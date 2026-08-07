/* ============================================================================
 * HeroBeats.tsx — the hero's scrollytelling content, as a HORIZONTAL pan
 * ----------------------------------------------------------------------------
 * Four frames in one wide strip: Identity · The Past · The Present (featured
 * projects) · The Future. You scroll VERTICALLY (native wheel via Lenis) and the
 * strip slides LEFT — moving down walks you rightward through time.
 *
 * THE GLASS (read before touching):
 * Frames 1-3 wrap their text in a `.slide-glass` panel (see index.css). It is a
 * SELF-SUFFICIENT CSS glass surface — translucent fill + bright ::before rim +
 * drop shadow — that reads as frosted glass from its own material, NOT from what
 * is behind it. That matters: the mask behind the hero is a near-black void, so a
 * WebGL refraction / backdrop blur has nothing to blur and renders invisible (we
 * learned this the hard way, and its 3-pass render also cost scroll perf). Box +
 * text live in one element inside the strip, so they pan together as one slide.
 *
 * Perf: the pan is written imperatively in one rAF loop (transform only). React
 * state (`useHeroFrame`) only swaps which frame is interactive.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BEAT_COUNT, heroScroll, useHeroFrame } from '../hooks/heroScroll'
import { heroScrollTo, heroScrollToFrame } from '../hooks/useLenis'
import { PROJECTS } from '../data/projects'
import { HeroClockRail } from './HeroClockRail'
import { SocialLinks } from './SocialLinks'

const FRAMES = [
  { id: 'identity', label: 'Identity' },
  { id: 'past', label: 'The Past' },
  { id: 'present', label: 'The Present' },
  { id: 'future', label: 'The Future' },
]

/** Areas Melvin is EXPLORING — framed as directions, not titles he claims. */
const AREAS = [
  'Applied AI',
  'Machine Learning',
  'MLOps',
  'Computer Vision',
  'Full Stack',
  'World Models',
  'Vision, Language, Action',
  'Robotics',
  'Neurotechnology',
  'Aerospace',
]

/** Shared class for the glass slide boxes. `.slide-glass` (index.css) carries the
 *  full glass material — fill, rim, shadow, radius; here we only add padding and a
 *  text-shadow so white copy stays legible on the lighter parts of the surface. */
const GLASS_BOX = 'slide-glass px-8 py-9 md:px-10 [text-shadow:0_1px_16px_rgba(0,0,0,0.55)]'

/* ---------------------------------------------------------------------------
 * Bottom frame indicator: dots only, no connecting line. Each jumps to a frame.
 * ------------------------------------------------------------------------ */
