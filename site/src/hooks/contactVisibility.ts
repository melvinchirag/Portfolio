/* ============================================================================
 * contactVisibility.ts — the ONE shared "hero → Contact handoff" value
 * ----------------------------------------------------------------------------
 * Melvin, 2026-08-10: "Create layers perhaps." This is that layer. Both WebGL
 * layers that live around the hero/Contact boundary read the SAME scalar from
 * here instead of each inventing their own idea of "am I past the hero yet":
 *   - MaskField.tsx (the big hero mask) fades ITSELF out on it.
 *   - GlobalScene.tsx mounts/unmounts the small swarm on it.
 * One source of truth means the two can't disagree, which is exactly what
 * every previous round of this bug came down to.
 *
 * ---- THE VALUE ----
 * `contactHandoff.t` = the hero track's bottom edge, as a fraction of one
 * viewport height:
 *     t = 1  → hero track's bottom is at the viewport bottom. The Future frame
 *              fills the screen; Contact covers 0% of it.
 *     t = 0  → hero track's bottom is at the viewport top. Contact covers 100%.
 * So `1 - t` is literally "what fraction of the screen Contact has taken over",
 * which is the unit both thresholds below are expressed in.
 *
 * Why the hero track's own rect and not `heroScroll.progress`: progress CLAMPS
 * at 1 for the whole span past the track, so it cannot distinguish "just left
 * Future" from "deep into Contact" — the exact distinction this boundary needs.
 *
 * ---- WHY THIS IS A rAF STORE, NOT REACT STATE ----
 * Same reasoning as heroScroll.ts: it changes every frame and is read inside
 * render loops, so putting it in state would re-render the tree ~60×/sec. The
 * ONE thing that genuinely needs to be React state is the swarm's mount
 * boolean (you can't mount a component from a mutable ref), and that only
 * flips a couple of times per visit — see the bail-out in `setMounted` below.
 * ========================================================================= */

import { useEffect, useState } from 'react'
import { heroScroll, BEAT_COUNT } from './heroScroll'

/** Live handoff scalar. 1 = hero owns the screen, 0 = Contact owns it. */
export const contactHandoff = { t: 1 }

/**
 * Shared 0..1 fade the swarm eases itself through when LEAVING Future
 * backward into Present — read directly inside ContactMaskSwarm's useFrame,
 * same "mutable object, not state" pattern as `contactHandoff.t` above.
 *
 * Melvin, 2026-08-10: scrolling Future → Present cut the glyphs off instantly
 * instead of letting the ones already risen finish rising and fade out. The
 * cause was that `useSwarmMounted` below hard-unmounted `<ContactMaskSwarm>`
 * the instant you left Future — React tears the whole WebGL draw down in one
 * frame, so a glyph mid-arc just vanishes.
 *
 * The fix is this scalar: `useSwarmMounted` now keeps the component mounted
 * for as long as this fade is still above zero, and ramps it down over real
 * TIME (not tied to scroll speed, so a fast flick up still fades gently
 * rather than snapping). ContactMaskSwarm multiplies it into every material's
 * `uFade`, so positions (the rise) are untouched and only opacity eases out —
 * exactly "they go up, then disappear", not "they stop existing".
 *
 * Deliberately snapped to 1 (not ramped) on the way IN — see the `tick` below
 * — because the per-instance staggered intro fade already handles arrival
 * smoothly; layering a second ramp on top of that one would only slow it down
 * for no visible benefit. This scalar's whole job is the exit, not the entry.
 */
export const swarmExit = { fade: 0 }

/** How long the exit fade takes, in real seconds. */
const EXIT_FADE_SECS = 1.2

/**
 * How far into the handoff the small swarm flies in. 0.35 → Contact already
 * covers ~65% of the screen. Melvin, 2026-08-10: "trigger when i have
 * completely reached contacts or at atmost 1 sec earlier" — at normal scroll
 * speed that remaining 35% is a few tenths of a second, so this lands just
 * inside his window rather than the wildly-early Future-frame trigger a
 * previous round used.
 */
const SWARM_TRIGGER_AT = 0.35

/** The last hero frame (Future). */
const FUTURE = BEAT_COUNT - 1

/**
 * Whether the small mask swarm should be mounted right now.
 *
 * The behaviour Melvin described is a LATCH, not a plain threshold, and that
 * distinction is why earlier rounds kept getting it wrong:
 *   - It TRIGGERS (flies in) only once you've essentially reached Contact.
 *   - Once triggered it STAYS mounted if you scroll back up to Future, so the
 *     glyphs already in flight keep floating upward there ("if I scroll up and
 *     stay in the future slide, the glyphs from below should still be floating
 *     upwards").
 *   - It only resets once you go back past Future to Present or earlier
 *     ("unless I go to the present or further back"), so returning to Contact
 *     later replays the fly-in properly.
 * A stateless `t <= threshold` check gives you the first bullet but breaks the
 * second; mounting on the Future frame (an earlier attempt) gives you the
 * second but breaks the first. The latch is what satisfies both.
 */
export function useSwarmMounted(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let raf = 0
    let triggered = false
    let last = performance.now()

    const tick = () => {
      const now = performance.now()
      // Clamped so a stalled/background tab can't produce one giant dt on the
      // frame it resumes (which would jump-cut the fade instead of easing it —
      // the exact bug this whole scalar exists to avoid).
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      const track = document.getElementById('hero-track')
      const vh = window.innerHeight || 1
      // No track (any page other than Home) → treat as "hero owns the screen",
      // which keeps the big mask un-faded and the swarm unmounted elsewhere.
      contactHandoff.t = track
        ? Math.max(0, Math.min(1, track.getBoundingClientRect().bottom / vh))
        : 1

      if (contactHandoff.t <= SWARM_TRIGGER_AT) triggered = true
      // `heroScroll.frame` clamps to FUTURE for everything past the track, so
      // dropping BELOW it genuinely means "scrolled back to Present or earlier".
      if (heroScroll.frame < FUTURE) triggered = false

      const active = triggered && heroScroll.frame === FUTURE
      if (active) {
        // Snapped, not ramped — see swarmExit's own comment for why.
        swarmExit.fade = 1
      } else {
        swarmExit.fade = Math.max(0, swarmExit.fade - dt / EXIT_FADE_SECS)
      }

      // Stay mounted for as long as we're active OR still fading out, so React
      // never yanks the WebGL draw out from under a glyph mid-arc. Only once
      // the fade has actually finished does the component (and its GPGPU sim)
      // go away.
      const shouldBeMounted = active || swarmExit.fade > 0.001
      // Identity bail-out: React skips the re-render when the value is
      // unchanged, so this is effectively free on the ~99% of frames where the
      // answer doesn't change.
      setMounted((prev) => (prev === shouldBeMounted ? prev : shouldBeMounted))

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return mounted
}
