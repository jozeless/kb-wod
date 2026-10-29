import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const files = ['hmkb-icon-v2-192.png', 'hmkb-icon-v2-512.png', 'hmkb-maskable-v2-512.png', 'hmkb-apple-touch-v2-180.png', 'hmkb-favicon-v2-32.png'];
const sizes = [192, 512, 512, 180, 32];
const artifactRoot = '/workspace/artifacts/pwa-installed-icon-refresh';
async function localMode(page) { await page.addInitScript(() => { window.KB_SUPABASE_CONFIG = { url: '', publishableKey: '' }; }); }

test('native decoding confirms the complete original artwork, dark background and conservative maskable safe area', async ({ page }, info) => {
  await localMode(page); await page.goto('./#library');
  const measurements = await page.evaluate(async ({ files }) => {
    const load = async path => { const image = new Image(); image.src = new URL(path, document.baseURI); await image.decode(); return image; };
    const source = await load('./assets/branding/hmkblogo001.png'), out = [];
    for (const file of files) {
      const image = await load(`./assets/icons/${file}`), size = image.naturalWidth;
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, size, size).data;
      let left = size, top = size, right = -1, bottom = -1, opaque = true;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4; if (data[i + 3] !== 255) opaque = false;
        if (data[i] !== 33 || data[i + 1] !== 34 || data[i + 2] !== 39) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      }
      const width = right - left + 1, height = bottom - top + 1;
      const expected = document.createElement('canvas'); expected.width = width; expected.height = height;
      const render = expected.getContext('2d'); render.imageSmoothingEnabled = true; render.imageSmoothingQuality = 'high'; render.drawImage(source, 0, 0, width, height);
      const pixels = render.getImageData(0, 0, width, height).data;
      let error = 0, coreError = 0, coreChannels = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
        const delta = Math.abs(pixels[(y * width + x) * 4 + c] - data[((y + top) * size + x + left) * 4 + c]); error += delta;
        if (x >= width * .24 && x <= width * .77 && y >= height * .17 && y <= height * .83) { coreError += delta; coreChannels++; }
      }
      // Manually reviewed conservative bounds enclosing the entire kettlebell and
      // hand in the immutable 1254px original; background/glow may extend farther.
      const safeRadius = size * .4;
      const coreCorners = [[300, 210], [960, 210], [300, 1040], [960, 1040]].map(([x, y]) => ({ x: left + x * width / source.naturalWidth, y: top + y * height / source.naturalHeight }));
      const maxCoreRadius = Math.max(...coreCorners.map(p => Math.hypot(p.x - size / 2, p.y - size / 2)));
      const corners = [0, (size - 1) * 4, (size - 1) * size * 4, (size * size - 1) * 4].map(i => Array.from(data.slice(i, i + 4)));
      out.push({ file, width: size, height: image.naturalHeight, artwork: { left, top, width, height }, opaque, corners, meanError: error / (width * height * 3), coreMeanError: coreError / coreChannels, safeRadius, maxCoreRadius });
    }
    return out;
  }, { files });
  for (const [index, m] of measurements.entries()) {
    expect(m.width).toBe(sizes[index]); expect(m.height).toBe(sizes[index]); expect(m.opaque).toBe(true);
    expect(m.corners).toEqual(Array(4).fill([33, 34, 39, 255])); expect(m.artwork.width).toBe(m.artwork.height);
    expect(m.artwork.left).toBe(m.artwork.top); expect(m.artwork.left * 2 + m.artwork.width).toBe(m.width);
    expect(m.meanError, m.file).toBeLessThan(3); expect(m.coreMeanError, m.file).toBeLessThan(4);
    expect(m.artwork.left).toBeGreaterThanOrEqual(1);
  }
  const mask = measurements[2]; expect(mask.artwork.left).toBeGreaterThanOrEqual(32);
  expect(mask.artwork.width / mask.width).toBeGreaterThanOrEqual(.8);
  expect(mask.maxCoreRadius).toBeLessThan(mask.safeRadius);
  expect(mask.safeRadius - mask.maxCoreRadius).toBeGreaterThan(10);
  await fs.mkdir(artifactRoot, { recursive: true }); await fs.writeFile(`${artifactRoot}/artwork-${info.project.name}.json`, JSON.stringify(measurements, null, 2));
});

