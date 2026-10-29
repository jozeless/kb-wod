import { test, expect } from '@playwright/test';
import { installBeepSpy } from './helpers/timer-beeps.js';

const draftId = 'historical-muted-recovery';
const notes = page => page.evaluate(() => window.beepNotes.map(n => n.frequency));
const stored = page => page.evaluate(async id => {
  const { getSession } = await import('./src/storage/session-store.js'); return getSession(id);
}, draftId);
const saved = page => expect(page.getByText('Draft saved locally.', { exact: true })).toBeVisible();
const advanceBoundary = async (page, ms) => { await page.clock.fastForward(ms - 100); await page.clock.runFor(100); };

async function recover(page, id, version, checkpointMs) {
  await installBeepSpy(page);
  await page.addInitScript(() => {
    window.KB_SUPABASE_CONFIG = { url: '', publishableKey: '' };
    window.recoveryUnlocks = [];
    const Audio = window.AudioContext;
    window.AudioContext = class extends Audio {
      state = 'suspended';
      resume() {
        window.recoveryUnlocks.push(navigator.userActivation.isActive);
        if (window.blockRecoveryAudio) return Promise.reject(new Error('Browser blocked audio'));
        this.state = 'running'; return Promise.resolve();
      }
    };
  });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('./#library');
  const before = await page.evaluate(async ({ id, version, checkpointMs, draftId }) => {
    const { findWorkout } = await import('./src/data/catalog.js');
    const { createDraft } = await import('./src/domain/result-schemas.js');
    const { putDraft } = await import('./src/storage/session-store.js');
    const r = createDraft(findWorkout(id, version), { getItem: () => null }, draftId);
    r.soundEnabled = false; r.hasStarted = true; r.checkpointMs = checkpointMs; r.activeDurationMs = checkpointMs - 3000;
    r.form.notes = 'Previously recorded entries';
    if (r.form.weights) r.form.weights['push-press'] = '12.5';
    else Object.assign(r.form.strength['goblet-squat'], { weightKg: '12.5', round1: '8', round2: '0' });
    return putDraft(r);
  }, { id, version, checkpointMs, draftId });
  await page.goto(`./#active/${id}/${version}?draft=${draftId}`);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible(); await saved(page);
  await expect(page.getByRole('button', { name: /Sound:/ })).toHaveCount(0);
  expect(await notes(page)).toEqual([]); expect(await page.evaluate(() => window.recoveryUnlocks)).toEqual([]);
  const after = await stored(page);
  for (const key of ['form', 'results', 'checkpointMs', 'activeDurationMs', 'completedBlocks', 'workoutSnapshot', 'hasStarted', 'soundEnabled']) expect(after[key]).toEqual(before[key]);
  return before;
}

test('historical muted continuous draft enables audio only on Resume and never replays missed cues', async ({ page }) => {
  const before = await recover(page, 'monday-paranoid', 3, 13000);
  const clock = page.getByRole('timer'); await expect(clock).toHaveText('00:50');
  await page.clock.fastForward(900000); await expect(clock).toHaveText('00:50'); expect(await notes(page)).toEqual([]);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await saved(page);
  expect(await notes(page)).toEqual([]); expect(await page.evaluate(() => window.recoveryUnlocks)).toEqual([true]);
  const resumed = await stored(page); expect(resumed.soundEnabled).toBe(true);
  for (const key of ['form', 'results', 'checkpointMs', 'activeDurationMs', 'completedBlocks', 'workoutSnapshot', 'hasStarted']) expect(resumed[key]).toEqual(before[key]);
  await advanceBoundary(page, 50000); expect(await notes(page)).toEqual([760]);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(180000);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await notes(page)).toEqual([760]);
  await advanceBoundary(page, 60000); expect(await notes(page)).toEqual([760, 760]);
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); await saved(page);
  page.on('dialog', d => d.accept()); await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  expect((await stored(page)).soundEnabled).toBe(true); expect(await notes(page)).toEqual([]);
  expect(await page.evaluate(() => window.recoveryUnlocks)).toEqual([]);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); expect(await notes(page)).toEqual([]);
  await advanceBoundary(page, 60000); expect(await notes(page)).toEqual([760]);
  expect((await stored(page)).form).toEqual(before.form);
});

