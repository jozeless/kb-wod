import {test, expect} from '@playwright/test';
import {installBeepSpy} from './helpers/timer-beeps.js';
const warning = 'End this workout? Your progress will not be saved.';
async function setup(page) {
  await page.addInitScript(() => {
    window.KB_SUPABASE_CONFIG = {url: '', publishableKey: ''}; window.sessionWrites = [];
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(record, ...args) {
      if (this.name === 'sessions') { window.sessionWrites.push(structuredClone(record)); if (window.failSessionSave) throw new DOMException('Fixture quota', 'QuotaExceededError'); }
      return put.call(this, record, ...args);
    };
  });
  await installBeepSpy(page); await page.clock.install({time: new Date('2026-10-29T12:00:00Z')}); await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z'));
}
const records = page => page.evaluate(async () => (await import('./src/storage/session-store.js')).listSessions());
async function start(page, id = 'monday-paranoid', version = 3) {
  await page.goto(`./#workout/${id}/${version}`); await page.getByRole('button', {name: 'Start Workout', exact: true}).click();
  await expect(page.getByRole('timer')).toHaveText('3'); await expect(page).toHaveURL(new RegExp(`#active/${id}/${version}$`));
}
const untouched = async page => { expect(await records(page)).toEqual([]); expect(await page.evaluate(() => sessionWrites)).toEqual([]); };

test('all detail/ready routes omit draft recovery and old draft deep links never load or mutate records', async ({page}) => {
  await setup(page); await page.goto('./#library');
  const legacy = await page.evaluate(async () => {
    const {findWorkout} = await import('./src/data/catalog.js'), {createDraft} = await import('./src/domain/result-schemas.js'), {putDraft} = await import('./src/storage/session-store.js');
    const r = createDraft(findWorkout('monday-paranoid', 3), {getItem: () => null}, 'legacy-muted'); r.soundEnabled = false; r.checkpointMs = 13000; r.form.notes = 'Keep legacy record'; return putDraft(r);
  });
  const workouts = await page.evaluate(async () => (await import('./src/data/catalog.js')).workouts.map(w => [w.id, w.version]));
  for (const [id, version] of workouts) for (const stage of ['workout', 'active']) {
    await page.goto(`./#${stage}/${id}/${version}`); await expect(page.getByRole('button', {name: /Resume draft/i})).toHaveCount(0); await expect(page.getByRole('timer')).toHaveCount(0);
  }
  await page.goto('./#active/monday-paranoid/3?draft=legacy-muted'); await expect(page.getByText('Ready when you are', {exact: true})).toBeVisible();
  expect(await records(page)).toEqual([legacy]); await page.getByRole('button', {name: 'Start Workout', exact: true}).click(); await expect(page.getByRole('timer')).toHaveText('3');
  await expect(page).toHaveURL(/#active\/monday-paranoid\/3$/); expect(await records(page)).toEqual([legacy]);
});

test('start, edits, pause/resume, phase changes and visibility never persist incomplete sessions', async ({page}) => {
  await setup(page); await start(page); await untouched(page); await page.clock.runFor(13000);
  await page.getByLabel('KB Push Press weight (kg)', {exact: true}).fill('12.5'); await page.getByRole('button', {name: 'Pause', exact: true}).click();
  await page.clock.fastForward(600000); await expect(page.getByRole('timer')).toHaveText('00:50'); await untouched(page);
  await page.getByRole('button', {name: 'Resume', exact: true}).click(); await page.clock.runFor(50000); await expect(page.getByRole('timer')).toHaveText('01:00');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, value: true}); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(180000); await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, value: false}); document.dispatchEvent(new Event('visibilitychange')); });
  await untouched(page); await page.clock.fastForward(1030000); await expect(page.getByRole('heading', {name: 'Workout Results', exact: true})).toBeVisible();
  await page.getByLabel('Thruster repetitions', {exact: true}).fill('17'); await untouched(page);
});

