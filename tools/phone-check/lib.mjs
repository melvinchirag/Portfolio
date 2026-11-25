// Shared phone-emulation helpers (headless Chrome over the DevTools protocol, Node built-ins only).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function phone({ out, cpu = 4, W = 390, H = 844, DPR = 3, port = 9377 }) {
  fs.mkdirSync(out, { recursive: true })
  const profile = path.resolve(out, '..', 'chrome-prof-' + Date.now())
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' })
  let targets = null
  for (let i = 0; i < 80 && !targets; i++) {
    await sleep(250)
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { /* not up yet */ }
  }
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  const problems = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); return }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      problems.push('EXCEPTION: ' + (d.exception?.description || d.text).slice(0, 400))
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      problems.push(m.params.type.toUpperCase() + ': ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    } else if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
      problems.push('LOG ' + m.params.entry.level + ': ' + m.params.entry.text.slice(0, 300) + ' ' + (m.params.entry.url || '').slice(-60))
    } else if (m.method === 'Inspector.targetCrashed') problems.push('PAGE CRASHED')
  }
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, (m) => res(m.result ?? m)); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return r.result?.value ?? ('ERR ' + JSON.stringify(r.exceptionDetails?.exception?.description || r).slice(0, 300))
  }
  let n = 0
  const shot = async (name) => {
    // clip is in PAGE coordinates, so follow the scroll position to capture what is on screen
    const sy = Number(await ev('Math.round(scrollY)')) || 0
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 55, clip: { x: 0, y: sy, width: W, height: H, scale: 1 / DPR } })
    const f = path.join(out, String(++n).padStart(2, '0') + '-' + name + '.jpg')
    if (r.data) fs.writeFileSync(f, Buffer.from(r.data, 'base64'))
    return f
  }
  const fps = (ms = 3000) => ev(`new Promise(res => { let c = 0, worst = 0, last = performance.now(); const t0 = last; function f(t){ c++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ${ms}) requestAnimationFrame(f); else res(Math.round(c * 1000 / (t - t0)) + ' fps, worst ' + Math.round(worst) + ' ms'); } requestAnimationFrame(f); })`)
  /** A real finger drag: touchStart, moves, touchEnd. dy < 0 drags the finger up (scrolls down). */
  const drag = async (x, y, dy, steps = 12) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / steps }] })
      await sleep(16)
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const tap = async (x, y) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await sleep(60)
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const tapText = async (sel, text) => {
    const r = await ev(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.textContent.trim().toLowerCase() === ${JSON.stringify(text.toLowerCase())}).map(e => e.getBoundingClientRect()).filter(b => b.width > 0 && b.top >= 0 && b.bottom <= innerHeight); const b = els[els.length - 1]; if (!b) return null; return [b.left + b.width / 2, b.top + b.height / 2]; })()`)
    if (!Array.isArray(r)) return 'no on-screen element "' + text + '"'
    await tap(r[0], r[1])
    return 'tapped ' + text + ' at ' + r.map(Math.round)
  }
  const state = () => ev(`JSON.stringify({ path: location.pathname, y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight, docW: document.documentElement.scrollWidth, h1: (document.querySelector('h1')?.textContent || '').slice(0, 24), canvases: document.querySelectorAll('canvas').length })`)
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', platform: 'iPhone' })
  if (cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu })
  const go = async (url, wait = 4000) => { await send('Page.navigate', { url }); await sleep(wait) }
  const close = async () => {
    ws.close(); proc.kill(); await sleep(500)
    try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* leave it */ }
  }
  return { send, ev, shot, fps, drag, tap, tapText, state, go, close, problems, W, H }
}
