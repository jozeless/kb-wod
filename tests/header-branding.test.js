import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('header uses the byte-identical user-approved original and precaches it separately from PWA icons',()=>{
 const logo=fs.readFileSync(new URL('../assets/branding/hmkblogo001.png',import.meta.url));
 assert.equal(createHash('sha256').update(logo).digest('hex'),'cdc6c25a8f59b0d52d5fe5c716d3284cfeaa24e6c95ba58dd1d0886c02128114');
 assert.equal(logo.readUInt32BE(16),1254);assert.equal(logo.readUInt32BE(20),1254);
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/aria-label="Heavy Metal KB home"/);assert.match(html,/src="\.\/assets\/branding\/hmkblogo001.png"/);assert.match(html,/class="header-account"/);
 const worker=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 assert.match(worker,/kb2-static-v28/);
 for(const asset of ['./assets/branding/hmkblogo001.png','./styles/hm-header.css','./icon-192.png','./icon-512.png','./assets/audio/start.wav','./assets/audio/minute.wav'])assert.ok(worker.includes(`'${asset}'`));
 assert.ok(!/skipWaiting|clients\.claim/.test(worker));
});

test('new header styles cannot restyle application content or import a typeface',()=>{
 const css=fs.readFileSync(new URL('../styles/hm-header.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const selectors=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m=>m[1].trim().split(','));
 assert.ok(selectors.length>10);assert.ok(selectors.every(s=>s.trim().startsWith('.app-header')));
 assert.ok(!/@import|@font-face|url\(/i.test(css));
 assert.match(css,/safe-area-inset-left/);assert.match(css,/safe-area-inset-right/);assert.match(css,/safe-area-inset-top/);
 assert.match(css,/\.app-header a:focus-visible/);
});
