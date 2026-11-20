/* ============================================================================
 * FerroName.tsx — the hero's MELVIN as a sand-coloured ferrofluid
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-20: "What if the entire thing was just ferrofluid, and I
 * could take my pointer and if I just moved over the MELVIN thing, the liquid
 * separates and comes back."
 *
 * A canvas sits exactly over the DOM first-name span (same font, size, weight
 * and tracking, drawn into an offscreen mask and used as the shape the liquid
 * wants to be). The DOM text stays for screen readers, selection and SEO; the
 * parent makes it transparent once `onActive(true)` fires. Physics and shading
 * live in ferro.ts.
 *
 * Contract with HeroBeats:
 *   - `targetRef`  the first-name span; the canvas is positioned from its box.
 *     The canvas's parent must be `position: relative` and contain the span.
 *   - `shown`      flips true when NameAssembly's dots have formed the word;
 *     the canvas then fades in over SOLIDIFY_SECS (the dots solidify INTO it).
 *   - `onActive`   true once WebGL is up and the first frame is drawn, false
 *     on any failure (the DOM text then stays visible, exactly as before).
 * Pointer: listened on `window` and mapped into canvas space, so the canvas
 * keeps `pointer-events: none` and never blocks a click or a scroll.
 * Pauses when the name is off screen (the hero pans) or the tab is hidden.
 * Reduced motion: the same shaded word, drawn once, no physics, no spikes.
 * ========================================================================= */

import { useEffect, useRef, type RefObject } from 'react'
import { createFerro, TUNING, type FerroPointer } from './ferro'
import { SOLIDIFY_SECS } from './NameAssembly'

