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
export const BREAK_ON = 0.012
export const BREAK_OFF = 0.004
/** Seconds for the dissolve (bottom to top) to play out. */
export const BREAK_SECS = 2.6
/** Seconds for the trio to flow back and the big mask to re-form. */
export const MERGE_SECS = 1.8

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
  if (!b.broken && progress > BREAK_ON) b.broken = true
  else if (b.broken && progress < BREAK_OFF) b.broken = false
  if (b.broken) {
    b.amt = Math.min(1, b.amt + dt / BREAK_SECS)
    b.settle += dt
  } else {
    b.amt = Math.max(0, b.amt - dt / MERGE_SECS)
    b.settle = Math.max(0, b.settle - dt * 2)
  }
}
