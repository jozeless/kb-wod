import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('details styles are scoped exclusively to real pre-workout pages without remote assets or storage changes',()=>{
 const css=fs.readFileSync(new URL('../styles/hm-details.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const selectors=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m=>m[1].trim().split(/,(?![^()]*\))/));
 assert.ok(selectors.length>30);assert.ok(selectors.every(s=>s.trim().startsWith('.hm-detail-view ')));
 assert.ok(!/@import|@font-face|url\(|box-shadow|[;{]\s*(?:transform|content)\s*:/i.test(css));
 const view=fs.readFileSync(new URL('../src/ui/views.js',import.meta.url),'utf8');assert.match(view,/if \(w.phases.length && stage === 'workout'\) \{\s*view.classList.add\('hm-detail-view'\)/);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.indexOf('./styles/hm-library.css')<html.indexOf('./styles/hm-details.css'));
 const worker=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');assert.match(worker,/kb2-static-v25/);assert.ok(worker.includes("'./styles/hm-details.css'"));assert.ok(!/skipWaiting|clients\.claim/.test(worker));
});
