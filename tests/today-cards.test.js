import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Today redesign stylesheet is isolated to the existing weekly grid and adds no remote assets',()=>{
 const css=fs.readFileSync(new URL('../styles/hm-today.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const selectors=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m=>m[1].trim().split(/,(?![^()]*\))/));
 assert.ok(selectors.length>20);assert.ok(selectors.every(s=>s.trim().startsWith('.week-grid ')));
 assert.ok(!/@import|@font-face|url\(|box-shadow|[;{]\s*(?:transform|content)\s*:/i.test(css));
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('./styles/hm-header.css')<html.indexOf('./styles/hm-today.css'));
 const worker=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 assert.match(worker,/kb2-static-v30/);assert.ok(worker.includes("'./styles/hm-today.css'"));
 assert.ok(!/skipWaiting|clients\.claim/.test(worker));
});
