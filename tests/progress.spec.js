import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const artifactRoot = '/workspace/artifacts/progress-analytics';
const A = {id: 'progress-account-a', email: 'progress-a@example.test', email_confirmed_at: '2026-01-01'};
const B = {id: 'progress-account-b', email: 'progress-b@example.test', email_confirmed_at: '2026-01-01'};
async function setup(page, cloud = false) {
  await page.addInitScript(config => { window.KB_SUPABASE_CONFIG = config; }, cloud ? {url: 'https://progress-test.supabase.co', publishableKey: 'sb_publishable_fixture'} : {url: '', publishableKey: ''});
  await page.clock.install({time: new Date('2026-10-29T12:00:00Z')}); await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z'));
}
const ready = page => expect(page.getByRole('region', {name: 'Monthly overview', exact: true})).toBeVisible();
const overview = page => page.getByRole('region', {name: 'Monthly overview', exact: true});
async function value(page, label, expected) {
  await expect(overview(page).locator('.progress-metric').filter({has: page.locator('dt', {hasText: new RegExp(`^${label}$`)})}).locator('dd')).toHaveText(String(expected));
}
async function seed(page) {
  await page.evaluate(async () => {
    const {progressRecords, savedRecord} = await import('./tests/helpers/progress-records.js');
    const {completeSession, putDraft} = await import('./src/storage/session-store.js');
    for (const record of progressRecords()) await completeSession(record);
    const draft = savedRecord({id: 'excluded-draft', weight: 24, reps: 100}); draft.status = 'draft'; draft.results = null; draft.checkpointMs = 13000; await putDraft(draft);
    localStorage.setItem('kb2.weekly-plan.v1', JSON.stringify({Monday: {workoutId: 'monday-paranoid', version: 3}}));
    localStorage.setItem('kb2.weight-preference.v1:monday-paranoid:3:push-press', '24');
  });
}
const records = page => page.evaluate(async () => (await import('./src/storage/session-store.js')).listSessions());
async function reloadProgress(page) { await page.goto('./#today'); await page.getByRole('link', {name: 'Progress', exact: true}).click(); await ready(page); }
async function mockCloud(page) {
  await page.route('https://progress-test.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), body = request.postDataJSON();
    const user = body?.email === B.email || request.headers().authorization === 'Bearer token-b' ? B : A;
    let data = url.pathname === '/auth/v1/token' ? {access_token: user === A ? 'token-a' : 'token-b', refresh_token: 'fixture-refresh', expires_in: 3600, user} : url.pathname === '/auth/v1/user' ? user : [];
    if (url.pathname === '/rest/v1/kb_training_sessions' && request.method() === 'GET') {
      const {savedRecord} = await import('./helpers/progress-records.js');
      const record = savedRecord({id: `downloaded-${user.id}`, ownerId: user.id, weight: user === A ? 14 : 22, reps: user === A ? 41 : 73});
      data = [{id: record.id, user_id: user.id, workout_id: record.workoutId, workout_version: record.workoutVersion, workout_snapshot: record.workoutSnapshot, results: record.results, session_data: record}];
    }
    await route.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,apikey,content-type,prefer', 'access-control-allow-methods': 'GET,POST,OPTIONS'}, body: JSON.stringify(data)});
  });
}
const login = (page, user) => page.evaluate(async user => { await (await import('./src/cloud/runtime.js')).auth.login(user.email, 'fixture-password'); }, user);

