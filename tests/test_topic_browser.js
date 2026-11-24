#!/usr/bin/env node
/* Real Chromium coverage for the 73-topic catalogue and the shared topic player.
 * NODE_PATH may point to an existing Playwright installation.
 * CHROMIUM_PATH selects Chrome. COURSE_SCREENSHOTS stores review images outside the repo.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const file = path.resolve(process.argv[2] || path.join(__dirname, '../index.html'));
const screenshots = process.env.COURSE_SCREENSHOTS;
const checks = [], failures = [], errors = [], requests = [];
let presetCount = 0, frameCount = 0;

async function run() {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    page.on('request', request => {if (/^https?:/.test(request.url())) requests.push(request.url());});
    if (screenshots) fs.mkdirSync(screenshots, {recursive: true});
    const shot = async name => {if (screenshots) await page.screenshot({path: path.join(screenshots, name + '.png'), fullPage: false});};
    async function check(name, action) {
      try {await action(); checks.push(name); console.log('PASS ' + name);}
      catch (error) {failures.push({name, error: error.message}); console.log('FAIL ' + name + ': ' + error.message); await shot('failure-' + failures.length);}
    }
    async function go(id) {
      await page.evaluate(id => {if (location.hash === '#' + id) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = id;}, id);
      await page.waitForFunction(id => {const node = document.getElementById(id); return location.hash === '#' + id && node && !node.closest('[hidden]');}, id);
    }
    async function overflow(label) {
      const metrics = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
      assert.ok(metrics.scrollWidth <= metrics.width, label + ': document width ' + metrics.scrollWidth + ' > ' + metrics.width);
    }
    async function openSettings(panel) {
      const settings = panel.locator('.topic-settings');
      if (await settings.count() && !await settings.evaluate(node => node.open)) await settings.locator('summary').click();
    }
    await page.goto(pathToFileURL(file).href);
    const categories = await page.locator('#category-meta').evaluate(node => JSON.parse(node.textContent));
    const panels = await page.locator('.topic-lab').evaluateAll(nodes => nodes.map(node => ({id: node.id, key: node.dataset.model, lesson: node.closest('.lesson-unit').dataset.lesson})));
    await check('Page identity, 73 categories and 56 initialized models', async () => {
      assert.ok((await page.title()).includes('資料結構'));
      assert.equal(categories.length, 73);
      assert.equal(new Set(categories.map(item => item.name)).size, 73);
      assert.equal(panels.length, 56);
      assert.equal(await page.locator('.topic-lab.is-ready').count(), 56);
      assert.equal(await page.locator('.topic-error:not([hidden])').count(), 0);
      assert.equal(await page.locator('.category-link').count(), 73);
      assert.equal(await page.locator('vite-error-overlay, nextjs-portal').count(), 0);
    });

    await check('Every category link opens its lesson and an operable model', async () => {
      for (const item of categories) {
        await go('topic-categories');
        await page.locator('.category-link').filter({has: page.getByText(item.name, {exact: true})}).click();
        await page.waitForURL(new RegExp('#' + item.lesson + '$'));
        const unit = page.locator('.lesson-unit[data-lesson="' + item.lesson + '"]');
        await unit.waitFor({state: 'visible'});
        assert.ok(await unit.isVisible(), item.name);
        const topic = unit.locator('.topic-lab[data-model="' + item.model + '"]');
        const legacy = unit.locator('[data-lab="' + item.model + '"]');
        assert.equal(await topic.count() + await legacy.count(), 1, item.name + ' model mapping');
        const panel = await topic.count() ? topic : legacy;
        const directTarget = await page.locator('[data-category-experiment]').evaluateAll(
          (links, name) => links.find(link => link.dataset.categoryExperiment === name).getAttribute('href'), item.name);
        assert.equal(directTarget, '#' + await panel.getAttribute('id'), item.name + ' direct experiment link');
        assert.ok(await unit.locator('.lesson-demo-link').count(), item.name + ' lesson shortcut');
        const next = panel.locator(await topic.count() ? '[data-topic-action="next"]' : '[data-action="next"]');
        const reset = panel.locator(await topic.count() ? '[data-topic-action="reset"]' : '[data-action="reset"]');
        await reset.click();
        assert.equal(await panel.getAttribute('data-step'), '0', item.name);
        if (await next.isEnabled()) {await next.click(); assert.equal(await panel.getAttribute('data-step'), '1', item.name);}
      }
    });

    await check('English, Chinese, group and empty catalogue filters; clear restores all', async () => {
      await go('topic-categories');
      const query = page.locator('#category-search'), group = page.locator('#category-group-filter');
      await query.fill('Segment Tree');
      assert.equal(await page.locator('.category-link:visible').count(), 1);
      assert.equal(await page.locator('.category-link:visible').getAttribute('data-category'), 'Segment Tree');
      await query.fill('線段樹');
      assert.equal(await page.locator('.category-link:visible').getAttribute('data-category'), 'Segment Tree');
      await query.fill('');
      const groupName = categories.find(item => item.name === 'Segment Tree').group;
      await group.selectOption(groupName);
      assert.equal(await page.locator('.category-link:visible').count(), categories.filter(item => item.group === groupName).length);
      await query.fill('query-with-zero-matches-987654321');
      assert.ok(await page.locator('#category-empty').isVisible());
      assert.equal(await page.locator('.category-link:visible').count(), 0);
      assert.equal(await page.locator('#category-count').innerText(), '0 / 73 類');
      await query.fill(''); await group.selectOption('');
      assert.equal(await page.locator('.category-link:visible').count(), 73);
      assert.ok(await page.locator('#category-empty').isHidden());
      await query.focus(); await page.keyboard.type('sEgMeNt   TrEe');
      assert.equal(await page.locator('.category-link:visible').getAttribute('data-category'), 'Segment Tree');
      await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
      assert.equal(await page.locator('.category-link:visible').count(), 73);
      await page.evaluate(() => scrollTo(0, 0)); await overflow('desktop catalogue'); await shot('categories-desktop');
    });

    await check('All 56 models: presets and every frame render without undefined or NaN', async () => {
      for (const [index, info] of panels.entries()) {
        await go(info.id);
        const panel = page.locator('#' + info.id);
        const stats = await panel.evaluate(panel => {
          const model = window.TopicModels[panel.dataset.model], range = panel.querySelector('.topic-timeline'), issues = [];
          let presets = 0, frames = 0;
          function inspect(expected) {
            const error = panel.querySelector('.topic-error');
            if (!error.hidden) issues.push(error.textContent);
            if (panel.querySelector('.topic-phase').textContent !== expected.title) issues.push('phase differs from model frame');
            if (panel.querySelector('.topic-explanation').textContent !== expected.explanation) issues.push('explanation differs from model frame');
            if (/\b(?:undefined|NaN)\b/.test(panel.querySelector('.topic-stage').textContent)) issues.push('undefined or NaN in rendered stage');
            for (const shape of panel.querySelectorAll('svg [d], svg [cx], svg [x]')) {
              if ([...shape.attributes].some(attribute => /\b(?:NaN|undefined|Infinity)\b/.test(attribute.value))) issues.push('invalid SVG geometry');
            }
          }
          function walk() {
            const input = Object.fromEntries([...panel.querySelectorAll('.topic-field input')].map(node => [node.name, node.value]));
            const expected = model.run(input);
            if (Number(range.max) !== expected.length - 1) issues.push('timeline length differs');
            expected.forEach((frame, step) => {range.value = String(step); range.dispatchEvent(new Event('input', {bubbles: true})); inspect(frame); frames++;});
            if (panel.dataset.done !== 'true' || !panel.querySelector('[data-topic-action="next"]').disabled) issues.push('last-frame controls');
          }
          for (const def of model.inputs) panel.querySelector('.topic-field input[name="' + def.name + '"]').value = def.value;
          panel.querySelector('form').requestSubmit(); walk();
          for (const button of panel.querySelectorAll('.topic-presets button')) {button.click(); walk(); presets++;}
          return {issues: [...new Set(issues)], presets, frames};
        });
        assert.deepEqual(stats.issues, [], info.key);
        presetCount += stats.presets; frameCount += stats.frames;
        await overflow('desktop ' + info.key);
        if ((index + 1) % 10 === 0) console.log('PROGRESS frames: ' + (index + 1) + '/' + panels.length + ' models');
      }
    });

    await check('All 56 models: next, previous, reset, range, playback and route pause', async () => {
      for (const [index, info] of panels.entries()) {
        await go(info.id); const panel = page.locator('#' + info.id);
        await panel.evaluate(panel => {
          const model = window.TopicModels[panel.dataset.model];
          for (const def of model.inputs) panel.querySelector('.topic-field input[name="' + def.name + '"]').value = def.value;
          panel.querySelector('form').requestSubmit();
        });
        assert.equal(await panel.getAttribute('data-step'), '0', info.key);
        const next = panel.locator('[data-topic-action="next"]'), previous = panel.locator('[data-topic-action="prev"]'), reset = panel.locator('[data-topic-action="reset"]');
        const maximum = Number(await panel.locator('.topic-timeline').getAttribute('max'));
        if (maximum > 0) {
          await next.click(); assert.equal(await panel.getAttribute('data-step'), '1', info.key);
          await previous.click(); assert.equal(await panel.getAttribute('data-step'), '0', info.key);
          await panel.locator('.topic-timeline').focus(); await page.keyboard.press('End');
          assert.equal(await panel.getAttribute('data-step'), String(maximum), info.key + ' keyboard timeline');
          await reset.click(); assert.equal(await panel.getAttribute('data-step'), '0', info.key);
          await panel.locator('.topic-speed').selectOption('300');
          await panel.locator('[data-topic-action="play"]').click();
          assert.equal(await panel.locator('.topic-explanation').getAttribute('aria-live'), 'off', info.key);
          await page.waitForFunction(id => Number(document.getElementById(id).dataset.step) > 0, info.id);
          if (await panel.getAttribute('data-done') !== 'true') assert.equal(await panel.getAttribute('data-playing'), 'true', info.key);
          await go('topic-categories');
          assert.equal(await panel.getAttribute('data-playing'), 'false', info.key);
          assert.equal(await panel.locator('.topic-explanation').getAttribute('aria-live'), 'polite', info.key);
          const stopped = await panel.getAttribute('data-step');
          await go(info.id);
          assert.equal(await panel.getAttribute('data-step'), stopped, info.key + ' stopped position');
          await reset.click();
        }
        if ((index + 1) % 10 === 0) console.log('PROGRESS controls: ' + (index + 1) + '/' + panels.length + ' models');
      }
    });

    await check('Input settings open and close with the keyboard', async () => {
      const info = panels.find(item => item.key === 'segment-tree'); await go(info.id);
      const panel = page.locator('#' + info.id), settings = panel.locator('.topic-settings');
      assert.equal(await settings.count(), 1);
      if (await settings.evaluate(node => node.open)) await settings.locator('summary').click();
      const summary = settings.locator('summary'); await summary.focus();
      await page.keyboard.press('Enter'); assert.equal(await settings.evaluate(node => node.open), true);
      assert.ok(await panel.locator('input[name="array"]').isVisible());
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await settings.evaluate(node => node.open), false);
      assert.ok(await panel.locator('input[name="array"]').isHidden());
      assert.ok(await panel.locator('[data-topic-action="next"]').isVisible());
    });

    await check('Invalid input receives focus and correction restores playback in place', async () => {
      const info = panels.find(item => item.key === 'segment-tree'); await go(info.id);
      const panel = page.locator('#' + info.id), field = panel.locator('input[name="array"]');
      await openSettings(panel); const route = page.url();
      await field.fill('1,,2'); await panel.locator('button[type="submit"]').click();
      assert.ok(await panel.locator('.topic-error').isVisible());
      assert.equal(await panel.locator('.topic-error').evaluate(node => node === document.activeElement), true);
      assert.ok(await panel.locator('form').getAttribute('aria-describedby'));
      await field.fill('2,1,5,3,4,6'); await panel.locator('button[type="submit"]').click();
      assert.ok(await panel.locator('.topic-error').isHidden());
      assert.equal(await panel.locator('form').getAttribute('aria-describedby'), null);
      assert.equal(page.url(), route);
      await panel.locator('[data-topic-action="next"]').click(); assert.equal(await panel.getAttribute('data-step'), '1');
    });

    await check('Self-loops, parallel edges and dark graph text remain distinct', async () => {
      const info = panels.find(item => item.key === 'euler-circuit'); await go(info.id);
      const panel = page.locator('#' + info.id);
      await openSettings(panel);
      await panel.locator('input[name="n"]').fill('2');
      await panel.locator('input[name="edges"]').fill('0-0,0-0,0-1,0-1');
      await panel.locator('button[type="submit"]').click();
      assert.ok(await panel.locator('.topic-error').isHidden());
      const paths = await panel.locator('.topic-edge').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
      assert.equal(paths.length, 4);
      assert.equal(new Set(paths).size, 4, 'parallel edges must have separate paths');
      assert.equal(paths.filter(value => value.includes(' C ')).length, 2, 'two visible self-loops');
      await page.locator('#theme-select').selectOption('dark');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      const colors = await panel.locator('.topic-node text').first().evaluate(node => ({fill: getComputedStyle(node).fill, background: getComputedStyle(node.closest('.topic-visual')).backgroundColor}));
      assert.notEqual(colors.fill, colors.background);
      await panel.locator('.topic-stage').scrollIntoViewIfNeeded(); await shot('self-loop-dark');
      await page.locator('#theme-select').selectOption('light');
      const segment = panels.find(item => item.key === 'segment-tree'); await go(segment.id);
      const tree = page.locator('#' + segment.id);
      await tree.locator('[data-topic-action="next"]').click();
      await tree.locator('.topic-stage').scrollIntoViewIfNeeded(); await shot('segment-tree-desktop');
    });

    await check('390px and 320px catalogue and all model views stay inside the page', async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({width, height: 844}); await go('topic-categories'); await overflow(width + ' catalogue');
        await page.evaluate(() => scrollTo(0, 0)); await shot('categories-mobile-' + width);
        for (const info of panels) {
          await go(info.id); const panel = page.locator('#' + info.id);
          await panel.locator('[data-topic-action="reset"]').click(); await overflow(width + ' first ' + info.key);
          await panel.locator('.topic-timeline').evaluate(node => {node.value = node.max; node.dispatchEvent(new Event('input', {bubbles: true}));});
          await overflow(width + ' last ' + info.key);
        }
      }
    });

    await check('Wide tables scroll locally with keyboard focus on a 320px viewport', async () => {
      await page.setViewportSize({width: 320, height: 844});
      const info = panels.find(item => item.key === 'suffix-array'); await go(info.id);
      const panel = page.locator('#' + info.id);
      await openSettings(panel);
      await panel.locator('input[name="text"]').fill('mississippi'); await panel.locator('button[type="submit"]').click();
      await panel.locator('[data-topic-action="next"]').click();
      const region = panel.locator('.topic-table-scroll');
      assert.equal(await region.getAttribute('tabindex'), '0');
      assert.equal(await region.getAttribute('role'), 'region');
      const dimensions = await region.evaluate(node => ({client: node.clientWidth, scroll: node.scrollWidth, overflow: getComputedStyle(node).overflowX}));
      assert.ok(dimensions.scroll > dimensions.client, 'wide data stays in a local scroll region');
      assert.ok(['auto', 'scroll'].includes(dimensions.overflow));
      await region.focus(); assert.equal(await region.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(id => document.querySelector('#' + id + ' .topic-table-scroll').scrollLeft > 0, info.id);
      await overflow('keyboard table scroll'); await shot('suffix-table-mobile-320');
      await page.setViewportSize({width: 390, height: 844});
      const segment = panels.find(item => item.key === 'segment-tree'); await go(segment.id);
      await page.locator('#' + segment.id + ' .topic-stage').scrollIntoViewIfNeeded(); await shot('segment-tree-mobile-390');
    });

    await check('No page errors or external resource requests', async () => {assert.deepEqual(errors, []); assert.deepEqual(requests, []);});
    console.log(JSON.stringify({file,verification:'Real Chrome / Playwright',viewports:[1280,390,320],categories:categories.length,models:panels.length,presets:presetCount,frames:frameCount,passed:checks.length,failures,errors,requests,screenshots},null,2));
    if (failures.length) throw Error(failures.length + ' topic-browser checks failed');
  } finally {await browser.close();}
}
run().catch(error => {console.error(error);process.exitCode = 1;});
