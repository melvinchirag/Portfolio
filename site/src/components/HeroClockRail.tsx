/* ============================================================================
 * HeroClockRail.tsx — the full-height clock strip down the right edge
 * ----------------------------------------------------------------------------
 * Melvin's spec (2026-07-28): a vertical strip pinned to the RIGHT edge of the
 * screen, spanning the FULL viewport height, ~1 inch wide, containing just the
 * live clock. An aesthetic choice — a "timecode down the side of the frame"
 * feel. `position: fixed`, so it stays put across the whole hero scroll.
 *
 * The time is rendered ROTATED (reads bottom-to-top up the strip) so a
 * horizontal HH:MM:SS fits a narrow vertical column. The clock text is updated
 * imperatively via a ref + setInterval (not React state) so ticking once a
 * second never re-renders the component tree.
 * ========================================================================= */

import { useEffect, useRef } from 'react'

export function HeroClockRail() {
  const timeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'America/Detroit',
    })
    const update = () => {
      if (timeRef.current) timeRef.current.textContent = fmt.format(new Date())
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed top-0 right-0 z-40 hidden h-screen w-[76px] flex-col items-center justify-between border-l border-white/10 py-8 md:flex"
    >
      {/* The rail carries the site accent (Melvin, 2026-08-07), but held well
          back in opacity. It is ambient furniture, not a call to action: at full
          strength three amber elements down the edge would out-shout his name. */}

      {/* top label */}
      <span className="text-accent/35 rotate-90 text-[9px] tracking-[0.35em] whitespace-nowrap uppercase">
        Michigan
      </span>

      {/* the clock — rotated so HH:MM:SS runs up the strip */}
      <span
        ref={timeRef}
        className="text-accent/65 -rotate-90 font-display text-[1.6rem] tracking-[0.15em] whitespace-nowrap tabular-nums"
      >
        --:--:--
      </span>

      {/* bottom label — the tense/zone marker */}
      <span className="text-accent/35 rotate-90 text-[9px] tracking-[0.35em] whitespace-nowrap uppercase">
        EDT
      </span>
    </aside>
  )
}
