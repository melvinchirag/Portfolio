/* ============================================================================
 * Home.tsx — the hero, as a 5-beat scrollytelling track
 * ----------------------------------------------------------------------------
 * STRUCTURE (this is the whole point of this file):
 *
 *   <section>            ← the TALL scroll track (BEAT_COUNT × 100vh). This is
 *     │                    what you actually scroll through.
 *     └ <div sticky>     ← the PINNED viewport. Stays fixed on screen for the
 *         ├ <MaskField>    entire track, so the mask never reloads or restarts
 *         └ <HeroBeats>    while content changes beneath the scroll.
 *
 * Why `position: sticky` and not GSAP pinning: sticky is one CSS line, can't
 * desync, and plays perfectly with Lenis' smooth scroll. GSAP ScrollTrigger is
 * still available (registered in useLenis) for per-beat scrubbed animations
 * later — this is the frame those will hang off, not a replacement for them.
 *
 * The hero is the ONLY page with scrollytelling — hard rule from the project
 * architecture. Beats 2-5 are placeholders; see HeroBeats.tsx.
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
      <section ref={trackRef} className="relative" style={{ height: `${BEAT_COUNT * 100}vh` }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* The persistent WebGL layer (particle mask + liquid glass) is now
              rendered globally in App.tsx -> GlobalScene so it persists across pages. */}

          {/* Everything that changes as you scroll. */}
          <HeroBeats />
        </div>
      </section>

      {/* The contact footer rolls up naturally when the sticky hero scroll track ends */}
      <section id="contact" className="relative z-20 w-full bg-[#06070d]">
        <Contact />
      </section>
    </>
  )
}
