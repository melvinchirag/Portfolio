/* ============================================================================
 * FactSnakes.tsx — the facts as snakes behind every page
 * ----------------------------------------------------------------------------
 * Melvin, 2026-10-29, replacing the horizontal ticker under the hero name:
 * "take one fact, make it go from up to down, and then from down to up ...
 * space it across the screen ... as soon as someone lands they fade in, and
 * then they start moving up slowly. One goes up, the other goes down ... I
 * want pixels dragging at the tail of that sentence, so it almost looks like
 * a snake ... arcade style pixels ... in the background, everywhere, just not
 * on the contact page."
 *
 * 2026-10-31: "everything is going vertically, but what if we made some
 * horizontal and they'd alternate." So the facts now alternate orientation:
 * fact 0 is a vertical column, fact 1 a horizontal row, fact 2 a column, and
 * so on. Within each orientation the MOTION alternates too (down/up,
 * right/left), so the field reads as a loose grid of sentences crossing
 * each other, like a slow Snake board.
 *
 * HOW IT IS BUILT
 * One 2D canvas, fixed to the viewport, between the WebGL scene (z-0) and the
 * page content (z-10), pointer-events none. Columns are spread across the
 * width (minus the clock rail on laptops); rows are spread down the height
 * (below the nav). The sentence always reads the natural way (top-to-bottom
 * for a column, left-to-right for a row) whatever direction it travels;
 * behind its tail a run of small squares, snapped to a pixel grid and
 * wiggling with a slow sine, is the arcade trail. When a snake leaves one
 * edge it re-enters from the other. Facts live in `data/facts.json`.
 *
 * Contact: the layer multiplies its alpha by `contactHandoff.t` (the shared
 * "how much of the screen Contact has taken" value from contactVisibility.ts),
 * so the snakes fade out as Contact scrolls up and are gone once it owns the
 * screen. On every other route `t` is 1.
 *
 * Mask: every frame each snake publishes its screen segment to snakeField so
 * the mask's particle sim can part around it (see hooks/snakeField.ts).
 *
 * Reduced motion: the snakes are drawn once, still, without trails. No rAF.
 * Hidden tab: the loop pauses (visibilitychange) so it costs nothing.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { contactHandoff } from '../hooks/contactVisibility'
import { SNAKE_SLOTS, snakeField } from '../hooks/snakeField'
import FACTS from '../data/facts.json'

const FONT = '500 11px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace'
/** Sand, like everything else that is light. A slate-blue version was tried
 *  for one commit (2026-10-29) as "the one cool colour" and Melvin killed it
 *  on sight ("the colour is bad, so bad"). The second colour the site has is
 *  not a hue: it is the mask reacting to the snakes (see snakeField.ts). */
const SAND = '205, 183, 138'
/** CSS px per second. A sentence crosses a laptop screen in ~9s. */
const SPEED_MIN = 60
const SPEED_MAX = 84
/** The arcade trail: square size (CSS px), how many, and their spacing.
 *  Short and quiet (Melvin: "a little less emphasis ... should not be
 *  distracting"). */
const PX = 3
const TRAIL_N = 9
const TRAIL_GAP = 6
/** Seconds for the land-fade, and the stagger between snakes. */
const FADE_SECS = 1.8
const STAGGER_SECS = 0.22
/** The clock rail (HeroClockRail) owns the right 76px on md+; keep clear. */
const RAIL_PX = 90
/** Keep the outer columns off the nav brand and the page gutter. */
const EDGE_PX = 64
/** Rows start below the nav and stop above the bottom edge. */
const TOP_PX = 112
const BOTTOM_PX = 56
/** Roughly one snake per this many px of the axis it is spread along. */
const COL_EVERY = 150
const ROW_EVERY = 180
const MD = 768

