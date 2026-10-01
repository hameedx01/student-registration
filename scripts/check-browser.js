import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Inspect the running app without a connected wallet; no transactions are possible here.
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.locator('tbody tr').first().waitFor({ timeout: 60_000 });
  const students = await page.locator('tbody tr').count();
  await page.screenshot({
    path: '/private/tmp/campus-live-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '/private/tmp/campus-live-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('body *')]
      .filter(
        (element) =>
          element.getBoundingClientRect().right > innerWidth + 1 &&
          !element.closest('.table-scroll'),
      )
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: element.getBoundingClientRect().right,
      })),
  }));
  console.log(JSON.stringify({ students, errors, layout }, null, 2));
  assert.equal(errors.length, 0, 'No browser runtime errors expected.');
  assert.ok(layout.scrollWidth <= layout.width, 'The mobile page must not overflow horizontally.');
} finally {
  await browser.close();
}
