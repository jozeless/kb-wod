import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { capture } from './helpers/ui-baseline.js';
import { installBeepSpy } from './helpers/timer-beeps.js';

const artifactRoot = '/workspace/artifacts/ui-v2-09';
const tabs = [['Today', '#today'], ['Library', '#library'], ['Progress', '#progress'], ['History', '#history']];
const A = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@example.test', email_confirmed_at: '2026-01-01' };
const B = { id: '22222222-2222-4222-8222-222222222222', email: 'bob@example.test', email_confirmed_at: '2026-01-01' };
const nav = page => page.getByRole('navigation', { name: 'Main navigation' });
async function setup(page, cloud = false) {
  await page.addInitScript(config => { window.KB_SUPABASE_CONFIG = config; }, cloud ? { url: 'https://footer-test.supabase.co', publishableKey: 'sb_publishable_fixture' } : { url: '', publishableKey: '' });
  await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z'));
}
async function active(page, label) {
  const selected = nav(page).locator('[aria-current]');
  await expect(selected).toHaveCount(label ? 1 : 0);
  if (label) { await expect(selected).toHaveAccessibleName(label); await expect(selected).toHaveAttribute('aria-current', 'page'); }
}
async function seed(page, layouts = false) {
  await page.evaluate(async ({ A, B, layouts }) => {
    const { findWorkout } = await import('./src/data/catalog.js');
    const { createDraft, finalResults } = await import('./src/domain/result-schemas.js');
    const { completeSession, putDraft } = await import('./src/storage/session-store.js');
    for (const [id, workoutId, version, ownerId] of [['guest-monday', 'monday-paranoid', 3, null], ['guest-focus', 'focus-001-upper-abs', 2, null], ['alice-tuesday', 'tuesday-of-spades', 1, A.id], ['bob-friday', 'friday-to-black', 1, B.id]]) {
      const w = findWorkout(workoutId, version), r = createDraft(w, { getItem: () => null }, id, '2026-10-28T12:00:00Z');
      r.ownerId = ownerId; r.stage = `${w.phases.at(-1).id}-results`; r.blockIndex = w.phases.length - 1; r.completedBlocks = w.phases.map(p => p.id);
      r.activeDurationMs = w.durationSeconds * 1000; r.completedAt = '2026-10-28T12:30:00Z'; r.results = finalResults(r); await completeSession(r);
    }
    const w = findWorkout('monday-paranoid', 3), r = createDraft(w, { getItem: () => null }, 'guest-draft');
    r.checkpointMs = 13000; r.activeDurationMs = 10000; r.form.weights['push-press'] = '12.5'; await putDraft(r);
    if (layouts) {
      const r = createDraft(w, { getItem: () => null }, 'layout-results');
      r.stage = 'finisher-results'; r.blockIndex = w.phases.length - 1; r.completedBlocks = w.phases.map(p => p.id); r.activeDurationMs = 1270000; r.completedAt = '2026-10-29T12:21:13Z';
      r.form.weights['push-press'] = '12.5'; r.form.finisherReps = '17'; await putDraft(r);
    }
  }, { A, B, layouts });
}
const records = page => page.evaluate(async () => (await import('./src/storage/session-store.js')).listSessions());

