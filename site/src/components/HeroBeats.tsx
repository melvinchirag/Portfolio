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
import { HeroClockRail } from './HeroClockRail'
import { HeroInfoTabs } from './HeroInfoTabs'

/** Beat definitions. Beat 0 is live; 1-4 are placeholders awaiting concepts. */
const BEATS = [
  { id: 'identity', label: 'Identity', eyebrow: '( 01 )', placeholder: false },
  { id: 'past', label: 'The Past', eyebrow: '( 02 )', placeholder: true },
  { id: 'present', label: 'The Present', eyebrow: '( 03 )', placeholder: true },
  { id: 'future', label: 'The Future', eyebrow: '( 04 )', placeholder: true },
  { id: 'invitation', label: 'The Invitation', eyebrow: '( 05 )', placeholder: true },
]

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
            className="h-full w-full origin-top bg-gradient-to-b from-white/70 to-white/15"
          />
        </div>
        {BEATS.map((b, i) => (
          // `group` + `pointer-events-auto`: the label is hidden by default and
          // only revealed when the cursor hovers THIS dot's row (Melvin's spec —
          // the rail traces progress via the dots; labels are on-demand, not
          // permanently on screen).
          <div key={b.id} className="group pointer-events-auto flex cursor-default items-center gap-3">
            <span
              className={`relative z-10 block h-[7px] w-[7px] rounded-full transition-all duration-500 ${
                i === active ? 'scale-125 bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.45)]' : 'bg-white/25'
              }`}
            />
            <span
              className={`text-[10px] tracking-[0.22em] whitespace-nowrap uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                i === active ? 'text-white' : 'text-white/60'
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
      <HeroClockRail />
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
              /* ---- BEAT 1 — the real hero. Name lockup is CENTRED (Melvin's
                     spec, 2026-07-28). No turquoise — that colour is BANNED
                     project-wide (see CONTEXT). Times New Roman via --font-display.
                     HeroInfoTabs on the right provides the glass targets. ---- */
              <div className="flex h-full items-center justify-center px-6">
                <div className="flex w-full max-w-6xl items-center justify-between gap-12">
                  {/* Left/centre: name lockup */}
                  <div className="flex flex-1 flex-col items-center text-center">
                    <h1 className="font-display leading-[0.95] text-white">
                      <span className="block text-[clamp(3rem,8vw,6.5rem)] tracking-[-0.01em]">
                        Melvin Chirag
                      </span>
                      <span className="mt-1 block text-[clamp(1.4rem,3.4vw,2.6rem)] tracking-[0.06em] text-white/60">
                        Karupati
                      </span>
                    </h1>
                    <p className="mt-5 text-[12px] tracking-[0.32em] text-white/45 uppercase">
                      Computer Science and Beyond
                    </p>
                    <p className="mt-1 text-[12px] tracking-[0.05em] text-white/30">
                      Eastern Michigan University
                    </p>
                  </div>
                  {/* Right: glass info tabs — provides the `.sync-glass-rect`
                      DOM targets the LiquidGlassField shader reads each frame */}
                  <div className="pointer-events-auto hidden md:block">
                    <HeroInfoTabs />
                  </div>
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

      {/* Beat counter, bottom — structural readout while building. Offset from
          the right edge so it clears the clock rail. */}
      <div className="pointer-events-none absolute right-28 bottom-8 z-20 hidden text-[10px] tracking-[0.25em] text-white/25 tabular-nums md:block">
        {String(beat + 1).padStart(2, '0')} / {String(BEAT_COUNT).padStart(2, '0')}
      </div>
    </>
  )
}
