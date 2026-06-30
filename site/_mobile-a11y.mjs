import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const OUT = 'C:/Users/hudee/AppData/Local/Temp/claude/E--shineup-archify/26ec9fd8-a96a-4917-a95f-6b8c72964c2c/scratchpad';
const URL = 'http://localhost:4321/';

const viewports = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-12', width: 390, height: 844 },
];

const browser = await chromium.launch();

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('#detects').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  // ---- horizontal overflow audit ----
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const offenders = [];
    const sec = document.querySelector('#detects');
    const els = sec ? sec.querySelectorAll('*') : [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      // element pushes past the right edge of the viewport
      if (r.right > docW + 1 || r.left < -1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 70),
          text: (el.textContent || '').trim().slice(0, 40),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    }
    return {
      docClientW: docW,
      bodyScrollW: document.body.scrollWidth,
      htmlScrollW: document.documentElement.scrollWidth,
      pageOverflows: document.documentElement.scrollWidth > docW + 1,
      offenders: offenders.slice(0, 12),
    };
  });

  // screenshot the detects section
  const box = await page.locator('#detects').boundingBox();
  if (box) {
    await page.screenshot({
      path: `${OUT}/detects-${vp.name}.png`,
      clip: { x: 0, y: box.y, width: vp.width, height: Math.min(box.height, 2600) },
    });
  }

  // ---- axe a11y scan (inject from CDN) ----
  let axeResult = { error: null, violations: [] };
  try {
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await page.evaluate(async () => {
      // scope to whole page; report serious/critical first
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 4).map((n) => ({
          target: n.target.join(' '),
          summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 160),
        })),
      }));
    });
    axeResult.violations = res;
  } catch (e) {
    axeResult.error = String(e).slice(0, 200);
  }

  console.log(`\n================ ${vp.name} (${vp.width}x${vp.height}) ================`);
  console.log('overflow:', JSON.stringify({
    docClientW: overflow.docClientW,
    htmlScrollW: overflow.htmlScrollW,
    pageOverflows: overflow.pageOverflows,
  }));
  if (overflow.offenders.length) {
    console.log('OFFENDERS (inside #detects past viewport):');
    for (const o of overflow.offenders) console.log('  ', JSON.stringify(o));
  } else {
    console.log('no #detects offenders past viewport edge');
  }
  console.log('axe error:', axeResult.error);
  console.log(`axe violations: ${axeResult.violations.length}`);
  for (const v of axeResult.violations) {
    console.log(`  [${v.impact}] ${v.id} — ${v.help}`);
    for (const n of v.nodes) console.log(`      @ ${n.target}  :: ${n.summary}`);
  }

  fs.writeFileSync(`${OUT}/report-${vp.name}.json`, JSON.stringify({ overflow, axe: axeResult }, null, 2));
  await ctx.close();
}

await browser.close();
console.log('\nDONE');
