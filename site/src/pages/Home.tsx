/* ============================================================================
 * Home.tsx — the hero
 * ----------------------------------------------------------------------------
 * Layout, per Melvin's explicit direction (2026-07-27): the GPGPU particle
 * mask is FIXED on the left (MaskField owns that side via its internal world
 * offset); his name sits centred; the liquid-glass info tabs sit on the right.
 * Sections 2-5 / scrollytelling are NOT built yet — hard rule: don't build
 * them until Melvin says so. This is section 1 only.
 * ========================================================================= */

import { useEffect, useState } from 'react'
import { RevealText } from '../components/RevealText'
import { MaskField } from '../components/scene/MaskField'
import { HeroInfoTabs } from '../components/HeroInfoTabs'

/**
 * A live clock, borrowed from Cinetica. Small, useless, and exactly the kind of
 * nuanced eccentricity that reads as craft.
 */
function LocalTime() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Detroit',
        }).format(new Date()),
      )
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [])

  return <span className="tabular-nums">{time || '--:--:--'}</span>
}

export function Home() {
  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background layer: the particle mask (fixed inset-0 internally, sits
          left via its own world-space offset — see MaskField.tsx). */}
      <MaskField />

      {/* Foreground content. `pointer-events-none` on the wrapper so mouse
          moves still reach the WebGL canvas underneath to disturb the mask;
          individual interactive children (tabs) opt back in. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between gap-10 px-6 pt-28 pb-10 md:px-14 md:pb-14">
        {/* Name, centred, per Melvin's layout call. Anchored toward the upper
            portion (justify-center within flex-1, but flex-1 itself is capped
            below) so it never drifts down into the tabs' vertical band on
            shorter viewports. */}
        <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ maxHeight: '70%' }}>
          <h1 className="font-display text-white">
            <RevealText
              text="Melvin"
              className="block text-[clamp(3rem,9vw,7rem)] leading-[0.9] tracking-[-0.02em]"
              delay={0.15}
              stagger={0.06}
            />
          </h1>
          <p className="mt-4 text-[13px] tracking-[0.32em] text-white/45 uppercase">CS, and beyond</p>
          <p className="mt-3 text-[13px] text-white/35">
            Computer Science <span className="mx-1.5 text-white/20">·</span> Eastern Michigan University
            <span className="mx-1.5 text-white/20">·</span>
            <LocalTime />
          </p>
        </div>

        {/* Liquid-glass info tabs, right side, lower half — clear of both the
            mask (left) and the name (centre). */}
        <div className="pointer-events-auto flex justify-center md:justify-end">
          <HeroInfoTabs />
        </div>
      </div>
    </section>
  )
}
