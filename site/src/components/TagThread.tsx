/* ============================================================================
 * TagThread.tsx — the accent-coloured word list used for a project's stack and
 * for "Areas I'm exploring", shared so both read as ONE treatment.
 * ----------------------------------------------------------------------------
 * Melvin, 2026-08-10: the stack (Present) and areas (Future) lists needed to be
 * in the accent colour, AND placed "creatively... same thing with stack in all
 * the boxes of the slides" — one consistent, considered treatment everywhere a
 * short word list like this appears, not a one-off per frame.
 *
 * WHY THIS SHAPE, NOT PILLS: the site's own rules (CLAUDE.md) already reject
 * bordered chips as the templated look, and a previous round explicitly ruled
 * pills out for exactly these two lists (see the plain slash-separated runs
 * this replaces). The brief also NAMES the site's one persistent motif: "a
 * glowing timeline thread... persists across every page." So rather than
 * invent a new decorative language for a small tag list, this borrows the
 * existing one: a thin accent hairline the words sit ON, each preceded by a
 * small glowing dot — a thread, literally. Same idea as the orbit ring and the
 * mask's glyphs (a hairline / a soft glow), so it reads as part of the same
 * site rather than a new component style.
 * ========================================================================= */

/**
 * @param items    the words/phrases to show, in order
 * @param compact  smaller type + tighter gaps, for the Present project cards
 *                 (three columns, narrow) — the Future box uses the default
 *                 size since it has the whole box width to itself.
 */
export function TagThread({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <ul className={`tag-thread ${compact ? 'tag-thread-compact' : ''}`}>
      {items.map((item) => (
        <li key={item} className="tag-thread-item">
          <span aria-hidden className="tag-thread-dot" />
          {item}
        </li>
      ))}
    </ul>
  )
}
