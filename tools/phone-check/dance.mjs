// The phone hero dance, as a film strip. Loads Home as a phone, shoots the first screen (glyphs
// only), the forming burst on the way to The Past, a strip of frames at rest on The Past, The
// Present and The Future, the Contact section, a tap on a mask, and the trip back to the top.
// With ?dancedebug the page publishes where the three masks are, so this also draws their trails
// (one picture of the whole path) and prints how long they spend over the text.
// usage: node dance.mjs <baseUrl> <outDir> [W] [H] [cpu] [stages]
//   stages: comma list of first,form,past,present,future,contact,tap,back (default all)
import { phone, sleep } from './lib.mjs'
const base = process.argv[2].replace(/\/$/, '')
const W = Number(process.argv[4] || 390), H = Number(process.argv[5] || 664)
const cpu = Number(process.argv[6] || 2)
const want = (process.argv[7] || 'first,form,past,present,future,contact,tap,back').split(',')
// its own debugging port, so it can run beside the other phone-check scripts (they use 9377)
const p = await phone({ out: process.argv[3], cpu, W, H, port: 9392 })
// a hard stop: a dead browser connection must never leave this script waiting for ever
setTimeout(() => { console.log('TIMED OUT after 225 s'); try { p.close() } catch { /* gone */ } process.exit(2) }, 225000).unref()
const t0 = Date.now()
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6), ...a)

const pos = async () => Number(await p.ev(`(() => { const el = document.getElementById('hero-track'); const r = el.getBoundingClientRect(); const sc = r.height - innerHeight; return (Math.max(0, Math.min(1, -r.top / sc)) * 3).toFixed(3); })()`))
const dbg = () => p.ev(`(() => { const d = window.__dance; if (!d) return 'no debug hook'; return 'form ' + d.form.map(v => v.toFixed(2)).join(' ') + ' | move ' + d.move + ' | xy ' + [0,1,2].map(k => Math.round(d.x[k]) + ',' + Math.round(d.y[k])).join('  ') + ' | dim ' + d.dim.map(v => v.toFixed(2)).join(' '); })()`)

// Trails: an overlay canvas that follows the published mask centres. One picture shows the path.
const trailsOn = () => p.ev(`(() => { if (!window.__dance) return 'no hook'; let c = document.getElementById('__trail'); if (!c) { c = document.createElement('canvas'); c.id = '__trail'; c.width = innerWidth; c.height = innerHeight; c.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none'; document.body.appendChild(c); } const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([4, 4]); g.strokeRect(0.5, 58.5, innerWidth - 1, innerHeight - 58 - 70); g.setLineDash([]); const cols = ['#5cf', '#f6c', '#8f6']; const last = [null, null, null]; const st = window.__trailStat = { n: 0, inText: [0, 0, 0], minGap: 1e9, maxV: 0 }; window.__trailRun = true; let lt = performance.now(); function f(t) { if (!window.__trailRun) return; const d = window.__dance; const dt = Math.max(1, t - lt); lt = t; st.n++; for (let k = 0; k < 3; k++) { const x = d.x[k], y = d.y[k]; if (last[k]) { g.strokeStyle = cols[k]; g.globalAlpha = 0.25 + 0.75 * d.form[k]; g.lineWidth = 2; g.beginPath(); g.moveTo(last[k][0], last[k][1]); g.lineTo(x, y); g.stroke(); st.maxV = Math.max(st.maxV, Math.hypot(x - last[k][0], y - last[k][1]) / dt * 1000); } last[k] = [x, y]; if (d.dim[k] > 0.5) st.inText[k]++; for (let j = k + 1; j < 3; j++) st.minGap = Math.min(st.minGap, Math.hypot(x - d.x[j], y - d.y[j])); } requestAnimationFrame(f); } requestAnimationFrame(f); return 'trails on'; })()`)
const trailsOff = async () => {
  const s = await p.ev(`(() => { window.__trailRun = false; const s = window.__trailStat; if (!s) return 'no stats'; return 'samples ' + s.n + ' | share of time over text ' + s.inText.map(v => Math.round(100 * v / s.n) + '%').join(' ') + ' | closest two masks came ' + Math.round(s.minGap) + 'px | top speed ' + Math.round(s.maxV) + 'px/s'; })()`)
  await p.ev(`document.getElementById('__trail')?.remove()`)
  return s
}

/** Finger-drag until the hero rests on frame k (pos within the hold zone), then wait for the settle. */
async function toFrame(k) {
  for (let i = 0; i < 14; i++) {
    const at = await pos()
    const need = k - at
    if (Math.abs(need) <= 0.22) break
    const dy = -Math.sign(need) * Math.min(230, Math.max(70, Math.abs(need) * H * 0.55))
    await p.drag(W / 2, H * 0.6, dy); await sleep(650)
  }
  await sleep(2400)
  return pos()
}
async function strip(name, count = 12, gap = 350) {
  for (let i = 0; i < count; i++) { await p.shot(name + '-' + String(i + 1).padStart(2, '0')); await sleep(gap) }
}
async function trailShot(name, secs) {
  if ((await trailsOn()) !== 'trails on') return
  await sleep(secs * 1000)
  await p.shot(name + '-TRAIL')
  log('  trail', name, '|', await trailsOff())
}

