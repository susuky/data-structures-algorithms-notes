#!/usr/bin/env node
/* Optional REAL browser regression test. Requires Playwright + an installed Chromium.
 * Run: CHROMIUM_PATH=/usr/bin/chromium node tests/test_browser.js [path/to/index.html]
 * Screenshots are written only when DSA_SCREENSHOTS points at a directory.
 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const file = path.resolve(process.argv[2] || path.join(__dirname, '../index.html'));
const screenshots = process.env.DSA_SCREENSHOTS;
const checks = [], errors = [], requests = [];
function pass(label) {checks.push(label);}
async function run() {
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request', r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const url=pathToFileURL(file).href;
  if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
  const shot=async(name)=>{if(screenshots)await page.screenshot({path:path.join(screenshots,name+'.png'),fullPage:false});};
  await page.goto(url);
  assert.equal(await page.locator('#chapters>article').count(),13);
  assert.equal(await page.locator('[data-lab]').count(),6);
  assert.ok(await page.locator('#course-home').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await shot('desktop-home');pass('Standalone desktop home, 13 chapters, 6 labs, no page overflow');
  await page.locator('.hero-actions a').first().click();
  await page.waitForURL(/#chapter-01$/);
  assert.ok(await page.locator('#chapter-01').isVisible());
  await page.locator('#next-chapter').click();await page.waitForURL(/#chapter-02$/);
  await page.goBack();assert.ok(await page.locator('#chapter-01').isVisible());
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
  assert.ok(await page.locator('#chapter-01').isVisible());pass('Chapter navigation, browser Back, skip link');
  await page.locator('#bookmark-button').click();await page.locator('#complete-button').click();await page.reload();
  assert.equal(await page.locator('#bookmark-button').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#course-progress-text').innerText(),'1 / 13');
  await page.locator('#show-bookmarks').click();assert.equal(await page.locator('#bookmark-list a').count(),1);
  await page.locator('#bookmark-list a').click();assert.ok(await page.locator('#bookmark-dialog').isHidden());pass('Bookmark, completion, reload, and bookmark dialog');
  await page.keyboard.press('/');await page.locator('#search-input').fill('binary search');
  assert.ok(await page.locator('.search-result').count()>0);await page.locator('.search-result').first().click();
  assert.ok(await page.locator('#chapter-09').isVisible());
  await page.locator('#search-button').click();await page.locator('#search-input').fill('zzzzz找不到987654321');
  assert.equal(await page.locator('.search-result').count(),0);await page.keyboard.press('Escape');pass('English alias search, result routing, empty state, Escape');
  await page.locator('#theme-select').selectOption('dark');await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await shot('desktop-dark-reader');
  await page.locator('#theme-select').selectOption('light');
  const topic=await page.locator('#chapter-11 h3').first().getAttribute('id');
  await page.goto(url+'#'+topic);assert.ok(await page.locator('#chapter-11').isVisible());pass('Theme persistence and direct topic URL');
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('#chapters details:not([open])').count(),0);
  await page.emulateMedia({media:'print'});
  assert.ok(await page.locator('#chapter-01').isVisible());assert.ok(await page.locator('#chapter-13').isVisible());
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  assert.ok(await page.locator('#chapters details:not([open])').count()>0);pass('Print shows all chapters and answers, then restores disclosures');
  await page.goto(url+'#algorithm-labs');
  for(const key of ['two-pointers','sliding-window','binary-search','bfs','backtracking','dp']){
    const lab=page.locator('#lab-'+key),next=lab.locator('[data-action="next"]');
    await lab.scrollIntoViewIfNeeded();assert.ok(await lab.locator('[data-action="prev"]').isDisabled());
    await next.click();assert.equal(await lab.getAttribute('data-step'),'1');
    await lab.locator('[data-action="prev"]').click();assert.equal(await lab.getAttribute('data-step'),'0');
    let count=0;while(!await next.isDisabled()&&count++<500)await next.click();
    assert.ok(count<500);assert.equal(await lab.getAttribute('data-done'),'true');
    await shot('lab-'+key);await lab.locator('[data-action="reset"]').click();assert.equal(await lab.getAttribute('data-step'),'0');
    pass(key+': next, previous, termination, reset');
  }
  await page.locator('#two-pointers-array').fill('9, 1');await page.locator('#lab-two-pointers button[type="submit"]').click();
  assert.ok(await page.locator('#lab-two-pointers .lab-error').isVisible());
  await page.locator('#two-pointers-array').fill('1, 9');await page.locator('#lab-two-pointers button[type="submit"]').click();
  assert.ok(await page.locator('#lab-two-pointers .lab-error').isHidden());
  await page.locator('#binary-search-array').fill('');await page.locator('#lab-binary-search button[type="submit"]').click();
  await page.locator('#lab-binary-search [data-action="next"]').click();assert.equal(await page.locator('#lab-binary-search').getAttribute('data-done'),'true');pass('Invalid and valid custom inputs; empty binary search');
  await page.setViewportSize({width:390,height:844});await page.goto(url);await shot('mobile-home');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#menu-button').click();assert.equal(await page.locator('#sidebar').getAttribute('aria-modal'),'true');
  await page.locator('.chapter-link[href="#chapter-06"]').click();assert.ok(await page.locator('#chapter-06').isVisible());
  assert.equal(await page.locator('#main-content').evaluate(el=>el.inert),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile-reader');
  await page.goto(url+'#lab-bfs');await shot('mobile-bfs');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  pass('390px mobile home, drawer, reader, lab, no document overflow');
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await nojs.newPage();await staticPage.goto(url);
  assert.ok(await staticPage.locator('#chapter-01').isVisible());assert.ok(await staticPage.locator('#chapter-13').isVisible());
  assert.ok(await staticPage.locator('#search-button').isHidden());assert.ok(await staticPage.locator('noscript').first().isVisible());
  assert.ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass('No-JS mode leaves all chapters readable and hides inert controls');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);pass('No JavaScript exceptions and no HTTP requests');
  await browser.close();
  console.log(JSON.stringify({file,verification:'Real Chromium browser',passed:checks.length,checks,errors,requests},null,2));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
