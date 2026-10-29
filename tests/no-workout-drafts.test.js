import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('production UI has no automatic session persistence or recovery routing; final Save and shared exit guard remain', () => {
  const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const controller = read('src/ui/block-training.js'), main = read('src/main.js'), views = read('src/ui/views.js'), history = read('src/ui/session-history.js');
  assert.doesNotMatch(controller, /putDraft|getSession|restorePaused|draftId|Saving draft|Draft saved/);
  assert.equal((controller.match(/await completeSession\(record\)/g) || []).length, 1);
  assert.doesNotMatch(main, /draft=|get\('draft'\)|checkpoint\?\./);
  assert.doesNotMatch(views + history, /draftActions|Resume draft/);
  assert.match(main, /if \(allowExit\(\)\) go\('#today'\)/); assert.match(main, /beforeunload/);
  assert.match(controller, /End this workout\? Your progress will not be saved\./);
  const worker = read('service-worker.js'); assert.match(worker, /kb2-static-v30/); assert.doesNotMatch(worker, /skipWaiting|clients\.claim/);
});
