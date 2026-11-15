const agent = 'XuongTuLieu/1.0 (https://github.com/theodoichatpage/XUONG_TULIEU)';
const plain = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const words = value => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().match(/[a-z0-9]+/g) || [];
const clean = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const terms = [
  [/chi[eế]n tranh vi[eệ]t nam/gi, 'Vietnam War'], [/t[eế]t m[aậ]u th[aâ]n/gi, 'Tet Offensive'],
  [/tr[aậ]n hu[eế]/gi, 'Battle of Hue'], [/s[aà]i g[oò]n/gi, 'Saigon'], [/đ[àa] n[ẵa]ng/gi, 'Da Nang'],
  [/đi[eệ]n bi[eê]n ph[uủ]/gi, 'Dien Bien Phu'], [/hu[eế]/gi, 'Hue'],
  [/t[uư] li[eệ]u|th[uư]ớc phim|h[iì]nh [aả]nh/gi, '']
];

export async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options, signal: AbortSignal.timeout(8500),
    headers: { 'User-Agent': agent, ...options.headers }
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function commons(query, kind, limit) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: query + (kind === 'video' ? ' filetype:video' : ' filetype:bitmap'),
    gsrnamespace: '6', gsrlimit: String(limit), prop: 'imageinfo',
    iiprop: 'url|size|mime|sha1|extmetadata', iiurlwidth: '560',
    iiextmetadatafilter: 'DateTimeOriginal|Artist|LicenseShortName|LicenseUrl|ImageDescription|Attribution'
  });
  const data = await json('https://commons.wikimedia.org/w/api.php?' + params);
  if (data.error) throw new Error(data.error.code);
  return (data.query?.pages || []).sort((a,b) => a.index - b.index).flatMap(page => {
    const file = page.imageinfo?.[0];
    if (!file?.url || !(file.mime || '').startsWith(kind + '/')) return [];
    const meta = file.extmetadata || {};
    return [{
      id: 'commons:' + page.pageid, source: 'Wikimedia Commons', kind,
      title: page.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''),
      thumb: file.thumburl || (kind === 'image' ? file.url : ''), file: file.url,
      preview: file.url, url: file.descriptionurl, sha: file.sha1,
      description: plain(meta.ImageDescription?.value).slice(0, 600),
      credit: plain(meta.Attribution?.value || meta.Artist?.value).slice(0, 180),
      date: plain(meta.DateTimeOriginal?.value).slice(0, 45),
      rights: plain(meta.LicenseShortName?.value), rightsUrl: meta.LicenseUrl?.value,
      width: file.width, height: file.height, size: file.size
    }];
  });
}

async function archive(query, kind, limit) {
  const fields = ['identifier','title','date','description','licenseurl','rights','creator'];
  const params = new URLSearchParams({
    q: words(query).slice(0, 20).join(' AND ') + ' AND mediatype:' + (kind === 'video' ? 'movies' : 'image'),
    rows: String(limit), output: 'json'
  });
  for (const field of fields) params.append('fl[]', field);
  const data = await json('https://archive.org/advancedsearch.php?' + params);
  if (!data.response) throw new Error('Invalid archive response');
  return (data.response.docs || []).filter(row => /^[\w.-]+$/.test(row.identifier)).map(row => ({
    id: 'archive:' + row.identifier, key: row.identifier, source: 'Internet Archive', kind,
    title: plain(row.title || row.identifier), description: plain(row.description).slice(0, 600),
    url: 'https://archive.org/details/' + row.identifier, thumb: 'https://archive.org/services/img/' + row.identifier,
    date: plain(row.date).slice(0, 25), credit: plain(row.creator).slice(0, 180),
    rights: plain(row.rights).slice(0, 180), rightsUrl: [row.licenseurl].flat()[0]
  }));
}

function consolidate(items, query) {
  const queryWords = new Set(words(query));
  const searchYear = [...queryWords].find(word => /^(18|19|20)\d{2}$/.test(word));
  const war = queryWords.has('vietnam') && queryWords.has('war');
  const score = item => {
    const titleWords = new Set(words(item.title));
    const year = Number(item.date?.match(/\b(?:18|19|20)\d{2}\b/)?.[0]);
    const relevance = [...titleWords].filter(word => queryWords.has(word)).length;
    if (searchYear && year === Number(searchYear)) return relevance + 3;
    if (war && year >= 1955 && year <= 1975) return relevance + 2;
    if (war && year > 1975) return relevance - 2;
    return relevance;
  };
  const seen = new Set();
  return items.sort((a,b) => score(b) - score(a) || Number(Boolean(b.file)) - Number(Boolean(a.file))).filter(item => {
    const title = words(item.title).join(' ');
    const nara = item.title.match(/\bNARA\s*-\s*(\d+)\b/i);
    const archivalKey = nara && 'nara:' + nara[1] + ':' + item.kind + ':' + title.split(' ').slice(0, 10).join(' ');
    const keys = [item.id, item.sha && ('sha:' + item.sha), archivalKey, title.length > 12 && item.kind + ':' + title].filter(Boolean);
    const repeated = keys.some(key => seen.has(key));
    for (const key of keys) seen.add(key);
    return !repeated;
  });
}

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const query = clean(params.get('q'), 140);
  if (!words(query).length) return res.status(400).json({ error: 'Nhập từ khóa tìm kiếm.' });
  const source = params.get('source');
  const kind = params.get('kind');
  const deep = params.get('deep') === '1';
  const translated = terms.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), query)
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim();
  const normalized = /\p{L}/u.test(translated) && translated ? translated : query;
  const variants = [...new Set(deep ? [normalized, query] : [normalized])];
  const kinds = ['image', 'video'].includes(kind) ? [kind] : ['image', 'video'];
  const providers = [
    ['commons', 'Wikimedia Commons', commons],
    ['archive', 'Internet Archive', archive]
  ].filter(([key]) => !source || key === source);
  const jobs = providers.flatMap(([key, name, search]) =>
    (key === 'archive' ? [normalized] : variants).flatMap(value =>
      kinds.map(type => ({ name, run: search(value, type, deep ? 16 : 10) }))
    )
  );
  const results = await Promise.allSettled(jobs.map(job => job.run));
  const items = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const warnings = [...new Set(results.flatMap((result, index) => result.status === 'rejected' ? [jobs[index].name] : []))];
  res.setHeader('Cache-Control', warnings.length ? 'no-store' : 'public, s-maxage=120, stale-while-revalidate=240');
  const unique = consolidate(items, normalized);
  return res.status(200).json({ items: unique, warnings, variants, duplicates: items.length - unique.length });
}
