/**
 * PageShell: the one page template (Melvin, 2026-11-19: "there needs to be a
 * proper order and form and body ... before we can add photos").
 *
 * Every content page (Work, Vision, and the Contact page through the same
 * column rule) shares: an eyebrow label, a page title in the display face, an
 * optional one-line intro, then the page body on one vertical rhythm inside one
 * of two column widths. The column width is also published to the fact snakes
 * so they stay in the margins (see hooks/readingColumn.ts).
 *
 * Widths: 'text' = 768px for reading pages, 'wide' = 896px for list pages.
 * Contrast: intro white/75 or better, body white/70, nothing below white/60.
 */
import { useEffect, type ReactNode } from 'react'
import { Reveal } from './Reveal'
import { useReadingColumn } from '../hooks/readingColumn'

export const SHELL_WIDTH = { text: 768, wide: 896 } as const
type Width = keyof typeof SHELL_WIDTH

export function PageShell({
  eyebrow,
  title,
  intro,
  width = 'text',
  children,
}: {
  eyebrow: string
  title: string
  intro?: ReactNode
  width?: Width
  children: ReactNode
}) {
  useReadingColumn(SHELL_WIDTH[width] / 2)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div
      className="relative z-10 mx-auto w-full px-6 pt-32 pb-28 md:px-10"
      style={{ maxWidth: SHELL_WIDTH[width] }}
    >
      <Reveal as="header" className="mb-14">
        <p className="label">{eyebrow}</p>
        <h1 className="display-wide font-display mt-4 text-5xl leading-[0.95] font-bold tracking-tight text-white md:text-7xl">
          {title}
        </h1>
        {intro && (
          <div className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">{intro}</div>
        )}
      </Reveal>
      <div className="flex flex-col gap-12">{children}</div>
    </div>
  )
}
