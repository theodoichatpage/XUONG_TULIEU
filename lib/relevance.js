const filler = /\b(?:quan doi viet nam|bo doi viet nam|viet nam|vietnam|tu lieu|phim tu lieu|hinh anh|video|footage|anh|phim|ve|tai|trong|cua|va|cho|nhung|cac|nam|the|of|at|in|and)\b/g;
const groups = [
  { query: /\b(?:qua song|qua suoi|qua cau|cau tre|cau go|bridge|river crossing|stream crossing)\b/, evidence: /\b(?:qua (?:song|suoi|cau)|vuot (?:song|suoi)|(?:cross|across|over) (?:a |the )?(?:river|stream|bridge)|(?:river|stream) crossing|pont|passerelle)\b/, tokens: ['qua', 'song', 'suoi', 'cau', 'tre', 'go', 'bridge', 'river', 'stream', 'crossing'] },
  { query: /\b(?:dien bien phu|dien bien)\b/, evidence: /\b(?:dien bien phu|dien bien)\b/, tokens: ['dien', 'bien', 'phu'] },
  { query: /\b(?:keo phao|keo trong phao|hauling artillery|pulling artillery|transporting artillery)\b/, evidence: /\b(?:(?:keo|thao|van chuyen|dua|day) (?:trong |can |nhung khau |khau )?phao|(?:haul\w*|pull\w*|transport\w*) (?:heavy )?(?:artillery|guns)|(?:artillery|guns) (?:haul\w*|transport\w*)|(?:tract\w*|hiss\w*|transport\w*) (?:des |les )?canons)\b/, tokens: ['keo', 'trong', 'phao', 'hauling', 'pulling', 'transporting', 'artillery'] },
  { query: /\b(?:tet mau than|tet offensive|mau than)\b/, evidence: /\b(?:tet offensive|tet mau than|mau than)\b/, tokens: ['tet', 'mau', 'than', 'offensive'] },
  { query: /\b(?:chien tranh viet nam|vietnam war)\b/, evidence: /\b(?:chien tranh viet nam|vietnam war|war in vietnam|operation mallet|vietnam combat|south vietnam)\b/, tokens: ['chien', 'tranh', 'viet', 'nam', 'vietnam', 'war'] }
];

export function relevant(item, query, variants, words) {
  const normalized = words(query).join(' ');
  const title = words(item.title).join(' ');
  const description = words(item.description || '').slice(0, 95).join(' ');
  const evidence = title + ' ' + description;
  const required = groups.filter(group => group.query.test(normalized));
  if (/\bcau (?:tre|go)\b/.test(normalized)
    && !/\b(?:cau (?:tre|go)|(?:bamboo|wooden|timber) (?:foot)?bridge)\b/.test(evidence)) return false;
  if (required.some(group => !group.evidence.test(evidence))) return false;
  if (required.length && /\b(?:hoa nhac|concert|dieu binh|le hoi|le vieng|truyen hinh truc tiep|podcast|book tv|cspan\w*)\b/.test(title)
    && !required.every(group => group.evidence.test(title))) return false;
  const covered = new Set(required.flatMap(group => group.tokens));
  const terms = value => [...new Set(words(words(value).join(' ').replace(filler, ' ')))]
    .filter(term => !covered.has(term) && !/^(18|19|20)\d{2}$/.test(term));
  const titleSet = new Set(title.split(' '));
  const evidenceSet = new Set(evidence.split(' '));
  const matches = value => {
    const tokens = terms(value);
    if (!tokens.length) return required.length > 0;
    return tokens.filter(token => evidenceSet.has(token)).length >= Math.ceil(tokens.length * 0.75)
      && (required.length > 0 || tokens.some(token => titleSet.has(token)));
  };
  // Alternate translations may be broader. Once an action or event is recognized, keep any extra original keywords.
  if (required.length) return matches(query);
  if ([query, ...variants].some(matches)) return true;
  return /^\d{4}$/.test(normalized) && (evidenceSet.has(normalized) || item.date?.startsWith(normalized));
}
