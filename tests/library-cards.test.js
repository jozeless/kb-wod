import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {libraryWorkouts,workouts} from '../src/data/catalog.js';

test('Library has its own view scope; new styles cannot target shared grids or cards globally',()=>{
 const css=fs.readFileSync(new URL('../styles/hm-library.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const selectors=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m=>m[1].trim().split(/,(?![^()]*\))/));
 assert.ok(selectors.length>20);assert.ok(selectors.every(s=>s.trim().startsWith('.hm-library-view ')));
 assert.ok(!/@import|@font-face|url\(|box-shadow|[;{]\s*(?:transform|content)\s*:/i.test(css));
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.indexOf('./styles/hm-today.css')<html.indexOf('./styles/hm-library.css'));
 const view=fs.readFileSync(new URL('../src/ui/views.js',import.meta.url),'utf8');assert.match(view,/const container = el\('div', \{className: 'hm-library-view'\}/);
 const worker=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');assert.match(worker,/kb2-static-v27/);assert.ok(worker.includes("'./styles/hm-library.css'"));assert.ok(!/skipWaiting|clients\.claim/.test(worker));
});

test('Library keeps exact released IDs, versions, duration seconds and all fifteen internal definitions',()=>{
 assert.deepEqual(libraryWorkouts.map(w=>[w.id,w.version,w.durationSeconds]),[['monday-paranoid',3,1270],['tuesday-of-spades',1,1200],['thursday-bells',1,1270],['friday-to-black',1,1200]]);
 assert.equal(workouts.length,15);
});
