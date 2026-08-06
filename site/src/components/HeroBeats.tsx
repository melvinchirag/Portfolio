/* ============================================================================
 * HeroBeats.tsx — the hero's scrollytelling content, as a HORIZONTAL pan
 * ----------------------------------------------------------------------------
 * Four frames laid side by side in one wide strip: Identity · The Past · The
 * Present (featured projects) · The Future. You scroll VERTICALLY (native
 * wheel/trackpad, via Lenis) and the strip slides LEFT — moving down walks you
 * rightward through time, matching the "life in three tenses" timeline motif.
 *
 * THE GLASS PANEL (read this before touching it):
 * The strip is CSS-transformed (that's the pan). A transformed ancestor stops
 * `backdrop-filter` from sampling anything behind it, so a glass box placed
 * INSIDE the strip blurs nothing — the mask sits further back. That was the
 * "glass doesn't blur" bug. Fix: ONE glass panel (`.hero-glass`) lives in the
 * sticky layer OUTSIDE the strip, where its backdrop really is the mask, so the
 * blur is real. It is centred, auto-sized each frame to the centred frame's
 * measured content, and only fades in as a frame SETTLES at centre (so you
 * never see text half-on / half-off a static box while panning). The Identity
 * frame gets a soft vignette instead of a panel.
 *
 * Perf note: everything scroll-driven is written imperatively in one rAF loop
 * (transform + panel size/opacity). React state (`useHeroFrame`) only swaps
 * which frame is interactive — a few times per scroll, never per frame.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import type { Ref } from 'react'
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
 * Frame 0 — Identity. A soft centred vignette lifts the text off the mask so
 * the whole block reads as one clean, centred lockup.
 * ------------------------------------------------------------------------ */
