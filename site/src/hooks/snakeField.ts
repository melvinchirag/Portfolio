/* ============================================================================
 * snakeField.ts — where the fact snakes are on screen, for the mask to feel
 * ----------------------------------------------------------------------------
 * Melvin, 2026-10-29: "if it touches the mask, it should go through the
 * shaders of the mask, so that way the physics is right." The snakes are a
 * 2D canvas and the mask is a GPGPU particle sim; this is the one object
 * that connects them. FactSnakes writes every snake's screen segment here
 * each frame, and MaskField's velocity shader reads it as a uniform array
 * and pushes particles aside along each segment, so a sentence passing
 * through the face parts the dust and the dust flows back behind it.
 *
 * Same "mutable object, not React state" pattern as heroScroll.ts: it is
 * read inside animation loops, so it must cost nothing.
 *
 * Layout (2026-10-31, snakes can be vertical OR horizontal now): each slot
 * is one line segment in CLIP space (-1..1, y up), four floats:
 *   seg[o..o+3] = [x0, y0, x1, y1]
 * and its strength lives beside it:
 *   w[i]        = 0..1, 0 = ignore this slot.
 * ========================================================================= */

export const SNAKE_SLOTS = 8

export const snakeField = {
  count: 0,
  seg: new Float32Array(SNAKE_SLOTS * 4),
  w: new Float32Array(SNAKE_SLOTS),
}
