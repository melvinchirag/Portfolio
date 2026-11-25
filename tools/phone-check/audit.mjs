// Visual audit at phone size: every hero beat, the Contact section, and each page top and scrolled.
// usage: node audit.mjs <baseUrl> <outDir> [W] [H] [cpu]
import { phone, sleep } from './lib.mjs'
const base = process.argv[2].replace(/\/$/, '')
const W = Number(process.argv[4] || 390), H = Number(process.argv[5] || 844)
const p = await phone({ out: process.argv[3], cpu: Number(process.argv[6] || 2), W, H })
const overflow = () => p.ev(`(() => { const bad = []; for (const e of document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main li, main input, main textarea, nav a')) { const b = e.getBoundingClientRect(); if (b.width === 0 || b.bottom < 0 || b.top > innerHeight) continue; const cs = getComputedStyle(e); let op = 1, n = e; while (n && n !== document.body) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; } if (op < 0.3 || cs.visibility === 'hidden') continue; if (b.right > innerWidth + 2 || b.left < -2) bad.push(e.tagName.toLowerCase() + ' "' + e.textContent.trim().slice(0, 26) + '" x=' + Math.round(b.left) + '..' + Math.round(b.right)); } return bad.slice(0, 8).join(' | ') || 'none'; })()`)

await p.go(base + '/', 24000)
console.log('HOME', await p.state(), await p.fps(2000))
const max = Number(await p.ev('document.documentElement.scrollHeight - innerHeight'))
const track = Number(await p.ev(`document.getElementById('hero-track').offsetHeight - innerHeight`))
console.log('track', track, 'max', max)
for (const [name, f] of [['beat0', 0], ['beat0b', 0.12], ['beat1', 0.25], ['beat1b', 0.38], ['beat2', 0.5], ['beat2b', 0.62], ['beat3', 0.75], ['beat3b', 0.9], ['beat4', 1]]) {
  const y = Math.round(track * f)
  // approach with real finger drags from the previous spot so touch-driven state runs too
  await p.ev(`window.scrollTo(0, ${Math.max(0, y - 120)})`); await sleep(500)
  await p.drag(W / 2, H * 0.7, -120); await sleep(3200)
  console.log(name, 'y=' + (await p.ev('Math.round(scrollY)')), '| off-screen text:', await overflow())
  await p.shot(name)
}
await p.ev(`window.scrollTo(0, ${track + 500})`); await sleep(3500); console.log('contact1 | off-screen:', await overflow()); await p.shot('contact-1')
await p.ev(`window.scrollTo(0, ${max})`); await sleep(3500); console.log('contact2 | off-screen:', await overflow(), await p.fps(2000)); await p.shot('contact-2')

for (const pg of ['work', 'vision', 'about', 'contact']) {
  await p.go(base + '/' + pg, 9000)
  console.log(pg.toUpperCase(), await p.state(), await p.fps(2000), '| off-screen:', await overflow()); await p.shot(pg + '-top')
  await p.drag(W / 2, H * 0.7, -520); await sleep(600); await p.drag(W / 2, H * 0.7, -520); await sleep(3000)
  console.log('  scrolled y=' + (await p.ev('Math.round(scrollY)')), '| off-screen:', await overflow()); await p.shot(pg + '-scrolled')
}
console.log('PROBLEMS:', [...new Set(p.problems)].join('\n  ') || 'none')
await p.close(); process.exit(0)
