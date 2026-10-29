/* ============================================================================
 * NameAssembly.tsx — the first name assembles out of particles on page load
 * ----------------------------------------------------------------------------
 * Board idea 1 ("the name is the mask"), done the cheap and honest way: a plain
 * 2D canvas, not the GPGPU mask. A few thousand sand dots start scattered across
 * the hero, fly to the pixel positions of the word "Melvin", hold for a beat,
 * then the dots fade out as the real DOM text fades in underneath. The visitor
 * reads one continuous event: dust becomes the name.
 *
 * Why not reuse MaskField for this: that system owns 1.4M particles whose
 * "home" is the face mesh. Giving it a second home (the letters) is real
 * shader work and belongs with the second-mask block. This component gives
 * the same visual promise now with ~150 lines and zero risk to the mask.
 *
 * Contract with the DOM:
 *   - `targetRef` is the element whose rendered text we sample (the first-name
 *     span). Its box, font size and weight are read live, so the dots land
 *     exactly where the real glyphs are.
 *   - `rootRef` is the box the canvas covers (the identity frame). Dots scatter
 *     anywhere inside it before converging.
 *   - `onDone` fires when the dots start fading, so the parent can fade the
 *     text in at the same moment.
 * Waits for `heroIntro.ready` (the Loader has left) and for the web font, so
 * the sampled shape is the final shape. Reduced motion: no canvas at all, the
 * text is simply there.
 * ========================================================================= */

import { useEffect, useRef, type RefObject } from 'react'
import { expectName, heroIntro, markNameDone } from '../hooks/heroIntro'

const DOT_COLOR = '205, 183, 138' // sand, as an rgb triple for rgba()
const MAX_DOTS = 5200
const FLY_SECS = 1.4 // one dot's journey
const STAGGER_SECS = 0.6 // spread of start times across dots
const HOLD_SECS = 0.4 // fully formed, before the handoff begins
/** Dust → solid is a SLOW crossfade (Melvin, 2026-10-29: "it should be a fade,
 *  it should look real"). The DOM text's own transition in HeroBeats must
 *  match this number. */
export const SOLIDIFY_SECS = 2.6
const FADE_SECS = SOLIDIFY_SECS

type Dot = { x0: number; y0: number; x1: number; y1: number; d: number; r: number }

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function NameAssembly({
  rootRef,
  targetRef,
  onDone,
}: {
  rootRef: RefObject<HTMLElement | null>
  targetRef: RefObject<HTMLElement | null>
  onDone: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    const target = targetRef.current
    if (!canvas || !root || !target) return

    // Tell the mask there is a name to wait for. Every early exit below must
    // also release it (markNameDone), or the mask would never fly in.
    expectName()
    const finish = () => {
      onDone()
      markNameDone()
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      finish()
      return
    }

    let raf = 0
    let cancelled = false
    let dots: Dot[] = []
    let dpr = 1
    let startedAt = 0

    /** Rasterise the target's text offscreen and turn the opaque pixels into
     *  dot targets. Runs once, after the font is ready. */
    const build = () => {
      const rootRect = root.getBoundingClientRect()
      const tRect = target.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(rootRect.width * dpr))
      canvas.height = Math.max(1, Math.round(rootRect.height * dpr))

      const off = document.createElement('canvas')
      off.width = canvas.width
      off.height = canvas.height
      const octx = off.getContext('2d')
      if (!octx) return

      const cs = getComputedStyle(target)
      // Match the DOM glyphs: same family, weight, size, and the wide cut
      // (Archivo's width axis; `fontStretch` is the canvas-side knob for it).
      octx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`
      try {
        ;(octx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded'
      } catch {
        /* older browsers: slightly narrower sample, still lands on the word */
      }
      octx.textBaseline = 'alphabetic'
      octx.fillStyle = '#fff'
      // The span's box top + its ascent gives the baseline. Using the font's
      // own metrics keeps the dots on the glyphs even when line-height differs.
      const m = octx.measureText(target.textContent || '')
      const ascent = m.actualBoundingBoxAscent || parseFloat(cs.fontSize) * dpr * 0.72
      const descent = m.actualBoundingBoxDescent || 0
      const textH = ascent + descent
      const boxH = tRect.height * dpr
      const x = (tRect.left - rootRect.left) * dpr
      const baseline = (tRect.top - rootRect.top) * dpr + (boxH - textH) / 2 + ascent
      octx.fillText(target.textContent || '', x, baseline)

      const img = octx.getImageData(0, 0, off.width, off.height).data
      // Adaptive step so the dot count stays bounded on big screens.
      const glyphArea = Math.max(1, m.width * textH)
      const step = Math.max(2, Math.round(Math.sqrt(glyphArea / MAX_DOTS)))
      const found: Dot[] = []
      for (let yy = 0; yy < off.height; yy += step) {
        for (let xx = 0; xx < off.width; xx += step) {
          if (img[(yy * off.width + xx) * 4 + 3] > 140) {
            found.push({
              // Scatter origin: anywhere in the frame, biased leftward (toward
              // the mask) so the dust reads as coming from the face.
              x0: (Math.random() * 1.3 - 0.5) * canvas.width,
              y0: (Math.random() * 1.4 - 0.2) * canvas.height,
              x1: xx + (Math.random() - 0.5) * step,
              y1: yy + (Math.random() - 0.5) * step,
              d: Math.random() * STAGGER_SECS,
              r: (0.55 + Math.random() * 0.9) * dpr,
            })
          }
        }
      }
      dots = found
    }

    const draw = (now: number) => {
      if (cancelled) return
      const t = (now - startedAt) / 1000
      const formedAt = FLY_SECS + STAGGER_SECS
      const fadeStart = formedAt + HOLD_SECS
      // Eased, slow fade: the dots thin out gradually, the text comes up
      // underneath at the same pace, and for most of it both are visible.
      const fp = t < fadeStart ? 0 : Math.min(1, (t - fadeStart) / FADE_SECS)
      const fade = 1 - fp * fp * (3 - 2 * fp) // smoothstep

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of dots) {
        const k = easeOutExpo(Math.max(0, Math.min(1, (t - p.d) / FLY_SECS)))
        // A tiny residual tremor that dies as the word solidifies, so the
        // dust never looks frozen before it fades.
        const tremor = (1 - k) * 0 + (1 - fp) * 0.6 * dpr
        const x = p.x0 + (p.x1 - p.x0) * k + (Math.random() - 0.5) * tremor
        const y = p.y0 + (p.y1 - p.y0) * k + (Math.random() - 0.5) * tremor
        // Dim while travelling, full once landed; this is what makes the
        // settle read as the word "switching on".
        const a = (0.35 + 0.65 * k) * fade
        ctx.fillStyle = `rgba(${DOT_COLOR}, ${a})`
        ctx.fillRect(x, y, p.r, p.r)
      }

      if (t >= fadeStart && !doneFired) {
        doneFired = true
        onDone()
      }
      if (t < fadeStart + FADE_SECS) raf = requestAnimationFrame(draw)
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        // The name is solid now; release the mask.
        markNameDone()
      }
    }
    let doneFired = false

    /** Wait for the Loader to leave, then build and run. */
    const waitForIntro = () => {
      if (cancelled) return
      if (!heroIntro.ready) {
        raf = requestAnimationFrame(waitForIntro)
        return
      }
      build()
      if (!dots.length) {
        finish()
        return
      }
      startedAt = performance.now()
      raf = requestAnimationFrame(draw)
    }

    document.fonts?.ready.then(waitForIntro).catch(waitForIntro)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [rootRef, targetRef, onDone])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
