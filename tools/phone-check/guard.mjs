// Slows the CPU hard and checks that the phone quality guard lowers the canvas resolution, without errors.
import { phone, sleep } from './lib.mjs'
const p = await phone({ out: process.argv[3], cpu: Number(process.argv[4] || 20), W: 390, H: 664, DPR: 3 })
const info = () => p.ev(`(() => { const c = [...document.querySelectorAll('canvas')].find(c => getComputedStyle(c.parentElement.parentElement).position === 'fixed' || c.clientWidth === innerWidth && c.clientHeight === innerHeight); return c ? 'main canvas backing ' + c.width + 'x' + c.height + ' (css ' + c.clientWidth + 'x' + c.clientHeight + ', ratio ' + (c.width / c.clientWidth).toFixed(2) + ')' : 'no canvas'; })()`)
await p.go(process.argv[2], 6000)
for (let i = 0; i < 6; i++) { console.log((6 + i * 7) + 's', await info(), '|', await p.fps(2000)); await sleep(5000) }
await p.shot('throttled')
console.log('PROBLEMS:', [...new Set(p.problems)].filter(x => !/Clock|insights/.test(x)).join('\n  ') || 'none')
await p.close(); process.exit(0)