export function FerroName({
  targetRef,
  shown,
  onActive,
}: {
  targetRef: RefObject<HTMLElement | null>
  shown: boolean
  onActive: (on: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onActiveRef = useRef(onActive)
  onActiveRef.current = onActive

  useEffect(() => {
    const canvas = canvasRef.current
    const span = targetRef.current
    if (!canvas || !span) return
    const ferro = createFerro(canvas)
    if (!ferro) {
      onActiveRef.current(false)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches

    let cancelled = false
    let ready = false
    let visible = true
    let raf = 0
    let last = 0
    let cssW = 1
    let cssH = 1
    let emPx = 100
    const ptr: FerroPointer = { x: -9999, y: -9999, active: false }
    let clientX = -9999
    let clientY = -9999
    let pointerIn = false
    let frameCount = 0

    /** Draw MELVIN exactly where the DOM span draws it, at device pixels. */
    const layout = () => {
      if (cancelled) return
      const cs = getComputedStyle(span)
      const fs = parseFloat(cs.fontSize)
      const pad = Math.round(fs * 0.24)
      const w = span.offsetWidth + pad * 2
      const h = span.offsetHeight + pad * 2
      if (w < 8 || h < 8) return
      canvas.style.left = `${span.offsetLeft - pad}px`
      canvas.style.top = `${span.offsetTop - pad}px`
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const wd = Math.round(w * dpr)
      const hd = Math.round(h * dpr)
      canvas.width = wd
      canvas.height = hd

      const mask = document.createElement('canvas')
      mask.width = wd
      mask.height = hd
      const ctx = mask.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, wd, hd)
      ctx.fillStyle = '#fff'
      ctx.font = `${cs.fontWeight} ${fs * dpr}px ${cs.fontFamily}`
      const c2 = ctx as CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string }
      try {
        c2.fontStretch = 'expanded' // Archivo's wdth 125 (the .display-wide cut)
        const ls = parseFloat(cs.letterSpacing)
        if (Number.isFinite(ls)) c2.letterSpacing = `${ls * dpr}px`
      } catch {
        /* older browsers: slightly different width, still the word */
      }
      ctx.textBaseline = 'alphabetic'
      const raw = span.textContent || ''
      const text = cs.textTransform === 'uppercase' ? raw.toUpperCase() : raw
      const m = ctx.measureText(text)
      // CSS centres the font's ascent+descent inside the line box.
      const fa = m.fontBoundingBoxAscent ?? fs * dpr * 0.9
      const fd = m.fontBoundingBoxDescent ?? fs * dpr * 0.2
      const baseline = pad * dpr + (span.offsetHeight * dpr - (fa + fd)) / 2 + fa
      // Safety: if the canvas font came out a different width than the DOM's,
      // squeeze it to the DOM width so the two always agree.
      const want = span.offsetWidth * dpr
      const sx = m.width > 0 && Math.abs(m.width / want - 1) < 0.12 ? want / m.width : 1
      ctx.save()
      ctx.translate(pad * dpr, 0)
      ctx.scale(sx, 1)
      ctx.fillText(text, 0, baseline)
      ctx.restore()

      cssW = w
      cssH = h
      emPx = fs
      const simW = Math.min(coarse ? TUNING.simWidthTouch : TUNING.simWidth, wd)
      const ok = ferro.setShape(mask, w, h, fs, simW)
      if (!ok) {
        ready = false
        onActiveRef.current(false)
        return
      }
      ferro.draw(performance.now() / 1000)
      if (!ready) {
        ready = true
        onActiveRef.current(true)
      }
    }

    const isActiveNow = () => {
      if (!pointerIn) return false
      const r = canvas.getBoundingClientRect()
      if (r.width < 1) return false
      const sx = cssW / r.width
      const sy = cssH / r.height
      const x = (clientX - r.left) * sx
      const y = (clientY - r.top) * sy
      ptr.x = x
      ptr.y = y
      const m = TUNING.holeRadiusEm * emPx * 0.6
      return x > -m && y > -m && x < cssW + m && y < cssH + m
    }

    const tick = (now: number) => {
      raf = 0
      if (cancelled || !ready || !visible || document.hidden) return
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      last = now
      ptr.active = isActiveNow()
      // At rest (no dent open, pointer away): only the slow surface ripple
      // moves, so draw at half rate.
      if (!ptr.active && !ferro.busy) {
        frameCount++
        if (frameCount % 2) {
          raf = requestAnimationFrame(tick)
          return
        }
      }
      ferro.frame(dt, now / 1000, ptr)
      raf = requestAnimationFrame(tick)
    }
    const kick = () => {
      if (reduced || raf || cancelled || !ready || !visible || document.hidden) return
      last = 0
      raf = requestAnimationFrame(tick)
    }

    // ---- pointer: window-level, so the canvas never blocks the page ----
    const onMove = (e: PointerEvent) => {
      clientX = e.clientX
      clientY = e.clientY
      pointerIn = true
      kick()
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.type === 'pointercancel') {
        pointerIn = false
        kick()
      }
    }
    const onLeave = () => {
      pointerIn = false
      kick()
    }
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onMove, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      window.addEventListener('pointercancel', onUp, { passive: true })
      document.documentElement.addEventListener('mouseleave', onLeave)
      window.addEventListener('blur', onLeave)
    }

    // ---- visibility: the hero pans, so the name leaves view ----
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      if (visible) kick()
    })
    io.observe(canvas)
    const onVis = () => kick()
    document.addEventListener('visibilitychange', onVis)

    // ---- size / font changes ----
    let relayoutRaf = 0
    const relayout = () => {
      if (relayoutRaf) return
      relayoutRaf = requestAnimationFrame(() => {
        relayoutRaf = 0
        layout()
        if (reduced && ready) ferro.draw(0)
      })
    }
    const ro = new ResizeObserver(relayout)
    ro.observe(span)
    window.addEventListener('resize', relayout)

    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady
      .then(() => {
        const cs = getComputedStyle(span)
        return document.fonts?.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, 'MELVIN')
      })
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        layout()
        kick()
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(relayoutRaf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', relayout)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('blur', onLeave)
      ferro.dispose()
      onActiveRef.current(false)
    }
  }, [targetRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity ${SOLIDIFY_SECS}s ease-in-out`,
        // Fixed until layout() measures the span.
        left: 0,
        top: 0,
        width: 1,
        height: 1,
      }}
    />
  )
}