test('four consistent inline SVG tabs route correctly, including legacy and nested active states', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await setup(page); await page.goto('./');
  expect(await nav(page).getByRole('link').allTextContents()).toEqual(tabs.map(([name]) => expect.stringMatching(new RegExp(`^\\s*${name}\\s*$`))));
  await expect(nav(page).getByRole('link')).toHaveCount(4);
  const icons = await nav(page).locator('svg').evaluateAll(nodes => nodes.map(n => ['viewBox', 'width', 'height', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill', 'aria-hidden', 'focusable'].map(k => n.getAttribute(k))));
  expect(icons).toEqual(Array(4).fill(['0 0 24 24', '22', '22', '2', 'round', 'round', 'none', 'true', 'false']));
  for (const [name, route] of tabs) { const link = nav(page).getByRole('link', { name, exact: true }); await expect(link).toHaveAttribute('href', route); await link.click(); await expect(page).toHaveURL(new RegExp(`${route}$`)); await active(page, name); }
  await nav(page).getByRole('link', { name: 'Progress', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  await expect(page.getByText('No completed workouts this month', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '← Previous month', exact: true })).toBeVisible();
  await expect(page.getByText('No recorded weights', { exact: true })).toBeVisible();
  for (const [route, selected] of [['library?day=Tuesday', 'Library'], ['workout/monday-paranoid/3', 'Library'], ['active/monday-paranoid/3', 'Library'], ['result/demo-hybrid-foundation/1', 'Library'], ['history', 'History'], ['history/monday-paranoid', 'History'], ['session/missing', 'History'], ['stats', 'Progress'], ['dashboard', 'Progress'], ['account', null], ['unknown', null]]) {
    await page.goto(`./#${route}`); await active(page, selected);
  }
  expect(errors).toEqual([]);
});

test('global History reuses completed-session filtering and preserves specific history, snapshots and drafts', async ({ page }) => {
  await setup(page); await page.goto('./#history'); await expect(page.getByText('No saved sessions', { exact: true })).toBeVisible();
  await seed(page); const before = await records(page); await page.goto('./#today'); await nav(page).getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeVisible(); await active(page, 'History');
  const list = page.locator('.library-grid > button'); await expect(list).toHaveCount(2);
  await expect(list.filter({ hasText: 'Monday Paranoid · Version 3' })).toHaveCount(1); await expect(list.filter({ hasText: 'Upper Body + ABS · Version 2' })).toHaveCount(1);
  await list.filter({ hasText: 'Monday Paranoid · Version 3' }).click(); await expect(page).toHaveURL(/#session\/guest-monday$/); await active(page, 'History');
  await expect(page.getByText('Active duration: 21:10', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Saved workouts', exact: true }).click(); await expect(page).toHaveURL(/#history\/monday-paranoid$/); await expect(list).toHaveCount(1); await active(page, 'History');
  await page.goto('./#history/focus-001-upper-abs'); await expect(list).toHaveCount(1); await list.click(); await expect(page).toHaveURL(/#session\/guest-focus$/); await active(page, 'History');
  await expect(page.getByRole('region', { name: 'Upper saved results', exact: true })).toBeVisible();
  expect(await records(page)).toEqual(before);
});

test('History and saved-session footer routes retain real auth/account separation without rewriting records', async ({ page }) => {
  await setup(page, true);
  await page.route('https://footer-test.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), body = request.postDataJSON();
    const user = body?.email === B.email || request.headers().authorization === 'Bearer token-b' ? B : A;
    const data = url.pathname === '/auth/v1/token' ? { access_token: user === A ? 'token-a' : 'token-b', refresh_token: 'fixture-refresh', expires_in: 3600, user } : url.pathname === '/auth/v1/user' ? user : url.pathname.startsWith('/rest/') ? [] : {};
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,apikey,content-type,prefer', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(data) });
  });
  await page.goto('./#history'); await seed(page); const before = await records(page);
  for (const user of [A, B]) {
    await page.goto('./#account'); await page.getByLabel('Email', { exact: true }).fill(user.email); await page.getByLabel('Password', { exact: true }).fill('example-password'); await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByText(`Signed in as ${user.email}`, { exact: true })).toBeVisible();
    await nav(page).getByRole('link', { name: 'History', exact: true }).click(); await expect(page.locator('.library-grid > button')).toHaveCount(3); await active(page, 'History');
    await expect(page.locator('.library-grid')).toContainText(user === A ? 'Tuesday of Spades' : 'Friday To Black');
    await expect(page.locator('.library-grid')).not.toContainText(user === A ? 'Friday To Black' : 'Tuesday of Spades');
    await page.goto(`./#session/${user === A ? 'bob-friday' : 'alice-tuesday'}`); await expect(page.getByRole('heading', { name: 'Session unavailable', exact: true })).toBeVisible(); await active(page, 'History');
    await page.goto('./#account'); await page.getByRole('button', { name: 'Log out', exact: true }).click(); await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  }
  await nav(page).getByRole('link', { name: 'History', exact: true }).click(); await expect(page.locator('.library-grid > button')).toHaveCount(2);
  expect(await records(page)).toEqual(before);
});

test('footer SVG clicks keep active exit confirmations, audio, paused checkpoints and recoverable session weights', async ({ page }) => {
  await setup(page); await installBeepSpy(page); await page.goto('./#workout/monday-paranoid/3');
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click(); await expect(page.getByRole('timer')).toHaveText('3'); await page.clock.runFor(13000);
  await page.getByLabel('KB Push Press weight (kg)', { exact: true }).fill('12.5');
  let accept = false, confirmations = 0; page.on('dialog', d => { confirmations++; return accept ? d.accept() : d.dismiss(); });
  const hash = await page.evaluate(() => location.hash);
  for (const [name] of tabs) {
    await nav(page).getByRole('link', { name, exact: true }).locator('svg').click(); await expect(page).toHaveURL(new RegExp(`${hash.replace(/[?]/g, '\\?')}$`)); await active(page, 'Library');
    await page.clock.runFor(1000);
  }
  expect(confirmations).toBe(4); await expect(page.getByRole('timer')).toHaveText('00:46');
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.clock.fastForward(600000); await expect(page.getByRole('timer')).toHaveText('00:46');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); expect(await page.evaluate(() => window.beepNotes.map(n => n.frequency))).toEqual([640]);
  accept = true; await nav(page).getByRole('link', { name: 'History', exact: true }).locator('svg').click(); await expect(page).toHaveURL(/#history$/); await active(page, 'History');
  const record = (await records(page))[0]; expect(record.checkpointMs).toBe(17000); expect(record.activeDurationMs).toBe(14000); expect(record.form.weights['push-press']).toBe('12.5'); expect(record.status).toBe('draft');
  await nav(page).getByRole('link', { name: 'Library', exact: true }).click(); await page.getByRole('button', { name: 'View workout: Monday Paranoid', exact: true }).click();
  await page.getByRole('button', { name: /Resume draft —/ }).click(); await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible(); await expect(page.getByRole('timer')).toHaveText('00:46'); await expect(page.getByLabel('KB Push Press weight (kg)', { exact: true })).toHaveValue('12.5'); await active(page, 'Library');
});

test('footer stays fixed and aligned without clipping or covering End/Save/fields at four widths and 200% text', async ({ page }, info) => {
  test.setTimeout(120000); await setup(page); page.on('dialog', d => d.accept()); await page.goto('./#today'); await seed(page, true);
  const routes = ['today', 'library', 'progress', 'history', 'workout/monday-paranoid/3', 'active/monday-paranoid/3?draft=guest-draft', 'active/monday-paranoid/3?draft=layout-results', 'session/guest-monday', 'account'];
  await fs.mkdir(`${artifactRoot}/accessibility`, { recursive: true });
  for (const scale of [100, 200]) {
    const zoom = scale === 200 ? await page.addStyleTag({ content: 'html{font-size:200%}' }) : null;
    for (const width of info.project.name === 'mobile' ? [320, 390] : [768, 1280]) for (const route of routes) {
      await page.setViewportSize({ width, height: 844 }); await page.goto(`./#${route}`);
      expect(await page.locator('html').evaluate(n => getComputedStyle(n).fontSize)).toBe(scale === 200 ? '32px' : '16px');
      if (route === 'history') await expect(page.locator('.library-grid > button')).toHaveCount(2);
      if (route === 'library') await expect(page.locator('.workout-card')).toHaveCount(4);
      if (route.startsWith('active/')) await expect(page.getByRole('button', { name: route.includes('layout-results') ? 'Save Workout' : 'Resume', exact: true })).toBeVisible();
      if (route.startsWith('session/')) await expect(page.getByText('Active duration: 21:10', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await nav(page).evaluate(n => { const r = n.getBoundingClientRect(); return { bottom: r.bottom, top: r.top, position: getComputedStyle(n).position }; });
      expect(bounds.position).toBe('fixed'); expect(bounds.bottom).toBe(844);
      const links = await nav(page).locator('a').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(), icon = n.querySelector('svg').getBoundingClientRect(), label = n.querySelector('span'); return { label: label.textContent, scroll: [label.scrollWidth,label.scrollHeight], client: [label.clientWidth,label.clientHeight], width: r.width, height: r.height, iconTop: icon.top, clipped: label.scrollWidth > label.clientWidth || label.scrollHeight > label.clientHeight }; }));
      for (const link of links) { expect(link.width).toBeGreaterThanOrEqual(44); expect(link.height).toBeGreaterThanOrEqual(44); expect(link.iconTop).toBe(links[0].iconTop); expect(link.clipped, `${width}/${scale}/${route}: ${JSON.stringify(link)}`).toBe(false); }
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      const overlap = await page.locator('#app button,#app input,#app textarea,#app select,#app a').evaluateAll(nodes => { const top = document.querySelector('nav').getBoundingClientRect().top; return nodes.filter(n => n.checkVisibility() && n.getBoundingClientRect().bottom > top).map(n => n.textContent || n.getAttribute('aria-label')); });
      expect(overlap).toEqual([]);
      if (scale === 200 && route === 'active/monday-paranoid/3?draft=layout-results') await page.screenshot({ path: `${artifactRoot}/accessibility/${width}-results-200.png`, fullPage: true, style: 'nav{visibility:hidden}' });
      if (scale === 200 && route === 'progress') await page.screenshot({ path: `${artifactRoot}/accessibility/${width}-progress-200.png` });
    }
    if (zoom) await zoom.evaluate(n => n.remove());
  }
});

test('keyboard, active underline, AA footer contrast and forced-colors states remain usable', async ({ page }) => {
  await setup(page); await page.goto('./#today'); await nav(page).getByRole('link', { name: 'Today', exact: true }).focus();
  for (const name of ['Library', 'Progress', 'History']) { await page.keyboard.press('Tab'); const link = nav(page).getByRole('link', { name, exact: true }); await expect(link).toBeFocused(); expect(await link.evaluate(n => getComputedStyle(n).outlineStyle)).toBe('solid'); }
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter'); await active(page, 'Progress');
  const contrast = await nav(page).locator('a').evaluateAll(nodes => {
    const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number), lum = s => rgb(s).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    return nodes.map(n => { const s = getComputedStyle(n), bg = s.backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(n.parentElement).backgroundColor : s.backgroundColor; return { text: ratio(lum(s.color), lum(bg)), icon: ratio(lum(getComputedStyle(n.querySelector('svg')).color), lum(bg)) }; });
  });
  for (const item of contrast) { expect(item.text).toBeGreaterThanOrEqual(4.5); expect(item.icon).toBeGreaterThanOrEqual(3); }
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await page.setViewportSize({ width: 320, height: 844 });
  const link = nav(page).getByRole('link', { name: 'Progress', exact: true }); await link.focus();
  const style = await link.evaluate(n => ({ outline: getComputedStyle(n).outlineStyle, border: getComputedStyle(n).borderTopStyle, underline: getComputedStyle(n, '::after').backgroundColor, height: getComputedStyle(n, '::after').height }));
  expect(style.outline).toBe('solid'); expect(style.border).toBe('solid'); expect(style.height).toBe('3px'); expect(style.underline).not.toBe('rgba(0, 0, 0, 0)');
  await fs.mkdir(`${artifactRoot}/accessibility`, { recursive: true }); await page.screenshot({ path: `${artifactRoot}/accessibility/320-forced-colors.png` });
});

test('footer and all four destinations work offline under the Pages subpath with retained history and details', async ({ page, context }) => {
  await setup(page); await page.goto('./#today'); await seed(page); const before = await records(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload(); await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  expect(await page.evaluate(async () => Boolean(await (await caches.open('kb2-static-v29')).match(new URL('./styles/hm-footer.css', document.baseURI))))).toBe(true);
  await context.setOffline(true); await page.reload();
  for (const [name] of tabs) { await nav(page).getByRole('link', { name, exact: true }).click(); await active(page, name); }
  await expect(page.locator('.library-grid > button')).toHaveCount(2); await page.locator('.library-grid > button').filter({ hasText: 'Monday Paranoid' }).click(); await active(page, 'History'); await expect(page.getByText('Active duration: 21:10', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Saved workouts', exact: true }).click(); await expect(page).toHaveURL(/#history\/monday-paranoid$/); await active(page, 'History');
  await nav(page).getByRole('link', { name: 'Library', exact: true }).click(); await page.getByRole('button', { name: 'View workout: Monday Paranoid', exact: true }).click(); await active(page, 'Library'); await expect(page.getByRole('button', { name: 'Start Workout', exact: true })).toBeVisible();
  expect(await records(page)).toEqual(before); await context.setOffline(false);
});

test('footer reference at four widths changes only navigation and the intended Progress placeholder', async ({ browser, baseURL }, info) => {
  test.setTimeout(240000);
  for (const width of info.project.name === 'mobile' ? [320, 390] : [768, 1280]) for (const state of ['today', 'library', 'progress', 'history-global', 'details', 'timer', 'results', 'history', 'history-list', 'account']) {
    const args = [browser, baseURL, { width, height: 844 }, String(width), state, true], options = { artifactRoot, headerEvidence: true, todayEvidence: true, footerEvidence: true };
    const before = await capture(...args, { ...options, footerBaseline: true }), after = await capture(...args, { ...options, audit: true });
    expect(after.viewportPNG.equals(before.viewportPNG), `${width}/${state}: intended footer change`).toBe(false);
    expect(after.navPNG.equals(before.navPNG)).toBe(false); expect(after.headerPNG.equals(before.headerPNG)).toBe(true);
    if (state === 'progress') { expect(after.contentPNG.equals(before.contentPNG)).toBe(false); continue; }
    expect(after.contentPNG.equals(before.contentPNG), `${width}/${state}: unchanged page`).toBe(true);
    expect(after.protectedMetrics.filter(n => n.area === 'content')).toEqual(before.protectedMetrics.filter(n => n.area === 'content'));
    expect(after.todayDOM).toEqual(before.todayDOM); expect(after.libraryDOM).toEqual(before.libraryDOM); expect(after.detailsDOM).toEqual(before.detailsDOM);
  }
});
