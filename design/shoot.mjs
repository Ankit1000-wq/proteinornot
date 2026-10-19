// Dev helper: serve dist/ on localhost and screenshot pages with headless Chrome.
// Usage: node design/shoot.mjs   (writes design/check-*.png)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'design');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(DIST, p);
  if (!file.startsWith(DIST) || !fs.existsSync(file)) { res.writeHead(404); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const shots = (process.argv[2] ? JSON.parse(process.argv[2]) : [
  ['home-desktop', '/', 1440, 2600],
  ['home-mobile', '/', 390, 4200],
  ['home-mobile-360', '/?cat=bar,chips-snacks&sort=p100', 360, 2400],
  ['product-desktop', '/p/sample-brand-b-whey-crisp-bar/', 1440, 1700],
  ['product-mobile', '/p/sample-brand-a-choco-peanut-bar/', 390, 3000],
  ['seo-mobile', '/cheapest-protein-per-rupee/', 390, 3200],
  ['seo-desktop', '/best-high-protein-snacks-india/', 1440, 1800],
  ['method-mobile', '/method/', 390, 2600],
]);

const run = (args) => new Promise((resolve) => execFile('/usr/bin/google-chrome', args, { timeout: 60000 }, (e) => resolve(e)));

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pon-shoot-'));
  for (const [name, url, w, h] of shots) {
    const err = await run(['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, `--window-size=${w},${h}`, '--virtual-time-budget=4000', `--screenshot=${path.join(OUT, `check-${name}.png`)}`, `http://127.0.0.1:${port}${url}`]);
    console.log(err ? `fail ${name}: ${err.message.split('\n')[0]}` : `ok   check-${name}.png`);
  }
  fs.rmSync(profile, { recursive: true, force: true });
  server.close();
});
