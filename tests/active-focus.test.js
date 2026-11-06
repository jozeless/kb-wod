import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('focus styles are scoped to the live view or its explicit chrome-state class, with no added clock/audio/storage logic',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),css=read('styles/hm-active.css').replace(/\/\*[\s\S]*?\*\//g,'');
 const selectors=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m=>m[1].trim().split(/,(?![^()]*\))/));assert.ok(selectors.length>30);assert.ok(selectors.every(s=>s.trim().startsWith('.hm-active-view')||s.trim().startsWith('body.hm-training-focus')));
 const presentation=read('src/ui/active-presentation.js');assert.doesNotMatch(presentation,/setInterval|setTimeout|Date\.now|performance\.now|localStorage|indexedDB|\.start\(\)/);assert.match(presentation,/role|aria-label/);assert.match(read('src/main.js'),/new MutationObserver\(updateFocusChrome\)/);
 assert.match(read('service-worker.js'),/kb2-static-v31/);assert.doesNotMatch(read('service-worker.js'),/skipWaiting|clients\.claim/);
});
