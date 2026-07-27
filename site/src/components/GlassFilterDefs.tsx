/* ============================================================================
 * GlassFilterDefs.tsx — the SVG filter behind `.uses-glass-distort`
 * ----------------------------------------------------------------------------
 * Renders one invisible <svg><filter> that CSS references via
 * `backdrop-filter: url(#glass-distort) ...` (see index.css). It warps
 * whatever is behind a glass panel slightly, which is what makes a blur read
 * as REFRACTION instead of just "frosted window". Mount this ONCE, near the
 * root — every glass panel on every page can reuse the same filter by id.
 *
 * How it works: feTurbulence generates a noise pattern (a "bump map");
 * feDisplacementMap uses that noise to nudge each backdrop pixel sideways by a
 * small amount. It's the CSS-native cousin of the reference shader's per-pixel
 * refraction normal (see docs/particle-mask-technique.md for that shader).
 *
 * ANIMATED (2026-07-27): a static noise field reads as "textured blur", not
 * liquid — glass has to visibly MOVE to read as fluid. `feOffset` slides the
 * noise pattern slowly across the panel every frame (via rAF, not CSS —
 * SVG filter primitive attributes aren't reliably CSS-animatable), so the
 * refraction ripples like something is actually flowing behind the glass.
 * ========================================================================= */

import { useEffect, useRef } from 'react'

export function GlassFilterDefs() {
  const offsetRef = useRef<SVGFEOffsetElement>(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      // Two out-of-phase sine drifts so the flow never looks like it's on a
      // simple loop — this is what sells "liquid" over "a gif repeating".
      offsetRef.current?.setAttribute('dx', String(Math.sin(t * 0.18) * 26))
      offsetRef.current?.setAttribute('dy', String(Math.cos(t * 0.14) * 22))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
      <filter id="glass-distort" x="-30%" y="-30%" width="160%" height="160%">
        {/* A soft, large-scale noise field — low frequency so the distortion
            reads as gentle glass warping, not visual static. */}
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.012"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        {/* Slide the noise field around each frame (see the rAF loop above) —
            THIS is what makes the distortion flow instead of sitting frozen. */}
        <feOffset ref={offsetRef} in="noise" dx="0" dy="0" result="flowingNoise" />
        {/* Push the backdrop around using the drifting noise. scale = how
            strong the "refraction" looks; too high turns text unreadable. */}
        <feDisplacementMap
          in="SourceGraphic"
          in2="flowingNoise"
          scale="20"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  )
}
