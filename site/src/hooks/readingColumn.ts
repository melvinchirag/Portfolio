/**
 * readingColumn: where a content page's text sits, so the background fact
 * snakes (FactSnakes.tsx) can stay in the margins and never cross a paragraph
 * (Melvin, 2026-11-19: the glyph snakes ran through the middle of the text on
 * Work, Vision and About).
 *
 * A page calls `useReadingColumn(halfWidthPx)` while it is mounted; the Home
 * page never does, so its snakes keep the whole screen. The value is a plain
 * mutable object (like heroScroll and snakeField) plus a window event so the
 * snake layer rebuilds its lanes when the page changes.
 */
import { useEffect } from 'react'

export const readingColumn = { half: 0 }

const EVENT = 'reading-column'

function set(half: number) {
  readingColumn.half = half
  window.dispatchEvent(new Event(EVENT))
}

export function onReadingColumn(fn: () => void) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

/** Half the width, in CSS px, of the centred text column on this page. */
export function useReadingColumn(half: number) {
  useEffect(() => {
    set(half)
    return () => set(0)
  }, [half])
}
