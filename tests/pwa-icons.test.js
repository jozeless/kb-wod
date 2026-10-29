import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url));
const icons = [
  ['hmkb-icon-v2-192.png', 192, 100000],
  ['hmkb-icon-v2-512.png', 512, 250000],
  ['hmkb-maskable-v2-512.png', 512, 250000],
  ['hmkb-apple-touch-v2-180.png', 180, 100000],
  ['hmkb-favicon-v2-32.png', 32, 10000],
];

test('install manifest names change while app identity, launch scope, colors and icon purposes remain explicit', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'Heavy Metal KB'); assert.equal(manifest.short_name, 'HM/KB');
  for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#212227'); assert.equal(manifest.background_color, '#212227');
  assert.deepEqual(manifest.icons, [
    { src: './assets/icons/hmkb-icon-v2-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: './assets/icons/hmkb-icon-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: './assets/icons/hmkb-maskable-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]);
});

test('versioned icons are compact opaque 8-bit RGB PNGs with the required physical dimensions', () => {
  for (const [name, size, budget] of icons) {
    const png = read(`assets/icons/${name}`);
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(png.toString('ascii', 12, 16), 'IHDR');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[24], 8); assert.equal(png[25], 2); assert.ok(png.length < budget, name);
  }
});

test('favicon/Apple links use new URLs while original artwork, legacy icon bytes and PWA cache activation are preserved', () => {
  const html = read('index.html').toString(), worker = read('service-worker.js').toString();
  assert.match(html, /rel="icon" type="image\/png" sizes="32x32" href="\.\/assets\/icons\/hmkb-favicon-v2-32.png"/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\.\/assets\/icons\/hmkb-apple-touch-v2-180.png"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="HM\/KB"/);
  const hashes = {
    'assets/branding/hmkblogo001.png': 'cdc6c25a8f59b0d52d5fe5c716d3284cfeaa24e6c95ba58dd1d0886c02128114',
    'icon-192.png': '8dc9946698b1c1285e3f44bad7ea4367bb79e68751ddc02c56687b711f37563f',
    'icon-512.png': 'c1613cba7d0cb784cfa0bc938512a5ae1be0a3804e54c9b294d1ba16d3096175',
  };
  for (const [file, hash] of Object.entries(hashes)) assert.equal(createHash('sha256').update(read(file)).digest('hex'), hash, file);
  assert.match(worker, /kb2-static-v29/); assert.ok(!/skipWaiting|clients\.claim/.test(worker));
  for (const file of [...icons.map(([name]) => `assets/icons/${name}`), 'icon-192.png', 'icon-512.png', 'assets/branding/hmkblogo001.png']) assert.ok(worker.includes(`'./${file}'`), file);
});
