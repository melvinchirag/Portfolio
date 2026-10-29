/* ============================================================================
 * Vision.tsx — "The Future": where the work is heading
 * ----------------------------------------------------------------------------
 * 2026-10-29 rewrite. The old page had two problems: a dashed box reading
 * "[ PLACEHOLDER: WEBGL CENTERPIECE ]" filling the right half, and copy
 * ("my life's mission is to create AGI", "transformers are fundamentally
 * limited") that contradicted the calmer, more credible Future text on the
 * hero. Recruiters read this page, so it now carries the hero's framing,
 * expanded: directions, not claims, with the areas as a plain list.
 *
 * The reserved visual for this page (the ink-fluid simulation, or the many
 * synced masks) is still planned. It gets built as its own block and wired
 * in here; until then the page is a clean single column with no placeholder.
 * ========================================================================= */

import { useEffect } from 'react'
import { TagThread } from '../components/TagThread'

const AREAS = [
  'Applied AI',
  'Machine Learning',
  'MLOps',
  'Computer Vision',
  'World Models',
  'Vision, Language, Action',
  'Robotics',
  'Neurotechnology',
  'Aerospace',
  'Scientific discovery',
]

export function Vision() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-6 pt-32 pb-32 md:px-10">
      <header className="mb-16">
        <p className="label">The future</p>
        <h1 className="display-wide mt-4 font-display text-5xl leading-[0.95] font-bold tracking-tight text-white md:text-7xl">
          Vision
        </h1>
      </header>

      <section className="flex flex-col gap-10">
        <p className="text-xl leading-relaxed text-white/90 md:text-2xl">
          I want to build intelligent systems that move past the screen: systems that can perceive
          the world, reason about it, and act within it.
        </p>

        <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-white/65">
          <p>
            Right now that means computer vision, applied machine learning, world models, and
            systems that connect vision, language and action. Osiris is the current expression of
            it: a camera, a model that understands what it sees, and a device that responds.
          </p>
          <p>
            Longer term I want to bring the same approach into fields where the hard part is the
            physical world: robotics, neurotechnology, aerospace, and scientific discovery. Those
            are directions I read and study in, not fields I claim to work in yet. Manas, the
            space-simulation console, is the first small step into one of them.
          </p>
          <p>
            The goal underneath all of it is simple. Take new research and turn it into things that
            are genuinely useful and reliable, and build systems that make hard technology feel
            more capable, more open, and more human.
          </p>
        </div>

        <div>
          <p className="label mb-3">Areas I’m exploring</p>
          <TagThread items={AREAS} />
        </div>
      </section>
    </div>
  )
}