test('truthful loading/empty states and arbitrary past/future month navigation use the local calendar', async ({page}) => {
  await setup(page); await page.goto('./#progress'); await ready(page);
  await expect(page.getByRole('heading', {name: 'October 2026', exact: true})).toBeVisible();
  await expect(page.getByText('No completed workouts this month', {exact: true})).toBeVisible();
  await value(page, 'Completed workouts', 0); await value(page, 'Active duration', 'No sessions');
  await expect(page.getByText('No recorded weights', {exact: true})).toBeVisible(); await expect(page.getByText('No recorded performance counts', {exact: true})).toBeVisible();
  for (let i = 0; i < 10; i++) await page.getByRole('button', {name: '← Previous month', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'December 2025', exact: true})).toBeVisible(); await ready(page);
  await expect(page.locator('.progress-days time')).toHaveCount(31);
  for (let i = 0; i < 12; i++) await page.getByRole('button', {name: 'Next month →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'December 2026', exact: true})).toBeVisible(); await ready(page); await value(page, 'Completed workouts', 0);
  await expect(page.getByRole('link', {name: 'Progress', exact: true})).toHaveAttribute('aria-current', 'page');
});

test('completed sessions drive month totals, days, weights, exact chart/table and separate performance counts without writes', async ({page}) => {
  await setup(page); await page.goto('./#today'); await seed(page); const before = await records(page);
  const preferences = await page.evaluate(() => JSON.stringify(localStorage)); await reloadProgress(page);
  await value(page, 'Completed workouts', 5); await value(page, 'Active duration', '1 h 43 min 30 s'); await value(page, 'Active days', 4); await value(page, 'Active weeks', 2);
  await expect(page.locator('.progress-days .is-trained')).toHaveCount(4);
  await expect(page.getByRole('listitem', {name: 'Oct 12, 2026: 2 completed workouts', exact: true})).toBeVisible();
  const select = page.getByLabel('Recorded exercise', {exact: true});
  await select.selectOption({label: 'KB Push Press · Monday Paranoid · Upper'});
  await expect(page.getByRole('img', {name: /KB Push Press.*recorded weight/})).toBeVisible();
  await expect(page.locator('.progress-weight-summary')).toContainText('Latest recorded16 kg'); await expect(page.locator('.progress-weight-summary')).toContainText('Historical maximum16 kg');
  await expect(page.locator('.progress-chart circle')).toHaveCount(2); await page.getByText('View recorded weights (2)', {exact: true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(2); expect(await page.locator('tbody td:nth-child(2)').allTextContents()).toEqual(['12', '16']);
  await select.selectOption({label: 'KB Floor Press · Upper Body + ABS · Upper'}); await expect(page.locator('.progress-weight-summary')).toContainText('8 kg');
  const performance = page.getByRole('region', {name: 'Recorded performance', exact: true});
  for (const text of ['37 reps', '61 steps', '3 rounds', '4 rounds', '6 reps', '5 reps']) await expect(performance.getByText(text, {exact: true})).toBeVisible();
  await expect(performance).toContainText('Floor Press final set · left arm'); await expect(performance).toContainText('8 × KB Thrusters / 8 × Hollow-Ups / 10 × Jump Squats');
  await page.getByRole('button', {name: '← Previous month', exact: true}).click(); await ready(page); await value(page, 'Completed workouts', 1); await value(page, 'Active duration', '20 min');
  await page.getByRole('button', {name: '← Previous month', exact: true}).click(); await ready(page); await value(page, 'Completed workouts', 0); await expect(performance.getByText('37 reps', {exact: true})).toBeVisible();
  expect(await records(page)).toEqual(before); expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(preferences);
});

test('unknown durations and malformed final measurements stay unknown while valid explicit zeros are displayed', async ({page}) => {
  await setup(page); await page.goto('./#today');
  await page.evaluate(async () => {
    const {savedRecord} = await import('./tests/helpers/progress-records.js'), {completeSession} = await import('./src/storage/session-store.js');
    const missing = savedRecord({id: 'missing'}); missing.activeDurationMs = null; missing.results.exerciseWeights = {'push-press': null}; missing.results.finisher.reps = '17'; await completeSession(missing);
  });
  await reloadProgress(page); await value(page, 'Completed workouts', 1); await value(page, 'Active duration', 'Not recorded');
  await expect(page.getByText('Active duration is recorded for 0 of 1 sessions. 1 missing or invalid duration entry is excluded.', {exact: true})).toBeVisible();
  await expect(page.getByText('No recorded weights', {exact: true})).toBeVisible(); await expect(page.getByText('No recorded performance counts', {exact: true})).toBeVisible();
  await page.evaluate(async () => {
    const {savedRecord} = await import('./tests/helpers/progress-records.js'), {completeSession} = await import('./src/storage/session-store.js');
    await completeSession(savedRecord({id: 'zero', weight: 0, reps: 0}));
  });
  await reloadProgress(page); await value(page, 'Completed workouts', 2); await value(page, 'Active duration', '21 min 10 s');
  await expect(page.locator('.progress-weight-summary')).toContainText('Latest recorded0 kg'); await expect(page.getByText('0 reps', {exact: true})).toBeVisible();
});

test('guest/imported/account sessions remain isolated through actual auth changes, repeat downloads, sign-out and offline recovery', async ({page, context}) => {
  await setup(page, true); await mockCloud(page); await page.goto('./#today');
  await page.evaluate(async () => { const {savedRecord} = await import('./tests/helpers/progress-records.js'); await (await import('./src/storage/session-store.js')).completeSession(savedRecord({id: 'unclaimed-guest', reps: 7})); });
  await reloadProgress(page); await value(page, 'Completed workouts', 1); await expect(page.getByText('7 reps', {exact: true})).toBeVisible();
  await login(page, A); await expect.poll(async () => (await records(page)).filter(r => r.ownerId === A.id).length).toBe(1);
  await value(page, 'Completed workouts', 2); await expect(page.getByText('48 reps', {exact: true})).toBeVisible();
  await page.evaluate(async () => { const {sync} = await import('./src/cloud/runtime.js'); await sync.sync(); await sync.sync(); });
  await value(page, 'Completed workouts', 2); const beforeB = await records(page);
  await login(page, B); await expect.poll(async () => (await records(page)).filter(r => r.ownerId === B.id).length).toBe(1);
  await value(page, 'Completed workouts', 2); await expect(page.getByText('80 reps', {exact: true})).toBeVisible(); await expect(page.getByText('48 reps', {exact: true})).toHaveCount(0);
  const all = await records(page); expect(all.filter(r => beforeB.some(old => old.id === r.id))).toEqual(beforeB);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload(); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  // No auth route may fulfill an otherwise-offline request: exercise cached identity.
  await page.unroute('https://progress-test.supabase.co/**');
  await context.setOffline(true); await page.reload(); await ready(page); await expect(page.getByText('80 reps', {exact: true})).toBeVisible();
  await expect(page.locator('.cloud-indicator')).toContainText('Offline');
  await page.evaluate(async () => (await import('./src/cloud/runtime.js')).auth.logout()); await ready(page); await value(page, 'Completed workouts', 1); await expect(page.getByText('7 reps', {exact: true})).toBeVisible();
  expect(await records(page)).toEqual(all); await context.setOffline(false);
});

test('in-flight old-account reads are discarded and detached Progress views cannot publish late data', async ({page}) => {
  await setup(page, true); await mockCloud(page);
  await page.route('**/src/storage/session-store.js', async route => {
    const response = await route.fetch(); let source = (await response.text()).replace('export async function listSessions(workoutId)', 'async function originalListSessions(workoutId)');
    source += `\nexport async function listSessions(workoutId) { const rows = await originalListSessions(workoutId); if (window.holdProgressOwner === currentUserId() && location.hash === '#progress') await new Promise(resolve => { (window.progressReleases ||= []).push(resolve); }); return rows; }\n`;
    await route.fulfill({response, body: source});
  });
  await page.goto('./#today'); await login(page, A); await expect.poll(async () => (await records(page)).length).toBe(1);
  await page.evaluate(id => { window.holdProgressOwner = id; }, A.id);
  await page.getByRole('link', {name: 'Progress', exact: true}).click(); await expect(page.getByText('Loading saved sessions…', {exact: true})).toBeVisible();
  await page.waitForFunction(() => window.progressReleases?.length > 0); await page.evaluate(() => { window.oldProgressRoot = document.querySelector('.hm-progress'); });
  await login(page, B); await value(page, 'Completed workouts', 1); await expect(page.getByText('73 reps', {exact: true})).toBeVisible();
  await page.evaluate(() => { window.holdProgressOwner = undefined; for (const release of window.progressReleases) release(); });
  await expect(page.getByText('41 reps', {exact: true})).toHaveCount(0); await expect(page.getByText('73 reps', {exact: true})).toBeVisible();
  expect(await page.evaluate(() => ({connected: oldProgressRoot.isConnected, content: oldProgressRoot.querySelector('.progress-content').textContent}))).toEqual({connected: false, content: ''});
});

test('cross-tab auth replacement clears old-account data while new identity verification is pending', async ({page}) => {
  await setup(page, true); await mockCloud(page); await page.goto('./#today'); await login(page, A);
  await expect.poll(async () => (await records(page)).length).toBe(1); await reloadProgress(page);
  await expect(page.getByText('41 reps', {exact: true})).toBeVisible();
  let release; const pending = new Promise(resolve => { release = resolve; });
  await page.route('https://progress-test.supabase.co/auth/v1/user', async route => {
    if (route.request().headers().authorization === 'Bearer token-b') { await pending; await route.fulfill({json: B}); }
    else await route.fallback();
  });
  await page.evaluate(user => {
    const key = 'kb2.cloud.auth.v1', oldValue = localStorage.getItem(key);
    const newValue = JSON.stringify({access_token: 'token-b', refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, user});
    localStorage.setItem(key, newValue); dispatchEvent(new StorageEvent('storage', {key, oldValue, newValue}));
  }, B);
  await expect(page.getByText('41 reps', {exact: true})).toHaveCount(0); await ready(page); await value(page, 'Completed workouts', 0);
  release(); await expect(page.getByText('73 reps', {exact: true})).toBeVisible(); await value(page, 'Completed workouts', 1);
});

test('unavailable IndexedDB shows a retryable error instead of fabricated zero statistics', async ({page}) => {
  await setup(page); await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', {get() { throw new Error('Fixture: storage unavailable'); }}); });
  await page.goto('./#progress'); await expect(page.getByRole('heading', {name: 'Progress unavailable', exact: true})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Monthly overview', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Retry loading sessions', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Progress unavailable', exact: true})).toBeVisible();
  await expect(page.getByText('No completed workouts this month', {exact: true})).toHaveCount(0);
  await page.getByRole('link', {name: 'Library', exact: true}).click(); await expect(page.locator('.workout-card')).toHaveCount(4);
});

test('Progress modules, history calculations and month controls work offline with unchanged saved sessions', async ({page, context}) => {
  await setup(page); await page.goto('./#today'); await seed(page); const before = await records(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload(); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  for (const file of ['./src/domain/progress-analytics.js', './src/ui/progress.js', './styles/hm-progress.css']) expect(await page.evaluate(async file => Boolean(await (await caches.open('kb2-static-v29')).match(new URL(file, document.baseURI))), file)).toBe(true);
  await context.setOffline(true); await page.reload(); await page.getByRole('link', {name: 'Progress', exact: true}).click(); await ready(page); await value(page, 'Completed workouts', 5);
  await page.getByLabel('Recorded exercise', {exact: true}).selectOption({label: 'KB Push Press · Monday Paranoid · Upper'}); await expect(page.locator('.progress-chart circle')).toHaveCount(2);
  await page.getByRole('button', {name: '← Previous month', exact: true}).click(); await ready(page); await value(page, 'Completed workouts', 1);
  expect(await records(page)).toEqual(before); await context.setOffline(false);
});

test('four widths, 200% text, keyboard, chart equivalents, footer clearance and contrast remain usable', async ({page}, info) => {
  test.setTimeout(120000); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await setup(page); await page.goto('./#today'); await seed(page); await reloadProgress(page);
  await page.getByLabel('Recorded exercise', {exact: true}).selectOption({label: 'KB Push Press · Monday Paranoid · Upper'});
  await fs.mkdir(artifactRoot, {recursive: true});
  for (const scale of [100, 200]) {
    const style = scale === 200 ? await page.addStyleTag({content: 'html{font-size:200%}'}) : null;
    for (const width of info.project.name === 'mobile' ? [320, 390] : [768, 1280]) {
      await page.setViewportSize({width, height: 844}); await page.getByRole('button', {name: '← Previous month', exact: true}).focus();
      await page.keyboard.press('Tab'); await expect(page.getByRole('button', {name: 'Next month →', exact: true})).toBeFocused();
      await page.keyboard.press('Tab'); await expect(page.getByLabel('Recorded exercise', {exact: true})).toBeFocused(); await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); await expect(page.locator('tbody tr')).toHaveCount(2); await expect(page.locator('tbody tr').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const sizes = await page.locator('.hm-progress button,.hm-progress select,.hm-progress summary').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return [r.width, r.height]; }));
      for (const [w, h] of sizes) { expect(w).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44); }
      const contrast = await page.locator('.hm-progress').evaluate(root => {
        const rgb = s => (s.match(/[\d.]+/g) || []).map(Number), lum = s => rgb(s).slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
        return [...root.querySelectorAll('*')].filter(n => n.checkVisibility() && [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())).flatMap(n => {
          const style = getComputedStyle(n); let bg = n;
          while (bg && getComputedStyle(bg).backgroundColor === 'rgba(0, 0, 0, 0)') bg = bg.parentElement;
          if (!bg || n.closest('svg')) return [];
          const a = lum(style.color), b = lum(getComputedStyle(bg).backgroundColor), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
          return ratio < 4.5 ? [{text: n.textContent.slice(0, 40), ratio}] : [];
        });
      }); expect(contrast).toEqual([]);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      const last = await page.locator('.hm-progress').evaluate(root => ({bottom: root.getBoundingClientRect().bottom, footer: document.querySelector('nav').getBoundingClientRect().top})); expect(last.bottom).toBeLessThanOrEqual(last.footer);
      await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({path: `${artifactRoot}/${width}-${scale}.png`, fullPage: true, style: 'nav{visibility:hidden}'}); await page.screenshot({path: `${artifactRoot}/${width}-${scale}-viewport.png`});
      await page.locator('summary').click();
    }
    if (style) await style.evaluate(n => n.remove());
  }
  await page.emulateMedia({forcedColors: 'active'}); await page.getByLabel('Recorded exercise', {exact: true}).focus();
  expect(await page.getByLabel('Recorded exercise', {exact: true}).evaluate(n => getComputedStyle(n).outlineStyle)).toBe('solid');
  expect(errors).toEqual([]);
});
