const get = id => document.getElementById(id);
const grid = get('grid');
const status = get('status');
const detail = get('detail');
const query = get('query');
const source = get('source');
let mode = 'search';
let kind = '';
let result;
let searchMessage = '';
let transferMessage = '';
let controller;
let detailVersion = 0;
let lastDeep = false;
const local = new Map();
const saved = new Map();
const objectUrls = new Map();

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action) {
  const node = element('button', text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}
function link(label, href, filename) {
  const localFile = filename && href?.startsWith('blob:');
  const address = localFile ? href : safeUrl(href);
  if (!address) return null;
  const node = element('a', label);
  node.href = address;
  if (localFile) node.download = filename;
  else { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
}
function addLinks(parent, ...links) {
  parent.append(...links.filter(Boolean));
}
function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xuong-tu-lieu', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const database = openStore()
  .then(async db => {
    const entries = await new Promise((resolve, reject) => {
      const request = db.transaction('entries').objectStore('entries').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    for (const { id, item } of entries) (id.startsWith('local:') ? local : saved).set(item.id, item);
    render();
    return db;
  })
  .catch(() => null);

async function store(id, item) {
  const db = await database;
  if (!db) throw new Error('Storage unavailable');
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', 'readwrite');
    const entries = transaction.objectStore('entries');
    if (item) entries.put({ id, item });
    else entries.delete(id);
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function fileUrl(item) {
  if (!item.blob) return '';
  if (!objectUrls.has(item.id)) objectUrls.set(item.id, URL.createObjectURL(item.blob));
  return objectUrls.get(item.id);
}
function setMode(value) {
  mode = value;
  render();
}
async function toggleSaved(item) {
  await database;
  const selected = saved.has(item.id);
  try {
    await store('saved:' + item.id, selected ? null : item);
    if (selected) saved.delete(item.id);
    else saved.set(item.id, item);
    transferMessage = '';
  } catch { transferMessage = 'Trình duyệt chưa lưu được mục này.'; }
  render();
}
function formatBytes(bytes) {
  return bytes ? new Intl.NumberFormat('vi', { maximumFractionDigits: 1 }).format(bytes / 1048576) + ' MB' : '';
}
function makeCard(item) {
  const card = element('article', '', 'card');
  const cover = button(item.kind === 'video' ? '▶ Video' : item.kind === 'design' ? 'Tệp .AI' : 'Ảnh', () => showDetail(item));
  cover.className = 'media';
  cover.setAttribute('aria-label', 'Xem ' + item.title);
  const thumbnail = item.blob && item.kind === 'image' ? fileUrl(item) : safeUrl(item.thumb);
  if (thumbnail) {
    const img = element('img');
    img.src = thumbnail;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove());
    cover.append(img);
  }
  if (item.blob && item.kind === 'video') {
    const video = element('video');
    video.src = fileUrl(item);
    video.preload = 'metadata';
    video.muted = true;
    video.addEventListener('error', () => video.remove());
    cover.append(video);
  }
  cover.append(element('span', item.kind === 'video' ? '▶ Video' : item.kind === 'design' ? 'Illustrator' : 'Ảnh', 'tag'));
  const info = element('div', '', 'card-content');
  info.append(element('h3', item.title), element('p', [item.source, item.date?.slice(0, 10), item.rights].filter(Boolean).join(' · '), 'meta'));
  const actions = element('div', '', 'actions');
  const isSaved = saved.has(item.id);
  const save = button(isSaved ? '✓ Đã lưu' : 'Lưu', () => toggleSaved(item));
  save.setAttribute('aria-pressed', String(isSaved));
  actions.append(save);
  const download = link(item.blob ? 'Tải tệp' : 'Mở tệp gốc', item.blob ? fileUrl(item) : item.file, item.blob && item.title);
  if (download) actions.append(download);
  else if (item.kind === 'image' && !item.key && item.url) addLinks(actions, link('Mở nguồn', item.url));
  else actions.append(button(item.youtube ? 'Xem video' : 'Xem tệp', () => showDetail(item)));
  info.append(actions);
  card.append(cover, info);
  return card;
}

function render() {
  for (const tab of document.querySelectorAll('[data-mode]')) tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode));
  for (const tab of document.querySelectorAll('[data-kind]')) tab.setAttribute('aria-pressed', String(tab.dataset.kind === kind));
  source.hidden = mode !== 'search';
  const webLinks = get('web-links');
  webLinks.replaceChildren();
  webLinks.hidden = mode !== 'search';
  if (mode === 'search' && query.value.trim()) {
    const term = encodeURIComponent(query.value.trim());
    addLinks(webLinks, link('Google Ảnh', 'https://www.google.com/search?tbm=isch&q=' + term),
      link('Google Video', 'https://www.google.com/search?tbm=vid&q=' + term),
      link('YouTube', 'https://www.youtube.com/results?search_query=' + term));
  }
  get('count').textContent = saved.size;
  const items = mode === 'local' ? [...local.values()] : mode === 'saved' ? [...saved.values()] : result?.items || [];
  const visible = items.filter(item => !kind || item.kind === kind);
  status.textContent = [transferMessage, mode === 'search' ? searchMessage : visible.length + ' tệp'].filter(Boolean).join(' · ');
  grid.replaceChildren(...visible.map(makeCard));
  if (!visible.length) {
    const empty = mode === 'local' ? 'Nhập ảnh, video hoặc tệp Adobe Illustrator (.ai) từ máy. Ảnh và video do AI tạo được nhận như các tệp thông thường.'
      : mode === 'saved' ? 'Các tư liệu đã lưu sẽ xuất hiện ở đây.'
      : controller ? 'Đang lấy ảnh và phim từ các kho…' : 'Chưa có kết quả phù hợp. Thử tên sự kiện, địa điểm hoặc năm khác.';
    grid.append(element('p', empty, 'empty'));
  }
}

async function search(deep = false) {
  if (!query.value.trim()) { query.focus(); return; }
  transferMessage = '';
  lastDeep = deep;
  controller?.abort();
  const current = new AbortController();
  controller = current;
  result = null;
  searchMessage = deep ? 'Đang tìm theo các biến thể từ khóa…' : 'Đang tìm trong các kho…';
  setMode('search');
  try {
    const params = new URLSearchParams({ q: query.value, kind, source: source.value, deep: deep ? '1' : '0' });
    const response = await fetch('/api/search?' + params, { signal: current.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (controller !== current) return;
    result = data;
    get('web-option').hidden = !data.webEnabled;
    const summary = [data.items.length + ' kết quả'];
    if (data.filtered) summary.push('Loại ' + data.filtered + ' mục không đủ liên quan');
    if (data.duplicates) summary.push('Gộp ' + data.duplicates + ' mục trùng');
    if (data.variants.join() !== query.value.trim()) summary.push('Từ khóa: ' + data.variants.join(' / '));
    if (data.warnings.length) summary.push('Chưa phản hồi: ' + data.warnings.join(', '));
    searchMessage = summary.join(' · ');
  } catch (error) {
    if (controller !== current) return;
    searchMessage = 'Chưa tìm được tư liệu. Hãy thử lại.';
  } finally {
    if (controller === current) { controller = null; render(); }
  }
}

function preview(item, href) {
  const address = item.blob ? href : safeUrl(href);
  if (!address || item.kind === 'design') return null;
  const node = element(item.kind === 'video' ? 'video' : 'img', '', 'detail-media');
  if (item.kind === 'video') { node.controls = true; node.preload = 'metadata'; }
  else node.alt = item.title;
  node.src = address;
  node.addEventListener('error', () => node.replaceWith(element('p', 'Trình duyệt chưa phát hoặc hiển thị được định dạng này. Anh có thể mở hoặc tải tệp bên dưới.')));
  return node;
}

async function showDetail(item) {
  const version = ++detailVersion;
  get('detail-title').textContent = item.title;
  const body = get('detail-body');
  body.replaceChildren();
  const holder = element('div');
  const media = preview(item, item.blob ? fileUrl(item) : item.preview);
  if (media) holder.append(media);
  if (/^[\w-]{11}$/.test(item.youtube || '')) {
    const player = element('iframe', '', 'detail-media embed');
    player.title = item.title;
    player.src = 'https://www.youtube-nocookie.com/embed/' + item.youtube;
    player.allowFullscreen = true;
    holder.append(player);
  }
  if (item.kind === 'image' && !media && !item.key && safeUrl(item.thumb)) {
    holder.append(preview(item, item.thumb));
  }
  body.append(holder, element('p', [item.source, item.date, item.width && item.height ? item.width + ' × ' + item.height : '', formatBytes(item.size)].filter(Boolean).join(' · '), 'meta'));
  if (item.description) body.append(element('p', item.description));
  if (item.credit) body.append(element('p', 'Ghi nguồn: ' + item.credit));
  if (!item.blob) body.append(element('p', 'Quyền sử dụng: ' + (item.rights || 'Xem hồ sơ gốc để xác minh.')));
  if (item.kind === 'design') body.append(element('p', 'Mở tệp .ai bằng Adobe Illustrator để xem nội dung.'));
  const actions = element('div', '', 'detail-links');
  addLinks(actions, link('Hồ sơ nguồn', item.url), link('Giấy phép', item.rightsUrl),
    link(item.blob ? 'Tải tệp' : 'Mở tệp gốc', item.blob ? fileUrl(item) : item.file, item.blob && item.title));
  body.append(actions);
  if (!detail.open) detail.showModal();
  if (!item.key) return;
  const files = element('p', 'Đang lấy danh sách tệp…');
  body.append(files);
  try {
    const response = await fetch('/api/media?id=' + encodeURIComponent(item.key));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (version !== detailVersion) return;
    const media = preview(item, data.preview);
    if (media) holder.append(media);
    if (!data.files.length) { files.textContent = 'Kho chưa cung cấp tệp ảnh hoặc video tải trực tiếp.'; return; }
    const list = element('ul', '', 'file-list');
    for (const file of data.files) {
      const row = element('li');
      addLinks(row, link(file.name + (file.original ? ' · Bản gốc' : '') + (file.size ? ' · ' + formatBytes(file.size) : ''), file.url));
      list.append(row);
    }
    files.replaceWith(element('h3', 'Tệp từ Internet Archive'), list);
  } catch {
    if (version === detailVersion) files.textContent = 'Chưa lấy được danh sách tệp. Hãy mở hồ sơ nguồn.';
  }
}

function fileKind(file) {
  if (/\.ai$/i.test(file.name)) return 'design';
  if (file.type.startsWith('image/') || /\.(tiff?|heic|heif)$/i.test(file.name)) return 'image';
  if (file.type.startsWith('video/') || /\.(mov|mkv|avi)$/i.test(file.name)) return 'video';
  return '';
}

get('files').addEventListener('change', async event => {
  const files = [...event.target.files];
  event.target.value = '';
  if (!files.length) return;
  await database;
  let added = 0;
  let skipped = 0;
  for (const file of files) {
    const type = fileKind(file);
    if (!type) { skipped++; continue; }
    const id = 'local:' + [file.name, file.size, file.lastModified].join(':');
    const item = { id, blob: file, kind: type, title: file.name, size: file.size, source: 'Tệp trên thiết bị' };
    try { await store(id, item); added++; }
    catch { skipped++; continue; }
    local.set(id, item);
  }
  transferMessage = 'Đã nhập ' + added + ' tệp' + (skipped ? ' · ' + skipped + ' tệp không hỗ trợ hoặc chưa lưu được' : '');
  kind = '';
  setMode('local');
});

get('search').addEventListener('submit', event => { event.preventDefault(); search(event.submitter?.value === 'deep'); });
for (const chip of document.querySelectorAll('[data-query]')) chip.addEventListener('click', () => { query.value = chip.dataset.query; search(); });
for (const tab of document.querySelectorAll('[data-mode]')) tab.addEventListener('click', () => { transferMessage = ''; setMode(tab.dataset.mode); });
for (const tab of document.querySelectorAll('[data-kind]')) tab.addEventListener('click', () => { kind = tab.dataset.kind; if (mode === 'search') search(lastDeep); else render(); });
get('saved-top').addEventListener('click', () => { transferMessage = ''; setMode('saved'); });
source.addEventListener('change', () => search(lastDeep));
detail.addEventListener('close', () => { detailVersion++; get('detail-body').replaceChildren(); });
search();
