import {test,expect} from '@playwright/test';
import {capture} from './helpers/ui-baseline.js';
test('seven screens have readable dark canvas and retained control geometry at phone/tablet/desktop sizes',async({browser,baseURL},info)=>{
 test.setTimeout(120000);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280])for(const state of ['library','today','details','timer','results','history','account']){
  const viewport={width,height:844},name=`${width}`;
  const before=await capture(browser,baseURL,viewport,name,state,false),after=await capture(browser,baseURL,viewport,name,state,true,{audit:true});
  expect(after.png.equals(before.png)).toBe(false);expect(after.metrics).toEqual(before.metrics);
 }
});
test('canvas, day containers, navigation and theme metadata have the intended scoped colors',async({page})=>{
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});await page.goto('./#today');
 const colors=await page.evaluate(()=>Object.fromEntries(['html','body','.day-slot','nav'].map(sel=>{const s=getComputedStyle(document.querySelector(sel));return [sel,{background:s.backgroundColor,color:s.color}];})));
 expect(colors.html).toEqual({background:'rgb(33, 34, 39)',color:'rgb(237, 236, 238)'});expect(colors.body.background).toBe('rgb(33, 34, 39)');expect(colors['.day-slot']).toEqual({background:'rgb(49, 47, 78)',color:'rgb(237, 236, 238)'});expect(colors.nav).toEqual({background:'rgb(33, 34, 39)',color:'rgb(237, 236, 238)'});await expect(page.locator('.day-slot')).toHaveCount(7);await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content','#212227');
});
