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

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BEAT_COUNT, heroScroll, useHeroFrame } from '../hooks/heroScroll'
import { heroScrollTo, heroScrollToFrame } from '../hooks/useLenis'
import { PROJECTS } from '../data/projects'
import { HeroClockRail } from './HeroClockRail'
import { NameAssembly, SOLIDIFY_SECS } from './NameAssembly'
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
/* Padding steps DOWN on phones. These frames are pinned to one viewport with
 * `overflow: hidden`, so anything taller than the screen is silently clipped
 * rather than scrollable — vertical space is the scarcest resource on this
 * slide, and box padding is the cheapest place to find some. Smaller padding
 * also widens the content column, which costs the long intro paragraph a
 * wrapped line or two on its own. Measured on a simulated 390px phone: this
 * takes the Present box from ~31px of headroom to ~70px. */
// 2026-10-29: no glass in the hero any more (Melvin's call). `sync-glass-rect`
// is gone from every hero element, so the WebGL glass shader skips this page,
// and `.slide-glass` is now a plain transparent box (see index.css). The
// text-shadow went with it: no shadows, no glow, anywhere.
const GLASS_BOX = 'slide-glass px-6 py-7 sm:px-8 sm:py-9 md:px-10'

/* The prose block inside Past and Future, as ONE shared class so the two
 * frames can't drift apart (Melvin, 2026-08-11: "this formatting needs to be
 * cleanly applied to all other slides... there needs to be uniformity
 * throughout").
 *
 * Steps down on phones for the same reason GLASS_BOX does: these frames are
 * pinned to a single viewport with `overflow: hidden`, so overflow is silent
 * clipping, not a scrollbar. Measured on a simulated 390px phone, Future's
 * three paragraphs alone ran 450px, which was the single line item pushing
 * that frame off screen. Desktop is untouched — everything below `sm:` only
 * applies under 640px. */
const PROSE_STACK =
  'mt-5 space-y-3.5 text-[12.5px] leading-[1.6] sm:mt-7 sm:space-y-5 sm:text-[14px] sm:leading-relaxed text-sand/85'

/* ---------------------------------------------------------------------------
 * Bottom frame indicator: dots only, no connecting line. Each jumps to a frame.
 * ------------------------------------------------------------------------ */
