import {test,expect} from '@playwright/test';
import {capture} from './helpers/ui-baseline.js';
test('five PR 01 baselines show intended canvas changes while retaining component geometry and styles',async({browser,baseURL},info)=>{
 test.setTimeout(90000);const viewport=info.project.use.viewport;
 for(const state of ['library','today','details','timer','results']){const before=await capture(browser,baseURL,viewport,info.project.name,state,false);if(process.env.HM_CAPTURE_PRECHANGE)continue;const after=await capture(browser,baseURL,viewport,info.project.name,state,true);expect(after.png.equals(before.png),`${state}: intended canvas change`).toBe(false);expect(after.metrics).toEqual(before.metrics);}
});
test('exact tokens load ahead of app.css, preserve legacy style roles and work offline',async({page,context})=>{
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});await page.goto('./#library');
 const expected={'--hm-bg':'#212227','--hm-surface-primary':'#312F4E','--hm-surface-secondary':'#4D4A6A','--hm-accent':'#B37ACB','--hm-highlight':'#EEEF58','--hm-text-primary':'#EDECEE'};
 const read=()=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()])),Object.keys(expected));expect(await read()).toEqual(expected);
 expect(await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).toEqual(['./styles/hm-tokens.css','./styles/app.css','./styles/hm-header.css','./styles/hm-today.css','./styles/hm-library.css','./styles/hm-details.css']);
 expect(await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return {accent:s.getPropertyValue('--accent').trim(),line:s.getPropertyValue('--line').trim(),bg:s.backgroundColor,color:s.color};})).toEqual({accent:'#244e40',line:'#d7dfd6',bg:'rgb(33, 34, 39)',color:'rgb(237, 236, 238)'});
 await expect(page.locator('.workout-card')).toHaveCount(4);await page.locator('.workout-card').first().focus();await expect(page.locator('.workout-card').first()).toBeFocused();expect(await page.locator('.workout-card').first().evaluate(n=>getComputedStyle(n).outlineStyle)).not.toBe('none');
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));expect(await page.evaluate(async()=>Boolean(await (await caches.open('kb2-static-v24')).match(new URL('./styles/hm-tokens.css',location.href))))).toBe(true);
 await context.setOffline(true);await page.reload();expect(await read()).toEqual(expected);expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(33, 34, 39)');await expect(page.locator('.workout-card')).toHaveCount(4);expect(await page.evaluate(async()=>(await fetch('./styles/hm-tokens.css')).status)).toBe(200);await context.setOffline(false);
});
