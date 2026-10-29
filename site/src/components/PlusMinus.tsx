/* ============================================================================
 * PlusMinus.tsx — the one disclosure indicator (block 5)
 * ----------------------------------------------------------------------------
 * Every expand/collapse on the Work page used to swap the characters "+" and
 * "−", which jumps. This is a drawn plus whose vertical bar rotates away when
 * open, so the change is a motion, not a swap. Colour comes from the parent
 * (currentColor), so the hover rules on the row still apply.
 * ========================================================================= */

export function PlusMinus({ open }: { open: boolean }) {
  return <span aria-hidden className={`plus-minus ${open ? 'is-open' : ''}`} />
}
