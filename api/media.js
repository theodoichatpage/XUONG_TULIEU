import { json } from './search.js';

export default async function handler(req, res) {
  const id = new URL(req.url, 'http://localhost').searchParams.get('id') || '';
  if (!/^[\w.-]{1,160}$/.test(id) || ['.', '..'].includes(id)) return res.status(400).json({ error: 'Mã tư liệu không hợp lệ.' });
  try {
    const item = await json('https://archive.org/metadata/' + encodeURIComponent(id));
    const types = /\.(mp4|webm|ogv|mov|mkv|mpeg|mpg|avi|m4v|jpg|jpeg|png|gif|webp|tif|tiff|jp2)$/i;
    const files = (item.files || []).filter(file => file.name && types.test(file.name) && file.private !== 'true' && file.private !== true);
    const url = file => 'https://archive.org/download/' + encodeURIComponent(id) + '/' + file.name.split('/').map(encodeURIComponent).join('/');
    const video = /\.(mp4|webm|ogv)$/i;
    const image = /\.(jpg|jpeg|png|gif|webp)$/i;
    const preview = files.find(file => (item.metadata?.mediatype === 'movies' ? video : image).test(file.name));
    const sorted = [...files].sort((a,b) => Number(b.source === 'original') - Number(a.source === 'original'));
    res.setHeader('Cache-Control', 'public, s-maxage=180');
    return res.status(200).json({
      preview: preview ? url(preview) : '',
      files: sorted.slice(0, 40).map(file => ({ name: file.name, size: Number(file.size) || 0, url: url(file), original: file.source === 'original' }))
    });
  } catch {
    return res.status(502).json({ error: 'Chưa tải được danh sách tệp từ Internet Archive.' });
  }
}
