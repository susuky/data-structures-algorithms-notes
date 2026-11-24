#!/usr/bin/env node
/* Real browser tests for direct manipulation, routing and keyboard access. */
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const shots=process.env.COURSE_SCREENSHOTS;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const checks=[],failures=[],errors=[],requests=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  if(shots)fs.mkdirSync(shots,{recursive:true});
  const shot=async name=>{if(shots)await page.screenshot({path:path.join(shots,'studio-'+name+'.jpg'),type:'jpeg',quality:85});};
  async function check(name,fn){
   try{await fn();checks.push(name);console.log('PASS '+name);}
   catch(e){failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message);await shot('failure-'+failures.length);}
  }
  const panel=key=>page.locator('[data-explore-panel="'+key+'"]');
  async function mode(key){await page.locator('[data-explore-mode="'+key+'"]').click();await panel(key).waitFor({state:'visible'});return panel(key);}
  async function go(id){await page.evaluate(id=>{if(location.hash==='#'+id)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=id;},id);await page.waitForFunction(id=>{const n=document.getElementById(id);return n&&!n.closest('[hidden]');},id);}
  async function setSort(text){const p=panel('sort');await p.locator('[data-explore-sort-input]').fill(text);await p.locator('.exploration-array-form button[type="submit"]').click();}
  const values=async p=>p.locator('.exploration-bars li').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.value)));
  async function noOverflow(label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflows viewport');}
  await page.goto(pathToFileURL(file).href);
  await page.locator('[data-explore-mode="sort"]').waitFor();
  await check('Home mounts one studio with six keyboard tabs',async()=>{
   assert.equal(await page.locator('[data-exploration-studio]').count(),1);
   assert.equal(await page.locator('[data-explore-mode]').count(),6);
   assert.equal(await page.locator('[data-explore-panel]:visible').count(),1);
   assert.equal(await page.locator('[data-explore-mode="sort"]').getAttribute('aria-selected'),'true');
   await noOverflow('home');
  });
  await check('Both sorting tracks sort edited signed values and retain duplicate identities',async()=>{
   const p=await mode('sort');
   await p.locator('[data-explore-sort-algorithm="left"]').selectOption('insertion');
   await p.locator('[data-explore-sort-algorithm="right"]').selectOption('selection');
   await setSort('4, 1, 4, -2, 0');
   await p.locator('[data-explore-step="end"]').click();
   for(const side of ['left','right'])assert.deepEqual(await values(p.locator('[data-explore-sort-track="'+side+'"]')),[-2,0,1,4,4]);
   const left=p.locator('[data-explore-sort-track="left"]');
   assert.deepEqual(await left.locator('.exploration-bar-label sup').allTextContents(),['a','b']);
   assert.ok(Number(await left.locator('[data-explore-comparisons]').innerText())>0);
   await p.locator('[data-explore-step="restart"]').click();
   await p.locator('[data-explore-step="next"]').click();
   assert.ok(Number(await left.locator('[data-explore-comparisons]').innerText())>0);
   await p.locator('[data-explore-step="prev"]').click();
   assert.equal(await left.locator('[data-explore-comparisons]').innerText(),'0');
  });
  await check('Invalid sort input is recoverable without replacing the trace',async()=>{
   const p=await mode('sort'),before=await values(p.locator('[data-explore-sort-track="left"]'));
   await setSort('1,,3');assert.equal(await p.locator('[data-explore-sort-input]').getAttribute('aria-invalid'),'true');
   assert.ok(await p.locator('.exploration-error').isVisible());
   assert.deepEqual(await values(p.locator('[data-explore-sort-track="left"]')),before);
   await setSort('3,1,2');assert.equal(await p.locator('[data-explore-sort-input]').getAttribute('aria-invalid'),null);
   assert.ok(await p.locator('.exploration-error').isHidden());
  });
  await check('Array values reorder with keyboard and actual pointer dragging',async()=>{
   const p=await mode('sort');await setSort('3,1,2');
   await p.locator('[data-explore-sort-item="0"]').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await p.locator('[data-explore-sort-input]').inputValue(),'1, 3, 2');
   assert.equal(await page.locator(':focus').getAttribute('data-explore-sort-item'),'1');
   await setSort('3,1,2');
   const first=p.locator('[data-explore-sort-item="0"]'),last=p.locator('[data-explore-sort-item="2"]');
   await first.scrollIntoViewIfNeeded();
   const a=await first.boundingBox(),b=await last.boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();
   assert.equal(await p.locator('[data-explore-sort-input]').inputValue(),'1, 2, 3');
  });
  await check('Weighted map compares true BFS and Dijkstra outcomes; editing changes costs',async()=>{
   const p=await mode('path');await p.locator('[data-explore-preset="weighted"]').click();
   await p.locator('[data-explore-step="end"]').click();
   const metric=(alg,key)=>p.locator('[data-explore-path-card="'+alg+'"] [data-explore-metric="'+key+'"]');
   assert.equal(await metric('bfs','steps').innerText(),'6');assert.equal(await metric('bfs','cost').innerText(),'26');
   assert.equal(await metric('dijkstra','steps').innerText(),'8');assert.equal(await metric('dijkstra','cost').innerText(),'8');
   const straight=await p.locator('polyline').getAttribute('points');
   await p.locator('[data-explore-route="dijkstra"]').click();assert.notEqual(await p.locator('polyline').getAttribute('points'),straight);
   await p.locator('[data-explore-tool="erase"]').click();await p.locator('[data-explore-cell="20"]').click();
   assert.equal(await metric('bfs','cost').innerText(),'—');
   await p.locator('[data-explore-step="end"]').click();assert.equal(await metric('bfs','cost').innerText(),'22');
   await shot('weighted-path');
  });
  await check('Map supports disconnected endpoints and keyboard cell editing',async()=>{
   const p=await mode('path');await p.locator('[data-explore-preset="empty"]').click();await p.locator('[data-explore-tool="wall"]').click();
   for(const i of [16,24,26,34])await p.locator('[data-explore-cell="'+i+'"]').click();
   await p.locator('[data-explore-step="end"]').click();
   for(const alg of ['bfs','dijkstra'])assert.equal(await p.locator('[data-explore-path-card="'+alg+'"] [data-explore-metric="steps"]').innerText(),'無路');
   await p.locator('[data-explore-preset="empty"]').click();await p.locator('[data-explore-cell="0"]').focus();
   await page.keyboard.press('ArrowRight');assert.equal(await page.locator(':focus').getAttribute('data-explore-cell'),'1');
   await page.keyboard.press('Space');assert.equal(await p.locator('[data-explore-cell="1"]').getAttribute('data-terrain'),'wall');
   await p.locator('[data-explore-tool="start"]').click();await p.locator('[data-explore-cell="9"]').click();
   assert.equal(await p.locator('[data-explore-cell="9"]').getAttribute('data-terrain'),'start');
  });
  await check('Search shows first duplicate, missing-value insertion and clickable targets',async()=>{
   const p=await mode('search');await p.locator('[data-explore-step="end"]').click();
   assert.equal(await p.locator('[data-explore-slot]').innerText(),'3');
   assert.equal(await p.locator('[data-explore-search-cell="match"]').getAttribute('data-explore-value-index'),'3');
   await p.locator('[data-explore-target]').fill('20');await p.locator('[data-explore-step="end"]').click();
   assert.equal(await p.locator('[data-explore-slot]').innerText(),'3');
   assert.equal(await p.locator('[data-explore-search-cell="match"]').count(),0);
   await p.locator('[data-explore-preset="edge"]').click();await p.locator('[data-explore-step="end"]').click();
   assert.equal(await p.locator('[data-explore-slot]').innerText(),'7');
   await p.locator('[data-explore-value-index="2"]').click();assert.equal(await p.locator('[data-explore-target]').inputValue(),'12');
   await p.locator('[data-explore-step="end"]').click();assert.equal(await p.locator('[data-explore-slot]').innerText(),'2');
  });
  await check('Heap operations update both tree and array, including empty heap',async()=>{
   const p=await mode('heap');await p.locator('[data-explore-heap-input]').fill('-7');await p.locator('[data-explore-heap-add]').click();
   assert.equal(await p.locator('[data-explore-heap-top]').innerText(),'-7');
   assert.equal(await p.locator('[data-explore-node="0"]').innerText(),'-7');
   const a=await p.locator('[data-explore-heap-index] > span').evaluateAll(nodes=>nodes.map(n=>Number(n.textContent)));
   a.slice(1).forEach((n,i)=>assert.ok(a[Math.floor(i/2)]<=n));
   await p.locator('[data-explore-heap-remove]').click();
   assert.equal(await p.locator('[data-explore-heap-output]').innerText(),'-7');assert.equal(await p.locator('[data-explore-heap-top]').innerText(),'12');
   await p.locator('[data-explore-preset="empty"]').click();
   assert.equal(await p.locator('[data-explore-heap-remove]').getAttribute('aria-disabled'),'true');
   await p.locator('[data-explore-heap-add]').click();assert.equal(await p.locator('[data-explore-heap-top]').innerText(),'8');
  });
  await check('BST / AVL tab compares height and performs rotations',async()=>{
   const p=await mode('bst');
   assert.equal(await p.locator('[data-explore-bst-height]').innerText(),'5');
   await p.locator('[data-explore-bst-mode="avl"]').click();
   assert.equal(await p.locator('[data-explore-bst-height]').innerText(),'3');
   await p.locator('[data-explore-preset="lr"]').click();
   await p.locator('[data-explore-bst-input]').fill('20');
   await p.locator('[data-explore-bst-action="insert"]').click();
   await p.locator('[data-explore-step="end"]').click();
   assert.equal(await p.locator('[data-explore-bst-rot]').innerText(),'2');
  });
  await check('Hash table tab switches chaining and linear probing with tombstones',async()=>{
   const p=await mode('hash');
   assert.equal(await p.locator('[data-explore-hash-count]').innerText(),'4 / 7');
   await p.locator('[data-explore-hash-strategy="probing"]').click();
   await p.locator('[data-explore-hash-input]').fill('14');
   await p.locator('[data-explore-hash-action="delete"]').click();
   await p.locator('[data-explore-step="end"]').click();
   assert.ok(await p.locator('.exploration-hash-tombstone').count()===1);
  });
  await check('Tab arrow keys and route navigation pause playback',async()=>{
   await page.locator('[data-explore-mode="heap"]').focus();await page.keyboard.press('Home');
   assert.equal(await page.locator(':focus').getAttribute('data-explore-mode'),'sort');
   const p=panel('sort');await p.locator('[data-explore-preset="reverse"]').click();await p.locator('[data-explore-step="play"]').click();
   await page.waitForFunction(()=>!document.querySelector('[data-explore-panel="sort"] [data-explore-position]').textContent.startsWith('0 /'));
   await go('chapter-01');const stopped=await p.locator('[data-explore-position]').innerText();await page.waitForTimeout(650);
   assert.equal(await p.locator('[data-explore-position]').innerText(),stopped);
   await go('course-home');assert.equal((await p.locator('[data-explore-step="play"]').innerText()).trim(),'播放');
   await page.locator('[data-explore-mode="sort"]').focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator(':focus').getAttribute('data-explore-mode'),'path');
   assert.ok(await panel('path').isVisible());
  });
  await check('All modes fit 390px and 320px in light and dark themes',async()=>{
   for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const theme of ['light','dark']){
     await page.locator('#theme-select').selectOption(theme);
     for(const key of ['sort','path','search','heap','bst','hash']){
      await mode(key);await noOverflow(width+' '+theme+' '+key);
      if(theme==='light'&&width===390){await page.locator('[data-exploration-studio]').scrollIntoViewIfNeeded();await shot(key+'-'+width);}
     }
    }
   }
   await page.locator('#theme-select').selectOption('light');
  });
  await check('No JavaScript errors or external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});
  console.log(JSON.stringify({verification:'Real Chromium direct interaction',checks,failures,errors,requests},null,2));
  if(failures.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
