import { useEffect, useState } from 'react'

const FLAGSHIPS = [
  {
    title: 'Manas',
    role: 'Creator & Lead Developer',
    status: 'In Progress',
    description: 'An AGI simulation engine designed to evolve intelligence through interacting simulated agents.',
    context: 'Manas is a stepping stone toward true Artificial General Intelligence. It creates a simulated environment where intelligent agents (simulated humans) can interact, learn, and evolve. The goal is to study how memory and complex interactions drive the emergence of general intelligence.',
  },
]

const HACKATHONS = [
  {
    title: 'Lingo',
    event: 'SpartaHack 11',
    award: 'Winner',
    team: 'Alex Thebolt, William Dalian, Melvin',
    context: 'Built a language-learning tool leveraging LLMs for dynamic conversational practice. The focus was on low-latency voice interactions and immediate grammar feedback.',
    devpost: 'https://devpost.com/', // Placeholder until exact link is provided
  },
  {
    title: 'EventsOS',
    event: 'GrizHacks @ Oakland University',
    award: 'Winner',
    team: 'Melvin, Alex Thebolt, Chanuth Devnaka Jayatissa, Karthikeya Thota',
    context: 'A comprehensive operating system conceptualized for event management, handling everything from ticketing logic to real-time attendee tracking during large scale college events.',
    devpost: 'https://devpost.com/', // Placeholder until exact link is provided
  },
]

const LEADERSHIP = [
  {
    role: 'Executive Member & Treasurer',
    org: 'Google Developer Group @ EMU',
  },
  {
    role: 'Member',
    org: 'AI Club',
  },
  {
    role: 'Finance Lead',
    org: 'EMU Hackathon',
  },
]

function Accordion({ title, children }: { title: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <button 
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-[10px] tracking-wider text-white/50 transition-colors hover:text-white uppercase cursor-pointer"
      >
        <span>{title}</span>
        <span className="text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      <div 
        className={`grid transition-all duration-300 ease-out-expo ${open ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="text-sm leading-relaxed text-white/60">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Work() {
  // Ensure we start at top when navigating
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-24 md:px-10">
      <header className="mb-20 text-center md:text-left">
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
          Work
        </h1>
      </header>

      <section className="mb-24">
        <h2 className="mb-8 text-xs tracking-[0.2em] text-white/50 uppercase">Flagship Case Studies</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FLAGSHIPS.map((p) => (
            <div key={p.title} className="sync-glass-rect group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-colors hover:bg-white/[0.04]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-3xl text-white">{p.title}</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-wider text-white/40 uppercase">
                  {p.status}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/60">
                {p.description}
              </p>
              
              <Accordion title="View Case Details">
                <p className="mb-3">{p.context}</p>
                <div className="text-xs text-white/30">Role: {p.role}</div>
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-24">
        <h2 className="mb-8 text-xs tracking-[0.2em] text-white/50 uppercase">Hackathon Wins</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {HACKATHONS.map((h) => (
            <div key={h.title} className="sync-glass-rect rounded-2xl border border-white/5 bg-white/[0.01] p-8">
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-display text-2xl text-white">{h.title}</h3>
                <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase">
                  {h.award}
                </span>
              </div>
              <p className="mb-4 text-xs tracking-wider text-white/40 uppercase">{h.event}</p>
              <p className="text-sm text-white/40">
                <span className="text-white/20">Team: </span>{h.team}
              </p>

              <Accordion title="More Context">
                <p className="mb-4">{h.context}</p>
                <a 
                  href={h.devpost} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block border-b border-white/20 pb-0.5 text-xs text-white/60 transition-colors hover:text-white"
                >
                  View on Devpost &rarr;
                </a>
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-16 md:grid-cols-2 md:gap-6">
        <section>
          <h2 className="mb-8 text-xs tracking-[0.2em] text-white/50 uppercase">Leadership</h2>
          <ul className="flex flex-col gap-4">
            {LEADERSHIP.map((l) => (
              <li key={l.role + l.org} className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-sm font-medium text-white/80">{l.role}</span>
                <span className="text-xs text-white/40">{l.org}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-8 text-xs tracking-[0.2em] text-white/50 uppercase">Skills Area</h2>
          <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
            <p className="text-[10px] tracking-widest text-white/20 uppercase">
              [ Placeholder: 3D Skills Constellation ]
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
