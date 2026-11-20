/* ============================================================================
 * desktopBreak.ts: the live state of the desktop hero "break" (Melvin, 2026-11-20)
 * ----------------------------------------------------------------------------
 * On desktop and tablet the big mask BREAKS when the visitor scrolls past a small
 * threshold, and the three smaller masks (DesktopTrio.tsx) take over. The break
 * is an EVENT, not a scrubbed animation: crossing the threshold flips `broken`,
 * and `amt` then runs 0 -> 1 in real TIME (BREAK_SECS), whatever the scroll does
 * afterwards. Scrolling back under the lower threshold runs it back to 0 in
 * MERGE_SECS (the trio flows home and the big mask re-forms). Hysteresis (on at
 * BREAK_ON, off at BREAK_OFF) stops flicker around the threshold.
 *
 * Same pattern as heroScroll.ts: one mutable object, written by MaskParticles'
 * frame loop, read by the trio and the shaders. Not React state.
 * ========================================================================= */

/** heroScroll.progress above this breaks the mask; below BREAK_OFF it re-forms. */
export const BREAK_ON = 0.003
export const BREAK_OFF = 0.001
/** Seconds from trigger to three formed masks (explode, wave, condense). */
export const BREAK_SECS = 1.8
/** Seconds for the trio to flow back and the big mask to re-form. */
export const MERGE_SECS = 1.2

export const desktopBreak = {
  /** True when the trio feature is on (desktop/tablet, motion allowed). */
  enabled: false,
  /** Latched trigger with hysteresis. */
  broken: false,
  /** 0 = whole big mask, 1 = fully broken. Time-driven. */
  amt: 0,
  /** Seconds the trio has been settled in the broken state (circle -> dance blend). */
  settle: 0,
  /** Has the first evaluation happened (a page restored mid-scroll skips the replay). */
  inited: false,
}

/** Seconds the trigger stays latched after a wheel/touch/key nudge, so the break
 *  can fire on the very first sign of scroll (before Lenis has moved the page). */
const KICK_HOLD = 0.8
let kickT = 0

/** Wheel, touch or key scroll intent at the top of the page fires the break at once. */
export function installBreakKick(): () => void {
  const kick = () => {
    if (desktopBreak.enabled && desktopBreak.inited && window.scrollY < 6) kickT = KICK_HOLD
  }
  const onWheel = (e: WheelEvent) => { if (e.deltaY > 0) kick() }
  const onKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) kick()
  }
  let ty = 0
  const onTS = (e: TouchEvent) => { ty = e.touches[0]?.clientY ?? 0 }
  const onTM = (e: TouchEvent) => { if ((e.touches[0]?.clientY ?? 0) < ty - 4) kick() }
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('keydown', onKey)
  window.addEventListener('touchstart', onTS, { passive: true })
  window.addEventListener('touchmove', onTM, { passive: true })
  return () => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('touchstart', onTS)
    window.removeEventListener('touchmove', onTM)
  }
}

export function stepDesktopBreak(dt: number, progress: number, armed: boolean) {
  const b = desktopBreak
  if (!b.enabled) {
    b.amt = 0
    b.broken = false
    return
  }
  if (!armed) return
  if (!b.inited) {
    b.inited = true
    if (progress > BREAK_ON) {
      b.broken = true
      b.amt = 1
      b.settle = 14
      return
    }
  }
  if (progress > BREAK_ON) kickT = 0
  else kickT = Math.max(0, kickT - dt)
  if (!b.broken && (progress > BREAK_ON || kickT > 0)) b.broken = true
  else if (b.broken && progress < BREAK_OFF && kickT <= 0) b.broken = false
  if (b.broken) {
    b.amt = Math.min(1, b.amt + dt / BREAK_SECS)
    b.settle += dt
  } else {
    b.amt = Math.max(0, b.amt - dt / MERGE_SECS)
    b.settle = Math.max(0, b.settle - dt * 2)
  }
}
