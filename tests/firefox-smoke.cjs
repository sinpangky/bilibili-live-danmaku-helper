'use strict'

const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { packageArchive } = require('../scripts/package.cjs')
const { availablePort, startFixtureServer } = require('./run-browser-e2e.cjs')

async function main() {
  const manifest = require('../build/firefox/manifest.json')
  const addonId = manifest.browser_specific_settings.gecko.id
  const uuid = randomUUID()
  const { destination } = packageArchive({ browser: 'firefox' })
  const fixturePort = await availablePort()
  const fixture = await startFixtureServer(fixturePort)
  const driverPort = await availablePort()
  const driver = spawn(process.env.DANMAKU_GECKODRIVER || 'geckodriver', [
    '--port', String(driverPort), '--allow-system-access',
  ], { stdio: ['ignore', 'ignore', 'inherit'] })
  let driverError
  driver.on('error', (error) => { driverError = error })
  let session = ''

  async function request(method, route, body) {
    const response = await fetch(`http://127.0.0.1:${driverPort}${session}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30000),
    })
    const { value } = await response.json()
    if (!response.ok) throw new Error(value.message)
    return value
  }

  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (driverError) throw driverError
      try {
        await request('GET', '/status')
        break
      } catch (error) {
        if (attempt === 49) throw error
        await delay(100)
      }
    }

    const started = await request('POST', '/session', { capabilities: { alwaysMatch: {
      browserName: 'firefox',
      'moz:firefoxOptions': {
        binary: process.env.DANMAKU_E2E_FIREFOX_PATH,
        args: ['-headless'],
        prefs: {
          'extensions.webextensions.uuids': JSON.stringify({ [addonId]: uuid }),
          'network.dns.localDomains': 'live.bilibili.com',
          'network.proxy.type': 0,
          'network.trr.mode': 5,
          'network.stricttransportsecurity.preloadlist': false,
          'dom.security.https_first': false,
          'dom.security.https_only_mode': false,
        },
      },
    } } })
    session = `/session/${started.sessionId}`
    assert.equal(await request('POST', '/moz/addon/install', {
      path: path.resolve(destination), temporary: true,
    }), addonId)

    const scenarios = ['/123', '/123?fullscreen=1', '/activity?activity=1']
    for (const route of scenarios) {
      await request('POST', '/url', { url: `http://live.bilibili.com:${fixturePort}${route}` })
      const embedded = route.startsWith('/activity')
      const data = await request('POST', '/execute/async', {
        args: [embedded],
        script: `const [embedded, done] = arguments;
          const deadline = Date.now() + 10000;
          const timer = setInterval(() => {
            const doc = embedded ? document.querySelector('iframe')?.contentDocument : document;
            const data = doc?.body?.dataset;
            if (data?.bilibiliTextApiSends || Date.now() >= deadline) {
              clearInterval(timer);
              done({ ...data });
            }
          }, 100);`,
      })
      assert.equal(data.bilibiliTextApiSends, '1', route)
      assert.equal(data.bilibiliSent, 'B站单条弹幕', route)
      assert.equal(data.bilibiliSendMethod, 'page-api', route)
    }

    await request('POST', '/url', { url: `moz-extension://${uuid}/index.html` })
    const rendered = await request('POST', '/execute/sync', {
      script: 'return document.body.innerText', args: [],
    })
    assert.ok(rendered.includes(`v${manifest.version}`) && rendered.includes('发送日志'))
    const logs = (operation) => request('POST', '/execute/async', {
      args: [operation],
      script: `const [operation, done] = arguments;
        browser.runtime.sendMessage({ type: 'danmaku-echo.send-log', operation })
          .then(done, error => done({ error: String(error) }));`,
    })
    assert.equal((await logs('list')).entries.filter((entry) => entry.success).length, scenarios.length)
    assert.ok((await logs('clear')).ok)
    assert.deepEqual((await logs('list')).entries, [])
    console.log(`Firefox ${started.capabilities.browserVersion} passed: normal, fullscreen, embedded, settings and logs.`)
  } finally {
    try {
      if (session) await request('DELETE', '')
    } finally {
      driver.kill()
      fixture.kill()
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