function FrameDots({ active }: { active: number }) {
  return (
    // bottom-3: tucked under the hero ticker (which sits at ~5.5vh), not on it.
    <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
      {FRAMES.map((f, i) => (
        <button
          key={f.id}
          type="button"
          onClick={() => heroScrollToFrame(i)}
          aria-label={`Go to ${f.label}`}
          aria-current={i === active}
          className={`ease-out-expo block rounded-full transition-all duration-500 ${
            i === active
              ? 'h-[9px] w-[9px] bg-sand'
              : 'h-[7px] w-[7px] bg-sand/25 hover:bg-sand/50'
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
/* The running line of facts under the name (board idea 3). Real roles only,
 * from Otto's `context/uni.md`; nothing aspirational. Rendered twice inside
 * the ticker so the loop is seamless. */
const FACTS = [
  'Co-lead and finance lead, Hack The Nest',
  'Vice president, GDG on Campus at EMU',
  'Founder and president, SPARC',
  'Winner, SpartaHack 11',
  'Winner, GrizzHacks 8',
  'Kuwait → India → Michigan',
  'Computer science, Eastern Michigan University',
]

/* 2026-10-29 REBUILD. The old frame was a centred stack (kicker, name with
 * glow, spaced-out surname, paragraph, three pills, four icons) sitting ON TOP
 * of the mask. Now: the mask owns the left of the screen untouched, and the
 * name owns the right, bottom-aligned, the way a film title sits in a frame.
 * The first name is enormous and assembles out of particles on load
 * (NameAssembly); under it the second line is the quiet narrow cut; under that
 * a thin mono ticker of real facts. One primary action, one secondary. The
 * socials become three mono text links in the top-right meta row. */
function IdentityFrame({ index }: { index: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const firstNameRef = useRef<HTMLSpanElement>(null)
  // The DOM name stays invisible until the particles have formed it, then
  // fades in as they fade out. Reduced motion: NameAssembly fires onDone at
  // once, so the name is simply there.
  const [nameShown, setNameShown] = useState(false)
  const reveal = useCallback(() => setNameShown(true), [])

  const linkRow = 'label flex items-center gap-5'
  const link =
    'ease-out-expo text-sand-dim transition-colors duration-300 hover:text-sand focus-visible:text-sand focus-visible:outline-none'

  return (
    // data-pan marks this as a panned root — the rAF loop writes its transform.
    // Full-bleed: the frame IS the viewport cell, and the layout inside it is a
    // 12-column grid so the name can sit in the right half, clear of the mask.
    <div
      ref={rootRef}
      data-pan={index}
      // Right padding on md+ clears the fixed 76px clock rail (HeroClockRail).
      className="relative grid h-full w-full grid-cols-12 items-end px-6 pb-[12vh] md:px-10 md:pr-[100px] lg:px-14 lg:pr-[110px]"
    >
      <NameAssembly rootRef={rootRef} targetRef={firstNameRef} onDone={reveal} />

      {/* Top meta row: who/where on the left, the three links recruiters want
          on the right. Sits under the nav, in the nav's own gutter. */}
      <div className="absolute inset-x-6 top-[11vh] flex items-center justify-between gap-6 md:left-10 md:right-[100px] lg:left-14 lg:right-[110px]">
        <span className="label hidden sm:inline">Computer science · Eastern Michigan University</span>
        <div className={linkRow}>
          <a href="https://github.com/melvinchirag" target="_blank" rel="noopener noreferrer" className={link}>
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/melvin-chirag-karupati-a34452380"
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            LinkedIn
          </a>
          <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className={link}>
            Résumé ↗
          </a>
        </div>
      </div>

      {/* The name block: right half on laptops, full width on phones. */}
      <div className="relative col-span-12 md:col-span-7 md:col-start-6">
        <h1 className="flex flex-col">
          <span
            ref={firstNameRef}
            // Opacity transition length = NameAssembly's SOLIDIFY_SECS, so the
            // text comes up at exactly the pace the dust thins out.
            style={{ transitionDuration: `${SOLIDIFY_SECS}s`, transitionTimingFunction: 'ease-in-out' }}
            className={`name-gold display-wide font-display text-[clamp(4rem,15vw,9rem)] leading-[0.86] font-extrabold tracking-[-0.03em] uppercase transition-opacity md:text-[clamp(5rem,9.4vw,12rem)] ${
              nameShown ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Melvin
          </span>
          <span className="display-narrow mt-3 font-display text-[clamp(1.1rem,3.2vw,2rem)] leading-none font-normal tracking-[0.01em] text-sand-dim">
            Chirag Karupati
          </span>
        </h1>

        <p className="mt-7 max-w-[44ch] text-[14.5px] leading-relaxed text-sand/75 sm:text-[15.5px]">
          I build computer-vision and machine-learning systems that work outside the screen, and I
          co-lead Hack The Nest, EMU's first hackathon. This site can{' '}
          <Link to="/vision" className="beyond-link" aria-label="Beyond — explore my Vision">
            see further
          </Link>
          .
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/work" className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide">
            See the work
          </Link>
          <button
            type="button"
            onClick={() => heroScrollTo('contact')}
            className="glass-cta is-secondary rounded-full px-6 py-2.5 text-sm tracking-wide"
          >
            Contact
          </button>
        </div>
      </div>

      {/* The ticker. Absolute to the bottom edge so it reads as part of the
          frame, not of the text block. Duplicated once for a seamless loop. */}
      <div
        aria-label="Roles and milestones"
        className="ticker absolute inset-x-6 bottom-[5.5vh] md:left-10 md:right-[100px] lg:left-14 lg:right-[110px]"
      >
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1} className="ticker-run">
              {FACTS.map((f) => (
                <span key={f} className="ticker-item">
                  {f}
                </span>
              ))}
            </span>
          ))}
        </div>
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
        <div className={PROSE_STACK}>
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
  // Holds the in-flight scroll animation frame so a new click cancels the old
  // one instead of two tweens fighting over scrollLeft.
  const scrollAnimRef = useRef<number | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateEdges = () => {
    const el = railRef.current
    if (!el) return
    // 2px slop absorbs sub-pixel scroll-end rounding some browsers produce.
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  /* THE ALIGNMENT RULE, measured at runtime instead of hardcoded.
   *
   * Melvin's requirement: every card's tag row must START at the same Y, "even
   * if one card has more space". Two earlier attempts got this wrong:
   *   - `flex-1` on the blurb only pins the card's BOTTOM, so cards whose tag
   *     lists wrap to different line counts still started their tags at
   *     different heights.
   *   - a fixed `min-height: 16.5em` in CSS did align them, but the value was
   *     an ESTIMATE of the worst case. Measured live it was 206px while the
   *     tallest blurb actually needed ~142px, so every card carried ~64px of
   *     dead space — which is what pushed the whole box past the viewport and
   *     clipped the tech stack off the bottom on his laptop.
   *
   * A single constant cannot be right at every width, because how many lines
   * a blurb wraps to depends on the card width, which is itself a responsive
   * formula. So: measure the tallest blurb at the CURRENT width and pin all
   * of them to exactly that. Perfect alignment, zero wasted pixels, and it
   * re-solves itself whenever the box resizes. */
  const equalizeRows = () => {
    const el = railRef.current
    if (!el) return
    for (const sel of ['.card-name', '.card-blurb']) {
      const nodes = [...el.querySelectorAll<HTMLElement>(sel)]
      if (!nodes.length) continue
      // Release first, so the measurement reads natural height rather than
      // whatever we pinned on the previous pass.
      for (const n of nodes) n.style.minHeight = ''
      const tallest = Math.max(...nodes.map((n) => n.getBoundingClientRect().height))
      for (const n of nodes) n.style.minHeight = `${Math.ceil(tallest)}px`
    }
  }

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    updateEdges()
    equalizeRows()
    el.addEventListener('scroll', updateEdges, { passive: true })

    // A ResizeObserver, not a `resize` listener: this needs to react to the
    // BOX shrinking (e.g. entering split-screen) even though the window
    // itself never fired a resize event.
    //
    // Width-gated on purpose: equalizeRows CHANGES the rail's height, which
    // would re-trigger this observer and could oscillate. Card wrapping only
    // depends on WIDTH, so ignoring pure height changes both fixes that and
    // skips work that couldn't have changed the answer.
    let lastWidth = el.getBoundingClientRect().width
    const ro = new ResizeObserver((entries) => {
      updateEdges()
      const w = entries[0].contentRect.width
      if (Math.abs(w - lastWidth) < 1) return
      lastWidth = w
      equalizeRows()
    })
    ro.observe(el)

    // Web fonts land after first paint and re-wrap the text under us, so the
    // first measurement can be taken against fallback metrics. Re-run once
    // fonts are actually ready.
    document.fonts?.ready.then(equalizeRows).catch(() => {})

    return () => {
      el.removeEventListener('scroll', updateEdges)
      ro.disconnect()
      if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current)
    }
  }, [])

  const scrollByCard = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-project-card]')
    // Read the LIVE computed gap rather than a hardcoded constant — the gap
    // is now a responsive clamp() (see .project-rail in index.css), not a
    // fixed Tailwind `gap-5`, so a constant here would drift out of sync with
    // whatever the current viewport actually renders.
    const gap = el ? parseFloat(getComputedStyle(el).columnGap || '0') : 0
    const amount = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.8

    // WHY NOT `el.scrollBy({ behavior: 'smooth' })`: Lenis (our smooth-scroll
    // library) is active on the page, and it swallows native smooth scrolls —
    // a `behavior: 'smooth'` call resolves to ZERO movement here, which is why
    // the arrows silently did nothing. `behavior: 'instant'` works, but a hard
    // jump is off-brand. So we animate scrollLeft ourselves with rAF, which
    // Lenis does not touch (it only manages the root scroller, not this inner
    // element). Reduced motion gets the instant jump.
    const maxLeft = el.scrollWidth - el.clientWidth
    const target = Math.max(0, Math.min(maxLeft, el.scrollLeft + dir * amount))

    if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.scrollLeft = target
      return
    }

    const start = el.scrollLeft
    const startTime = performance.now()
    const duration = 500
    // easeOutCubic — fast out, gentle settle, in the spirit of the site's
    // ease-out-expo without pulling in a dependency.
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration)
      el.scrollLeft = start + (target - start) * ease(p)
      if (p < 1) scrollAnimRef.current = requestAnimationFrame(step)
      else scrollAnimRef.current = null
    }
    scrollAnimRef.current = requestAnimationFrame(step)
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
    // NOT `relative`: the arrows below are positioned against the glass box
    // (the nearest positioned ancestor), so they centre on the panel and sit in
    // its side gutters instead of over the cards.
    <div className="mt-8">
      {/* Both arrows are ALWAYS rendered so the carousel affordance is visible
          from the start (Melvin, 2026-08-12: "I dont see the left and right
          arrows... it simply does not exist"). They were previously mounted only
          when scrollable, so on wide screens where the cards fit they never
          appeared at all. Now they dim + disable at each end instead of
          vanishing. The cards are sized to overflow (see .project-rail in
          index.css) so there is always something to scroll to. */}
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        disabled={!canLeft}
        aria-label="Scroll to the previous project"
        className="project-rail-arrow project-rail-arrow-left"
      >
        <span aria-hidden>‹</span>
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        disabled={!canRight}
        aria-label="Scroll to the next project"
        className="project-rail-arrow project-rail-arrow-right"
      >
        <span aria-hidden>›</span>
      </button>

      <div
        ref={railRef}
        role="group"
        aria-label="Featured projects — use the left and right arrow keys to scroll"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="project-rail"
      >
        {PROJECTS.map((p) => (
          /* No card chrome: a translucent bordered box INSIDE a translucent
             bordered panel reads as muddy nesting, and is the "cards on cards"
             look that makes a page feel templated. Only the preview well
             carries a surface. */
          <article key={p.name} data-project-card className="flex flex-col text-left">
            {/* Image + name ARE the "Explore Project" action now (Melvin,
                2026-08-10: "remove those [Explore Project buttons]... if
                someone hovers over its name or the image it should
                automatically do what 'explore project' is doing" — this also
                evens out card height, since a trailing CTA line whose
                presence/absence depended on `href` was the thing making cards
                sit at different heights). No separate link when there's
                nothing to link to yet (`tentative` projects) — the "Preview
                coming" label in the image already says that, an inert hover
                target would just be a dead end. */}
            {p.href ? (
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Explore ${p.name}`}
                className="group/card ease-out-expo -m-1 rounded-lg p-1 transition-opacity duration-300 hover:opacity-90"
              >
                <div className="relative mb-4 flex aspect-[16/10] items-end overflow-hidden rounded-lg bg-white/[0.045] transition-colors group-hover/card:bg-white/[0.07]">
                  <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-5xl text-white/15">
                    {p.name.charAt(0)}
                  </span>
                  <span className="m-3 text-[9px] tracking-[0.25em] text-white/40 uppercase">Preview</span>
                  {/* Same arrow glyph the Resume link already uses elsewhere
                      on the hero — reused, not a new affordance to learn. */}
                  <span
                    aria-hidden
                    className="ease-out-expo text-accent absolute top-3 right-3 translate-y-1 text-sm opacity-0 transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100"
                  >
                    ↗
                  </span>
                </div>
                <h3 className="card-name font-display group-hover/card:text-accent text-xl text-white transition-colors duration-300">
                  {p.name}
                </h3>
              </a>
            ) : (
              <>
                <div className="relative mb-4 flex aspect-[16/10] items-end overflow-hidden rounded-lg bg-white/[0.045]">
                  <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-5xl text-white/15">
                    {p.name.charAt(0)}
                  </span>
                  <span className="m-3 text-[9px] tracking-[0.25em] text-white/40 uppercase">Preview coming</span>
                </div>
                <h3 className="card-name font-display text-xl text-white">{p.name}</h3>
              </>
            )}

            {/* NOT `flex-1` anymore — see .card-blurb in index.css for why:
                a flex-grow blurb only pins the BOTTOM of the tags to a common
                line, not the TOP, so cards whose tags wrap to a different
                number of lines still started their tag row at different
                heights (Melvin, 2026-08-11, via the hero layout editor: "the
                starting point of all bullet points needs to be the same in
                terms of the co-ordinates"). A fixed min-height on the blurb
                itself is what actually guarantees that. */}
            <p className="card-blurb mt-2 text-[12.5px] leading-relaxed text-white/80">{p.blurb}</p>

            <TagThread items={p.stack} compact />
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
  // `relative` so the rail arrows can position against the WHOLE glass box
  // (centred vertically on the panel, out in its side gutters) rather than
  // against the rail alone, which sat them low and over the cards.
  return (
      <div data-pan={index} className={`${GLASS_BOX} relative w-[min(94vw,1060px)]`}>
        <h2 className="frame-title font-display text-[clamp(2.6rem,7vw,5.2rem)] tracking-[-0.015em] leading-[0.95]">
          The Present
        </h2>
        {/* Full glass-box width, NOT max-w-xl (Melvin, 2026-08-11: "make it
            cover the entire tab... it needs to uniformly cover the entire
            glass box. That way we'll have more space to push the project
            cards up"). The narrow measure was costing a wrapped line or two
            of pure height in a frame that has none to spare — widening it is
            the cheapest vertical space on this slide. */}
        <p className="mt-4 text-[12px] leading-[1.6] sm:text-[13px] sm:leading-relaxed text-white/85">
          I am currently exploring topics in computer science like computer vision, V-JEPA, neural
          architecture, PaLM-E models, and much more. My vision is to ensure that AI interacts with
          real-world information, which may ultimately lead us to the genesis of AGI. I love merging AI
          and computer science with different fields of study to create projects that have the
          potential for domain expansion.
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
        <div className={PROSE_STACK}>
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
