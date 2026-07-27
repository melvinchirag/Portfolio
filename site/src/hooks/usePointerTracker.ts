/* ============================================================================
 * usePointerTracker.ts — one global source of truth for where the mouse is
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS
 * React Three Fiber offers `state.pointer`, but it is derived from pointer
 * events landing on the <canvas> element. Our page content sits in a <main>
 * layer ABOVE the canvas, so whenever the mouse is over text, the nav, or a
 * link, those events never reach the canvas and the scene simply stops
 * receiving updates.
 *
 * That produced two bugs Melvin reported: particles reacting to the cursor
 * inconsistently, and the effect appearing to work on some parts of the page
 * but not others.
 *
 * The fix is to listen on `window` instead, which sees every pointer move
 * regardless of what element is underneath. This module keeps a single shared
 * value that any component can read.
 * ========================================================================= */

import { useEffect } from 'react'

/**
 * Normalised pointer position, shared across the whole app.
 *
 * Both axes run -1 to +1 with 0 at the centre of the screen. Y is flipped
 * relative to the DOM (up is positive) because that matches 3D convention,
 * which keeps the shader maths readable.
 */
export const pointerState = {
  x: 0,
  y: 0,
  /** False until the pointer has actually moved, so nothing reacts to the
   *  default 0,0 position before the visitor has touched anything. */
  hasMoved: false,
}

/** How many components are currently listening. */
let subscribers = 0
/** The shared listener, attached only while at least one component wants it. */
let listener: ((event: PointerEvent) => void) | null = null

/**
 * Subscribes this component to global pointer tracking.
 *
 * The listener is attached once and shared: mounting this hook in ten
 * components still results in exactly one `pointermove` handler on window.
 */
export function usePointerTracker(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    subscribers++

    // Only the first subscriber actually attaches the handler.
    if (!listener) {
      listener = (event: PointerEvent) => {
        // Convert pixel coordinates into the -1..+1 range the scene expects.
        pointerState.x = (event.clientX / window.innerWidth) * 2 - 1
        // Negated because DOM Y grows downward while 3D Y grows upward.
        pointerState.y = -((event.clientY / window.innerHeight) * 2 - 1)
        pointerState.hasMoved = true
      }
      // `passive` tells the browser we will never call preventDefault, which
      // lets it keep scrolling smooth instead of waiting on our handler.
      window.addEventListener('pointermove', listener, { passive: true })
    }

    return () => {
      subscribers--
      // Detach only when the last subscriber goes away.
      if (subscribers === 0 && listener) {
        window.removeEventListener('pointermove', listener)
        listener = null
      }
    }
  }, [enabled])
}
