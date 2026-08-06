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
 * the strip's transform imperatively. React state (`useHeroFrame`) is used ONLY
 * to swap which frame is interactive/aria-visible.
 *
 * Because the pan is horizontal, the frame indicator is a row of DOTS along the
 * BOTTOM (no connecting line — Melvin's call). Frames 2-4 sit inside a
 * blurring glass panel so their text stays readable over the mask without
 * hiding it. Copy is written to sound human: no em-dashes, few hyphens.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BEAT_COUNT, heroScroll, useHeroFrame } from '../hooks/heroScroll'
import { heroScrollTo, heroScrollToFrame } from '../hooks/useLenis'
import { PROJECTS } from '../data/projects'
import { HeroClockRail } from './HeroClockRail'
import { SocialLinks } from './SocialLinks'

/** Frame order — also the labels announced by the bottom indicator dots. */
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

/* ---------------------------------------------------------------------------
 * The bottom frame indicator: just dots, no connecting line. Each dot jumps to
 * its frame. Centred along the bottom so it reads as a horizontal-scroll
 * position marker rather than a vertical rail.
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
 * Frame 0 — Identity. Name, who he is, the interactive tagline, the three
 * actions, and the social row. This is the recruiter's first 3 seconds.
 * ------------------------------------------------------------------------ */
function IdentityFrame() {
  // Surname is rendered letter-by-letter with `justify-between` inside a box
  // that stretches to the width of the first-name line above it. That makes
  // "KARUPATI" span EXACTLY the same width as "Melvin Chirag", evenly spaced —
  // the balanced lockup Melvin wanted, and it stays matched at every viewport.
  const surname = 'KARUPATI'.split('')

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <h1 className="inline-flex flex-col text-white">
          <span className="font-display text-[clamp(2.6rem,7.5vw,5.4rem)] leading-[0.95] tracking-[-0.005em]">
            Melvin Chirag
          </span>
          <span
            aria-label="Karupati"
            className="mt-2 flex justify-between font-display text-[clamp(1.15rem,3vw,2.1rem)] text-white/65"
          >
            {surname.map((ch, i) => (
              <span key={i} aria-hidden>
                {ch}
              </span>
            ))}
          </span>
        </h1>

        <p className="mt-6 text-[11px] tracking-[0.26em] text-white/60 uppercase">
          Computer Science Student · Applied AI · Computer Vision · Full Stack
        </p>

        {/* Signature tagline — "Beyond" glows and links to the Vision page. */}
        <p className="mt-6 font-display text-[clamp(1.4rem,3vw,2.1rem)] text-white/85">
          Computer Science and{' '}
          <Link to="/vision" className="beyond-link" aria-label="Beyond — explore my Vision">
            Beyond
          </Link>
        </p>

        <p className="mt-6 max-w-md text-[13.5px] leading-relaxed text-white/70">
          I'm exploring computer vision, intelligent systems, machine learning, and full stack
          products. I like building things where software meets the real world, connecting ideas
          across domains and turning curiosity into something that actually works.
        </p>

        {/* The three hero actions. Projects goes to the Work page (the full,
            detailed view of what Melvin builds), NOT a hero slide. */}
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
 * Frame 1 — The Past. A short origin, not a timeline (that's the About page).
 * Content sits in a blurring glass panel so it reads clearly over the mask.
 * ------------------------------------------------------------------------ */
function PastFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="liquid-glass max-w-xl rounded-3xl p-8 md:p-10">
        <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95] text-white">
          The Past
        </h2>
        <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/75">
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
          className="mt-7 inline-block text-[13px] tracking-wide text-white/80 transition-colors duration-300 hover:text-white"
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
      <span className="mt-4 inline-block text-[12px] tracking-wide text-white/30" title="Link coming soon">
        Explore Project <span aria-hidden>→</span>
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-block text-[12px] tracking-wide text-white/80 transition-colors duration-300 hover:text-white"
    >
      Explore Project <span aria-hidden>→</span>
    </a>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 2 — The Present. Three featured project cards, inside a glass panel.
 * The cards are plain bordered sub-panels (not their own glass) so the panel
 * blurs once, not twice.
 * ------------------------------------------------------------------------ */
function PresentFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div className="liquid-glass w-full max-w-5xl rounded-3xl p-7 md:p-9">
        <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95] text-white">
          The Present
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/70">
          Right now I'm building at the intersection of computer vision, machine learning,
          interactive software, and a lot of scientific curiosity.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <article
              key={p.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left"
            >
              <div className="relative mb-4 flex aspect-[16/10] items-end overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.1] to-transparent">
                <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-5xl text-white/15">
                  {p.name.charAt(0)}
                </span>
                <span className="m-3 text-[9px] tracking-[0.25em] text-white/40 uppercase">
                  {p.tentative ? 'Preview coming' : 'Preview'}
                </span>
              </div>

              <h3 className="font-display text-xl text-white">{p.name}</h3>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/70">{p.blurb}</p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.stack.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] tracking-wide text-white/60"
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
 * Frame 3 — The Future. Ambition + the areas he's exploring, in a glass panel.
 * ------------------------------------------------------------------------ */
function FutureFrame() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="liquid-glass max-w-2xl rounded-3xl p-8 md:p-10">
        <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95] text-white">
          The Future
        </h2>
        <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/75">
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

        <p className="mt-7 text-[10px] tracking-[0.3em] text-white/45 uppercase">Areas I'm exploring</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <li
              key={area}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] tracking-wide text-white/70"
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
  // The centred frame (round of progress×(N-1)) — drives the indicator dots and
  // which frame is interactive. Re-renders only on frame change.
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

      <FrameDots active={frame} />
    </>
  )
}
