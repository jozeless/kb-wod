import {test, expect} from '@playwright/test';
import {installBeepSpy} from './helpers/timer-beeps.js';
const legacyId = 'historical-muted-recovery';
const notes = page => page.evaluate(() => beepNotes.map(n => n.frequency));
const stored = page => page.evaluate(async id => (await import('./src/storage/session-store.js')).getSession(id), legacyId);
const advance = async (page, ms) => { await page.clock.fastForward(ms - 100); await page.clock.runFor(100); };
async function legacy(page, id, version) {
  await installBeepSpy(page); await page.addInitScript(() => {
    window.KB_SUPABASE_CONFIG = {url: '', publishableKey: ''}; window.unlocks = [];
    const Audio = window.AudioContext; window.AudioContext = class extends Audio {
      state = 'suspended'; resume() { window.unlocks.push(navigator.userActivation.isActive); if (window.blockAudio) return Promise.reject(Error('Browser blocked audio')); this.state = 'running'; return Promise.resolve(); }
    };
  });
  await page.clock.install({time: new Date('2026-01-01T00:00:00Z')}); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z')); await page.goto('./#library');
  const before = await page.evaluate(async ({id, version, legacyId}) => {
    const {findWorkout} = await import('./src/data/catalog.js'), {createDraft} = await import('./src/domain/result-schemas.js'), {putDraft} = await import('./src/storage/session-store.js');
    const r = createDraft(findWorkout(id, version), {getItem: () => null}, legacyId); r.soundEnabled = false; r.hasStarted = true; r.checkpointMs = 13000; r.form.notes = 'Historical notes'; return putDraft(r);
  }, {id, version, legacyId});
  await page.goto(`./#active/${id}/${version}?draft=${legacyId}`); await expect(page.getByText('Ready when you are', {exact: true})).toBeVisible();
  expect(await notes(page)).toEqual([]); expect(await page.evaluate(() => unlocks)).toEqual([]); return before;
}
async function start(page) { await page.getByRole('button', {name: 'Start Workout', exact: true}).click(); await expect(page.getByRole('timer')).toHaveText('3'); await page.clock.runFor(3000); }

test('historical muted draft links stay inactive; fresh Start and normal Resume unlock audio without late cues or record changes', async ({page}) => {
  const before = await legacy(page, 'monday-paranoid', 3); await page.clock.fastForward(900000); expect(await notes(page)).toEqual([]);
  await start(page); expect(await notes(page)).toEqual([640]); await advance(page, 60000); expect(await notes(page)).toEqual([640, 760]);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, value: true}); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(180000); await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, value: false}); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await notes(page)).toEqual([640, 760]); await advance(page, 60000); expect(await notes(page)).toEqual([640, 760, 760]);
  await page.getByRole('button', {name: 'Pause', exact: true}).click(); await page.clock.fastForward(600000); await page.getByRole('button', {name: 'Resume', exact: true}).click(); expect(await notes(page)).toEqual([640, 760, 760]);
  await advance(page, 60000); expect(await notes(page)).toEqual([640, 760, 760, 760]); expect(await stored(page)).toEqual(before);
  page.on('dialog', d => d.accept()); await page.reload(); await expect(page.getByText('Ready when you are', {exact: true})).toBeVisible(); expect(await notes(page)).toEqual([]); expect(await page.evaluate(() => unlocks)).toEqual([]); expect(await stored(page)).toEqual(before);
});

test('fresh Hybrid keeps entered results and audio across later blocks and explicit final save, leaving a muted legacy draft unchanged', async ({page}) => {
  const before = await legacy(page, 'hybrid-001-strength-sweat', 2); await start(page); await page.clock.fastForward(390000); await advance(page, 30000); expect(await notes(page)).toEqual([640, 760]);
  await advance(page, 60000); await expect(page.getByRole('heading', {name: 'Strength Results', exact: true})).toBeVisible();
  const squat = page.getByRole('region', {name: 'KB Goblet Squat results', exact: true}); await squat.getByLabel('Actual Weight (kg)', {exact: true}).fill('12.5'); await squat.getByLabel('Round 1', {exact: true}).fill('8'); await squat.getByLabel('Round 2', {exact: true}).fill('0');
  await page.getByLabel('Workout notes', {exact: true}).fill('In-memory notes'); await page.clock.fastForward(600000); expect(await notes(page)).toEqual([640, 760]);
  await page.getByRole('button', {name: 'Continue to Conditioning', exact: true}).click(); await page.clock.runFor(3000); expect(await notes(page)).toEqual([640, 760, 1040]);
  await advance(page, 40000); expect(await notes(page)).toEqual([640, 760, 1040, 520, 520]); await advance(page, 20000); expect(await notes(page)).toEqual([640, 760, 1040, 520, 520, 1040]);
  await page.clock.fastForward(420000); await expect(page.getByRole('heading', {name: 'Conditioning Results', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Continue to Finisher', exact: true}).click(); await page.clock.runFor(3000); await advance(page, 240000);
  expect(await notes(page)).toEqual([640, 760, 1040, 520, 520, 1040, 1040, 620, 620]); expect(await page.evaluate(() => unlocks)).toEqual([true, true, true]);
  await page.getByRole('button', {name: 'Save Workout', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Workout saved', exact: true})).toBeVisible(); expect(await stored(page)).toEqual(before);
  const records = await page.evaluate(async () => (await import('./src/storage/session-store.js')).listSessions()); expect(records).toHaveLength(2); const final = records.find(r => r.status === 'completed');
  expect(final.activeDurationMs).toBe(1200000); expect(final.results.strength[0]).toEqual({exerciseId: 'goblet-squat', weightKg: 12.5, rounds: [8, 0, null, null]}); expect(final.results.notes).toBe('In-memory notes');
});

test('browser-blocked Start keeps the timer running; a later explicit Resume enables only future cues', async ({page}) => {
  const before = await legacy(page, 'monday-paranoid', 3); await page.evaluate(() => { window.blockAudio = true; }); await start(page); await advance(page, 60000); expect(await notes(page)).toEqual([]);
  await page.getByRole('button', {name: 'Pause', exact: true}).click(); await page.evaluate(() => { window.blockAudio = false; }); await page.getByRole('button', {name: 'Resume', exact: true}).click(); expect(await notes(page)).toEqual([]);
  await advance(page, 60000); expect(await notes(page)).toEqual([760]); expect(await page.evaluate(() => unlocks)).toEqual([true, true]); expect(await stored(page)).toEqual(before); await expect(page.getByRole('button', {name: /Sound:/})).toHaveCount(0);
});