test('Chromium parses the new manifest and future Apple/favicon metadata without changing PWA identity or header', async ({ page, context }) => {
  await localMode(page); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('./#today');
  const devtools = await context.newCDPSession(page), result = await devtools.send('Page.getAppManifest');
  expect(result.errors).toEqual([]); const manifest = JSON.parse(result.data);
  expect(manifest.name).toBe('Heavy Metal KB'); expect(manifest.short_name).toBe('HM/KB');
  for (const key of ['id', 'start_url', 'scope']) expect(new URL(manifest[key], result.url).pathname).toBe('/kb-wod/');
  expect(manifest.display).toBe('standalone'); expect(manifest.background_color).toBe('#212227'); expect(manifest.theme_color).toBe('#212227');
  expect(manifest.icons.map(i => i.purpose)).toEqual(['any', 'any', 'maskable']);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', './assets/icons/hmkb-favicon-v2-32.png');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', './assets/icons/hmkb-apple-touch-v2-180.png');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'HM/KB');
  await expect(page.locator('.brand-logo')).toHaveAttribute('src', './assets/branding/hmkblogo001.png');
  expect(await page.locator('.brand-logo').evaluate(n => n.complete && n.naturalWidth === 1254)).toBe(true);
  expect(errors).toEqual([]); await devtools.detach();
});

test('v29 precaches every install/Apple/favicon icon and retains old icons and app resources offline', async ({ page, context }) => {
  await localMode(page); await page.goto('./#library'); await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload(); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const entries = await page.evaluate(async () => { const worker = await fetch('./service-worker.js').then(r => r.text()); const urls = [...new Set([...worker.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]))]; const cache = await caches.open('kb2-static-v29'); return Promise.all(urls.map(async url => ({ url, cached: Boolean(await cache.match(new URL(url, document.baseURI))) }))); });
  expect(entries).toHaveLength(80); expect(entries.filter(e => !e.cached)).toEqual([]);
  await context.setOffline(true); await page.reload(); await expect(page.locator('.workout-card')).toHaveCount(4);
  const decoded = await page.evaluate(async files => {
    const manifest = await fetch('./manifest.webmanifest').then(r => r.json()), output = [];
    for (const url of [...files.map(file => `./assets/icons/${file}`), './icon-192.png', './icon-512.png', './assets/branding/hmkblogo001.png']) {
      const response = await fetch(url), bitmap = await createImageBitmap(await response.blob()); output.push({ url, ok: response.ok, width: bitmap.width, height: bitmap.height }); bitmap.close();
    }
    return { manifest, output };
  }, files);
  expect(decoded.manifest.name).toBe('Heavy Metal KB'); expect(decoded.output.every(d => d.ok && d.width === d.height)).toBe(true);
  expect(decoded.output.map(d => d.width)).toEqual([...sizes, 192, 512, 1254]);
  await page.getByRole('link', { name: 'Today', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await context.setOffline(false);
});

test('review sheet shows real PNGs under common masks with the mandatory 80%-diameter safe circle', async ({ page }, info) => {
  await localMode(page); await page.goto('./#library'); await expect(page.locator('.workout-card')).toHaveCount(4);
  const url = file => new URL(`./assets/icons/${file}`, page.url()).href;
  const markup = `<style>body{margin:0;padding:24px;background:#212227;color:#EDECEE;font:15px system-ui}h1{font-size:24px;color:#EEEF58}main{display:grid;grid-template-columns:repeat(3,220px);gap:24px}figure{margin:0;background:#312F4E;padding:14px;border-radius:16px}figcaption{margin-top:10px}img{display:block;width:192px;height:192px}.circle{clip-path:circle(50%)}.round{border-radius:28%}.mask{position:relative}.safe{position:absolute;inset:10%;border:2px dashed #EEEF58;border-radius:50%;box-sizing:border-box;pointer-events:none}.favicon{width:32px;height:32px}</style><h1>HM/KB — install icon review</h1><p>Exact approved artwork. Yellow guide: maskable safe circle (40% radius).</p><main><figure><img src="${url(files[0])}"><figcaption>192 × 192 · any</figcaption></figure><figure><img src="${url(files[1])}"><figcaption>512 × 512 · any</figcaption></figure><figure><div class="mask"><img class="circle" src="${url(files[2])}"><span class="safe"></span></div><figcaption>512 maskable · circular mask</figcaption></figure><figure><img class="round" src="${url(files[2])}"><figcaption>512 maskable · rounded mask</figcaption></figure><figure><img class="round" src="${url(files[3])}"><figcaption>180 × 180 · Apple touch</figcaption></figure><figure><img class="favicon" src="${url(files[4])}"><figcaption>32 × 32 · favicon (actual size)</figcaption></figure></main>`;
  await page.setViewportSize({ width: 800, height: 820 }); await page.setContent(markup); await page.locator('img').evaluateAll(nodes => Promise.all(nodes.map(n => n.decode())));
  await fs.mkdir(artifactRoot, { recursive: true }); await page.screenshot({ path: `${artifactRoot}/icon-review-${info.project.name}.png`, fullPage: true });
});