test('all historical multi-block transitions keep entered results only in memory until explicit final save', async ({page}) => {
  await setup(page); await start(page, 'hybrid-001-strength-sweat', 2); await page.clock.fastForward(483000);
  const squat = page.getByRole('region', {name: 'KB Goblet Squat results', exact: true}); await squat.getByLabel('Round 1', {exact: true}).fill('8'); await untouched(page);
  await page.getByRole('button', {name: 'Continue to Conditioning', exact: true}).click(); await page.clock.fastForward(483000); await untouched(page);
  await page.getByRole('button', {name: 'Continue to Finisher', exact: true}).click(); await page.clock.fastForward(243000); await untouched(page);
  await page.getByRole('button', {name: 'Save Workout', exact: true}).evaluate(b => { b.click(); b.click(); }); await expect(page.getByRole('heading', {name: 'Workout saved', exact: true})).toBeVisible();
  const saved = await records(page); expect(saved).toHaveLength(1); expect(saved[0].status).toBe('completed'); expect(saved[0].activeDurationMs).toBe(1200000); expect(saved[0].results.strength[0].rounds[0]).toBe(8);
  expect(await page.evaluate(() => sessionWrites.map(r => r.status))).toEqual(['completed']);
});

test('End cancellation preserves the same running timer; confirmation discards once, stops audio and returns Today', async ({page}) => {
  await setup(page); let accept = false; const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); return accept ? d.accept() : d.dismiss(); });
  await start(page); await page.clock.runFor(13000); await page.getByRole('button', {name: 'End Workout', exact: true}).click();
  expect(dialogs).toEqual([warning]); await page.clock.runFor(1000); await expect(page.getByRole('timer')).toHaveText('00:49');
  accept = true; await page.getByRole('button', {name: 'End Workout', exact: true}).click(); await expect(page).toHaveURL(/#today$/); expect(dialogs).toEqual([warning, warning]);
  const notes = await page.evaluate(() => beepNotes); await page.clock.fastForward(2000000); expect(await page.evaluate(() => beepNotes)).toEqual(notes); await untouched(page);
});

test('footer, Back and leaving unfinished results use one consistent confirmation and preserve cancelled forms', async ({page}) => {
  await setup(page); let accept = false; const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); return accept ? d.accept() : d.dismiss(); });
  await start(page); await page.clock.runFor(13000);
  for (const name of ['Today', 'Library', 'Progress', 'History']) { await page.getByRole('link', {name, exact: true}).locator('svg').click(); await expect(page).toHaveURL(/#active\/monday-paranoid\/3$/); }
  await page.goBack(); await expect(page).toHaveURL(/#active\/monday-paranoid\/3$/); expect(dialogs).toEqual(Array(5).fill(warning));
  await page.clock.fastForward(1260000); await expect(page.getByRole('heading', {name: 'Workout Results', exact: true})).toBeVisible();
  await page.getByLabel('Thruster repetitions', {exact: true}).fill('23'); await page.getByRole('button', {name: 'Return to Today', exact: true}).click();
  await expect(page.getByLabel('Thruster repetitions', {exact: true})).toHaveValue('23'); expect(dialogs).toEqual(Array(6).fill(warning));
  accept = true; await page.getByRole('link', {name: 'History', exact: true}).click(); await expect(page).toHaveURL(/#history$/); expect(dialogs).toEqual(Array(7).fill(warning)); await untouched(page);
});

test('refresh discards active and result sessions and never restarts a timer without Start', async ({page}) => {
  await setup(page); const dialogs = []; page.on('dialog', d => { dialogs.push(d.type()); return d.accept(); });
  await start(page); await page.clock.runFor(13000); await page.getByLabel('KB Push Press weight (kg)', {exact: true}).fill('12.5'); await page.reload();
  await expect(page.getByText('Ready when you are', {exact: true})).toBeVisible(); await expect(page.getByRole('timer')).toHaveCount(0); await expect(page.getByRole('button', {name: 'Resume', exact: true})).toHaveCount(0); await untouched(page);
  await page.getByRole('button', {name: 'Start Workout', exact: true}).click(); await expect(page.getByRole('timer')).toHaveText('3'); await page.clock.fastForward(1273000);
  await page.getByLabel('Thruster repetitions', {exact: true}).fill('23'); await page.reload(); await expect(page.getByText('Ready when you are', {exact: true})).toBeVisible(); await untouched(page);
  expect(dialogs).toEqual(['beforeunload', 'beforeunload']);
  await page.goto('./#workout/monday-paranoid/3'); await expect(page.getByLabel('KB Push Press weight (kg)', {exact: true})).toHaveValue('12.5');
});

test('back/forward-cache document restoration shows Ready instead of resurrecting an abandoned timer', async ({page}) => {
  await setup(page); await start(page); await page.clock.runFor(13000);
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}));
    dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
  });
  await expect(page.getByText('Ready when you are', {exact: true})).toBeVisible(); await expect(page.getByRole('timer')).toHaveCount(0);
  await untouched(page); const count = await page.evaluate(() => beepNotes.length); await page.clock.fastForward(2000000); expect(await page.evaluate(() => beepNotes.length)).toBe(count);
});