type Snake = {
  text: string
  /** 'v' travels along y in a column; 'h' travels along x in a row. */
  axis: 'v' | 'h'
  /** The fixed coordinate: screen x for a column, screen y for a row. */
  lane: number
  /** The moving coordinate: screen y of the TOP of a column's text, or
   *  screen x of the LEFT of a row's text. Text always reads the natural
   *  way; only the motion alternates. */
  pos: number
  /** +1 travels down (column) or right (row); -1 up or left. */
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

    /** Spread `n` lanes across [from, to], each nudged off the grid by a
     *  fixed fraction so they don't read as a table. */
    const lane = (i: number, n: number, from: number, to: number) =>
      from + ((to - from) * (i + 0.5 + (((i * 0.618) % 1) - 0.5) * 0.4)) / n

    const build = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const left = W < MD ? 28 : EDGE_PX
      const right = W - (W >= MD ? RAIL_PX : 0) - left
      const top = TOP_PX
      const bottom = H - BOTTOM_PX

      // How many snakes the screen has room for: columns by width, rows by
      // height. Facts alternate v, h, v, h ... so the count of each is tied
      // to the total; a short screen caps the rows and the leftover facts
      // simply aren't shown.
      const total = Math.max(2, Math.min(FACTS.length, Math.floor((right - left) / COL_EVERY)))
      const nV = Math.ceil(total / 2)
      const nH = Math.max(1, Math.min(Math.floor(total / 2), Math.floor((bottom - top) / ROW_EVERY)))
      const n = nV + nH

      const old = snakes
      const keep = old.length === n
      snakes = []
      let vi = 0
      let hi = 0
      for (let i = 0; i < FACTS.length && snakes.length < n; i++) {
        const axis: 'v' | 'h' = i % 2 === 0 ? 'v' : 'h'
        if (axis === 'v' && vi >= nV) continue
        if (axis === 'h' && hi >= nH) continue
        const k = axis === 'v' ? vi++ : hi++
        const text = FACTS[i]
        const len = measure(text)
        const extent = axis === 'v' ? H : W
        const idx = snakes.length
        const prev = keep ? old[idx] : null
        snakes.push({
          text,
          axis,
          lane: axis === 'v' ? lane(k, nV, left, right) : lane(k, nH, top, bottom),
          // Spread the start positions so the screen is populated on arrival
          // rather than every sentence entering from the edge at once.
          pos: prev ? prev.pos : extent * ((idx * 0.618) % 1),
          // Within each orientation the motion alternates.
          dir: k % 2 === 0 ? 1 : -1,
          speed: prev ? prev.speed : SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
          len,
          seed: prev ? prev.seed : Math.random() * 1000,
          born: prev ? prev.born : t0 + idx * STAGGER_SECS * 1000,
        })
      }
    }

    const snap = (v: number) => Math.round(v / PX) * PX
    const cx = (x: number) => (x / W) * 2 - 1
    const cy = (y: number) => 1 - (y / H) * 2

    const draw = (now: number, dt: number) => {
      ctx.clearRect(0, 0, W, H)
      // Gone once Contact has taken the screen. 1 everywhere else.
      const page = Math.max(0, Math.min(1, (contactHandoff.t - 0.25) / 0.5))
      // Publish every sentence's screen segment for the mask sim (clip
      // space, y up). Slots past `count` are zeroed so the shader ignores them.
      snakeField.seg.fill(0)
      snakeField.w.fill(0)
      snakeField.count = page <= 0 ? 0 : Math.min(SNAKE_SLOTS, snakes.length)
      if (page <= 0) return
      ctx.font = FONT
      ctx.textBaseline = 'middle'

      for (let si = 0; si < snakes.length; si++) {
        const s = snakes[si]
        const age = (now - s.born) / 1000
        if (age < 0) continue
        const fade = Math.min(1, age / FADE_SECS)
        const a = fade * fade * (3 - 2 * fade) * page
        const extent = s.axis === 'v' ? H : W

        if (!reduced) {
          s.pos += s.dir * s.speed * dt
          // Off the far edge (sentence AND trail): re-enter from the other side.
          const trail = TRAIL_N * TRAIL_GAP
          if (s.dir === 1 && s.pos > extent + trail) s.pos = -(s.len + trail)
          if (s.dir === -1 && s.pos + s.len < -trail) s.pos = extent + trail
        }

        // The sentence, reading the natural way for its axis.
        ctx.save()
        if (s.axis === 'v') {
          ctx.translate(s.lane, s.pos)
          ctx.rotate(Math.PI / 2)
        } else {
          ctx.translate(s.pos, s.lane)
        }
        ctx.fillStyle = `rgba(${SAND}, ${0.34 * a})`
        ctx.fillText(s.text.toUpperCase(), 0, 0)
        ctx.restore()

        if (si < SNAKE_SLOTS) {
          const o = si * 4
          if (s.axis === 'v') {
            snakeField.seg[o] = cx(s.lane)
            snakeField.seg[o + 1] = cy(s.pos)
            snakeField.seg[o + 2] = cx(s.lane)
            snakeField.seg[o + 3] = cy(s.pos + s.len)
          } else {
            snakeField.seg[o] = cx(s.pos)
            snakeField.seg[o + 1] = cy(s.lane)
            snakeField.seg[o + 2] = cx(s.pos + s.len)
            snakeField.seg[o + 3] = cy(s.lane)
          }
          snakeField.w[si] = reduced ? 0 : a
        }

        if (reduced) continue

        // The trail: squares behind the tail, snapped to the pixel grid,
        // thinning out and swaying with a slow wave so the whole thing
        // reads as a snake rather than a dotted line. The tail is whichever
        // end of the sentence is behind, given the direction of travel.
        const t = now / 1000
        const tailEnd = s.dir === 1 ? s.pos : s.pos + s.len
        for (let i = 0; i < TRAIL_N; i++) {
          const k = i / TRAIL_N
          const along = tailEnd - s.dir * (i + 1) * TRAIL_GAP
          const sway = Math.sin(t * 2.2 + s.seed + i * 0.6) * (1 + k * 2.5)
          const px = s.axis === 'v' ? snap(s.lane + sway) : snap(along)
          const py = s.axis === 'v' ? snap(along) : snap(s.lane + sway)
          ctx.fillStyle = `rgba(${SAND}, ${(1 - k) * (1 - k) * 0.3 * a})`
          ctx.fillRect(px - PX / 2, py - PX / 2, PX, PX)
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
      snakeField.count = 0
      snakeField.seg.fill(0)
      snakeField.w.fill(0)
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