test('historical muted Hybrid draft retains results and audio through later blocks and final save', async ({ page }) => {
  const before = await recover(page, 'hybrid-001-strength-sweat', 2, 393000);
  await expect(page.getByRole('timer')).toHaveText('00:30');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); expect(await notes(page)).toEqual([]);
  await advanceBoundary(page, 30000); expect(await notes(page)).toEqual([760]);
  await advanceBoundary(page, 60000);
  await expect(page.getByRole('heading', { name: 'Strength Results', exact: true })).toBeVisible(); await saved(page);
  expect(await notes(page)).toEqual([760]); expect((await stored(page)).form).toEqual(before.form);
  await page.clock.fastForward(600000); expect(await notes(page)).toEqual([760]);
  await page.getByRole('button', { name: 'Continue to Conditioning', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('3'); await page.clock.runFor(3000); expect(await notes(page)).toEqual([760, 1040]);
  await advanceBoundary(page, 40000); expect(await notes(page)).toEqual([760, 1040, 520, 520]);
  await advanceBoundary(page, 20000); expect(await notes(page)).toEqual([760, 1040, 520, 520, 1040]);
  await page.clock.fastForward(420000);
  await expect(page.getByRole('heading', { name: 'Conditioning Results', exact: true })).toBeVisible(); await saved(page);
  await page.getByRole('button', { name: 'Continue to Finisher', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('3'); await page.clock.runFor(3000);
  expect(await notes(page)).toEqual([760, 1040, 520, 520, 1040, 1040]);
  await advanceBoundary(page, 240000);
  await expect(page.getByRole('heading', { name: 'Finisher Results', exact: true })).toBeVisible(); await saved(page);
  expect(await notes(page)).toEqual([760, 1040, 520, 520, 1040, 1040, 620, 620]);
  expect(await page.evaluate(() => window.recoveryUnlocks)).toEqual([true, true, true]);
  await page.getByRole('button', { name: 'Save Workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout saved', exact: true })).toBeVisible();
  const final = await stored(page); expect(final.status).toBe('completed'); expect(final.activeDurationMs).toBe(1200000);
  expect(final.form).toEqual(before.form); expect(final.workoutSnapshot).toEqual(before.workoutSnapshot); expect(final.soundEnabled).toBe(true);
  expect(final.results.strength[0]).toEqual({ exerciseId: 'goblet-squat', weightKg: 12.5, rounds: [8, 0, null, null] });
  expect(final.results.notes).toBe(before.form.notes);
  await expect(page.getByRole('button', { name: /Sound:/ })).toHaveCount(0);
});

test('browser-blocked historical Resume keeps timing/results intact and retries audio on the next Resume gesture', async ({ page }) => {
  const before = await recover(page, 'monday-paranoid', 3, 13000);
  await page.evaluate(() => { window.blockRecoveryAudio = true; });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000); await expect(page.getByRole('timer')).toHaveText('00:49');
  await advanceBoundary(page, 49000); expect(await notes(page)).toEqual([]);
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); await saved(page);
  expect((await stored(page)).form).toEqual(before.form); expect((await stored(page)).activeDurationMs).toBe(60000);
  await page.evaluate(() => { window.blockRecoveryAudio = false; });
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); expect(await notes(page)).toEqual([]);
  await advanceBoundary(page, 60000); expect(await notes(page)).toEqual([760]);
  expect(await page.evaluate(() => window.recoveryUnlocks)).toEqual([true, true]);
  expect((await stored(page)).soundEnabled).toBe(true);
  await expect(page.getByRole('button', { name: /Sound:/ })).toHaveCount(0);
});