await p.go(base + '/?dancedebug', 24000)
log('HOME', W + 'x' + H, 'cpu x' + cpu, await p.state())

if (want.includes('first')) {
  await p.shot('first-a'); await sleep(1500); await p.shot('first-b')
  // a crop at the screen's real pixel density, to judge whether the glyphs read as glyphs
  { const r = await p.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 0, y: 40, width: W, height: 300, scale: 2 / 3 } }); if (r.data) (await import('node:fs')).writeFileSync(process.argv[3] + '/00-first-zoom.jpg', Buffer.from(r.data, 'base64')) }
  log('first screen', await dbg(), '| fps', await p.fps(2500))
  // a small scroll that stays on the first screen must NOT bring the masks out
  await p.drag(W / 2, H * 0.6, -40); await sleep(2600)
  log('small scroll, pos', await pos(), await dbg()); await p.shot('first-small-scroll')
  await p.ev('window.scrollTo(0, 0)'); await sleep(1200)
}

if (want.includes('form')) {
  // FORMING: two quick drags toward The Past, shooting a burst while it happens.
  await p.drag(W / 2, H * 0.62, -230, 10)
  await p.shot('form-01'); log('form burst starts, pos', await pos(), await dbg())
  await p.drag(W / 2, H * 0.62, -230, 10)
  for (let i = 2; i <= 9; i++) { await p.shot('form-' + String(i).padStart(2, '0')); if (i % 3 === 0) log('  form', i, 'pos', await pos(), await dbg()); await sleep(160) }
  await sleep(1500); await p.shot('form-10-after'); log('formed? pos', await pos(), await dbg())
}

for (const [name, k, secs] of [['past', 1, 11], ['present', 2, 11], ['future', 3, 13]]) {
  if (!want.includes(name)) continue
  log(name.toUpperCase(), 'rest at pos', await toFrame(k), await dbg())
  await strip(name)
  log('  fps', await p.fps(2500))
  await trailShot(name, secs)
}

if (want.includes('tap')) {
  // TOUCH: tap the first mask where it is right now; it should burst into glyphs and re-form.
  await toFrame(2)
  const at = await p.ev(`(() => { const d = window.__dance; return d ? [d.x[0], d.y[0]] : null })()`)
  if (Array.isArray(at)) {
    await p.shot('tap-00-before')
    await p.tap(at[0], at[1])
    for (let i = 1; i <= 8; i++) { await sleep(140); await p.shot('tap-' + String(i).padStart(2, '0')); if (i % 2 === 1) log('  tap', i, await dbg()) }
    await sleep(1600); await p.shot('tap-09-after'); log('after tap', await dbg())
  } else log('tap skipped: no debug hook')
  // a flick: the tempo should rise and settle, with no snap when the direction reverses
  if ((await trailsOn()) === 'trails on') {
    await p.drag(W / 2, H * 0.6, -60, 4); await p.drag(W / 2, H * 0.6, 60, 4); await p.drag(W / 2, H * 0.6, -60, 4); await p.drag(W / 2, H * 0.6, 60, 4)
    await sleep(3500); await p.shot('flick-TRAIL'); log('  flick', await trailsOff())
  }
}

if (want.includes('contact')) {
  await toFrame(3)
  for (let i = 0; i < 5; i++) { await p.drag(W / 2, H * 0.62, -230); await sleep(500) }
  await sleep(2800)
  log('CONTACT y', await p.ev('Math.round(scrollY)'), await dbg(), '| fps', await p.fps(2500))
  await strip('contact', 3, 700)
  for (let i = 0; i < 2; i++) { await p.drag(W / 2, H * 0.62, -230); await sleep(500) }
  await sleep(2500); await p.shot('contact-lower'); log('contact lower y', await p.ev('Math.round(scrollY)'), await dbg())
}

if (want.includes('back')) {
  // BACK TO THE TOP: the masks must loosen into glyphs and be gone on the first screen.
  await p.ev(`window.scrollTo(0, Math.round(innerHeight * 1.0))`); await sleep(2600)
  log('back on The Past, pos', await pos(), await dbg()); await p.shot('back-00-past')
  await p.drag(W / 2, H * 0.4, 230, 10)
  await p.drag(W / 2, H * 0.4, 230, 10)
  for (let i = 1; i <= 7; i++) { await p.shot('back-' + String(i).padStart(2, '0')); if (i % 2 === 1) log('  back', i, 'pos', await pos(), await dbg()); await sleep(170) }
  await p.drag(W / 2, H * 0.4, 230, 10); await sleep(2800)
  await p.shot('back-08-top'); log('top again, pos', await pos(), await dbg(), '| fps', await p.fps(2500))
}

log('PROBLEMS:', [...new Set(p.problems)].join('\n  ') || 'none')
await p.close(); process.exit(0)
