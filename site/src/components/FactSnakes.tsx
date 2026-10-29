/* ============================================================================
 * FactSnakes.tsx — the facts as vertical snakes behind every page
 * ----------------------------------------------------------------------------
 * Melvin, 2026-10-29, replacing the horizontal ticker under the hero name:
 * "take one fact, make it go from up to down, and then from down to up ...
 * space it across the screen ... as soon as someone lands they fade in, and
 * then they start moving up slowly. One goes up, the other goes down ... I
 * want pixels dragging at the tail of that sentence, so it almost looks like
 * a snake ... arcade style pixels ... in the background, everywhere, just not
 * on the contact page."
 *
 * HOW IT IS BUILT
 * One 2D canvas, fixed to the viewport, between the WebGL scene (z-0) and the
 * page content (z-10), pointer-events none. Each fact owns a column, evenly
 * spaced across the width (minus the clock rail on laptops). Odd columns
 * travel down, even ones up. The sentence is drawn rotated so it reads along
 * its direction of travel; behind its tail a run of small squares, snapped to
 * a pixel grid and wiggling sideways with a slow sine, is the arcade trail.
 * When a snake leaves one edge it re-enters from the other, so the loop
 * never ends. Facts live in `data/facts.json`; edit that, not this.
 *
 * Contact: the layer multiplies its alpha by `contactHandoff.t` (the shared
 * "how much of the screen Contact has taken" value from contactVisibility.ts),
 * so the snakes fade out as Contact scrolls up and are gone once it owns the
 * screen. On every other route `t` is 1.
 *
 * Reduced motion: the columns are drawn once, still, without trails. No rAF.
 * Hidden tab: the loop pauses (visibilitychange) so it costs nothing.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { contactHandoff } from '../hooks/contactVisibility'
import FACTS from '../data/facts.json'

const FONT = '500 11px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace'
const SAND = '205, 183, 138'
/** CSS px per second. Slow: a sentence takes ~40s to cross a laptop screen. */
const SPEED_MIN = 11
const SPEED_MAX = 17
/** The arcade trail: square size (CSS px), how many, and their spacing. */
const PX = 3
const TRAIL_N = 16
const TRAIL_GAP = 7
/** Seconds for the land-fade, and the stagger between columns. */
const FADE_SECS = 1.8
const STAGGER_SECS = 0.22
/** The clock rail (HeroClockRail) owns the right 76px on md+; keep clear. */
const RAIL_PX = 90
const MD = 768

type Snake = {
  text: string
  x: number
  /** Position of the tail end along the travel axis (CSS px, screen y). */
  y: number
  /** +1 travels down the screen, -1 up. */
  dir: 1 | -1
  speed: number
  len: number
  seed: number
  born: number
}

export function FactSnakes() {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let dpr = 1
    let snakes: Snake[] = []
    let raf = 0
    let last = performance.now()
    const t0 = last

    const measure = (text: string) => {
      ctx.font = FONT
      // Canvas letter-spacing is Chromium/Safari only; the fallback is just
      // slightly tighter text, which is fine.
      const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
      if ('letterSpacing' in c) c.letterSpacing = '0.08em'
      return ctx.measureText(text.toUpperCase()).width
    }

    const build = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const usable = W - (W >= MD ? RAIL_PX : 0)
      // One column per ~170px, at least two, never more than there are facts.
      const n = Math.max(2, Math.min(FACTS.length, Math.floor(usable / 170)))
      const keep = snakes.length === n
      snakes = Array.from({ length: n }, (_, i) => {
        const text = FACTS[i]
        const len = measure(text)
        const dir: 1 | -1 = i % 2 === 0 ? 1 : -1
        const prev = keep ? snakes[i] : null
        return {
          text,
          x: (usable * (i + 0.5)) / n,
          // Spread the start positions so the screen is populated on arrival
          // rather than every sentence entering from the edge at once.
          y: prev ? prev.y : (H * ((i * 0.618) % 1)),
          dir,
          speed: prev ? prev.speed : SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
          len,
          seed: prev ? prev.seed : Math.random() * 1000,
          born: prev ? prev.born : t0 + i * STAGGER_SECS * 1000,
        }
      })
    }

    const snap = (v: number) => Math.round(v / PX) * PX

    const draw = (now: number, dt: number) => {
      ctx.clearRect(0, 0, W, H)
      // Gone once Contact has taken the screen. 1 everywhere else.
      const page = Math.max(0, Math.min(1, (contactHandoff.t - 0.25) / 0.5))
      if (page <= 0) return
      ctx.font = FONT
      ctx.textBaseline = 'middle'

      for (const s of snakes) {
        const age = (now - s.born) / 1000
        if (age < 0) continue
        const fade = Math.min(1, age / FADE_SECS)
        const a = fade * fade * (3 - 2 * fade) * page

        if (!reduced) {
          s.y += s.dir * s.speed * dt
          // Off the far edge (sentence AND trail): re-enter from the other side.
          const over = s.len + TRAIL_N * TRAIL_GAP
          if (s.dir === 1 && s.y > H + over) s.y = -over
          if (s.dir === -1 && s.y < -over) s.y = H + over
        }

        // The sentence. Rotated to read along its travel: a down-snake reads
        // top-to-bottom with its tail at `y`; an up-snake reads bottom-to-top.
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.dir === 1 ? Math.PI / 2 : -Math.PI / 2)
        ctx.fillStyle = `rgba(${SAND}, ${0.3 * a})`
        ctx.fillText(s.text.toUpperCase(), 0, 0)
        ctx.restore()

        if (reduced) continue

        // The trail: squares behind the tail, snapped to the pixel grid,
        // thinning out and swaying with a slow wave so the whole thing
        // reads as a snake rather than a dotted line.
        const t = now / 1000
        for (let i = 0; i < TRAIL_N; i++) {
          const k = i / TRAIL_N
          const along = s.y - s.dir * (i + 1) * TRAIL_GAP
          const sway = Math.sin(t * 1.6 + s.seed + i * 0.55) * (2 + k * 4)
          const px = snap(s.x + sway) - PX / 2
          const py = snap(along) - PX / 2
          ctx.fillStyle = `rgba(${SAND}, ${(1 - k) * (1 - k) * 0.45 * a})`
          ctx.fillRect(px, py, PX, PX)
        }
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      draw(now, dt)
      raf = requestAnimationFrame(tick)
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (document.hidden || reduced) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }

    build()
    if (reduced) {
      // One still frame, redrawn on resize only.
      draw(t0 + FADE_SECS * 1000 + snakes.length * STAGGER_SECS * 1000, 0)
    } else {
      raf = requestAnimationFrame(tick)
    }
    const onResize = () => {
      build()
      if (reduced) draw(performance.now() + 1e6, 0)
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
    />
  )
}
