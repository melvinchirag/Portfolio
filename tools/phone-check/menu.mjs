// The phone CM menu (top right liquid blob): closed, open, every word, tap outside, Escape.
// usage: node menu.mjs <baseUrl> <outDir> [W] [H] [debugPort] [modes]
// With a sixth argument of `modes` it also checks reduced motion and the no-WebGL fallback.
import fs from 'node:fs'
import path from 'node:path'
import { phone, sleep } from './lib.mjs'
const base = process.argv[2].replace(/\/$/, '')
const out = process.argv[3]
const W = Number(process.argv[4] || 390), H = Number(process.argv[5] || 664)
const p = await phone({ out, cpu: 2, W, H, port: Number(process.argv[6] || 9391) })
let fails = 0
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')) }

// A close-up of the top right corner at full device resolution.
let z = 0
const zoom = async (name, w = 230, h = 330) => {
  const r = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: W - w, y: Number(await p.ev('Math.round(scrollY)')) || 0, width: w, height: h, scale: 1 } })
  const f = path.join(out, 'zoom-' + String(++z).padStart(2, '0') + '-' + name + '.png')
  if (r.data) fs.writeFileSync(f, Buffer.from(r.data, 'base64'))
  return f
}
const menu = () => p.ev(`JSON.stringify((() => { const b = document.querySelector('.cm-button'); const l = document.getElementById('cm-pages'); if (!b || !l) return { missing: true }; const cs = getComputedStyle(l); return { expanded: b.getAttribute('aria-expanded'), controls: b.getAttribute('aria-controls'), label: b.getAttribute('aria-label'), inert: l.inert, vis: cs.visibility, path: location.pathname, current: (l.querySelector('[aria-current=page]')?.textContent || '').trim(), under: [...l.querySelectorAll('.cm-slot.is-under')].map(e => e.textContent.trim()).join(','), focus: document.activeElement?.className?.toString().slice(0, 20) || document.activeElement?.tagName }; })())`).then(JSON.parse)
const cm = async () => {
  const r = await p.ev(`(() => { const b = document.querySelector('.cm-button').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`)
  await p.tap(r[0], r[1])
}

await p.go(base + '/', 24000)
console.log('HOME', await p.state())

// Closed.
let m = await menu()
check('CM button exists with aria', !m.missing && m.label === 'Menu' && m.controls === 'cm-pages' && m.expanded === 'false', JSON.stringify(m))
check('closed list is inert and hidden', m.inert === true && m.vis === 'hidden')
check('old bottom row is gone', (await p.ev(`document.querySelectorAll('.mercury-menu').length`)) === 0)
const fixedLow = await p.ev(`[...document.querySelectorAll('nav, nav *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && getComputedStyle(e).visibility !== 'hidden' && b.top > innerHeight * 0.6; }).length`)
check('nothing from the menu in the lower part of the screen', fixedLow === 0, 'count ' + fixedLow)
const geo = JSON.parse(await p.ev(`JSON.stringify((() => { const b = document.querySelector('.cm-button').getBoundingClientRect(); const w = document.querySelector('header a').getBoundingClientRect(); const c = document.querySelector('.cm-menu canvas'); return { btn: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], wordmarkRight: Math.round(w.right), canvas: c ? [c.width, c.height] : null, dpr: devicePixelRatio }; })())`))
console.log('geometry', JSON.stringify(geo))
check('CM is at least 44px and clear of the wordmark', geo.btn[2] >= 44 && geo.btn[3] >= 44 && geo.btn[0] > geo.wordmarkRight + 8)
check('canvas is capped at 2x', !!geo.canvas && geo.canvas[0] <= 208 * 2 + 2, JSON.stringify(geo.canvas))
await p.shot('closed')
for (const n of ['a', 'b', 'c', 'd', 'e']) { await zoom('closed-' + n, 100, 84); await sleep(1300) }
console.log('fps closed', await p.fps(2000))

// Opening, caught on the way.
await cm(); await sleep(90); await zoom('opening-1'); await sleep(90); await zoom('opening-2'); await sleep(140); await zoom('opening-3')
await sleep(900)
m = await menu()
check('tap CM opens', m.expanded === 'true' && m.inert === false && m.vis === 'visible', JSON.stringify(m))
check('the liquid marks the current page', m.under === 'Home' && m.current === 'Home', 'under=' + m.under + ' current=' + m.current)
const rows = JSON.parse(await p.ev(`JSON.stringify([...document.querySelectorAll('#cm-pages a')].map(a => { const b = a.getBoundingClientRect(); return [a.textContent.trim(), Math.round(b.width), Math.round(b.height), Math.round(b.bottom)]; }))`))
console.log('rows', JSON.stringify(rows))
check('five words, each row at least 44px tall and on screen', rows.length === 5 && rows.every((r) => r[2] >= 44 && r[3] <= H))
await p.shot('open'); await zoom('open')
console.log('fps open', await p.fps(2000))

// CM again closes.
await cm(); await sleep(140); await zoom('closing'); await sleep(700)
m = await menu()
check('tap CM again closes', m.expanded === 'false' && m.inert === true)