function FrameDots({ active }: { active: number }) {
  return (
    <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
      {FRAMES.map((f, i) => (
        <button
          key={f.id}
          type="button"
          onClick={() => heroScrollToFrame(i)}
          aria-label={`Go to ${f.label}`}
          aria-current={i === active}
          className={`block rounded-full transition-all duration-500 ${
            i === active
              ? 'h-[9px] w-[9px] bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]'
              : 'h-[7px] w-[7px] bg-white/25 hover:bg-white/50'
          }`}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 0 — Identity. Tagline kicker on top, the name in gold, then the pitch.
 * A soft vignette lifts it off the mask so it reads as one clean centred block.
 * ------------------------------------------------------------------------ */
function IdentityFrame() {
  // Surname is rendered letter-by-letter with `justify-between` inside a box
  // that stretches to the first-name line's width, so "KARUPATI" spans exactly
  // the same width as "Melvin Chirag" at every viewport.
  const surname = 'KARUPATI'.split('')

  return (
    <div className="relative flex h-full items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(44% 42% at 50% 48%, rgba(6,7,13,0.6) 0%, rgba(6,7,13,0.3) 46%, transparent 72%)',
        }}
      />

      <div className="relative flex max-w-2xl flex-col items-center text-center">
        {/* Tagline kicker, above the name. "Beyond" glows and links to Vision. */}
        <p className="mb-5 font-display text-[clamp(1rem,2.1vw,1.4rem)] text-white/75 [text-shadow:0_1px_20px_rgba(0,0,0,0.6)]">
          Computer Science and{' '}
          <Link to="/vision" className="beyond-link" aria-label="Beyond — explore my Vision">
            Beyond
          </Link>
        </p>

        <h1 className="inline-flex flex-col">
          <span className="name-gold font-display text-[clamp(2.8rem,8vw,5.8rem)] leading-[0.95] tracking-[-0.01em]">
            Melvin Chirag
          </span>
          <span
            aria-label="Karupati"
            className="mt-2 flex justify-between font-display text-[clamp(1.2rem,3.1vw,2.2rem)]"
            style={{ color: 'rgba(255,220,174,0.6)' }}
          >
            {surname.map((ch, i) => (
              <span key={i} aria-hidden>
                {ch}
              </span>
            ))}
          </span>
        </h1>

        <p className="mt-7 max-w-md text-[13.5px] leading-relaxed text-white/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.6)]">
          I'm exploring computer vision, intelligent systems, machine learning, and full stack
          products. I like building things where software meets the real world, connecting ideas
          across domains and turning curiosity into something that actually works.
        </p>

        {/* Projects goes to the Work page (the full view of what Melvin builds). */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/work"
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide text-white/90"
          >
            Projects
          </Link>
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
            Resume <span aria-hidden>↗</span>
          </a>
        </div>

        <SocialLinks className="mt-7 justify-center" />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 1 — The Past. Short origin, not a timeline (that's About).
 * ------------------------------------------------------------------------ */
function PastFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className={`${GLASS_BOX} w-[min(88vw,600px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95]">
          The Past
        </h2>
        <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/85">
          <p>
            Born in Hyderabad and raised in Kuwait, I later continued my education in India before
            moving to Michigan for computer science.
          </p>
          <p>
            I first thought about engineering because I wanted to build things with my hands. Then I
            found computer science, where an idea can turn into a real tool, system, or experience
            at the speed of your own curiosity.
          </p>
          <p>
            That was the shift. I wasn't looking for a single job title. I was looking for a way to
            keep creating.
          </p>
        </div>
        <Link
          to="/about"
          className="mt-7 inline-block text-[13px] tracking-wide text-white/85 transition-colors duration-300 hover:text-white"
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
      <span className="mt-4 inline-block text-[12px] tracking-wide text-white/35" title="Link coming soon">
        Explore Project <span aria-hidden>→</span>
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-block text-[12px] tracking-wide text-white/85 transition-colors duration-300 hover:text-white"
    >
      Explore Project <span aria-hidden>→</span>
    </a>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 2 — The Present. Three featured project cards inside the glass box.
 * ------------------------------------------------------------------------ */
function PresentFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div className={`${GLASS_BOX} w-[min(94vw,1060px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95]">
          The Present
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/85">
          Right now I'm building at the intersection of computer vision, machine learning,
          interactive software, and a lot of scientific curiosity.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <article
              key={p.name}
              className="flex flex-col rounded-2xl border border-white/12 bg-white/[0.05] p-5 text-left"
            >
              <div className="relative mb-4 flex aspect-[16/10] items-end overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.12] to-transparent">
                <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-5xl text-white/20">
                  {p.name.charAt(0)}
                </span>
                <span className="m-3 text-[9px] tracking-[0.25em] text-white/45 uppercase">
                  {p.tentative ? 'Preview coming' : 'Preview'}
                </span>
              </div>

              <h3 className="font-display text-xl text-white">{p.name}</h3>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/80">{p.blurb}</p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.stack.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] tracking-wide text-white/70"
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
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 3 — The Future. Ambition + the areas he's exploring.
 * ------------------------------------------------------------------------ */
function FutureFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className={`${GLASS_BOX} w-[min(90vw,680px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95]">
          The Future
        </h2>
        <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/85">
          <p>
            I want to build intelligent systems that move past the screen, systems that can perceive
            the world, reason about it, and act within it.
          </p>
          <p>
            I'm especially drawn to computer vision, applied machine learning, robotics, world
            models, and systems that connect vision, language, and action. Longer term I want to
            bring AI into fields like robotics, neurotechnology, aerospace, and scientific discovery.
          </p>
          <p>
            The goal is to turn new research into things that are genuinely useful and reliable, and
            eventually to build systems that make hard technology feel more capable, more open, and
            more human.
          </p>
        </div>

        <p className="mt-7 text-[10px] tracking-[0.3em] text-white/55 uppercase">Areas I'm exploring</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <li
              key={area}
              className="rounded-full border border-white/15 px-3 py-1 text-[11px] tracking-wide text-white/80"
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
  const frame = useHeroFrame()
  const stripRef = useRef<HTMLDivElement>(null)

  // The pan. Slide the strip left by `progress × (N-1) × viewportWidth`, so
  // frame k is centred when progress === k/(N-1). Transform only → composited,
  // cheap. The glass boxes inside pan with it; the WebGL glass follows each box
  // by reading its live rect (see LiquidGlassField), so box + text + glass stay
  // locked together as one slide.
  useEffect(() => {
    const LAST = BEAT_COUNT - 1
    let raf = 0
    const tick = () => {
      if (stripRef.current) {
        stripRef.current.style.transform = `translate3d(${-heroScroll.progress * LAST * window.innerWidth}px,0,0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <HeroClockRail />

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

      <FrameDots active={frame} />
    </>
  )
}
