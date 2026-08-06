/* ============================================================================
 * heroScroll.ts — the ONE contract between scrolling and everything else
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS (read before changing anything here)
 * The hero has two expensive, fragile systems in it: the GPGPU particle mask
 * and the WebGL liquid glass. Wiring scroll directly into either of them would
 * mean scroll changes could break them. So instead, scroll writes into ONE
 * plain object, and everything else READS from it. Nothing reads back the other
 * way. That keeps the blast radius of scroll work to this file plus Home.tsx.
 *
 * It is deliberately NOT React state. Scroll fires ~60×/second; putting that in
 * state would re-render the whole hero 60×/second and destroy the framerate.
 * Instead:
 *   - `heroScroll` is a mutable object that anything inside a useFrame /
 *     requestAnimationFrame loop can read for free (the WebGL layers do this).
 *   - `useHeroBeat()` is for React components that need to re-render — it only
 *     updates when the BEAT CHANGES (5 times over the whole hero), not per frame.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react'

/** How many full-viewport "beats" the hero scrolls through. */
export const BEAT_COUNT = 5

/**
 * Live scroll state. Mutated by `useHeroScrollTrack`, read by everyone else.
 * Read this inside an animation loop; do NOT put it in React state.
 */
export const heroScroll = {
  /** 0 → 1 across the ENTIRE hero track. */
  progress: 0,
  /** Which beat we're in: 0 … BEAT_COUNT-1. */
  beat: 0,
  /** 0 → 1 WITHIN the current beat. Useful for per-beat animations. */
  beatProgress: 0,
  /**
   * Which frame is CENTRED on screen right now: 0 … BEAT_COUNT-1.
   *
   * Distinct from `beat`. The hero pans HORIZONTALLY — the frame strip slides
   * left linearly with `progress`, so frame k is dead-centre when
   * `progress === k / (BEAT_COUNT-1)`. `frame` is that nearest-centre index
   * (a ROUND), which is what should light the rail dot and become interactive.
   * `beat` (a FLOOR over BEAT_COUNT) is the older even-slice index, kept for
   * any per-beat scrubbing; the two differ by up to half a frame mid-pan.
   */
  frame: 0,
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * Attach to the tall scroll track element. Measures how far through that
 * element the viewport has scrolled and writes it into `heroScroll`.
 *
 * Uses rAF rather than a scroll event because Lenis animates scroll smoothly —
 * reading every frame stays in sync with it, and costs almost nothing since
 * it's just one getBoundingClientRect.
 */
export function useHeroScrollTrack(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        const rect = el.getBoundingClientRect()
        // Total distance this track can scroll past a fixed viewport.
        const scrollable = rect.height - window.innerHeight
        // How far we've gone into it. rect.top goes negative as we scroll down.
        const scrolled = -rect.top
        const p = scrollable > 0 ? clamp01(scrolled / scrollable) : 0

        heroScroll.progress = p
        // Map 0→1 onto beat index + progress within that beat.
        const scaled = p * BEAT_COUNT
        heroScroll.beat = Math.min(BEAT_COUNT - 1, Math.floor(scaled))
        heroScroll.beatProgress = clamp01(scaled - heroScroll.beat)
        // Nearest-centre frame for the horizontal pan (see the store comment).
        heroScroll.frame = Math.round(p * (BEAT_COUNT - 1))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref])
}

/**
 * For React components that need to re-render when the beat changes (e.g. to
 * swap which beat's copy is showing). Deliberately only re-renders on a beat
 * CHANGE — a handful of times per full scroll, not every frame.
 */
export function useHeroBeat() {
  const [beat, setBeat] = useState(0)
  const last = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (heroScroll.beat !== last.current) {
        last.current = heroScroll.beat
        setBeat(heroScroll.beat)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return beat
}

/**
 * Like `useHeroBeat`, but returns the CENTRED frame (`heroScroll.frame`) — the
 * value that tracks the horizontal pan. Re-renders only when the centred frame
 * changes, so it's cheap enough to gate which frame is interactive/visible.
 */
export function useHeroFrame() {
  const [frame, setFrame] = useState(0)
  const last = useRef(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (heroScroll.frame !== last.current) {
        last.current = heroScroll.frame
        setFrame(heroScroll.frame)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return frame
}