// Every word.
for (const [word, want] of [['Work', '/work'], ['Vision', '/vision'], ['About', '/about'], ['Contact', '/contact'], ['Home', '/']]) {
  await cm(); await sleep(800)
  const t = await p.tapText('#cm-pages a', word)
  await sleep(120); await zoom('to-' + word.toLowerCase())
  // A heavy page (Home) can hold the main thread while it mounts: wait for the closed state, up to 8s.
  let waited = 0
  for (; waited < 8000; waited += 400) { await sleep(400); m = await menu(); if (m.path === want && m.expanded === 'false' && m.vis === 'hidden' && m.under === '') break }
  await sleep(1200)
  check(word + ' navigates and closes', m.path === want && m.expanded === 'false' && m.inert === true && m.vis === 'hidden' && m.under === '', t + ' closed after ' + (waited + 400) + 'ms -> ' + JSON.stringify(m))
  await p.shot('page-' + word.toLowerCase())
  await cm(); await sleep(900)
  m = await menu()
  check(word + ' is the marked page when reopened', m.under === word && m.current === word, 'under=' + m.under)
  await p.shot('open-on-' + word.toLowerCase())
  await cm(); await sleep(600)
}

// Tap outside closes, and the tap does not fall through to the page.
await p.go(base + '/work', 9000)
await cm(); await sleep(800)
const before = await p.state()
await p.tap(70, Math.round(H * 0.62)); await sleep(900)
m = await menu()
const after = await p.state()
check('tap outside closes', m.expanded === 'false' && m.inert === true, JSON.stringify(m))
check('the closing tap did not act on the page', before === after, before + ' vs ' + after)
await p.shot('after-tap-outside')

// Escape closes and gives focus back to CM; Tab from CM reaches the first word.
await p.ev(`document.querySelector('.cm-button').focus()`)
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
await sleep(700)
m = await menu()
check('Enter on CM opens', m.expanded === 'true')
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
await sleep(500)
const focused = await p.ev(`(document.activeElement?.textContent || '').trim()`)
check('Tab moves into the list', focused === 'Home', 'focus on "' + focused + '"')
await p.shot('keyboard-focus'); await zoom('keyboard-focus')
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await sleep(700)
m = await menu()
check('Escape closes and focus returns to CM', m.expanded === 'false' && String(m.focus).startsWith('cm-button'), JSON.stringify(m))
const tabbable = await p.ev(`[...document.querySelectorAll('#cm-pages a')].filter(a => { a.focus(); return document.activeElement === a; }).length`)
check('closed links cannot take focus', tabbable === 0, 'focusable ' + tabbable)

// Scrolled: CM stays, the wordmark may hide.
await p.go(base + '/about', 9000)
await p.drag(W / 2, H * 0.7, -420); await sleep(500); await p.drag(W / 2, H * 0.7, -420); await sleep(2500)
await p.shot('about-scrolled'); await cm(); await sleep(900); await p.shot('about-scrolled-open'); await cm(); await sleep(500)

if (process.argv[7] === 'modes') {
  // Reduced motion: the menu simply appears, nothing flows.
  await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await p.go(base + '/work', 9000)
  await zoom('reduced-closed-a', 100, 84); await sleep(1500); await zoom('reduced-closed-b', 100, 84)
  await cm(); await sleep(120)
  const words = await p.ev(`[...document.querySelectorAll('.cm-word')].map(w => { const c = getComputedStyle(w); return c.opacity + '/' + c.transform; }).join(' ')`)
  m = await menu()
  check('reduced motion: words and pill are there at once', m.under === 'Work' && words.split(' ').every((w) => w === '1/none'), words + ' under=' + m.under)
  await zoom('reduced-open'); await p.shot('reduced-open')
  await p.tapText('#cm-pages a', 'About'); await sleep(1500)
  m = await menu()
  check('reduced motion: a word navigates and closes', m.path === '/about' && m.expanded === 'false', JSON.stringify(m))
  await p.send('Emulation.setEmulatedMedia', { features: [] })

  // No WebGL for the menu canvas only: the plain disc and pill.
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (this.closest && this.closest('.cm-menu')) return null; return g.call(this, t, ...a); }; })()` })
  await p.go(base + '/vision', 9000)
  const plain = await p.ev(`document.querySelector('.cm-menu').className + ' | canvases in menu: ' + document.querySelectorAll('.cm-menu canvas').length`)
  check('no WebGL: plain mode', plain.includes('is-plain') && plain.endsWith(': 0'), plain)
  await zoom('plain-closed', 100, 84)
  await cm(); await sleep(900); await zoom('plain-open'); await p.shot('plain-open')
  await p.tapText('#cm-pages a', 'Contact'); await sleep(1800)
  m = await menu()
  check('no WebGL: a word navigates and closes', m.path === '/contact' && m.expanded === 'false', JSON.stringify(m))
}

console.log('FAILED CHECKS:', fails)
console.log('PROBLEMS:', [...new Set(p.problems)].join('\n  ') || 'none')
await p.close(); process.exit(0)
