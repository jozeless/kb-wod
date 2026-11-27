import { test, expect } from '@playwright/test';
import { mockCloud } from './helpers/cloud.js';

test.use({timezoneId: 'Europe/Amsterdam'});

const card = page => page.getByRole('region', {name: 'Weekly consistency', exact: true});
const goal = section => section.getByRole('combobox', {name: 'Weekly goal', exact: true});
const metric = (section, name) => section.getByText(name, {exact: true}).locator('xpath=following-sibling::dd');

async function seed(page, sessions) {
  await page.evaluate(async sessions => {
    const {classicIron} = await import('./src/data/classic-iron.js');
    const {createRoundAmrapSession} = await import('./src/domain/round-amrap-results.js');
    const {completeSession} = await import('./src/storage/session-store.js');
    for (const [id, day, activeDurationMs] of sessions) {
      const startedAt = `${day}T12:00:00.000Z`;
      await completeSession({
        ...createRoundAmrapSession(classicIron, null, id, startedAt), activeDurationMs,
        completedAt: new Date(Date.parse(startedAt) + 1200000).toISOString(), results: {completedRounds: 1},
      });
    }
  }, sessions);
}

test('weekly history and scheduled goals survive v44 cache replacement and offline restart', async ({page, context}) => {
  await page.addInitScript(() => { window.KB_SUPABASE_CONFIG = {url: '', publishableKey: ''}; });
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'));
  await page.goto('./manifest.webmanifest');
  await page.evaluate(async () => {
    const cache = await caches.open('kb2-static-v43');
    await cache.put(new URL('./', location.href), new Response('v43 fixture'));
  });
  const historicalDays = ['09', '10', '11', '12', '16', '17', '18', '19'];
  await seed(page, [...historicalDays.map(day => [`nov-${day}`, `2026-11-${day}`, 1200000]),
    ['first', '2026-11-23', 1200000], ['same-day', '2026-11-23', null]]);
  await page.goto('./#progress');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  expect(await page.evaluate(() => caches.keys())).toContain('kb2-static-v44');
  expect(await page.evaluate(() => caches.keys())).not.toContain('kb2-static-v43');

  const view = card(page);
  await expect(goal(view)).toHaveValue('4');
  await expect(metric(view, 'Active days this week')).toHaveText('1');
  await expect(metric(view, 'Saved workouts this week')).toHaveText('2');
  await expect(metric(view, 'Recorded training time this week')).toHaveText('20 min');
  await expect(view.getByText('Recorded durations available for 1 of 2 workouts.')).toBeVisible();
  await expect(metric(view, 'Goal completion')).toHaveText('25%');
  await expect(view.getByRole('progressbar')).toHaveAttribute('value', '25');
  await expect(metric(view, 'Current weekly streak')).toHaveText('2 weeks');
  await expect(metric(view, 'Longest weekly streak')).toHaveText('2 weeks');
  const days = view.getByRole('list', {name: 'Week of Nov 23, 2026'});
  await expect(days.getByRole('listitem')).toHaveCount(7);
  await expect(days.getByRole('listitem', {name: 'Nov 23, 2026: 2 completed workouts'})).toBeVisible();
  const history = view.getByRole('list', {name: 'Last eight completed weeks'});
  await expect(history.getByRole('listitem')).toHaveCount(8);
  await expect(history.getByRole('listitem').first()).toContainText('Week of Nov 16, 2026');
  await expect(history.getByRole('listitem').first()).toContainText('Goal met');
  await expect(history.getByRole('listitem').last()).toContainText('Goal not met');
  expect(await view.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);

  await context.setOffline(true);
  await goal(view).selectOption('1');
  await expect(view.getByText('Goal changes to 1 day on Nov 30, 2026.')).toBeVisible();
  await expect(metric(view, 'Goal this week')).toHaveText('4');
  await page.reload();
  await expect(goal(view)).toHaveValue('1');
  await expect(view.getByText('Goal changes to 1 day on Nov 30, 2026.')).toBeVisible();
  await expect(metric(view, 'Current weekly streak')).toHaveText('2 weeks');

  await page.clock.setFixedTime(new Date('2026-12-02T12:00:00Z'));
  await seed(page, [['next-monday', '2026-11-30', 1200000], ['next-tuesday', '2026-12-01', 1200000]]);
  await expect(metric(view, 'Goal this week')).toHaveText('1');
  await expect(metric(view, 'Active days this week')).toHaveText('2');
  await expect(metric(view, 'Goal completion')).toHaveText('200%');
  await expect(view.getByRole('progressbar')).toHaveAttribute('value', '100');
  await expect(view.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '2 of 1 active days (200%)');
  await expect(metric(view, 'Current weekly streak')).toHaveText('1 week');
  await expect(metric(view, 'Longest weekly streak')).toHaveText('2 weeks');
  await expect(history.getByRole('listitem').first()).toContainText('1 of 4 active days');
  await expect(history.getByRole('listitem').first()).toContainText('Goal not met');
  for (const name of ['Monthly overview', 'Monthly training calendar', 'Workout Performance', 'Classic Iron · Fastest Round — All Time']) {
    await expect(page.getByRole('region', {name, exact: true})).toBeVisible();
  }
});

test('empty weeks allow immediate changes and isolate saved goals for guest and each account', async ({page}) => {
  const cloud = await mockCloud(page);
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'));
  await page.goto('./#progress');
  const view = card(page);
  await expect(view.getByText('No saved workouts this week.')).toBeVisible();
  await expect(goal(view).locator('option')).toHaveCount(7);
  await expect(metric(view, 'Current weekly streak')).toHaveText('0 weeks');
  await expect(metric(view, 'Longest weekly streak')).toHaveText('0 weeks');
  await expect(metric(view, 'Goal completion')).toHaveText('0%');

  async function choose(value) {
    await goal(view).selectOption(String(value));
    await expect(metric(view, 'Goal this week')).toHaveText(String(value));
    await expect(view.getByText(/Goal changes to/)).toHaveCount(0);
  }
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

  await choose(7);
  await page.reload();
  await expect(goal(view)).toHaveValue('7');
  await login('alice@example.test');
  await expect(goal(view)).toHaveValue('4');
  await choose(2);
  await logout();
  await expect(goal(view)).toHaveValue('7');
  await login('bob@example.test');
  await expect(goal(view)).toHaveValue('4');
  await choose(6);
  await logout();
  await login('alice@example.test');
  await expect(goal(view)).toHaveValue('2');
  await page.reload();
  await expect(goal(view)).toHaveValue('2');
  expect(cloud.sessions.size).toBe(0);
  expect(cloud.calls.filter(call => call.path.includes('goal'))).toEqual([]);
});
