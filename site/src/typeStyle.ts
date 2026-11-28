/* ============================================================================
 * typeStyle.ts: the lettering of the whole site, switchable on preview links
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-27: the lettering and name read "retro"; he wants something
 * that looks futuristic and utopian.
 *   halo     Archivo in its thin, wide cut; the name as a blade of light
 *   nova     Unbounded for the big words (Google Fonts, trial)
 *   classic  the look before this change
 * Changing it reloads the page, because the liquid name only exists in classic.
 * ========================================================================= */

import { isPreview } from './boxStyle'

export const TYPE_STYLES = ['halo', 'nova', 'classic'] as const
export type TypeStyle = (typeof TYPE_STYLES)[number]

const KEY = 'melvin:type'
const DEFAULT: TypeStyle = 'halo'
const valid = (v: string | null): v is TypeStyle => TYPE_STYLES.includes(v as TypeStyle)

function initial(): TypeStyle {
  if (!isPreview) return DEFAULT
  const asked = new URLSearchParams(location.search).get('type')
  if (valid(asked)) return asked
  try {
    const saved = sessionStorage.getItem(KEY)
    if (valid(saved)) return saved
  } catch {
    /* private window: use the default */
  }
  return DEFAULT
}

export const typeStyle: TypeStyle = typeof document === 'undefined' ? DEFAULT : initial()

export function chooseTypeStyle(style: TypeStyle) {
  try {
    sessionStorage.setItem(KEY, style)
  } catch {
    /* the address below still carries the choice */
  }
  const url = new URL(location.href)
  url.searchParams.set('type', style)
  location.replace(url)
}

if (typeof document !== 'undefined') {
  document.documentElement.dataset.type = typeStyle
  if (typeStyle === 'nova') {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@200..600&display=swap'
    document.head.appendChild(link)
  }
}
