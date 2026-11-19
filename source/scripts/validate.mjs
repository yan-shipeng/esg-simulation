import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: false }, logLevel: 'error' })
await server.listen()
const address = server.httpServer.address()
if (!address || typeof address === 'string') throw new Error('No validation port')
const url = `http://127.0.0.1:${address.port}/`
let browser

try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await mkdir('validation', { recursive: true })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('.campus-canvas canvas').waitFor()
  await page.waitForTimeout(1200)

  assert.match(await page.locator('h1').innerText(), /让转型/)
  assert.equal((await page.locator('.resource-metric strong').innerText()).trim(), '60')
  assert.match(await page.locator('.support-heading strong').innerText(), /38/)
  assert.equal((await page.locator('.profile-identity h2').innerText()).trim(), '可持续发展总监')
  assert.equal((await page.locator('.turn-stepper').innerText()).replace(/\s/g, ''), '01选择行动02选择职位03执行行动')
  assert.ok(!(await page.locator('body').innerText()).includes('林岚'))
  await page.screenshot({ path: 'validation/campus-initial.png', fullPage: true })

  await page.locator('.language-toggle').click()
  assert.match(await page.locator('h1').innerText(), /Transformation starts/)
  assert.equal((await page.locator('.profile-identity h2').innerText()).trim(), 'Sustainability Director')
  assert.ok(!(await page.locator('body').innerText()).includes('Lin Lan'))
  assert.ok((await page.locator('.action-list').innerText()).includes('Co-creation Workshop'))
  await page.reload({ waitUntil: 'networkidle' })
  assert.match(await page.locator('h1').innerText(), /Transformation starts/, 'Language preference should survive refresh')
  assert.equal((await page.locator('.resource-metric strong').innerText()).trim(), '60')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'validation/campus-english.png', fullPage: true })
  await page.locator('.language-toggle').click()
  assert.match(await page.locator('h1').innerText(), /让转型/)

  assert.ok(await page.locator('.execution-block .execute-button').isDisabled(), 'Execution requires action and target selection')
  await page.locator('.action-card').filter({ hasText: '一对一沟通' }).click()
  assert.match(await page.locator('.turn-stepper > div').nth(1).getAttribute('class'), /active/)
  await page.locator('.connection-list button').first().click()
  assert.match(await page.locator('.turn-stepper > div').nth(2).getAttribute('class'), /active/)
  await page.locator('.execution-block .execute-button').click()
  await page.waitForFunction(() => document.querySelector('.week-display strong')?.textContent?.includes('02'))
  assert.equal((await page.locator('.resource-metric strong').innerText()).trim(), '56')
  const supportAfterAction = await page.locator('.support-heading strong').innerText()
  assert.ok(!supportAfterAction.includes('38'), 'Support should change after an action')
  await page.waitForTimeout(450)
  await page.screenshot({ path: 'validation/campus-after-action.png', fullPage: true })

  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.campus-canvas canvas').waitFor()
  assert.match(await page.locator('.week-display strong').innerText(), /02/)
  assert.equal((await page.locator('.resource-metric strong').innerText()).trim(), '56')
  await page.locator('.connection-list button').first().click()
  assert.equal(await page.locator('.support-heading strong').innerText(), supportAfterAction)

  await page.locator('.icon-button[aria-label="重新开始"]').click()
  assert.match(await page.locator('.week-display strong').innerText(), /01/)
  assert.equal((await page.locator('.resource-metric strong').innerText()).trim(), '60')
  assert.match(await page.locator('.support-heading strong').innerText(), /38/)

  await page.locator('.action-card').filter({ hasText: '共创工作坊' }).click()
  await page.locator('.connection-list button').first().click()
  await page.locator('.execution-block .execute-button').click()
  await page.waitForFunction(() => document.querySelector('.week-display strong')?.textContent?.includes('02'))
  assert.equal((await page.locator('.resource-metric strong').innerText()).trim(), '52')
  assert.match(await page.locator('.turn-toast').innerText(), /支持度/)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  const mobileLayout = await page.evaluate(() => {
    const button = document.querySelector('.execution-block .execute-button')?.getBoundingClientRect()
    const actions = document.querySelector('.action-list')
    return { bodyHeight: document.body.scrollHeight, viewportHeight: innerHeight, buttonTop: button?.top, buttonBottom: button?.bottom, horizontalActions: actions ? actions.scrollWidth > actions.clientWidth : false }
  })
  assert.ok(mobileLayout.bodyHeight <= mobileLayout.viewportHeight + 1, 'Mobile core loop must fit one screen')
  assert.ok(mobileLayout.buttonTop >= 0 && mobileLayout.buttonBottom <= mobileLayout.viewportHeight, 'Execute button must stay visible')
  assert.ok(mobileLayout.horizontalActions, 'Actions should use a horizontal deck on mobile')
  await page.screenshot({ path: 'validation/campus-mobile.png', fullPage: true })

  await page.locator('.profile-open-button').click()
  await page.locator('.profile-panel.mobile-open').waitFor()
  await page.locator('.profile-close').click()
  await page.locator('.action-card').filter({ hasText: '一对一沟通' }).click()
  await page.locator('.profile-open-button').click()
  await page.locator('.connection-list button').first().click()
  await page.locator('.execution-block .execute-button').click()
  await page.waitForFunction(() => document.querySelector('.week-display strong')?.textContent?.includes('03'))
  assert.match(await page.locator('.turn-stepper > div').first().getAttribute('class'), /active/)
  assert.equal(await page.evaluate(() => window.scrollY), 0)
  assert.equal(await page.locator('.campus-canvas canvas').count(), 1)
  assert.deepEqual(pageErrors, [])

  console.log(JSON.stringify({
    result: 'passed',
    checks: ['3D scene rendered', 'Chinese and English UI switched', 'language preference survived refresh', 'game state unchanged by language switch', 'action changed week/resources/support', 'feedback rendered', 'save restored after refresh', 'restart reset state', 'second action executed', 'mobile core loop fits one screen', 'execute button stays visible', 'profile drawer opens and closes', 'next turn continues without vertical scrolling', 'no page errors'],
    screenshots: ['validation/campus-initial.png', 'validation/campus-english.png', 'validation/campus-after-action.png', 'validation/campus-mobile.png'],
  }, null, 2))
} finally {
  if (browser) await browser.close()
  await server.close()
}
