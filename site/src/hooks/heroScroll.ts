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
import { glideTo } from './useLenis'

/**
 * How many full-viewport frames the hero pans through: Hero · Past · Present ·
 * Future. (Was 5 — the old "Invitation" frame was removed; the Contact section
 * now lives as its own vertical section after the pan, not as a frame.)
 */
export const BEAT_COUNT = 4

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

/* ----------------------------------------------------------------------------
 * PHONES: HOLD EACH FRAME, THEN SLIDE (2026-11-24)
 * On a wide screen the frames pan in direct proportion to scroll and it reads
 * fine. On a phone it did not: a thumb scroll stops anywhere, and anywhere that
 * is not exactly on a frame showed text cut off at the screen edge or half faded
 * (Melvin's friends: "the phone version breaks and it's not functional").
 *
 * So below the md breakpoint the pan runs through `phonePan`: each frame sits
 * dead centre for PHONE_HOLD of a step either side of its own position, and the
 * slide to the next frame happens in the gap between. `usePhoneFrameSettle`
 * then nudges the page out of that gap when a scroll stops inside it.
 * -------------------------------------------------------------------------- */
const PHONE_QUERY = '(max-width: 767px)'
/** Share of a frame step, either side of a frame's centre, where it holds still. */
export const PHONE_HOLD = 0.3

/** True on phone-width screens. Read live so a rotated or resized window follows. */
export function isPhoneWidth(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia(PHONE_QUERY).matches
}

/**
 * The pan position on phones. `pos` is progress times (frames minus one), so whole
 * numbers are frame centres; the result holds at each whole number and eases
 * between them.
 */
export function phonePan(pos: number): number {
  const k = Math.floor(pos)
  const t = pos - k
  const u = clamp01((t - PHONE_HOLD) / (1 - 2 * PHONE_HOLD))
  return k + u * u * (3 - 2 * u)
}

/**
 * When a scroll comes to rest between two frames, glide to one, so the page never
 * sits with a frame half off the screen. Does nothing while a finger is down,
 * above the track or once the Contact section has taken over.
 *
 * Phones glide the short distance to the nearer frame's hold zone. Wider screens
 * (added 2026-11-26) go to a frame's centre, favouring the direction of travel so
 * one notch of a mouse wheel moves on instead of bouncing back.
 */
export function useFrameSettle(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const LAST = BEAT_COUNT - 1
    let timer = 0
    let touching = false
    let lastY = window.scrollY
    let dir = 1
    const settle = () => {
      const el = ref.current
      if (!el || touching) return
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const scrolled = -rect.top
      if (scrollable <= 0 || scrolled <= 1 || scrolled >= scrollable - 1) return
      const pos = (scrolled / scrollable) * LAST
      let target: number
      if (isPhoneWidth()) {
        const k = Math.round(pos)
        const off = pos - k
        if (Math.abs(off) <= PHONE_HOLD) return
        target = k + Math.sign(off) * (PHONE_HOLD - 0.04)
      } else {
        const from = dir > 0 ? Math.floor(pos) : Math.ceil(pos)
        target = Math.abs(pos - from) > 0.06 ? from + dir : from
        if (Math.abs(pos - target) < 0.004) return
      }
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      glideTo(window.scrollY + ((target - pos) / LAST) * scrollable, reduced)
    }
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, isPhoneWidth() ? 170 : 240)
    }
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - lastY) > 0.5) dir = y > lastY ? 1 : -1
      lastY = y
      arm()
    }
    const down = () => {
      touching = true
      window.clearTimeout(timer)
    }
    const up = () => {
      touching = false
      arm()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', up, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', up)
    }
  }, [ref])
}

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
