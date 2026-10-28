import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('foundations define only prefixed tokens with the exact palette and no font/style application',()=>{
 const css=fs.readFileSync(new URL('../styles/hm-tokens.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 assert.match(css,/^\s*:root\s*\{[^{}]*\}\s*$/);assert.ok(!/@import|@font-face|url\(/i.test(css));
 const declarations=[...css.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)];assert.ok(declarations.length>20);assert.ok(declarations.every(d=>d[1].startsWith('--hm-')));
 const tokens=Object.fromEntries(declarations.map(d=>[d[1],d[2].trim()]));assert.equal(declarations.length,Object.keys(tokens).length);
 for(const [name,value]of Object.entries({'--hm-bg':'#212227','--hm-surface-primary':'#312F4E','--hm-surface-secondary':'#4D4A6A','--hm-accent':'#B37ACB','--hm-highlight':'#EEEF58','--hm-text-primary':'#EDECEE'}))assert.equal(tokens[name],value);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.indexOf('./styles/hm-tokens.css')<html.indexOf('./styles/app.css'));
 const legacy=fs.readFileSync(new URL('../styles/app.css',import.meta.url),'utf8');assert.ok(legacy.includes('background:var(--hm-bg)'));assert.ok(legacy.includes('color:var(--hm-text-primary)'));
});
