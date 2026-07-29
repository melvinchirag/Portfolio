import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ─── Data ────────────────────────────────────────────────────────────────────

const MILESTONES = [
  {
    year: '2002 — 2020',
    title: 'Kuwait',
    description:
      'Born and raised in the Gulf. The first chapter, the only home I knew for eighteen years.',
  },
  {
    year: '2020 — 2022',
    title: 'India',
    description:
      'Junior and senior years of high school. Relocated for the final stretch of early education before making the jump overseas.',
  },
  {
    year: 'Fall 2022 — Summer 2025',
    title: 'Henry Ford College',
    description:
      'Landed in Michigan. Started the CS degree, found the craft, and built the foundation that made the transfer possible.',
  },
  {
    year: 'Fall 2025 — Present',
    title: 'Eastern Michigan University',
    description:
      'Transferred in as a Junior. Leaning heavily into AI/ML, stepped up as Executive Member & Treasurer for the Google Developer Group.',
  },
]

// The snake path connects L1->R1, R1->R2, R2->L2, L2->L3, L3->R3
// We order the array so that the visual zig-zag traces the logical reading order.
const THREADS = [
  {
    year: 'Language',
    title: 'Telugu, Hindi & English',
    description: 'Three countries, three ways of seeing things. Telugu and Hindi at home, English everywhere else.',
  }, // L1 (0)
  {
    year: 'Craft',
    title: 'Storytelling & Film',
    description: 'A long-standing pull toward filmmaking and structure. Why this site is built the way it is.',
  }, // R1 (1)
  {
    year: 'Practice',
    title: 'Shipping & building',
    description: 'Hackathons, side projects, leadership — the habit of finishing is the practice I keep coming back to.',
  }, // L2 (2) - Read fourth
  {
    year: 'Curiosity',
    title: 'The wide edges',
    description: `Astrophysics, neuro-tech, aerospace — fields I read and study, even if not yet building in them.`,
  }, // R2 (3) - Read third
  {
    year: 'People',
    title: 'Rooms full of builders',
    description: 'GDG, the AI Club, the hackathon crew — the best part of the work is always the people around it.',
  }, // L3 (4)
  {
    year: 'Now',
    title: 'Momentum & depth',
    description: 'A challenging first semester at EMU turned into momentum. Fewer things, done better.',
  }, // R3 (5)
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({
  year,
  title,
  description,
  className = '',
}: {
  year: string
  title: string
  description: string
  className?: string
}) {
  return (
    <div className={`sync-glass-rect flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04] ${className}`}>
      <span className="font-display text-2xl text-white/20 md:text-3xl">{year}</span>
      <h3 className="text-base font-medium tracking-wide text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/60">{description}</p>
    </div>
  )
}



function PacMan() {
  return (
    <>
      <style>{`
        @keyframes pacman-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .pacman-bob {
          animation: pacman-bob 2s ease-in-out infinite;
          display: inline-block;
        }
      `}</style>
      <span className="pacman-bob ml-3 inline-block" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M50,50 L95,20 A45,45 0 1,0 95,80 Z" fill="#FACC15" />
        </svg>
      </span>
    </>
  )
}

// ─── Abstract Threads Layout ─────────────────────────────────────────────

function AbstractThreads({ items }: { items: typeof THREADS }) {
  return (
    <div className="relative z-10 flex w-full flex-col gap-12 py-8 md:gap-16">
      {items.map((item, i) => {
        // i % 2 === 0 -> Left aligned
        // i % 2 === 1 -> Center aligned
        const alignClass = i % 2 === 0 ? 'self-start' : 'self-start ml-16 md:ml-[320px]'
        return (
          <div key={item.title} className={`w-full max-w-[280px] md:max-w-[320px] ${alignClass}`}>
            <Card {...item} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function About() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative z-10 w-full px-6 pt-32 pb-40 md:px-10">
      {/* ── SECTION 1: "Get to know me" — header left, milestone cards right ── */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="max-w-2xl flex flex-col items-center justify-center">
          <header>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
              Get to know me
            </h1>
          </header>

          {/* Coming soon placeholder */}
          <div className="sync-glass-rect mt-16 flex aspect-square w-full max-w-[550px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] md:mt-24">
            <span className="font-display text-2xl text-white/15 md:text-3xl">Coming soon</span>
          </div>
        </div>

        {/* Right column — milestone cards */}
        <div className="w-full mt-16 md:mt-0 md:pl-8">
          <div className="relative z-10 flex w-full flex-col gap-12 md:gap-16">
            {MILESTONES.map((m, i) => {
              const alignClass = i % 2 === 0 ? 'self-start' : 'self-end'
              return (
                <div key={m.title} className={`w-full max-w-[280px] md:max-w-[320px] ${alignClass}`}>
                  <Card {...m} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: "Get to know me even more" — left-dominant threads ── */}
      <div className="mt-32 grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left column — threads content */}
        <div className="max-w-2xl">
          <div className="mb-16">
            <p className="text-[12px] uppercase tracking-[0.32em] text-white/35">The threads</p>
            <h2 className="mt-4 flex flex-wrap items-center font-display text-4xl leading-[1.05] text-white md:text-5xl">
              Get to know me even more
              <PacMan />
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/45">
              The through-lines that do not fit into a single year &mdash; the interests, disciplines,
              and practices that shape the direction of the journey.
            </p>
          </div>

          {/* Act II — the abstract non-linear threads */}
          <AbstractThreads items={THREADS} />

          {/* Closing spacer */}
          <div className="mt-40">
            <p className="font-display text-3xl text-white/25 md:text-4xl">The work continues.</p>
            <p className="mt-3 text-sm text-white/30">Building the next chapter.</p>
          </div>
        </div>

        {/* Right column — Coming soon placeholder */}
        <div className="w-full mt-16 md:mt-0 md:pl-8 flex items-center justify-center">
          <div className="sync-glass-rect flex aspect-square w-full max-w-[550px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <span className="font-display text-2xl text-white/15 md:text-3xl">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}
