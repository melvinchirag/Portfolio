

const LINKS = [
  {
    label: 'Email',
    href: 'mailto:melvinchirag@gmail.com',
    value: 'melvinchirag@gmail.com',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/melvin-chirag-karupati-a34452380',
    value: 'linkedin.com/in/melvin-chirag-karupati',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/melvinchirag',
    value: 'github.com/melvinchirag',
  },
  {
    label: 'Resume',
    href: '/resume.pdf',
    value: 'Download PDF',
  },
]

export function Contact() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-24 text-center md:px-10">
      <header className="mb-20">
        <p className="mb-4 text-[11px] tracking-[0.3em] text-white/40 uppercase">
          ( Say Hello )
        </p>
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
          Contact
        </h1>
      </header>

      <div className="flex w-full max-w-lg flex-col gap-8">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith('http') ? '_blank' : undefined}
            rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="sync-glass-rect group flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-8 transition-colors hover:bg-white/[0.03]"
          >
            <span className="mb-2 text-[10px] tracking-widest text-white/40 uppercase transition-colors group-hover:text-white/60">
              {link.label}
            </span>
            <span className="text-lg tracking-wide text-white/80 transition-colors group-hover:text-white md:text-xl">
              {link.value}
            </span>
          </a>
        ))}
      </div>
      
      {/* Visual cue to loop back to home, keeping with the "thread" motif */}
      <div className="mt-24 flex flex-col items-center gap-4">
        <div className="h-16 w-px bg-gradient-to-b from-white/20 to-transparent"></div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          className="text-[10px] tracking-widest text-white/30 transition-colors hover:text-white/70 uppercase cursor-pointer"
        >
          Return to Start
        </button>
      </div>
    </div>
  )
}
