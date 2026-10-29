import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('footer CSS stays scoped with a dedicated content reserve, no assets/dependencies, and unchanged PWA activation', () => {
  const css = fs.readFileSync(new URL('../styles/hm-footer.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m => m[1].trim().split(/,(?![^()]*\))/));
  assert.ok(selectors.length > 15); assert.ok(selectors.every(s => s.trim().startsWith('.hm-bottom-nav') || s.trim() === '#status.hm-footer-reserve'));
  assert.ok(!/@import|@font-face|url\(|box-shadow|animation|transition/i.test(css));
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'); assert.ok(html.indexOf('./styles/hm-active.css') < html.indexOf('./styles/hm-footer.css'));
  const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8'); assert.match(worker, /kb2-static-v29/); assert.ok(worker.includes("'./styles/hm-footer.css'")); assert.ok(!/skipWaiting|clients\.claim/.test(worker));
});
