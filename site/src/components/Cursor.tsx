/* ============================================================================
 * Cursor.tsx: which pointer the site uses (desktop only)
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-27: the trailing dot and ring were annoying. They lagged
 * behind the mouse and hid the real cursor. Every choice here keeps the system's
 * own pointer position, so nothing ever lags:
 *   ember   our arrow and hand, drawn in cream and orange (CSS cursor images)
 *   glow    the normal cursor with a soft warm light around it
 *   system  the normal cursor, untouched
 * Preview links can switch with the corner button or ?cursor=glow.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import { isPreview } from '../boxStyle'

const STYLES = ['ember', 'glow', 'system'] as const
type Style = (typeof STYLES)[number]
const NAMES: Record<Style, string> = { ember: 'Ember', glow: 'Glow', system: 'Standard' }
const KEY = 'melvin:cursor'
const DEFAULT: Style = 'ember'
const CLICKABLE = 'a, button, [role="button"], [role="tab"], summary, label[for], select'

const valid = (v: string | null): v is Style => STYLES.includes(v as Style)

function initial(): Style {
  if (!isPreview) return DEFAULT
  const asked = new URLSearchParams(location.search).get('cursor')
  if (valid(asked)) return asked
  try {
    const saved = sessionStorage.getItem(KEY)
    if (valid(saved)) return saved
  } catch {
    /* private window: use the default */
  }
  return DEFAULT
}

export function Cursor() {
  const [style, setStyle] = useState<Style>(initial)
  const [fine] = useState(() => window.matchMedia('(pointer: fine)').matches)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.dataset.cursor = style
    try {
      sessionStorage.setItem(KEY, style)
    } catch {
      /* not remembered, still applied */
    }
  }, [style])

  // The light is written straight to the element on each move: no loop, no lag.
  useEffect(() => {
    const el = glowRef.current
    if (!el || style !== 'glow') return
    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`
      el.classList.add('is-on')
      el.classList.toggle('is-over', !!(e.target as Element | null)?.closest(CLICKABLE))
    }
    const leave = () => el.classList.remove('is-on')
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      leave()
    }
  }, [style])

  if (!fine) return null
  const next = STYLES[(STYLES.indexOf(style) + 1) % STYLES.length]
  return (
    <>
      {style === 'glow' && <div ref={glowRef} aria-hidden className="cursor-glow" />}
      {isPreview && (
        <button
          type="button"
          onClick={() => setStyle(next)}
          aria-label={`Cursor: ${NAMES[style]}. Switch to ${NAMES[next]}.`}
          className="box-switch cursor-switch"
        >
          Cursor: {NAMES[style]}
        </button>
      )}
    </>
  )
}
