/* ============================================================================
 * Cursor.tsx — the sand dot and ring that replace the pointer (block 5)
 * ----------------------------------------------------------------------------
 * A dot that sits on the pointer, and a hairline ring that trails it with
 * light inertia and opens up over anything clickable. Mounts nothing on touch
 * devices and under reduced motion. The native cursor is hidden by
 * `html.has-cursor` (index.css), which is added only after the first pointer
 * move, so if this component ever fails the visitor keeps their normal cursor.
 *
 * Position is written with `transform` every frame from a rAF loop: no React
 * state, no layout. Hover detection is one `pointerover` listener on the
 * document using `closest()`, so there is nothing to attach per element.
 * ========================================================================= */

import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const CLICKABLE = 'a, button, [role="button"], [role="tab"], label, summary, input, select, textarea'

export function Cursor() {
  const reduced = usePrefersReducedMotion()
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return
    const html = document.documentElement

    let tx = -100
    let ty = -100 // target: the pointer
    let rx = -100
    let ry = -100 // the ring, eased toward the pointer
    let raf = 0
    let shown = false

    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!shown) {
        shown = true
        rx = tx
        ry = ty
        html.classList.add('has-cursor')
      }
    }
    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null
      html.classList.toggle('cursor-hover', !!t?.closest(CLICKABLE))
    }
    const onLeave = () => {
      html.classList.remove('has-cursor')
      shown = false
    }

    const tick = () => {
      rx += (tx - rx) * 0.18
      ry += (ty - ry) * 0.18
      dot.style.transform = `translate3d(${tx}px,${ty}px,0)`
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    html.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      html.removeEventListener('pointerleave', onLeave)
      html.classList.remove('has-cursor', 'cursor-hover')
    }
  }, [reduced])

  if (reduced) return null
  return (
    <>
      <div ref={dotRef} aria-hidden className="cursor-dot" />
      <div ref={ringRef} aria-hidden className="cursor-ring" />
    </>
  )
}
