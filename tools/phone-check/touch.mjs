// Does a finger drag scroll the page? Tries drags starting at several heights on Home, then on Work.
// usage: node touch.mjs <baseUrl> <outDir>
import { phone, sleep } from './lib.mjs'
const base = process.argv[2].replace(/\/$/, '')
const p = await phone({ out: process.argv[3], cpu: 1 })
const y = async () => p.ev('Math.round(scrollY)')
const what = (x, yy) => p.ev(`(() => { const e = document.elementFromPoint(${x}, ${yy}); if (!e) return 'nothing'; const chain = []; let n = e; while (n && n !== document.documentElement && chain.length < 5) { const cs = getComputedStyle(n); chain.push(n.tagName.toLowerCase() + '.' + String(n.className || '').split(' ').slice(0, 2).join('.') + '[ta=' + cs.touchAction + ',pe=' + cs.pointerEvents + ']'); n = n.parentElement; } return chain.join(' < '); })()`)

await p.go(base + '/', 22000)
console.log('HOME loaded', await p.state())
console.log('html/body:', await p.ev(`JSON.stringify({ htmlTA: getComputedStyle(document.documentElement).touchAction, bodyTA: getComputedStyle(document.body).touchAction, htmlOv: getComputedStyle(document.documentElement).overflowY, bodyOv: getComputedStyle(document.body).overflowY, htmlClass: document.documentElement.className, bodyClass: document.body.className, htmlH: getComputedStyle(document.documentElement).height, bodyH: getComputedStyle(document.body).height })`))
for (const fy of [0.15, 0.35, 0.58, 0.75, 0.9]) {
  const yy = Math.round(p.H * fy)
  await p.ev('window.scrollTo(0, 0)'); await sleep(600)
  console.log(`\nat y=${yy}:`, await what(195, yy))
  await p.drag(195, yy, -300); await sleep(1200)
  console.log('  after drag up 300 -> scrollY', await y())
}
await p.ev('window.scrollTo(0, 0)'); await sleep(500)
await p.send('Input.synthesizeScrollGesture', { x: 195, y: 300, yDistance: -500, gestureSourceType: 'touch', speed: 800 }); await sleep(1500)
console.log('\nsynth gesture at y=300 -> scrollY', await y())
await p.shot('home-after-drags')

await p.go(base + '/work', 9000)
console.log('\nWORK loaded', await p.state())
await p.drag(195, 500, -300); await sleep(1200)
console.log('  after drag up 300 -> scrollY', await y())
console.log('\nPROBLEMS:', [...new Set(p.problems)].join('\n  ') || 'none')
await p.close(); process.exit(0)
