// Desktop guard for the phone CM menu: at 1440x900 the row and island menu must be what it was.
// Prints the menu's geometry on Home (row) and Work (island); give a second base URL to compare.
// usage: node menu-desktop.mjs <baseUrl> <outDir> [otherBaseUrl] [debugPort]
import { phone, sleep } from './lib.mjs'
const out = process.argv[3]
const W = 1440, H = 900
const geo = (p) => p.ev(`JSON.stringify((() => { const n = document.querySelector('.mercury-menu'); if (!n) return { missing: true, cm: document.querySelectorAll('.cm-menu, .cm-scrim').length }; const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }; const c = n.querySelector('canvas'); return { form: n.dataset.form, nav: r(n), canvas: c ? [c.width, c.height] : null, items: [...n.querySelectorAll('a')].map(a => [a.textContent.trim(), ...r(a), getComputedStyle(a).fontSize]), cm: document.querySelectorAll('.cm-menu, .cm-scrim, .cm-button').length, wordmark: r(document.querySelector('header a')) }; })())`)
const run = async (base, tag) => {
  const p = await phone({ out, cpu: 1, W, H, DPR: 1, port: Number(process.argv[5] || 9393) })
  const res = {}
  await p.go(base + '/', 24000)
  res.home = await geo(p); await p.shot(tag + '-home')
  console.log(tag, 'HOME', await p.state(), '\n ', res.home)
  for (const [word, want] of [['Work', '/work'], ['About', '/about'], ['Vision', '/vision'], ['Contact', '/contact'], ['Home', '/']]) {
    console.log(' ', await p.tapText('.mercury-menu a', word)); await sleep(3500)
    const path = await p.ev('location.pathname')
    const g = await geo(p)
    // On the island pages the open bar relaxes shut; wait for the resting state before measuring.
    res[word] = g
    console.log(' ', (path === want ? 'ok   ' : 'FAIL ') + word + ' -> ' + path + ' form=' + JSON.parse(g).form)
    await p.shot(tag + '-' + word.toLowerCase())
  }
  console.log(tag, 'PROBLEMS:', [...new Set(p.problems)].join('\n  ') || 'none')
  await p.close()
  return res
}
const a = await run(process.argv[2].replace(/\/$/, ''), 'this')
if (process.argv[4]) {
  const b = await run(process.argv[4].replace(/\/$/, ''), 'other')
  for (const k of Object.keys(a)) console.log((a[k] === b[k] ? 'same ' : 'DIFF ') + k + (a[k] === b[k] ? '' : '\n  this  ' + a[k] + '\n  other ' + b[k]))
}
process.exit(0)
