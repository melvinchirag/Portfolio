import { useEffect } from 'react'

// The three-country spine (real). These are the anchor milestones.
const MILESTONES = [
  {
    year: '2002 — 2020',
    title: 'Kuwait',
    description: 'Born and raised. The beginning of the journey across three countries.',
  },
  {
    year: '2020 — 2022',
    title: 'India',
    description:
      'Relocated for the junior and senior years of high school, completing early education before making the jump to university.',
  },
  {
    year: 'Aug 2022 — Present',
    title: 'Michigan',
    description:
      'Transferred from Henry Ford College to Eastern Michigan University. Found footing in the CS program, leaning heavily into AI/ML, and stepped up as Treasurer for the Google Developer Group.',
  },
]

// FILLER (placeholder) — added to lengthen the page so the hero video has room
// to scrub end-to-end and the scroll feels smooth. Replace with real copy later.
const THREADS = [
  {
    year: 'Language',
    title: 'Telugu, and the rest',
    description:
      'Three countries means three ways of seeing the same thing. Telugu at home, English everywhere, and enough of a few others to get by — placeholder copy, refine later.',
  },
  {
    year: 'Craft',
    title: 'Storytelling',
    description:
      'A long-standing pull toward filmmaking and story structure — which is exactly why a site like this is built the way it is. Placeholder.',
  },
  {
    year: 'Curiosity',
    title: 'The wide edges',
    description:
      'Astrophysics, neurotech, aerospace, quantum — read into, not yet built in. Interests that set the direction without overstating the résumé. Placeholder.',
  },
  {
    year: 'Practice',
    title: 'Shipping things',
    description:
      'Hackathons, side projects, club leadership — the habit of finishing and showing. Placeholder copy to be replaced with specifics.',
  },
  {
    year: 'People',
    title: 'Rooms full of builders',
    description:
      'Google Developer Group, the AI Club, the campus hackathon crew — the best part of the work is the people around it. Placeholder.',
  },
  {
    year: 'Now',
    title: 'Getting sharper',
    description:
      'A hard first semester turned into momentum. The current chapter is about depth: fewer, better things. Placeholder.',
  },
]

function Card({ year, title, description }: { year: string; title: string; description: string }) {
  return (
    <div className="sync-glass-rect ml-8 flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-colors hover:bg-white/[0.04]">
      <span className="font-display text-4xl text-white/20 md:text-5xl">{year}</span>
      <h3 className="text-xl font-medium tracking-wide text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">{description}</p>
    </div>
  )
}

function Node() {
  return (
    <span className="absolute -left-[37px] top-1.5 flex h-[10px] w-[10px] items-center justify-center rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)] md:-left-[53px]">
      <span className="absolute h-4 w-4 rounded-full border border-white/20"></span>
    </span>
  )
}

export function About() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-6 pt-32 pb-40 md:px-10">
      <header className="mb-24 text-center md:text-left">
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
          About
        </h1>
      </header>

      {/* Act I — the three-country spine */}
      <div className="relative ml-4 border-l border-white/10 py-4 pl-8 md:ml-8 md:pl-12">
        {MILESTONES.map((m) => (
          <div key={m.title} className="relative mb-20 last:mb-0">
            <Node />
            <Card {...m} />
          </div>
        ))}
      </div>

      {/* Section break */}
      <div className="my-32 text-center md:text-left">
        <p className="text-[12px] uppercase tracking-[0.32em] text-white/35">The threads</p>
        <h2 className="mt-4 font-display text-4xl leading-[1.05] text-white md:text-5xl">
          What runs underneath it
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
          Placeholder section — the through-lines that don't fit a single year.
          Swap this copy out once the real narrative is set.
        </p>
      </div>

      {/* Act II — filler threads (placeholder) */}
      <div className="relative ml-4 border-l border-white/10 py-4 pl-8 md:ml-8 md:pl-12">
        {THREADS.map((m) => (
          <div key={m.title} className="relative mb-20 last:mb-0">
            <Node />
            <Card {...m} />
          </div>
        ))}
      </div>

      {/* Closing spacer so the last of the video has room to play through */}
      <div className="mt-40 text-center">
        <p className="font-display text-3xl text-white/25 md:text-4xl">More to come.</p>
        <p className="mt-3 text-sm text-white/30">This page is still being written.</p>
      </div>
    </div>
  )
}
