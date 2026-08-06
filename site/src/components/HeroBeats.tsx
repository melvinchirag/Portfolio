/* ============================================================================
 * HeroBeats.tsx — the hero's scrollytelling content, as a HORIZONTAL pan
 * ----------------------------------------------------------------------------
 * The hero is five frames laid side by side in one wide strip. You scroll
 * VERTICALLY (native wheel/trackpad, via Lenis) and the strip slides LEFT — so
 * moving down walks you rightward through time, matching the "life in three
 * tenses" timeline motif. No scroll-jacking: the browser's vertical scroll is
 * untouched; we only translate the strip in response to it.
 *
 * WHY a rAF loop and not React state for the pan: scroll fires ~60×/second.
 * Driving `transform` through state would re-render the whole hero every frame
 * and wreck the framerate. Instead we read `heroScroll.progress` each frame and
 * write the strip's transform imperatively — the same pattern the beat-rail
 * fill uses. React state (`useHeroFrame`) is used ONLY to swap which frame is
 * interactive/aria-visible, which changes a handful of times per scroll.
 *
 * The mask + liquid glass live in GlobalScene (App.tsx) and read the same
 * `heroScroll` store, so they pan in lockstep with these frames for free.
 *
 * Frame 1 (Identity) is the real, built hero. Frames 2-5 are labelled
 * placeholders awaiting their copy — do NOT treat their styling as decided.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { BEAT_COUNT, heroScroll, useHeroFrame } from '../hooks/heroScroll'
import { heroScrollTo } from '../hooks/useLenis'
import { HeroClockRail } from './HeroClockRail'

/** Frame definitions. Frame 0 is live; 1-4 are placeholders awaiting concepts. */
const BEATS = [
  { id: 'identity', label: 'Identity', eyebrow: '( 01 )', placeholder: false },
  { id: 'past', label: 'The Past', eyebrow: '( 02 )', placeholder: true },
  { id: 'present', label: 'The Present', eyebrow: '( 03 )', placeholder: true },
  { id: 'future', label: 'The Future', eyebrow: '( 04 )', placeholder: true },
  { id: 'invitation', label: 'The Invitation', eyebrow: '( 05 )', placeholder: true },
]

/**
 * The left-edge frame rail: which frame is centred, and a line that fills as you
 * scroll. Structural navigation that keeps the 5-frame architecture legible.
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
  // The centred frame (round of progress×(N-1)) — drives the rail dot, the
  // counter, and which frame is interactive. Re-renders only on frame change.
  const frame = useHeroFrame()
  const stripRef = useRef<HTMLDivElement>(null)

  // The pan. Slide the wide strip left by `progress × (N-1) × viewportWidth`, so
  // frame k is dead-centre exactly when progress === k/(N-1). innerWidth is read
  // each frame (cheap) so it stays correct across window resizes.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (stripRef.current) {
        const shift = heroScroll.progress * (BEAT_COUNT - 1) * window.innerWidth
        stripRef.current.style.transform = `translate3d(${-shift}px,0,0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <HeroClockRail />
      <BeatRail active={frame} />

      {/* The horizontal frame strip. Width = N × 100vw; the sticky parent's
          overflow-hidden clips everything but the centred frame. Each cell is a
          full viewport that only becomes interactive when it's the centred one
          (so off-screen frames never steal clicks or tab focus). */}
      <div
        ref={stripRef}
        className="absolute top-0 left-0 z-10 flex h-full will-change-transform"
        style={{ width: `${BEAT_COUNT * 100}vw` }}
      >
        {BEATS.map((b, i) => (
          <div
            key={b.id}
            aria-hidden={i !== frame}
            className={`relative h-full w-screen shrink-0 ${i === frame ? '' : 'pointer-events-none'}`}
          >
            {i === 0 ? (
              /* ---- FRAME 1 — the real hero. Name lockup CENTRED (Melvin's
                     spec). No turquoise — BANNED project-wide. ---- */
              <div className="flex h-full items-center justify-center px-6">
                <div className="flex flex-col items-center text-center">
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

                  {/* Availability, as a single quiet line (not a widget): a soft
                      pulsing ember dot — the one rare accent use — reads as
                      "actively looking" without any extra words. */}
                  <p className="mt-8 flex items-center gap-2.5 text-[11px] tracking-[0.18em] text-white/50 uppercase">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff6b35] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff6b35]" />
                    </span>
                    Open to internships &amp; jobs
                  </p>

                  {/* The hero's ONE ask. Glides to the contact slide at the end
                      of the track via Lenis (see heroScrollTo). Same glass
                      treatment as the nav résumé so the chrome reads as a set. */}
                  <button
                    type="button"
                    onClick={() => heroScrollTo('contact')}
                    className="glass-cta mt-6 rounded-full px-7 py-2.5 text-sm tracking-wide text-white/90"
                  >
                    Contact
                  </button>
                </div>
              </div>
            ) : (
              /* ---- FRAMES 2-5 — placeholders, awaiting their concepts ---- */
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-[11px] tracking-[0.4em] text-white/30 uppercase">{b.eyebrow}</p>
                <h2 className="mt-4 font-display text-[clamp(2.4rem,7vw,5rem)] leading-[0.95] text-white/85">
                  {b.label}
                </h2>
                <p className="mt-6 max-w-md text-[13px] leading-relaxed text-white/30">
                  Placeholder — this frame's concept, visuals and copy are not
                  designed yet. The horizontal scroll structure around it is
                  what's being built.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scroll cue — only while you're still on the first frame. */}
      <div
        className={`pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 transition-opacity duration-500 ${
          frame === 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] text-white/35 uppercase">Scroll</span>
          <span className="scroll-cue" aria-hidden />
        </div>
      </div>

      {/* Frame counter, bottom — structural readout while building. Offset from
          the right edge so it clears the clock rail. */}
      <div className="pointer-events-none absolute right-28 bottom-8 z-20 hidden text-[10px] tracking-[0.25em] text-white/25 tabular-nums md:block">
        {String(frame + 1).padStart(2, '0')} / {String(BEAT_COUNT).padStart(2, '0')}
      </div>
    </>
  )
}
