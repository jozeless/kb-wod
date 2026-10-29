import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('active styles stay scoped, use no downloaded assets and keep the existing PWA activation policy', () => {
  const css = fs.readFileSync(new URL('../styles/hm-active.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m => m[1].trim().split(/,(?![^()]*\))/));
  assert.ok(selectors.length > 40); assert.ok(selectors.every(s => s.trim().startsWith('.hm-active-view')));
  assert.ok(!/@import|@font-face|url\(|box-shadow/i.test(css));
  const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(worker, /kb2-static-v27/); assert.ok(!/skipWaiting|clients\.claim/.test(worker));
  for (const asset of ['styles/hm-active.css', 'src/ui/active-presentation.js', 'assets/audio/start.wav', 'assets/audio/minute.wav']) assert.ok(worker.includes(`'./${asset}'`));
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('./styles/hm-details.css') < html.indexOf('./styles/hm-active.css'));
});
