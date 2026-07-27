type ChapterProps = {
  eyebrow: string
  title: string
  blurb: string
}

export function Chapter({ eyebrow, title, blurb }: ChapterProps) {
  return (
    <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-6 text-xs tracking-[0.35em] text-white/40 uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
        {title}
      </h1>
      <p className="mt-8 max-w-md text-sm leading-relaxed text-white/60">{blurb}</p>
    </section>
  )
}
