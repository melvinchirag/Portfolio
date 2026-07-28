/* ============================================================================
 * HeroBeats.tsx — the hero's scrollytelling content, beat by beat
 * ----------------------------------------------------------------------------
 * SKELETON ONLY (2026-07-28). This file establishes the STRUCTURE and MOVEMENT
 * of the hero's 5-beat scroll — not the final look of each beat. Beat 1 is the
 * real, built hero (name + tagline + glass info tabs). Beats 2-5 are explicitly
 * labelled placeholders: they exist so the scroll mechanics can be felt and
 * tested end to end. Do NOT treat their styling as a decision — Melvin will
 * design each beat's concept separately.
 *
 * Everything here READS `heroScroll` (see hooks/heroScroll.ts) and never writes
 * to it. The particle mask and liquid glass are untouched by this file.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { BEAT_COUNT, heroScroll, useHeroBeat } from '../hooks/heroScroll'
import { HeroInfoTabs } from './HeroInfoTabs'
import { RevealText } from './RevealText'

/** Beat definitions. Beat 0 is live; 1-4 are placeholders awaiting concepts. */
const BEATS = [
  { id: 'identity', label: 'Identity', eyebrow: '( 01 )', placeholder: false },
  { id: 'past', label: 'The Past', eyebrow: '( 02 )', placeholder: true },
  { id: 'present', label: 'The Present', eyebrow: '( 03 )', placeholder: true },
  { id: 'future', label: 'The Future', eyebrow: '( 04 )', placeholder: true },
  { id: 'invitation', label: 'The Invitation', eyebrow: '( 05 )', placeholder: true },
]

/** A live clock — the small "system detail" eccentricity from the references. */
function LocalTime() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'America/Detroit',
    })
    const update = () => {
      if (ref.current) ref.current.textContent = fmt.format(new Date())
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [])
  return <span ref={ref} className="tabular-nums">--:--:--</span>
}

/**
 * The left-edge beat rail: which beat you're in, and a line that fills as you
 * scroll. This is structural navigation, not decoration — it makes the 5-beat
 * architecture legible while we build it.
 */
function BeatRail({ active }: { active: number }) {
  const fillRef = useRef<HTMLDivElement>(null)

  // Drive the fill directly from the scroll store each frame — no React state,
  // so this costs nothing and stays perfectly in sync with Lenis' smooth scroll.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${heroScroll.progress})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="pointer-events-none absolute top-1/2 left-6 z-20 hidden -translate-y-1/2 md:block">
      <div className="relative flex flex-col gap-6">
        {/* the hairline track + its fill */}
        <div className="absolute top-0 bottom-0 left-[3px] w-px bg-white/10">
          <div
            ref={fillRef}
            className="h-full w-full origin-top bg-gradient-to-b from-[#80fff0] to-[#80fff0]/20"
          />
        </div>
        {BEATS.map((b, i) => (
          <div key={b.id} className="flex items-center gap-3">
            <span
              className={`relative z-10 block h-[7px] w-[7px] rounded-full transition-all duration-500 ${
                i === active ? 'scale-125 bg-[#80fff0] shadow-[0_0_10px_2px_rgba(128,255,240,0.55)]' : 'bg-white/25'
              }`}
            />
            <span
              className={`text-[10px] tracking-[0.22em] uppercase transition-colors duration-500 ${
                i === active ? 'text-white/70' : 'text-white/20'
              }`}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeroBeats() {
  const beat = useHeroBeat()

  return (
    <>
      <BeatRail active={beat} />

      {/* Beat content. Each beat is absolutely stacked and cross-fades; only the
          active one is visible and interactive. `pointer-events-none` on the
          wrapper lets mouse movement reach the WebGL canvas underneath so the
          mask still reacts to the cursor. */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {BEATS.map((b, i) => (
          <div
            key={b.id}
            aria-hidden={i !== beat}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === beat ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {i === 0 ? (
              /* ---- BEAT 1 — the real, built hero ---- */
              <div className="flex h-full flex-col justify-between px-6 pt-28 pb-10 md:px-14 md:pb-14">
                <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ maxHeight: '70%' }}>
                  <h1 className="font-display text-white">
                    <RevealText
                      text="Melvin"
                      className="block text-[clamp(3rem,9vw,7rem)] leading-[0.9] tracking-[-0.02em]"
                      delay={0.15}
                      stagger={0.06}
                    />
                  </h1>
                  <p className="mt-4 text-[13px] tracking-[0.32em] text-white/45 uppercase">
                    Computer Science and Beyond
                  </p>
                  <p className="mt-3 text-[13px] text-white/35">
                    Computer Science <span className="mx-1.5 text-white/20">·</span> Eastern Michigan University
                    <span className="mx-1.5 text-white/20">·</span>
                    <LocalTime />
                  </p>
                </div>
                <div className="pointer-events-auto flex justify-center md:justify-end">
                  <HeroInfoTabs />
                </div>
              </div>
            ) : (
              /* ---- BEATS 2-5 — placeholders, awaiting their concepts ---- */
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-[11px] tracking-[0.4em] text-white/30 uppercase">{b.eyebrow}</p>
                <h2 className="mt-4 font-display text-[clamp(2.4rem,7vw,5rem)] leading-[0.95] text-white/85">
                  {b.label}
                </h2>
                <p className="mt-6 max-w-md text-[13px] leading-relaxed text-white/30">
                  Placeholder — this beat's concept, visuals and copy are not
                  designed yet. The scroll structure around it is what's being
                  built.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scroll cue — only while you're still on the first beat. */}
      <div
        className={`pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 transition-opacity duration-500 ${
          beat === 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] text-white/35 uppercase">Scroll</span>
          <span className="scroll-cue" aria-hidden />
        </div>
      </div>

      {/* Beat counter, bottom-right — structural readout while building. */}
      <div className="pointer-events-none absolute right-6 bottom-8 z-20 hidden text-[10px] tracking-[0.25em] text-white/25 tabular-nums md:block">
        {String(beat + 1).padStart(2, '0')} / {String(BEAT_COUNT).padStart(2, '0')}
      </div>
    </>
  )
}
