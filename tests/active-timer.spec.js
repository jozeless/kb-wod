import { test, expect } from '@playwright/test';
import { capture } from './helpers/ui-baseline.js';
import { installBeepSpy } from './helpers/timer-beeps.js';
import fs from 'node:fs/promises';

const approved = [['monday-paranoid', 3], ['tuesday-of-spades', 1], ['thursday-bells', 1], ['friday-to-black', 1]];
const artifactRoot = '/workspace/artifacts/ui-v2-08';
async function setup(page) {
  await page.addInitScript(() => { window.KB_SUPABASE_CONFIG = { url: '', publishableKey: '' }; });
  await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z'));
  page.on('dialog', d => d.accept());
}
async function start(page, id = 'monday-paranoid', version = 3) {
  await page.goto(`./#workout/${id}/${version}`);
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('3');
}
const offset = page => page.locator('.session-ring-fill').evaluate(n => Number(n.style.strokeDashoffset));
async function soundAbsent(page) {
  await expect(page.getByRole('button', { name: /Sound:/ })).toHaveCount(0);
  expect(await page.locator('.active-controls button').allTextContents()).toEqual([expect.stringMatching(/^(Pause|Resume)$/), 'End Workout']);
}

test('four approved WODs use live circular interval time, editable weights, nested Next and unchanged pause/draft/end actions', async ({ page }) => {
  await setup(page); await installBeepSpy(page);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const [id, version] of approved) {
    await start(page, id, version); await soundAbsent(page);
    await expect(page.locator('.session-state')).toHaveText('GET READY');
    expect(await offset(page)).toBe(0);
    await page.clock.runFor(1000); expect(await offset(page)).toBeCloseTo(100 / 3);
    await page.clock.runFor(2000); await expect(page.locator('.session-state')).toHaveText('WORK');
    await page.clock.runFor(12000);
    expect(await offset(page)).toBeCloseTo(20);
    const card = page.getByRole('region', { name: 'Current exercise', exact: true });
    await expect(card.locator('.active-exercise')).not.toBeEmpty();
    await expect(card.locator('.active-target')).not.toBeEmpty();
    await expect(card.locator('.session-next')).toHaveText(/^Next: .+/);
    await expect(page.locator('.active-panel > .session-next')).toHaveCount(0);
    const input = card.getByRole('spinbutton').first(); await input.fill('12.5');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const time = await page.getByRole('timer').textContent(), ring = await offset(page);
    await page.clock.fastForward(600000);
    await expect(page.getByRole('timer')).toHaveText(time); expect(await offset(page)).toBe(ring);
    await expect(page.locator('.session-state')).toHaveText('PAUSED');
    await expect(page.getByText('Draft saved locally.', { exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await soundAbsent(page); await expect(card.getByRole('spinbutton').first()).toHaveValue('12.5');
    await expect(page.getByRole('timer')).toHaveText(time); expect(await offset(page)).toBeCloseTo(ring);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.clock.runFor(48000); expect(await offset(page)).toBe(0);
    await expect(card.locator('.active-exercise')).not.toBeEmpty();
    await page.getByRole('button', { name: 'End Workout', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('work/rest, both automatic transitions, reps finisher, holding sides and AMRAP circuits retain their actual context', async ({ page }) => {
  await setup(page);
  await start(page); await page.clock.fastForward(483000);
  await expect(page.locator('.session-state')).toHaveText('TRANSITION');
  await expect(page.locator('.current-exercise-card input:visible')).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveText('00:05');
  await page.clock.runFor(5000); await expect(page.locator('.session-state')).toHaveText('WORK');
  await page.clock.runFor(40000); await expect(page.locator('.session-state')).toHaveText('REST');
  await expect(page.getByRole('timer')).toHaveText('00:20'); expect(await offset(page)).toBe(0);
  await page.clock.runFor(10000); expect(await offset(page)).toBe(50);
  await page.clock.runFor(10000); await expect(page.locator('.session-state')).toHaveText('WORK');
  await page.clock.fastForward(300000); await expect(page.locator('.session-state')).toHaveText('TRANSITION');
  await page.clock.runFor(5000); await expect(page.locator('.session-state')).toHaveText('WORK');
  await page.clock.fastForward(360000); await expect(page.locator('.session-state')).toHaveText('AMRAP REPS');
  await expect(page.locator('.active-exercise')).toHaveText('KB Thruster');
  await page.clock.fastForward(60000); await expect(page.getByRole('heading', { name: 'Workout Results', exact: true })).toBeVisible();
  await expect(page.locator('.hm-active-view')).toHaveCount(0); await expect(page.getByRole('spinbutton')).toHaveCount(13);
  await start(page, 'thursday-bells', 1); await page.clock.fastForward(1213000);
  await expect(page.locator('.holding-side')).toHaveText('Holding: RIGHT hand');
  await expect(page.locator('.current-exercise-card .session-next')).toHaveText('Next: LEFT hand (automatic switch)');
  await page.clock.runFor(30000); await expect(page.locator('.holding-side')).toHaveText('Holding: LEFT hand');
  expect(await offset(page)).toBe(0);
  for (const [id, version] of [['tuesday-of-spades', 1], ['friday-to-black', 1], ['hybrid-001-strength-sweat', 1]]) {
    await start(page, id, version); await page.clock.fastForward(963000);
    await expect(page.locator('.session-state')).toHaveText('AMRAP');
    const circuit = page.locator('.current-exercise-card').getByRole('list', { name: 'AMRAP circuit' });
    await expect(circuit.locator('li')).toHaveCount(3);
    await expect(page.locator('.current-exercise-card .session-next')).not.toBeEmpty();
    if (id === 'friday-to-black') await expect(circuit.getByRole('spinbutton')).toHaveCount(1);
    await soundAbsent(page);
  }
});

test('active controls, weights, ring and text fit all widths and 200% text, with keyboard and forced-colors support', async ({ page }) => {
  test.setTimeout(90000); await setup(page); await start(page); await page.clock.runFor(13000);
  async function fits() {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const boxes = await page.locator('.session-dial,.session-dial-face,.phase-clock,.current-exercise-card,.session-next,input,.active-controls button').evaluateAll(nodes => nodes.filter(n => n.checkVisibility()).map(n => {
      const r = n.getBoundingClientRect(); return { name: n.className, left: r.left, right: r.right, width: r.width, height: r.height };
    }));
    for (const box of boxes) { expect(box.left, String(box.name)).toBeGreaterThanOrEqual(0); expect(box.right, String(box.name)).toBeLessThanOrEqual(page.viewportSize().width); }
    for (const button of await page.locator('.active-controls button').all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    const end = page.getByRole('button', { name: 'End Workout', exact: true }); await expect(end).toBeInViewport();
    expect(await end.evaluate(n => n.getBoundingClientRect().bottom <= document.querySelector('nav').getBoundingClientRect().top)).toBe(true);
  }
  for (const width of [320, 390, 768, 1280]) { await page.setViewportSize({ width, height: 844 }); await fits(); }
  const zoom = await page.addStyleTag({ content: 'html{font-size:200%}' });
  await fs.mkdir(`${artifactRoot}/accessibility`, { recursive: true });
  for (const width of [320, 390, 768, 1280]) { await page.setViewportSize({ width, height: 844 }); await fits(); await page.screenshot({ path: `${artifactRoot}/accessibility/${width}-text-200.png`, fullPage: true, style: 'nav{visibility:hidden}' }); }
  await zoom.evaluate(n => n.remove());
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await page.setViewportSize({ width: 320, height: 844 }); await fits();
  const pause = page.getByRole('button', { name: 'Pause', exact: true }); await pause.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(pause).toBeFocused();
  expect(await pause.evaluate(n => getComputedStyle(n).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter'); await expect(page.locator('.session-state')).toHaveText('PAUSED');
  expect(await page.locator('.session-ring-fill').evaluate(n => getComputedStyle(n).stroke !== getComputedStyle(n.parentElement).backgroundColor)).toBe(true);
});

test('six active-state screenshot pairs at four widths change only the active view; completion remains identical', async ({ browser, baseURL }, info) => {
  test.setTimeout(240000);
  for (const width of info.project.name === 'mobile' ? [320, 390] : [768, 1280]) {
    for (const state of ['timer-countdown', 'timer', 'timer-rest', 'timer-amrap', 'timer-paused', 'timer-completed']) {
      const options = { artifactRoot, audit: true, todayEvidence: true, workoutId: state === 'timer-amrap' ? 'tuesday-of-spades' : 'monday-paranoid', workoutVersion: state === 'timer-amrap' ? 1 : 3 };
      const args = [browser, baseURL, { width, height: 844 }, String(width), state, true];
      const before = await capture(...args, { ...options, audit: false, activeBaseline: true }), after = await capture(...args, options);
      expect(after.png.equals(before.png), `${width}/${state}`).toBe(state === 'timer-completed');
      expect(after.headerPNG.equals(before.headerPNG)).toBe(true); expect(after.navPNG.equals(before.navPNG)).toBe(true);
    }
  }
});

test('Today, Library, details, results, history and account stay pixel-identical with the actual previous controllers', async ({ browser, baseURL }, info) => {
  test.setTimeout(180000);
  for (const width of info.project.name === 'mobile' ? [320, 390] : [768, 1280]) for (const state of ['today', 'library', 'details', 'results', 'history', 'history-list', 'account']) {
    const args = [browser, baseURL, { width, height: 844 }, String(width), state, true], options = { artifactRoot, audit: true, headerEvidence: true, todayEvidence: true };
    const before = await capture(...args, { ...options, activeBaseline: true }), after = await capture(...args, options);
    expect(after.png.equals(before.png), `${width}/${state}`).toBe(true);
    expect(after.protectedMetrics).toEqual(before.protectedMetrics); expect(after.contentPNG.equals(before.contentPNG)).toBe(true);
    expect(after.headerPNG.equals(before.headerPNG)).toBe(true); expect(after.navPNG.equals(before.navPNG)).toBe(true);
  }
});

test('v26 precaches the full presentation, starts all approved and historical timers offline, and restores muted draft audio on Resume', async ({ page, context }) => {
  await setup(page); await installBeepSpy(page); await page.goto('./#library');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload(); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cached = await page.evaluate(async () => { const cache = await caches.open('kb2-static-v26'); return Promise.all(['styles/hm-active.css', 'src/ui/active-presentation.js', 'assets/audio/start.wav', 'assets/audio/minute.wav'].map(async path => Boolean(await cache.match(new URL(path, document.baseURI))))); });
  expect(cached).toEqual([true, true, true, true]); await context.setOffline(true);
  for (const [id, version] of [...approved, ['focus-001-upper-abs', 1]]) {
    await start(page, id, version); await page.clock.runFor(13000); await expect(page.locator('.session-state')).toHaveText('WORK');
    expect(await offset(page)).toBeCloseTo(100 / 6); await soundAbsent(page);
  }
  await page.getByRole('button', { name: 'End Workout', exact: true }).click();
  await page.evaluate(async () => {
    const { findWorkout } = await import('./src/data/catalog.js'); const { createDraft } = await import('./src/domain/result-schemas.js'); const { putDraft } = await import('./src/storage/session-store.js');
    const r = createDraft(findWorkout('monday-paranoid', 3), { getItem: () => null }, 'existing-muted-draft'); r.soundEnabled = false; r.checkpointMs = 13000; await putDraft(r);
  });
  await page.goto('./#active/monday-paranoid/3?draft=existing-muted-draft'); await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const notes = await page.evaluate(() => window.beepNotes.map(n => n.frequency)); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect(await page.evaluate(() => window.beepNotes.map(n => n.frequency))).toEqual(notes);
  await page.clock.fastForward(49900); await page.clock.runFor(100);
  expect(await page.evaluate(() => window.beepNotes.map(n => n.frequency))).toEqual([...notes, 760]); await soundAbsent(page); await context.setOffline(false);
});
