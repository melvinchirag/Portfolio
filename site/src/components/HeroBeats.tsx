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

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BEAT_COUNT, heroScroll, useHeroFrame } from '../hooks/heroScroll'
import { heroScrollTo, heroScrollToFrame } from '../hooks/useLenis'
import { PROJECTS } from '../data/projects'
import { HeroClockRail } from './HeroClockRail'
import { SocialLinks } from './SocialLinks'
import { TagThread } from './TagThread'

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
          className={`ease-out-expo block rounded-full transition-all duration-500 ${
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
    // NO max-width here (there was one, max-w-2xl, until 2026-08-09): the name
    // now runs at real display scale, per the eladiodieste.com reference, and a
    // 672px cap would force it to wrap mid-word. The column shrink-wraps to its
    // widest child instead; the description paragraph below keeps its own
    // narrower max-w-md so body copy still reads at a comfortable measure.
    <div data-pan={index} className="relative flex flex-col items-center px-4 text-center">
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
        <p className="mb-6 font-display text-[clamp(1.05rem,2.4vw,1.5rem)] text-white/75 [text-shadow:0_1px_20px_rgba(0,0,0,0.6)]">
          Computer Science and{' '}
          <Link to="/vision" className="beyond-link" aria-label="Beyond — explore my Vision">
            Beyond
          </Link>
        </p>

        {/* Scale bumped 2026-08-09, per the Dieste reference: display type is
            meant to run uncomfortably big, closer to the viewport edge than
            feels safe, not a "nice size". Tracking tightened to match (huge
            letters read as loose at the old -0.01em). */}
        <h1 className="inline-flex flex-col">
          <span className="name-gold font-display text-[clamp(2.75rem,11vw,9rem)] leading-[0.95] tracking-[-0.02em]">
            Melvin Chirag
          </span>
          <span
            aria-label="Karupati"
            className="mt-3 flex justify-between font-display text-[clamp(1.4rem,3.6vw,2.6rem)]"
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
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide"
          >
            Projects
          </Link>
          <button
            type="button"
            onClick={() => heroScrollTo('contact')}
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide"
          >
            Contact
          </button>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide"
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
        <h2 className="frame-title font-display text-[clamp(2.6rem,7vw,5.2rem)] tracking-[-0.015em] leading-[0.95]">
          The Past
        </h2>
        <div className="mt-7 space-y-5 text-[14px] leading-relaxed text-white/85">
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
          className="ease-out-expo text-accent/85 hover:text-accent mt-7 inline-block text-[13px] tracking-wide transition-colors duration-300"
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
      className="ease-out-expo text-accent/85 hover:text-accent mt-4 inline-block text-[12px] tracking-wide transition-colors duration-300"
    >
      Explore Project <span aria-hidden>→</span>
    </a>
  )
}

/* ---------------------------------------------------------------------------
 * The project rail — Present's three cards, as a horizontally scrollable strip
 * rather than a fixed 3-column grid (Melvin, 2026-08-10: "in the present slide
 * the adjustment is weird when I split screen on my laptop... same problem on
 * phone, we need to figure something out for it").
 *
 * WHY A GRID BROKE ON THOSE WIDTHS: `md:grid-cols-3` is a binary switch — below
 * `md` it's one column (fine), at/above `md` it's forced to exactly three
 * columns regardless of how much room there actually is. A split-screened
 * laptop or a landscape phone can land ABOVE the `md` breakpoint while still
 * being too narrow for three real columns, so the grid crammed them anyway.
 * There is no single breakpoint that fixes this — the failure is continuous,
 * not discrete.
 *
 * So this isn't a grid: it's an `overflow-x: auto` strip with scroll-snap
 * (`.project-rail`). However much width is actually available, that many
 * cards (or fractions of a card, snapped) show at once, and the rest is a
 * normal horizontal scroll — the same fix at every width, not a table of
 * breakpoints. On a wide desktop viewport all three cards fit and there is
 * nothing to scroll, so this looks IDENTICAL to the old grid there; it only
 * changes behaviour exactly where the grid was breaking.
 *
 * ARROW CONTROLS: also the explicit ask ("a feature only for that glass box in
 * the present slide to scroll like a left and right arrow key on the left and
 * right side of the box respectively") — solved by the SAME mechanism as the
 * responsive fix, not a separate feature bolted on. Two circular buttons sit
 * on the rail's own left/right edges (kept INSIDE `.slide-glass`'s
 * `overflow: hidden`, not hanging off it — see index.css) and each scrolls by
 * one card width; a real ArrowLeft/ArrowRight keydown handler on the rail does
 * the same. Both are hidden at the end they'd scroll toward, via a live
 * scroll-position check, so you're never shown a control that does nothing.
 * ------------------------------------------------------------------------ */
function ProjectRail() {
  const railRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateEdges = () => {
    const el = railRef.current
    if (!el) return
    // 2px slop absorbs sub-pixel scroll-end rounding some browsers produce.
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    updateEdges()
    el.addEventListener('scroll', updateEdges, { passive: true })
    // A ResizeObserver, not a `resize` listener: this needs to react to the
    // BOX shrinking (e.g. entering split-screen) even though the window
    // itself never fired a resize event.
    const ro = new ResizeObserver(updateEdges)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateEdges)
      ro.disconnect()
    }
  }, [])

  const scrollByCard = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-project-card]')
    const gap = 20 // matches the `gap-5` on .project-rail below
    const amount = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.8
    el.scrollBy({ left: dir * amount, behavior: 'smooth' })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollByCard(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollByCard(-1)
    }
  }

  return (
    <div className="relative mt-8">
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Scroll to the previous project"
          className="project-rail-arrow project-rail-arrow-left"
        >
          <span aria-hidden>‹</span>
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Scroll to the next project"
          className="project-rail-arrow project-rail-arrow-right"
        >
          <span aria-hidden>›</span>
        </button>
      )}

      <div
        ref={railRef}
        role="group"
        aria-label="Featured projects — use the left and right arrow keys to scroll"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="project-rail gap-5"
      >
        {PROJECTS.map((p) => (
          /* No card chrome: a translucent bordered box INSIDE a translucent
             bordered panel reads as muddy nesting, and is the "cards on cards"
             look that makes a page feel templated. Only the preview well
             carries a surface. */
          <article key={p.name} data-project-card className="flex flex-col text-left">
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

            <TagThread items={p.stack} compact />

            <ExploreLink href={p.href} />
          </article>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 2 — The Present. Three featured project cards inside the glass box.
 * ------------------------------------------------------------------------ */
function PresentFrame({ index }: { index: number }) {
  return (
      <div data-pan={index} className={`${GLASS_BOX} w-[min(94vw,1060px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.6rem,7vw,5.2rem)] tracking-[-0.015em] leading-[0.95]">
          The Present
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/85">
          Right now I'm building at the intersection of computer vision, machine learning,
          interactive software, and a lot of scientific curiosity.
        </p>

        <ProjectRail />
      </div>
  )
}

/* ---------------------------------------------------------------------------
 * Frame 3 — The Future. Ambition + the areas he's exploring.
 * ------------------------------------------------------------------------ */
function FutureFrame({ index }: { index: number }) {
  return (
      <div data-pan={index} className={`${GLASS_BOX} w-[min(90vw,680px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.6rem,7vw,5.2rem)] tracking-[-0.015em] leading-[0.95]">
          The Future
        </h2>
        <div className="mt-7 space-y-5 text-[14px] leading-relaxed text-white/85">
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

        {/* Not bordered pills — see TagThread.tsx for why (chips make ten
            equal-weight nouns look like filter controls you can click, the
            most templated element on any portfolio). Same accent-thread
            treatment as the Present cards' stack, so both slides carry ONE
            considered version of "a short word list", not two designs. */}
        <p className="mt-7 text-[10px] tracking-[0.3em] text-white/45 uppercase">
          Areas I'm exploring
        </p>
        <TagThread items={AREAS} />
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
