import { useEffect } from 'react'

const INTERESTS = [
  'Mathematics & Logic',
  'Neural Networks',
  'Neuroscience',
  'Memory Architecture',
  'Astrophysics',
  'Aerospace',
]

export function Vision() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-24 md:px-10">
      <header className="mb-24 text-center md:text-left">
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
          Vision
        </h1>
      </header>

      <div className="grid gap-16 md:grid-cols-2 md:gap-12">
        {/* Left Col: Manifesto */}
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-4 text-xs tracking-[0.2em] text-white/50 uppercase">The Objective</h2>
            <p className="text-xl leading-relaxed font-light text-white/90 md:text-2xl">
              Building toward true Artificial General Intelligence by bridging the gap between logic and physical memory.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              My life's mission is to create AGI that possesses true intelligence, rather than just contextual intelligence.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xs tracking-[0.2em] text-white/50 uppercase">The Missing Link</h2>
            <p className="text-sm leading-relaxed text-white/70">
              Present AI, heavily reliant on transformers, is fundamentally limited. It lacks true, grounded intelligence. I believe the missing piece is <span className="text-white font-medium">Memory</span>—specifically, how memory maps physically in the brain, how it interacts with decision-making, and how it anchors context over time.
              <br /><br />
              My work focuses on the intersection of deep neural networks, mathematics, and neuroscience to solve this fundamental architecture problem.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {INTERESTS.map((interest) => (
                <span key={interest} className="rounded-full border border-white/10 px-4 py-1.5 text-xs tracking-wide text-white/50">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Right Col: Placeholder for future visual */}
        <section className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
          <p className="text-[11px] tracking-widest text-white/20 uppercase">
            [ Placeholder: WebGL Centerpiece ]
          </p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/30">
            Reserved for the ink-fluid Navier-Stokes simulation or the 50-60 synced masks concept.
          </p>
        </section>
      </div>
    </div>
  )
}
