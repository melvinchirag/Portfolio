/* ============================================================================
 * boxStyle.ts: which material the text boxes are made of
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-27: every text body gets a box, liquid glass first, with the
 * alternatives to compare. The choice is an attribute on <html>:
 *   glass  the WebGL liquid glass (LiquidGlassField bends the scene behind)
 *   frost  a plain frosted CSS panel
 *   clay   a soft solid "claymorphism" panel
 * Preview links can switch with ?box=frost or the button in the corner. The
 * public domain always shows the default, so a half-decided look never leaks.
 * ========================================================================= */

export const BOX_STYLES = ['glass', 'frost', 'clay'] as const
export type BoxStyle = (typeof BOX_STYLES)[number]

const KEY = 'melvin:box'
const DEFAULT: BoxStyle = 'glass'

export const isPreview =
  typeof location !== 'undefined' && !/(^|\.)melvinchirag\.com$/.test(location.hostname)

const valid = (v: string | null): v is BoxStyle => BOX_STYLES.includes(v as BoxStyle)

function initial(): BoxStyle {
  if (!isPreview) return DEFAULT
  const asked = new URLSearchParams(location.search).get('box')
  if (valid(asked)) return asked
  try {
    const saved = sessionStorage.getItem(KEY)
    if (valid(saved)) return saved
  } catch {
    /* private window: just use the default */
  }
  return DEFAULT
}

export function setBoxStyle(style: BoxStyle) {
  document.documentElement.dataset.box = style
  try {
    sessionStorage.setItem(KEY, style)
  } catch {
    /* not remembered, still applied */
  }
}

if (typeof document !== 'undefined') setBoxStyle(initial())
