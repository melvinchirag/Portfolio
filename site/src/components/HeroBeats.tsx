/* ============================================================================
 * HeroBeats.tsx — the hero's scrollytelling content, as a HORIZONTAL pan
 * ----------------------------------------------------------------------------
 * Four frames laid side by side in one wide strip: Identity · The Past · The
 * Present (featured projects) · The Future. You scroll VERTICALLY (native
 * wheel/trackpad, via Lenis) and the strip slides LEFT — moving down walks you
 * rightward through time, matching the "life in three tenses" timeline motif.
 * No scroll-jacking: the browser's vertical scroll is untouched; we only
 * translate the strip in response to it.
 *
 * WHY a rAF loop and not React state for the pan: scroll fires ~60×/second.
 * Driving `transform` through state would re-render the whole hero every frame
 * and wreck the framerate. So we read `heroScroll.progress` each frame and write
 * the strip's transform imperatively (same pattern as the beat-rail fill).
 * React state (`useHeroFrame`) is used ONLY to swap which frame is
 * interactive/aria-visible — a handful of changes per scroll.
 *
 * The mask + liquid glass live in GlobalScene (App.tsx) and read the same
 * `heroScroll` store, so they pan in lockstep with these frames for free.
 *
 * Copy here is REAL (per Melvin's brief). Project cards / résumé / X + Instagram
 * still await final assets — see data/projects.ts and data/profile.ts.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BEAT_COUNT, heroScroll, useHeroFrame } from '../hooks/heroScroll'
import { heroScrollTo, heroScrollToFrame } from '../hooks/useLenis'
import { PROJECTS } from '../data/projects'
import { HeroClockRail } from './HeroClockRail'
import { SocialLinks } from './SocialLinks'

/** Frame order — also the labels shown on the left rail. */
const FRAMES = [
  { id: 'identity', label: 'Identity' },
  { id: 'past', label: 'The Past' },
  { id: 'present', label: 'The Present' },
  { id: 'future', label: 'The Future' },
]

/** Index of the featured-projects frame — the target of the "Projects" button. */
const PRESENT_FRAME = 2

/** Areas Melvin is EXPLORING — framed as directions, not titles he claims. */
const AREAS = [
  'Applied AI',
  'Machine Learning',
  'MLOps',
  'Computer Vision',
  'Full-stack Engineering',
  'World Models',
  'Vision-Language-Action',
  'Robotics',
  'Neurotechnology',
  'Aerospace',
]

/* ---------------------------------------------------------------------------
 * The left-edge frame rail: which frame is centred + a line that fills as you
 * scroll. Structural navigation that keeps the 4-frame architecture legible.
 * ------------------------------------------------------------------------ */
