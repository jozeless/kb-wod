import { test, expect } from '@playwright/test';
import { mockCloud } from './helpers/cloud.js';

test.use({timezoneId: 'Europe/Amsterdam'});

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const performance = page => page.getByRole('region', {name: 'Workout Performance', exact: true});
const metric = (section, name) => section.getByText(name, {exact: true}).locator('xpath=following-sibling::dd');
const records = page => page.evaluate(async () => (await import('./src/storage/session-store.js')).listSessions());

async function sessions(page, data, storeLocally) {
  return page.evaluate(async ({data, storeLocally}) => {
    const {findWorkout} = await import('./src/data/catalog.js');
    const {createRoundAmrapSession} = await import('./src/domain/round-amrap-results.js');
    const {completeSession} = await import('./src/storage/session-store.js');
    const sessions = [];
    for (const [id, workoutId, durationSeconds, day, completedRounds, roundTimesMs, ownerId] of data) {
      const workout = structuredClone(findWorkout(workoutId, 1));
      workout.durationSeconds = durationSeconds;
      workout.phases[0].durationSeconds = durationSeconds;
      workout.phases[0].timer.durationSeconds = durationSeconds;
      const startedAt = `${day}T12:00:00.000Z`;
      const activeDurationMs = durationSeconds * 1000;
      const record = {...createRoundAmrapSession(workout, null, id, startedAt), status: 'completed', ownerId: ownerId ?? null,
        completedAt: new Date(Date.parse(startedAt) + activeDurationMs).toISOString(), activeDurationMs,
        results: {completedRounds, ...(roundTimesMs === null ? {} : {roundTimesMs})}};
      sessions.push(storeLocally ? await completeSession(record) : record);
    }
    return sessions;
  }, {data, storeLocally});
}

test('filters comparable workouts, shows accessible chart data, and keeps history offline after v43 activation', async ({page, context}) => {
  await page.addInitScript(() => { window.KB_SUPABASE_CONFIG = {url: '', publishableKey: ''}; });
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'));
  await page.goto('./manifest.webmanifest');
  await page.evaluate(async () => {
    const cache = await caches.open('kb2-static-v42');
    await cache.put(new URL('./', location.href), new Response('v42 fixture'));
  });
  await sessions(page, [
    ['recent', 'core-blast', 600, '2026-11-24', 4, null],
    ['early', 'core-blast', 600, '2026-07-10', 2, [80000, 100000]],
    ['best', 'core-blast', 600, '2026-09-01', 6, [50000, 60000, 70000, 80000, 90000, 100000]],
    ['old-zero', 'core-blast', 300, '2026-10-15', 0, []],
    ['old-late', 'core-blast', 300, '2026-10-16', 3, null],
    ['beef', 'saturday-morning-beef', 300, '2026-08-01', 1, [45000]],
    ['invalid', 'core-blast', 600, '2026-11-26', 99, [1000]],
  ], true);
  const original = await records(page);
  await page.goto('./#progress');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  expect(await page.evaluate(() => caches.keys())).toContain('kb2-static-v43');
  expect(await page.evaluate(() => caches.keys())).not.toContain('kb2-static-v42');
  await context.setOffline(true);
  await page.reload();

  const view = performance(page);
  const workout = view.getByRole('combobox', {name: 'Workout', exact: true});
  const duration = view.getByRole('combobox', {name: 'Workout duration', exact: true});
  const period = view.getByRole('combobox', {name: 'Period', exact: true});
  const mode = view.getByRole('combobox', {name: 'Chart metric', exact: true});
  await expect(workout.locator('option')).toHaveText(['Classic Iron', 'Core Blast', 'Iron Twist', 'Saturday Morning Beef', 'Iron Arms']);
  await expect(view.getByText('No recorded sessions for this workout.')).toBeVisible();
  await workout.selectOption('core-blast');
  await expect(duration.locator('option')).toHaveText(['10 min', '5 min']);
  await expect(duration).toHaveValue('600');
  await expect(metric(view, 'Completed sessions')).toHaveText('3');
  await expect(metric(view, 'First recorded result')).toContainText('2 rounds');
  await expect(metric(view, 'Latest recorded result')).toContainText('4 rounds');
  await expect(metric(view, 'Best recorded result')).toContainText('6 rounds');
  await expect(metric(view, 'Average completed rounds')).toHaveText('4');
  await expect(metric(view, 'Fastest recorded round')).toHaveText('00:50');
  await expect(metric(view, 'Latest session average round time')).toHaveText('Not recorded');
  await expect(metric(view, 'Completed-round improvement')).toHaveText('Up 100%');

  const roundsChart = view.getByRole('img', {name: /Completed rounds by session date/});
  await expect(roundsChart.locator('circle')).toHaveCount(3);
  await expect(roundsChart.locator('.progress-latest-point title')).toContainText('· 4 · Latest plotted result');
  await view.getByText('View chart data', {exact: true}).click();
  await expect(view.getByRole('table').locator('tbody td')).toHaveText(['2', '6', '4 · Latest plotted result']);
  const layout = await view.evaluate(element => ({width: element.clientWidth, content: element.scrollWidth}));
  expect(layout.content).toBeLessThanOrEqual(layout.width);

  await mode.selectOption('averageRoundTimeMs');
  await expect(view.getByRole('img', {name: /Average round time by session date/}).locator('circle')).toHaveCount(2);
  await view.getByText('View chart data', {exact: true}).click();
  await expect(view.getByRole('table').locator('tbody td')).toHaveText(['01:30', '01:15 · Latest plotted result']);

  await period.selectOption('90');
  await expect(metric(view, 'Completed sessions')).toHaveText('2');
  await expect(metric(view, 'Completed-round improvement')).toHaveText('Down 33.3%');
  await expect(view.getByText('Only one result is available for this chart.')).toBeVisible();
  await period.selectOption('30');
  await expect(metric(view, 'Completed sessions')).toHaveText('1');
  await expect(metric(view, 'Completed-round improvement')).toHaveText('Unavailable with one session');
  await expect(view.getByText('No valid round times are recorded for this selection.')).toBeVisible();

  await duration.selectOption('300');
  await expect(view.getByText('No results within the selected period.')).toBeVisible();
  await period.selectOption('all');
  await expect(duration).toHaveValue('300');
  await expect(metric(view, 'First recorded result')).toContainText('0 rounds');
  await expect(metric(view, 'Completed-round improvement')).toHaveText('Unavailable with a zero starting result');
  await workout.selectOption('saturday-morning-beef');
  await expect(duration.locator('option')).toHaveText(['5 min']);
  await expect(metric(view, 'Latest session average round time')).toHaveText('00:45');
  await workout.selectOption('iron-twist');
  await expect(duration).toBeHidden();
  await expect(view.getByText('No recorded sessions for this workout.')).toBeVisible();

  for (const name of ['Monthly overview', 'Weekly consistency', 'Core Blast · Fastest Round — All Time']) {
    await expect(page.getByRole('region', {name, exact: true})).toBeVisible();
  }
  await page.getByRole('button', {name: '← Previous month', exact: true}).click();
  await expect(workout).toHaveValue('iron-twist');
  expect(await records(page)).toEqual(original);
});

