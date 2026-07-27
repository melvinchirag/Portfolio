/* ============================================================================
 * Home.tsx — the hero (clean slate)
 * ----------------------------------------------------------------------------
 * The triptych / particle-face hero was dropped, and (2026-07-27) so was the
 * real-nebula background — it read as "astronomy person", the wrong signal for
 * a CS major. Both are parked in /parked, not deleted. This is back to a
 * minimal, honest placeholder: the name on black, facts in the corners.
 *
 * The new hero direction is ABSTRACT / EDITORIAL — deliberately not pointing at
 * any single field. Nothing here is a decision to preserve; it's the neutral
 * ground we design the new hero on top of.
 * ========================================================================= */

import { useEffect, useState } from 'react'
import { RevealText } from '../components/RevealText'

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
    <section className="relative flex h-screen flex-col justify-between px-6 pt-28 pb-6 md:px-10 md:pb-10">
      {/* Hero background intentionally empty — the abstract/editorial concept
          is being chosen. Until then, black. The parked nebula lives in
          /parked/hero-nebula if we ever want it back. */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="font-display text-white">
          <RevealText
            text="Melvin"
            className="block text-[clamp(3.5rem,11vw,9rem)] leading-[0.9] tracking-[-0.02em]"
            delay={0.15}
            stagger={0.06}
          />
        </h1>

        {/* Placeholder — the identity line is Melvin's to write. */}
        <p className="mt-7 max-w-xl text-balance text-[15px] leading-relaxed text-white/45 md:text-base">
          <span className="text-white/30">[ identity line goes here — one sentence, your voice ]</span>
        </p>
      </div>

      {/* Facts as system metadata, in the corners. */}
      <div className="flex items-end justify-between gap-6 text-[11px] tracking-[0.18em] text-white/40 uppercase">
        <p className="max-w-[45%] leading-relaxed">
          Computer Science
          <span className="mx-1.5 text-white/20">·</span>
          Eastern Michigan University
          <span className="mt-1 block tracking-normal text-white/25 normal-case">
            Michigan, US <span className="mx-1 text-white/15">·</span> <LocalTime />
          </span>
        </p>

        <p className="flex shrink-0 items-center gap-2 text-white/35">
          <span className="hidden sm:inline">Scroll</span>
          <span className="scroll-cue" aria-hidden />
        </p>
      </div>
    </section>
  )
}
