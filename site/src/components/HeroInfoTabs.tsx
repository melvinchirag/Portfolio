/* ============================================================================
 * HeroInfoTabs.tsx — the hero's liquid-glass info tabs
 * ----------------------------------------------------------------------------
 * Sits on the RIGHT side of the hero (the mask owns the left). A row of glass
 * pill tabs + one glass content panel that switches between four facts about
 * Melvin, auto-advancing every 6s (pauses when you click a tab yourself).
 *
 * Content is sourced from Otto_sys/NOTES.md (2026-07 context transfer) and
 * follows its explicit rule: Melvin is ACTIVELY building in CS/AI-ML only —
 * astrophysics/neurotech/aerospace/etc. are stated INTERESTS, never implied as
 * active work. The "beyond" tab is written to keep that line honest.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react'

type Tab = {
  id: string
  label: string
  eyebrow: string
  heading: string
  body: string
}

const TABS: Tab[] = [
  {
    id: 'now',
    label: 'Now',
    eyebrow: '( The present )',
    heading: 'Computer science',
    body: 'AI/ML concentration at Eastern Michigan University. Treasurer, Google Developer Group. Currently working through CS50P.',
  },
  {
    id: 'building',
    label: 'Building',
    eyebrow: '( In progress )',
    heading: 'Osiris & Manas',
    body: 'Osiris — touchless device control, tracking hands in real time from a webcam. Manas — an astrophysics simulation engine, pulsars and black-hole environments, still in progress.',
  },
  {
    id: 'wins',
    label: 'Wins',
    eyebrow: '( Track record )',
    heading: 'Two hackathon wins',
    body: 'Lingo, at SpartaHack 11. EventsOS, at GrizHacks — Oakland University. Built with teams, shipped under a clock.',
  },
  {
    id: 'beyond',
    label: 'Beyond',
    eyebrow: '( And beyond )',
    heading: 'Curiosity, not scope',
    body: 'Robotics, neurotech, astrophysics, quantum computing, aerospace, filmmaking — fields he reads into, not fields he’s building in. Yet.',
  },
]

const AUTO_MS = 6000

export function HeroInfoTabs() {
  const [active, setActive] = useState(0)
  const timer = useRef<number | null>(null)

  // Auto-advance through the tabs; any manual click restarts the timer so it
  // never fights the visitor.
  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setActive((i) => (i + 1) % TABS.length)
    }, AUTO_MS)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [active])

  const tab = TABS[active]

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {/* Tab rail — glass pills, one per fact. */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            data-active={i === active}
            data-glow
            onClick={() => setActive(i)}
            className="glass-tab uses-glass-distort flex items-center gap-2 px-4 py-2 text-[11px] tracking-[0.14em] uppercase"
          >
            <span className="glass-tab-dot" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content panel — swaps content, itself never remounts (keeps the glass
          distortion/glare steady instead of flickering on every switch). */}
      <div className="glass-panel uses-glass-distort px-7 py-6 md:px-8 md:py-7">
        <p key={tab.id + '-eyebrow'} className="reveal-fade text-[11px] tracking-[0.3em] text-white/45 uppercase">
          {tab.eyebrow}
        </p>
        <h3 key={tab.id + '-h'} className="reveal-fade mt-2 font-display text-[1.9rem] leading-tight text-white md:text-[2.1rem]">
          {tab.heading}
        </h3>
        <p key={tab.id + '-b'} className="reveal-fade mt-3 text-[14.5px] leading-relaxed text-white/60">
          {tab.body}
        </p>
      </div>
    </div>
  )
}
