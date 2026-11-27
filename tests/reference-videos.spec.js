import {test, expect} from '@playwright/test';
const references = [
  ['classic-iron', null, 7, '20:00'],
  ['core-blast', null, 5, '10:00'],
  ['iron-twist', 'https://youtube.com/shorts/BlKoQLB955k?si=8kQGAIttJyFuu8Q0', 5, '05:00'],
  ['saturday-morning-beef', 'https://youtube.com/shorts/w-ZRqmfBmrQ?si=I-FJN83Plpq2Azr0', 5, '10:00'],
];
for (const [id, url, count, clock] of references) {
  test(`${id}: optional secure external reference appears only on details and preserves Start and circuit`, async ({page, context}) => {
    await page.addInitScript(() => { window.KB_SUPABASE_CONFIG = {url:'', publishableKey:''}; });
    await page.clock.install({time: new Date('2026-11-16T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-11-16T12:00:01Z'));
    const requests = [];
    await context.route('https://youtube.com/**', route => {
      requests.push(route.request().headers());
      return route.fulfill({contentType:'text/html', body:'<title>Reference video fixture</title>'});
    });
    await page.goto(`./#workout/${id}/1`);
    const link = page.getByRole('link', {name:'Watch reference video', exact:true});
    await expect(page.locator('.prescriptions > li')).toHaveCount(count);
    await expect(page.getByRole('button', {name:'Start Workout', exact:true})).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(requests).toHaveLength(0);
    if (url) {
      await expect(link).toHaveAttribute('href', url);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
      const originalUrl = page.url();
      const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
      await expect(popup).toHaveURL(url);
      expect(await popup.evaluate(() => window.opener)).toBeNull();
      expect(requests).toHaveLength(1); expect(requests[0].referer).toBeUndefined();
      await popup.close(); expect(page.url()).toBe(originalUrl);
    } else await expect(link).toHaveCount(0);
    await page.getByRole('button', {name:'Start Workout', exact:true}).click();
    await expect(page.locator('.phase-clock')).toHaveText('3');
    await expect(link).toHaveCount(0);
    await page.clock.runFor(3000);
    await expect(page.locator('.phase-clock')).toHaveText(clock);
    await expect(page.locator('.active-circuit li')).toHaveCount(count);
    await expect(link).toHaveCount(0); await expect(page.locator('iframe')).toHaveCount(0);
    expect(await page.evaluate(async () => (await import('./src/storage/session-store.js')).listSessions())).toEqual([]);
  });
}
