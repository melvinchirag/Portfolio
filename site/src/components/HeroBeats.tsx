/* ============================================================================
 * HeroBeats.tsx — the hero's scrollytelling content, as a HORIZONTAL pan
 * ----------------------------------------------------------------------------
 * Four frames in one wide strip: Identity · The Past · The Present (featured
 * projects) · The Future. You scroll VERTICALLY (native wheel via Lenis) and the
 * strip slides LEFT — moving down walks you rightward through time.
 *
 * THE GLASS — WHY THE PAN IS BUILT THE WAY IT IS (read before touching):
 * Frames 1-3 sit in a `.slide-glass` panel whose frosted look comes from a real
 * CSS `backdrop-filter`, blurring the particle mask behind it.
 *
 * `backdrop-filter` is silently killed by a TRANSFORMED ANCESTOR — a transform
 * (also filter / opacity / will-change) on any parent makes the element sample an
 * empty backdrop, so it renders stone flat with no blur at all. This cost several
 * rounds of wrong fixes: the old build panned ONE wide strip via transform, and
 * every panel inside it was therefore un-blurrable.
 *
 * So there is NO strip. The four frames are stacked cells (absolute inset-0, NO
 * transform anywhere on them), and the pan transform is applied directly to each
 * frame's own root element — the `[data-pan]` panel itself. An element having its
 * own transform is fine; only an ancestor's breaks the backdrop. The text lives
 * inside that same element, so panel + text still move as one slide.
 *
 * Corollary: never add `transform`, `filter`, `opacity < 1`, or `will-change` to
 * the wrapper cells or to `#hero-track` — any of them silently flattens the glass.
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
function IdentityFrame({ index }: { index: number }) {
  // Surname is rendered letter-by-letter with `justify-between` inside a box
  // that stretches to the first-name line's width, so "KARUPATI" spans exactly
  // the same width as "Melvin Chirag" at every viewport.
  const surname = 'KARUPATI'.split('')

  return (
    // data-pan marks this as a panned root — the rAF loop writes its transform.
    <div data-pan={index} className="relative flex max-w-2xl flex-col items-center text-center">
      {/* Soft halo so the name reads cleanly wherever the mask sits behind it.
          Oversized (negative inset) so it fades out well past the text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 -inset-y-28"
        style={{
          background:
            'radial-gradient(52% 50% at 50% 50%, rgba(6,7,13,0.62) 0%, rgba(6,7,13,0.3) 48%, transparent 74%)',
        }}
      />

      <div className="relative flex flex-col items-center">
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
function PastFrame({ index }: { index: number }) {
  return (
      <div data-pan={index} className={`${GLASS_BOX} w-[min(88vw,600px)]`}>
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
function PresentFrame({ index }: { index: number }) {
  return (
      <div data-pan={index} className={`${GLASS_BOX} w-[min(94vw,1060px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.95]">
          The Present
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/85">
          Right now I'm building at the intersection of computer vision, machine learning,
          interactive software, and a lot of scientific curiosity.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PROJECTS.map((p) => (
            /* No card chrome: a translucent bordered box INSIDE a translucent
               bordered panel reads as muddy nesting, and is the "cards on cards"
               look that makes a page feel templated. The columns are separated by
               space alone; only the preview well carries a surface. */
            <article key={p.name} className="flex flex-col text-left">
              <div className="relative mb-4 flex aspect-[16/10] items-end overflow-hidden rounded-lg bg-white/[0.045]">
                <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-5xl text-white/15">
                  {p.name.charAt(0)}
                </span>
                <span className="m-3 text-[9px] tracking-[0.25em] text-white/40 uppercase">
                  {p.tentative ? 'Preview coming' : 'Preview'}
                </span>
              </div>

              <h3 className="font-display text-xl text-white">{p.name}</h3>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-white/80">{p.blurb}</p>

              {/* Same reasoning as the areas list: a quiet separated run, not
                  chips. See the note in FutureFrame. */}
              <ul className="mt-3 flex flex-wrap items-center text-[11px] leading-[1.8] text-white/55">
                {p.stack.map((tech, i) => (
                  <li key={tech}>
                    {tech}
                    {i < p.stack.length - 1 && (
                      <span aria-hidden className="px-1.5 text-white/25">
                        /
                      </span>
                    )}
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
function FutureFrame({ index }: { index: number }) {
  return (
      <div data-pan={index} className={`${GLASS_BOX} w-[min(90vw,680px)]`}>
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

        {/* Set as a plain typographic run, NOT bordered pills. Chips make ten
            equal-weight nouns look like filter controls you can click, and they
            are the most templated element on any portfolio. A quiet separated
            line reads as prose, which is what this actually is. */}
        <p className="mt-7 text-[10px] tracking-[0.3em] text-white/45 uppercase">
          Areas I'm exploring
        </p>
        <ul className="mt-3 flex flex-wrap items-center text-[12.5px] leading-[1.9] text-white/70">
          {AREAS.map((area, i) => (
            <li key={area}>
              {area}
              {i < AREAS.length - 1 && (
                <span aria-hidden className="px-2.5 text-white/25">
                  /
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
  )
}

export function HeroBeats() {
  const frame = useHeroFrame()
  const rootRef = useRef<HTMLDivElement>(null)

  // THE PAN. Each frame's own root ([data-pan]) is translated to
  // `index × step − progress × (N-1) × step`, so frame k is dead-centre when
  // progress === k/(N-1) and the frames march past one viewport apart.
  //
  // Why per-element and not one strip: the transform MUST live on the same
  // element that carries the glass's backdrop-filter (see the file header) — a
  // transformed ancestor silently flattens the blur. Panel and its text are one
  // element, so they still move together as a single slide.
  //
  // `step` is the container's own width, not 100vw: 100vw includes the
  // scrollbar, which would drift the frames a few px off-centre per step.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const panes = Array.from(root.querySelectorAll<HTMLElement>('[data-pan]'))
    const LAST = BEAT_COUNT - 1
    let raf = 0
    const tick = () => {
      const step = root.clientWidth || window.innerWidth
      const x = heroScroll.progress * LAST * step
      for (const el of panes) {
        el.style.transform = `translate3d(${Number(el.dataset.pan) * step - x}px,0,0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <HeroClockRail />

      {/* Stacked full-bleed cells. NOTHING here may get transform / filter /
          opacity / will-change — see the file header; it would kill the glass. */}
      <div ref={rootRef} className="absolute inset-0 z-10 overflow-hidden">
        {FRAMES.map((f, i) => (
          <div
            key={f.id}
            aria-hidden={i !== frame}
            className={`absolute inset-0 flex items-center justify-center px-6 ${
              i === frame ? '' : 'pointer-events-none'
            }`}
          >
            {i === 0 ? (
              <IdentityFrame index={i} />
            ) : i === 1 ? (
              <PastFrame index={i} />
            ) : i === 2 ? (
              <PresentFrame index={i} />
            ) : (
              <FutureFrame index={i} />
            )}
          </div>
        ))}
      </div>

      <FrameDots active={frame} />
    </>
  )
}