test('final-save failure keeps valid in-memory entries, disables duplicate submits and retries the same UUID exactly once', async ({page}) => {
  await setup(page); await start(page); await page.clock.fastForward(1273000);
  await page.getByLabel('KB Push Press actual weight (kg)', {exact: true}).fill('12.5'); await page.getByLabel('Thruster repetitions', {exact: true}).fill('17');
  await page.evaluate(() => { window.failSessionSave = true; }); await page.getByRole('button', {name: 'Save Workout', exact: true}).click();
  await expect(page.getByText('Workout could not be saved. Your entries are still here. Retry Save Workout.', {exact: true})).toBeVisible(); expect(await records(page)).toEqual([]);
  await expect(page.getByLabel('Thruster repetitions', {exact: true})).toHaveValue('17'); await expect(page.getByLabel('KB Push Press actual weight (kg)', {exact: true})).toHaveValue('12.5');
  await page.evaluate(() => { window.failSessionSave = false; }); await page.getByRole('button', {name: 'Save Workout', exact: true}).evaluate(b => { b.click(); b.click(); });
  await expect(page.getByRole('heading', {name: 'Workout saved', exact: true})).toBeVisible(); const writes = await page.evaluate(() => sessionWrites);
  expect(writes).toHaveLength(2); expect(writes[0].id).toBe(writes[1].id); expect(writes.every(r => r.status === 'completed')).toBe(true);
  const saved = await records(page); expect(saved).toHaveLength(1); expect(saved[0].results.finisher.reps).toBe(17);
});

test('ownership is captured in memory and a transient identity change cannot save another account’s results', async ({page}) => {
  await setup(page); await start(page); await page.clock.fastForward(1273000);
  await page.getByLabel('Thruster repetitions', {exact: true}).fill('17');
  await page.evaluate(async () => (await import('./src/cloud/identity.js')).setUserId('different-account'));
  await page.getByRole('button', {name: 'Save Workout', exact: true}).click();
  await expect(page.getByText('Account changed. Start a new workout before saving.', {exact: true})).toBeVisible(); await untouched(page);
  await page.evaluate(async () => (await import('./src/cloud/identity.js')).setUserId(null));
  await page.getByRole('button', {name: 'Save Workout', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Workout saved', exact: true})).toBeVisible();
  const completed = await records(page); expect(completed).toHaveLength(1); expect(completed[0].ownerId).toBeNull(); expect(completed[0].results.finisher.reps).toBe(17);
});

test('legacy drafts and completed history/Progress remain byte-identical after abandoned sessions offline', async ({page, context}) => {
  await setup(page); page.on('dialog', d => d.accept()); await page.goto('./#library');
  const before = await page.evaluate(async () => {
    const {savedRecord} = await import('./tests/helpers/progress-records.js'), {completeSession, putDraft, listSessions} = await import('./src/storage/session-store.js');
    await completeSession(savedRecord({id: 'existing-completed', weight: 12.5, reps: 17}));
    const old = savedRecord({id: 'existing-draft'}); old.status = 'draft'; old.results = null; await putDraft(old); return listSessions();
  });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload(); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller)); await context.setOffline(true);
  await start(page); await page.clock.fastForward(1273000); await page.getByLabel('Thruster repetitions', {exact: true}).fill('99'); await page.getByRole('button', {name: 'Return to Today', exact: true}).click();
  expect(await records(page)).toEqual(before); await page.getByRole('link', {name: 'History', exact: true}).click(); await expect(page.locator('.library-grid > button')).toHaveCount(1);
  await page.locator('.library-grid > button').click(); await expect(page.getByText('KB Thruster completed repetitions: 17', {exact: true})).toBeVisible(); await page.reload(); await expect(page.getByText('KB Thruster completed repetitions: 17', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Progress', exact: true}).click(); const overview = page.getByRole('region', {name: 'Monthly overview', exact: true});
  await expect(overview.locator('.progress-metric').filter({hasText: 'Completed workouts'}).locator('dd')).toHaveText('1'); await expect(page.getByText('17 reps', {exact: true})).toBeVisible(); expect(await records(page)).toEqual(before);
  await context.setOffline(false);
});
