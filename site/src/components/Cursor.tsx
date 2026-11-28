/* ============================================================================
 * Cursor.tsx: a light-edged pointer that morphs into a hand (desktop only)
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-27: he loved the arrow turning into a hand, but the pixel
 * style read as retro; he wants it to look like something from 2099. So the
 * shape is one vector outline, filled like dark glass with an edge of light,
 * that FLOWS between a swept blade and a streamlined hand.
 *
 * No lag: the position is written inside the pointermove handler itself, with
 * no easing. Only the shape change is animated. The system pointer is hidden
 * only once this one is drawing (`html.has-prism`), so a failure leaves the
 * normal cursor. Text fields always use the system I-beam.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react'

const CLICKABLE = 'a, button, [role="button"], [role="tab"], summary, label[for], select'
const TEXT = 'input, textarea'

/* Both outlines start at the point that clicks, (0,0), and run clockwise. */
type P = [number, number]
const BLADE: P[] = [[0, 0], [22, 12.4], [12.2, 13.8], [7.4, 24.4]]
const HAND: P[] = [
  [0, 0], [2.3, 0.8], [3.1, 3], [3.1, 11], [5.2, 9.9], [7.1, 11.2], [9.1, 10.8], [10.9, 12.3],
  [12.8, 12.2], [14.4, 14.2], [14.4, 19.4], [12.6, 24], [9.9, 27.4], [1.6, 27.4], [-1.4, 24.2],
  [-6.3, 17.6], [-6.5, 15.5], [-4.7, 14.7], [-3.1, 16], [-3.1, 3], [-2.3, 0.8],
]
const POINTS = 96

/** The same number of evenly spaced points on any closed outline, so two of
 *  them can be blended point for point. */
function resample(shape: P[]): P[] {
  const edges = shape.map((a, i) => {
    const b = shape[(i + 1) % shape.length]
    return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) }
  })
  const total = edges.reduce((s, e) => s + e.len, 0)
  const out: P[] = []
  let k = 0
  let before = 0
  for (let i = 0; i < POINTS; i++) {
    const at = (i / POINTS) * total
    while (at > before + edges[k].len) before += edges[k++].len
    const { a, b, len } = edges[k]
    const t = len ? (at - before) / len : 0
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}
const FROM = resample(BLADE)
const TO = resample(HAND)
const outline = (t: number) =>
  'M' + FROM.map(([x, y], i) => `${(x + (TO[i][0] - x) * t).toFixed(2)} ${(y + (TO[i][1] - y) * t).toFixed(2)}`).join('L') + 'Z'

export function Cursor() {
  const [fine] = useState(() => window.matchMedia('(pointer: fine)').matches)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || !fine) return
    const html = document.documentElement
    const paths = el.querySelectorAll('path')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let t = 0
    let goal = 0
    let raf = 0
    let last = 0
    const draw = () => {
      const d = outline(t)
      paths.forEach((p) => p.setAttribute('d', d))
    }
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += (goal - t) * (1 - Math.exp(-dt * 22))
      if (Math.abs(goal - t) < 0.004) t = goal
      draw()
      raf = t === goal ? 0 : requestAnimationFrame(step)
    }
    const aim = (over: boolean) => {
      const next = over ? 1 : 0
      el.classList.toggle('is-over', over)
      if (next === goal) return
      goal = next
      if (reduced) {
        t = goal
        draw()
      } else if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(step)
      }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      el.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`
      const target = e.target as Element | null
      const typing = !!target?.closest(TEXT)
      el.classList.toggle('is-on', !typing)
      html.classList.add('has-prism')
      aim(!typing && !!target?.closest(CLICKABLE))
    }
    const down = () => el.classList.add('is-down')
    const up = () => el.classList.remove('is-down')
    const leave = () => {
      el.classList.remove('is-on')
      html.classList.remove('has-prism')
    }
    draw()
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    html.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      html.removeEventListener('pointerleave', leave)
      leave()
    }
  }, [fine])

  if (!fine) return null
  return (
    <div ref={root} aria-hidden className="prism-cursor">
      <span className="prism-pulse" />
      <svg viewBox="-12 -8 44 46" width="44" height="46">
        <defs>
          <linearGradient id="prism-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#ffd2a0" />
            <stop offset="1" stopColor="#ff4a1f" />
          </linearGradient>
          <linearGradient id="prism-body" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor="#fff0dc" stopOpacity="0.92" />
            <stop offset="0.38" stopColor="#ff9a52" stopOpacity="0.5" />
            <stop offset="1" stopColor="#1a0403" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        <path fill="url(#prism-body)" />
        <path fill="none" stroke="url(#prism-edge)" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
