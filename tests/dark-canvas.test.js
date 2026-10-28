import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('dark-canvas layer preserves existing CSS and changes only color roles and browser theme metadata',()=>{
 const current=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8'),before=fs.readFileSync(new URL('./fixtures/ui-v2-01-app.css',import.meta.url),'utf8');assert.ok(current.startsWith(before));
 const layer=current.slice(before.length).replace(/\/\*[\s\S]*?\*\//g,'');const declarations=[...layer.matchAll(/\{([^{}]*)\}/g)].flatMap(rule=>[...rule[1].matchAll(/([\w-]+)\s*:\s*([^;}]+)/g)]);assert.ok(declarations.length>0);assert.ok(declarations.every(d=>['background','color','border-color'].includes(d[1])));for(const value of layer.match(/#[a-f\d]+/gi)||[])assert.ok(before.includes(value));
 const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.background_color,'#212227');assert.equal(manifest.theme_color,'#212227');assert.equal(manifest.id,'./');assert.equal(manifest.name,'KB 2.0');assert.equal(manifest.short_name,'KB 2.0');assert.deepEqual(manifest.icons,[{src:'./icon-192.png',sizes:'192x192',type:'image/png'},{src:'./icon-512.png',sizes:'512x512',type:'image/png'}]);
});
