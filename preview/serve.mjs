#!/usr/bin/env node
// Serves the theme folder so the preview can read colors.toml, unlock.png and the wallpapers, with / showing the preview.
// Usage: node preview/serve.mjs [port]. Also used by preview/capture.mjs.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.toml': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

export function serve(port = 4173) {
  const server = createServer(async (request, response) => {
    let file = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (file === '/' || file === '/preview/') file = '/preview/index.html';
    const full = path.join(root, path.normalize(file));
    if (!full.startsWith(root + path.sep)) return response.writeHead(403).end();
    try {
      const body = await readFile(full);
      response.writeHead(200, { 'content-type': types[path.extname(full)] ?? 'application/octet-stream' }).end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.argv[2] ?? 4173));
  console.log(`Gilt preview at http://127.0.0.1:${server.address().port}/ (Ctrl-C to stop)`);
}
