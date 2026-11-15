import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import search from './api/search.js';
import media from './api/media.js';

const handlers = { '/api/search': search, '/api/media': media };
const assets = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] };
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const handler = handlers[path];
  if (handler) {
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    try { await handler(req, res); } catch { res.status(500).json({ error: 'Lỗi máy chủ.' }); }
    return;
  }
  const asset = assets[path];
  if (!asset) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', asset[1] + '; charset=utf-8');
  res.end(await readFile(new URL('./public/' + asset[0], import.meta.url)));
}).listen(Number(process.env.PORT || 3030), '127.0.0.1', () => console.log('http://127.0.0.1:' + (process.env.PORT || 3030)));
