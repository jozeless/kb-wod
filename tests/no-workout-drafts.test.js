import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
test('production UI has no automatic session persistence or recovery routing; final Save and shared exit guard remain', () => {
  const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const controller = read('src/ui/block-training.js'), main = read('src/main.js'), views = read('src/ui/views.js'), history = read('src/ui/session-history.js');
  assert.doesNotMatch(controller, /putDraft|getSession|restorePaused|draftId|Saving draft|Draft saved/);
  assert.equal((controller.match(/await completeSession\(record\)/g) || []).length, 1);
  assert.doesNotMatch(main, /draft=|get\('draft'\)|checkpoint\?\./);
  assert.doesNotMatch(views + history, /draftActions|Resume draft/);
  assert.match(main, /if \(allowExit\(\)\) go\('#today'\)/); assert.match(main, /beforeunload/);
  assert.match(controller, /End this workout\? Your progress will not be saved\./);
  const worker = read('service-worker.js'); assert.match(worker, /kb2-static-v33/); assert.doesNotMatch(worker, /skipWaiting|clients\.claim/);
});

test('merged-main Focus Mode, 40/20 definitions, loud audio, result/storage/cloud logic and PWA resources remain exact',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
 const protectedFiles=JSON.parse(read('tests/fixtures/completed-only-main-protected.json'));
 for(const [file,sha] of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(read(file)).digest('hex'),sha,file);
 assert.match(read('src/ui/block-training.js').toString(),/createWorkoutAudio\(\{profile: workout.audioProfile\}\)/);
 assert.match(read('src/ui/block-training.js').toString(),/pause.setAttribute\('aria-label'/);
 const worker=read('service-worker.js').toString();assert.equal(createHash('sha256').update(worker.replace('kb2-static-v33','kb2-static-v31').replace("'./src/data/oldschool.js', './src/data/oldschool-sailor.js', './src/data/oldschool-tiger.js', './src/data/oldschool-eagle.js', './src/domain/oldschool-results.js', './src/ui/oldschool-results-form.js', ", '')).digest('hex'),'ba187413a3b2d8a85a9dd1a73bdfda8f13b2a3206afbb345950bcfee26dff5dd');const urls=[...worker.matchAll(/'(\.\/[^']*)'/g)].map(m=>m[1]);assert.equal(new Set(urls).size,92);
});
