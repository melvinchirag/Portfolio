/* ============================================================================
 * Home.tsx — the hero, as a 5-beat scrollytelling track
 * ----------------------------------------------------------------------------
 * STRUCTURE (this is the whole point of this file):
 *
 *   <section>            ← the TALL scroll track (BEAT_COUNT × 100vh). This is
 *     │                    what you actually scroll through.
 *     └ <div sticky>     ← the PINNED viewport. Stays fixed on screen for the
 *         └ <HeroBeats>    entire track. The mask + liquid glass are NOT here —
 *                           they render globally in GlobalScene.tsx (mounted in
 *                           App.tsx) so they persist across route changes.
 *
 * Why `position: sticky` and not GSAP pinning: sticky is one CSS line, can't
 * desync, and plays perfectly with Lenis' smooth scroll. GSAP ScrollTrigger is
 * still available (registered in useLenis) for per-beat scrubbed animations
 * later — this is the frame those will hang off, not a replacement for them.
 *
 * The hero is the ONLY page with scrollytelling — hard rule from the project
 * architecture. It now PANS HORIZONTALLY through four frames (Identity · Past ·
 * Present · Future); see HeroBeats.tsx. The Contact section below is a normal
 * vertical section the pan hands off into once the track ends.
 * ========================================================================= */

import { useRef } from 'react'
import { HeroBeats } from '../components/HeroBeats'
import { BEAT_COUNT, useHeroScrollTrack } from '../hooks/heroScroll'
import { Contact } from './Contact'

export function Home() {
  const trackRef = useRef<HTMLElement>(null)

  // Measures scroll position through the track and publishes it to the shared
  // `heroScroll` store. This is the ONLY thing that writes scroll state.
  useHeroScrollTrack(trackRef)

  return (
    <>
      <section id="hero-track" ref={trackRef} className="relative" style={{ height: `${BEAT_COUNT * 100}vh` }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* The persistent WebGL layer (particle mask + liquid glass) is now
              rendered globally in App.tsx -> GlobalScene so it persists across pages. */}

          {/* Everything that changes as you scroll. */}
          <HeroBeats />
        </div>
      </section>

      {/* The contact footer rolls up naturally when the sticky hero scroll track
          ends. NO opaque background (was bg-[#06070d] until 2026-08-09): the
          section now has its own WebGL background, a swarm of ten small masks
          (ContactMaskSwarm, gated in GlobalScene by useContactInView) rendered
          on the fixed scene layer BEHIND everything. An opaque fill here would
          hide it completely. Falls back to GlobalScene's own #050609 base. */}
      <section id="contact" className="relative z-20 w-full">
        <Contact />
      </section>
    </>
  )
}
