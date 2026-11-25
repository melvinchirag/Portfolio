// Finger-scrolls the home hero in uneven steps, lets the page come to rest each time, and checks
// that no visible text is left hanging off the screen. Then taps through the menu.
// usage: node settle.mjs <baseUrl> <outDir> [W] [H]
import { phone, sleep } from './lib.mjs'
const base = process.argv[2].replace(/\/$/, '')
const W = Number(process.argv[4] || 390), H = Number(process.argv[5] || 844)
const p = await phone({ out: process.argv[3], cpu: 2, W, H })
const overflow = () => p.ev(`(() => { const bad = []; for (const e of document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main li')) { const b = e.getBoundingClientRect(); if (b.width === 0 || b.bottom < 0 || b.top > innerHeight) continue; let op = 1, n = e; while (n && n !== document.body) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; } if (op < 0.25) continue; if (e.closest('[data-rail], .rail, [class*=overflow-x]')) continue; if (b.right > innerWidth + 2 || b.left < -2) bad.push(e.tagName.toLowerCase() + ' "' + e.textContent.trim().slice(0, 22) + '" x=' + Math.round(b.left) + '..' + Math.round(b.right) + ' op=' + op.toFixed(2)); } return bad.slice(0, 5).join(' | ') || 'none'; })()`)
const pos = () => p.ev(`(() => { const el = document.getElementById('hero-track'); const r = el.getBoundingClientRect(); const sc = r.height - innerHeight; return (Math.max(0, Math.min(1, -r.top / sc)) * 3).toFixed(2); })()`)

await p.go(base + '/', 24000)
console.log('HOME', await p.state())
let bad = 0
const steps = [-150, -260, -90, -310, -200, -120, -280, -170, -240, -330, -110, -210, -260, -190, -300, -230, 180, 260, -140]
for (let i = 0; i < steps.length; i++) {
  await p.drag(W / 2, H * (0.45 + 0.3 * ((i * 7) % 5) / 5), steps[i]); await sleep(2600)
  const o = await overflow()
  if (o !== 'none') bad++
  console.log(String(i + 1).padStart(2), 'drag', String(steps[i]).padStart(5), '-> y=' + (await p.ev('Math.round(scrollY)')), 'frame pos', await pos(), '| cut off:', o)
  await p.shot('rest-' + String(i + 1).padStart(2, '0'))
}
console.log('RESTING STATES WITH CUT-OFF TEXT:', bad, 'of', steps.length)
console.log('fps', await p.fps(2500))
await p.ev('window.scrollTo(0, 0)'); await sleep(2500)
for (const word of ['Work', 'Vision', 'About', 'Contact', 'Home']) {
  console.log(await p.tapText('a', word)); await sleep(4500)
  console.log('  ->', await p.state())
}
console.log('PROBLEMS:', [...new Set(p.problems)].join('\n  ') || 'none')
await p.close(); process.exit(0)