test('performance reflects Supabase downloads and isolates accounts and guest data', async ({page}) => {
  const db = await mockCloud(page);
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'));
  await page.goto('./manifest.webmanifest');
  const remote = await sessions(page, [
    ['00000000-0000-4000-8000-000000000041', 'classic-iron', 1200, '2026-11-09', 3, [80000, 80000, 80000], alice],
    ['00000000-0000-4000-8000-000000000042', 'classic-iron', 1200, '2026-11-10', 5, [60000, 60000, 60000, 60000, 60000], bob],
  ], false);
  for (const record of remote) {
    db.sessions.set(`${record.ownerId}:${record.id}`, {
      id: record.id, user_id: record.ownerId, workout_id: record.workoutId, workout_version: record.workoutVersion,
      workout_snapshot: record.workoutSnapshot, results: record.results, session_data: record,
    });
  }
  await sessions(page, [['guest', 'classic-iron', 1200, '2026-11-08', 1, [90000]]], true);
  async function login(email) {
    await page.goto('./#account');
    await page.getByLabel('Email', {exact: true}).fill(email);
    await page.getByLabel('Password', {exact: true}).fill('fixture-password');
    await page.getByRole('button', {name: 'Log in', exact: true}).click();
    await expect(page.locator('.cloud-indicator')).toHaveText('Synced');
    await page.goto('./#progress');
  }
  async function logout() {
    await page.goto('./#account');
    await page.getByRole('button', {name: 'Log out', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Log in', exact: true})).toBeVisible();
    await page.goto('./#progress');
  }

  const view = performance(page);
  await login('alice@example.test');
  await expect(metric(view, 'Completed sessions')).toHaveText('2');
  await expect(metric(view, 'Latest recorded result')).toContainText('3 rounds');
  await expect(metric(view, 'Fastest recorded round')).toHaveText('01:20');
  await logout();
  await expect(metric(view, 'Completed sessions')).toHaveText('1');
  await expect(metric(view, 'Fastest recorded round')).toHaveText('01:30');
  await login('bob@example.test');
  await expect(metric(view, 'Completed sessions')).toHaveText('2');
  await expect(metric(view, 'Latest recorded result')).toContainText('5 rounds');
  await expect(metric(view, 'Fastest recorded round')).toHaveText('01:00');
  expect(db.sessions.size).toBe(2);
  expect((await records(page)).map(record => record.ownerId)).toEqual([bob, alice, null]);
});