function IdentityFrame() {
  // Surname is rendered letter-by-letter with `justify-between` inside a box
  // that stretches to the width of the first-name line above it, so "KARUPATI"
  // spans EXACTLY the same width as "Melvin Chirag" at every viewport.
  const surname = 'KARUPATI'.split('')

  return (
    <div className="relative flex h-full items-center justify-center px-6">
      {/* Vignette: darkens the mask just behind the text, fading to nothing so
          the scene is softened, not hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(46% 42% at 50% 47%, rgba(6,7,13,0.62) 0%, rgba(6,7,13,0.32) 45%, transparent 72%)',
        }}
      />

      <div className="relative flex max-w-2xl flex-col items-center text-center [text-shadow:0_1px_24px_rgba(0,0,0,0.5)]">
        <h1 className="inline-flex flex-col text-white">
          <span className="font-display text-[clamp(2.6rem,7.5vw,5.4rem)] leading-[0.95] tracking-[-0.005em]">
            Melvin Chirag
          </span>
          <span
            aria-label="Karupati"
            className="mt-2 flex justify-between font-display text-[clamp(1.15rem,3vw,2.1rem)] text-white/70"
          >
            {surname.map((ch, i) => (
              <span key={i} aria-hidden>
                {ch}
              </span>
            ))}
          </span>
        </h1>

        <p className="mt-6 text-[11px] tracking-[0.26em] text-white/65 uppercase">
          Computer Science Student · Applied AI · Computer Vision · Full Stack
        </p>

        <p className="mt-6 font-display text-[clamp(1.4rem,3vw,2.1rem)] text-white/90">
          Computer Science and{' '}
          <Link to="/vision" className="beyond-link" aria-label="Beyond — explore my Vision">
            Beyond
          </Link>
        </p>

        <p className="mt-6 max-w-md text-[13.5px] leading-relaxed text-white/75">
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
 * Frame 1 — The Past. Short origin, not a timeline (that's About). `innerRef`
 * lets HeroBeats measure this content so the glass panel can size to it.
 * ------------------------------------------------------------------------ */
function PastFrame({ innerRef }: { innerRef?: Ref<HTMLDivElement> }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div ref={innerRef} className="max-w-xl px-8 py-9">
        <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95] text-white">
          The Past
        </h2>
        <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/80">
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
 * Frame 2 — The Present. Three featured project cards over the glass panel.
 * ------------------------------------------------------------------------ */
function PresentFrame({ innerRef }: { innerRef?: Ref<HTMLDivElement> }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div ref={innerRef} className="w-full max-w-5xl px-8 py-8">
        <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95] text-white">
          The Present
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/80">
          Right now I'm building at the intersection of computer vision, machine learning,
          interactive software, and a lot of scientific curiosity.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <article
              key={p.name}
              className="flex flex-col rounded-2xl border border-white/12 bg-white/[0.04] p-5 text-left"
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
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/75">{p.blurb}</p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.stack.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] tracking-wide text-white/65"
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
function FutureFrame({ innerRef }: { innerRef?: Ref<HTMLDivElement> }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div ref={innerRef} className="max-w-2xl px-8 py-9">
        <h2 className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95] text-white">
          The Future
        </h2>
        <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/80">
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

        <p className="mt-7 text-[10px] tracking-[0.3em] text-white/50 uppercase">Areas I'm exploring</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <li
              key={area}
              className="rounded-full border border-white/12 px-3 py-1 text-[11px] tracking-wide text-white/75"
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
  const panelRef = useRef<HTMLDivElement>(null)
  // Measured content box of frames 1-3 (index 0 unused — Identity has no panel).
  const contentRefs = useRef<(HTMLDivElement | null)[]>([])
  const contentSizes = useRef<({ w: number; h: number } | null)[]>([null, null, null, null])

  // Measure each frame's content so the glass panel can match its footprint.
  // offsetWidth/Height are layout metrics, unaffected by the strip's transform.
  useEffect(() => {
    const measure = () => {
      contentRefs.current.forEach((el, i) => {
        if (el) contentSizes.current[i] = { w: el.offsetWidth, h: el.offsetHeight }
      })
    }
    measure()
    // Re-measure once shortly after mount, in case layout settles late.
    const t = window.setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [])

  // One rAF loop drives BOTH the pan and the glass panel.
  useEffect(() => {
    const LAST = BEAT_COUNT - 1
    let raf = 0
    const tick = () => {
      const p = heroScroll.progress

      // Pan: slide the strip so frame k is centred when progress === k/LAST.
      if (stripRef.current) {
        stripRef.current.style.transform = `translate3d(${-p * LAST * window.innerWidth}px,0,0)`
      }

      // Glass panel: size to the nearest frame's content, fade in as it settles.
      if (panelRef.current) {
        const nf = Math.round(p * LAST) // nearest frame index
        const center = nf / LAST
        // 1 at dead-centre, easing to 0 by 0.11 of progress away (before the
        // midpoint between frames), so glass is present only when settled.
        const settle = Math.max(0, 1 - Math.abs(p - center) / 0.11)
        const size = contentSizes.current[nf]
        if (nf === 0 || !size) {
          panelRef.current.style.opacity = '0'
        } else {
          // +64/+48 gives the glass a margin around the measured text box.
          panelRef.current.style.width = `${size.w + 64}px`
          panelRef.current.style.height = `${size.h + 48}px`
          panelRef.current.style.opacity = String(settle)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <HeroClockRail />

      {/* The real-blur glass panel. Sits OUTSIDE the transformed strip (so its
          backdrop is the mask, not empty strip space) and is centred; size +
          opacity are set each frame in the rAF loop above. */}
      <div
        ref={panelRef}
        aria-hidden
        className="hero-glass pointer-events-none absolute top-1/2 left-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 rounded-[1.9rem]"
        style={{ opacity: 0, width: 0, height: 0 }}
      />

      {/* The horizontal frame strip. Width = N × 100vw; the sticky parent's
          overflow-hidden clips everything but the centred frame. Each cell only
          becomes interactive when it's the centred one. */}
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
              <PastFrame innerRef={(el) => { contentRefs.current[1] = el }} />
            ) : i === 2 ? (
              <PresentFrame innerRef={(el) => { contentRefs.current[2] = el }} />
            ) : (
              <FutureFrame innerRef={(el) => { contentRefs.current[3] = el }} />
            )}
          </div>
        ))}
      </div>

      <FrameDots active={frame} />
    </>
  )
}