function FrameRail({ active }: { active: number }) {
  const fillRef = useRef<HTMLDivElement>(null)

  // Drive the fill straight from the scroll store each frame — no React state,
  // so it costs nothing and stays perfectly in sync with Lenis' smooth scroll.
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
        <div className="absolute top-0 bottom-0 left-[3px] w-px bg-white/10">
          <div
            ref={fillRef}
            className="h-full w-full origin-top bg-gradient-to-b from-white/70 to-white/15"
          />
        </div>
        {FRAMES.map((f, i) => (
          <div key={f.id} className="group pointer-events-auto flex cursor-default items-center gap-3">
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
              {f.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 0 — Identity. Name, who he is, the interactive tagline, the three
 * actions, and the social row. This is the recruiter's first 3 seconds.
 * ------------------------------------------------------------------------ */
function IdentityFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <h1 className="font-display leading-[0.95] text-white">
          <span className="block text-[clamp(3rem,8vw,6.5rem)] tracking-[-0.01em]">Melvin Chirag</span>
          <span className="mt-1 block text-[clamp(1.4rem,3.4vw,2.6rem)] tracking-[0.06em] text-white/60">
            Karupati
          </span>
        </h1>

        <p className="mt-5 text-[11px] tracking-[0.28em] text-white/45 uppercase">
          Computer Science Student · Aspiring Applied AI/ML Engineer
        </p>

        {/* Signature tagline — "Beyond" glows and links to the Vision page. */}
        <p className="mt-6 font-display text-[clamp(1.4rem,3vw,2.1rem)] text-white/80">
          Computer Science and{' '}
          <Link to="/vision" className="beyond-link" aria-label="Beyond — explore my Vision">
            Beyond
          </Link>
        </p>

        <p className="mt-6 max-w-md text-[13px] leading-relaxed text-white/55">
          I'm exploring computer vision, intelligent systems, machine learning, and full-stack
          products — building projects where software meets the real world, thinking in systems,
          connecting domains, and turning curiosity into working experiences.
        </p>

        {/* The three hero actions. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => heroScrollToFrame(PRESENT_FRAME)}
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide text-white/90"
          >
            Projects
          </button>
          <button
            type="button"
            onClick={() => heroScrollTo('contact')}
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide text-white/90"
          >
            Contact
          </button>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide text-white/90"
          >
            Résumé <span aria-hidden>↗</span>
          </a>
        </div>

        <SocialLinks className="mt-7 justify-center" />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 1 — The Past. A short emotional origin, not a timeline (that's About).
 * ------------------------------------------------------------------------ */
function PastFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6 md:px-24">
      <div className="max-w-xl">
        <p className="text-[11px] tracking-[0.4em] text-white/30 uppercase">( 02 )</p>
        <h2 className="mt-4 font-display text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] text-white/90">
          The Past
        </h2>
        <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-white/60">
          <p>
            Born in Hyderabad and raised in Kuwait, I later continued my education in India before
            moving to Michigan to pursue computer science.
          </p>
          <p>
            I originally considered engineering because I wanted to build things with my hands. Then
            I found computer science — a field where an idea can become a real tool, system, or
            experience at the speed of curiosity.
          </p>
          <p>
            That was the shift: I wasn't looking for a single job title. I was looking for a way to
            keep creating.
          </p>
        </div>
        <Link
          to="/about"
          className="mt-8 inline-block text-[13px] tracking-wide text-white/70 transition-colors duration-300 hover:text-white"
        >
          Read the full story <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * A single "Explore Project" link — a real link when a target exists, a dimmed
 * "coming soon" label otherwise (so no card ever links to nowhere).
 * ------------------------------------------------------------------------ */
function ExploreLink({ href }: { href: string }) {
  if (!href) {
    return (
      <span className="mt-4 inline-block text-[12px] tracking-wide text-white/25" title="Link coming soon">
        Explore Project <span aria-hidden>→</span>
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-block text-[12px] tracking-wide text-white/70 transition-colors duration-300 hover:text-white"
    >
      Explore Project <span aria-hidden>→</span>
    </a>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 2 — The Present. Three featured project cards.
 * ------------------------------------------------------------------------ */
function PresentFrame() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-20 md:px-20">
      <div className="text-center">
        <p className="text-[11px] tracking-[0.4em] text-white/30 uppercase">( 03 )</p>
        <h2 className="mt-4 font-display text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] text-white/90">
          The Present
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[13px] leading-relaxed text-white/50">
          Right now I'm building at the intersection of computer vision, AI/ML, interactive
          software, and scientific curiosity.
        </p>
      </div>

      <div className="mt-10 grid w-full max-w-5xl gap-5 md:grid-cols-3">
        {PROJECTS.map((p) => (
          <article
            key={p.name}
            className="liquid-glass flex flex-col rounded-2xl p-5 text-left"
          >
            {/* Preview slot — a warm gradient placeholder until real art lands. */}
            <div className="relative mb-4 flex aspect-[16/10] items-end overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.08] to-transparent">
              <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-5xl text-white/10">
                {p.name.charAt(0)}
              </span>
              <span className="m-3 text-[9px] tracking-[0.25em] text-white/30 uppercase">
                {p.tentative ? 'Preview coming' : 'Preview'}
              </span>
            </div>

            <h3 className="font-display text-xl text-white/90">{p.name}</h3>
            <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/55">{p.blurb}</p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {p.stack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] tracking-wide text-white/50"
                >
                  {tech}
                </li>
              ))}
            </ul>

            <ExploreLink href={p.href} />
          </article>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 3 — The Future. Ambition + the areas he's exploring.
 * ------------------------------------------------------------------------ */
function FutureFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6 md:px-24">
      <div className="max-w-2xl">
        <p className="text-[11px] tracking-[0.4em] text-white/30 uppercase">( 04 )</p>
        <h2 className="mt-4 font-display text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] text-white/90">
          The Future
        </h2>
        <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-white/60">
          <p>
            I want to build intelligent systems that move beyond screens — systems that can perceive
            the world, reason about it, and act within it.
          </p>
          <p>
            I'm especially drawn to computer vision, applied machine learning, robotics, world
            models, and vision-language-action systems. Long term, I want to connect AI with domains
            such as robotics, neurotechnology, aerospace, and scientific discovery.
          </p>
          <p>
            My goal is to turn emerging research into useful, reliable products — and eventually
            build systems that make complex technology more capable, accessible, and human-centered.
          </p>
        </div>

        <p className="mt-8 text-[10px] tracking-[0.3em] text-white/30 uppercase">Areas I'm exploring</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <li
              key={area}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] tracking-wide text-white/55"
            >
              {area}
            </li>
          ))}
        </ul>
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
      <FrameRail active={frame} />

      {/* The horizontal frame strip. Width = N × 100vw; the sticky parent's
          overflow-hidden clips everything but the centred frame. Each cell only
          becomes interactive when it's the centred one, so off-screen frames
          never steal clicks or tab focus. */}
      <div
        ref={stripRef}
        className="absolute top-0 left-0 z-10 flex h-full will-change-transform"
        style={{ width: `${BEAT_COUNT * 100}vw` }}
      >
        {FRAMES.map((f, i) => (
          <div
            key={f.id}
            aria-hidden={i !== frame}
            className={`relative h-full w-screen shrink-0 ${i === frame ? '' : 'pointer-events-none'}`}
          >
            {i === 0 ? (
              <IdentityFrame />
            ) : i === 1 ? (
              <PastFrame />
            ) : i === 2 ? (
              <PresentFrame />
            ) : (
              <FutureFrame />
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
