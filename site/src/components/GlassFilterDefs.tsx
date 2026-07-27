/* ============================================================================
 * GlassFilterDefs.tsx — the SVG filter behind `.uses-glass-distort`
 * ----------------------------------------------------------------------------
 * Renders one invisible <svg><filter> that CSS references via
 * `backdrop-filter: url(#glass-distort) ...` (see index.css). It warps
 * whatever is behind a glass panel slightly, which is what makes a blur read
 * as REFRACTION instead of just "frosted window". Mount this ONCE, near the
 * root — every glass panel on every page can reuse the same filter by id.
 *
 * How it works: feTurbulence generates a fixed noise pattern (a "bump map");
 * feDisplacementMap uses that noise to nudge each backdrop pixel sideways by a
 * small amount. It's the CSS-native cousin of the reference shader's per-pixel
 * refraction normal (see docs/particle-mask-technique.md for that shader).
 * ========================================================================= */

export function GlassFilterDefs() {
  return (
    <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
      <filter id="glass-distort" x="-20%" y="-20%" width="140%" height="140%">
        {/* A soft, large-scale noise field — low frequency so the distortion
            reads as gentle glass warping, not visual static. */}
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.012"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        {/* Push the backdrop around using that noise. scale = how strong the
            "refraction" looks; too high turns text behind it unreadable. */}
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="18"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  )
}
