/* ============================================================================
 * heroIntro.ts — the gate between the Loader and the mask's entrance
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS
 * The opening Loader (the neuron sequence) and the hero's particle mask are two
 * independent WebGL scenes that mount at the same time. Without a gate, the
 * mask's fly-in animation starts on its first frame — which is WHILE the loader
 * is still covering the screen — so by the time the neurons dissolve, the mask
 * has already arrived (Melvin, 2026-08-01: "the mask is already there").
 *
 * The fix, same shape as heroScroll: ONE plain mutable object. The Loader flips
 * `ready` to true the instant it is completely gone; the mask reads it inside
 * its useFrame loop and only THEN starts its entrance. Not React state — the
 * mask reads it every frame, and a state change there would churn the hero.
 * ========================================================================= */

export const heroIntro = {
  /** True once the Loader has fully left the screen. The mask waits for this
   *  before beginning its fly-in, so the neurons finish first, then the mask. */
  ready: false,
}

/** Called by the Loader when its sequence is completely gone. Idempotent. */
export function markIntroReady() {
  heroIntro.ready = true
}
