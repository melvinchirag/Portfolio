import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { createMercury, type Mercury } from './mercury'

/**
 * THE MERCURY MENU (Melvin, 2026-11-09).
 *
 * Two boards led here. First he picked the liquid ("retain the liquid ray
 * marching thing ... use it on my menu tab"): the indicator is a drop of
 * raymarched liquid sand that flows to the page you point at, stretching into
 * a bridge on the way. Then he rejected the capsule around it ("I dont like
 * the menu itself") and chose all three forms from the second board, one per
 * page ("when we're in home we use stack A, and then the other 2 when we're
 * on the other pages"):
 *
 *   Home, About     ROW     four words across the top, no container
 *   Work, Vision    ISLAND  one drop holding the current page; hover opens it
 *   Phone (any)     CM      a liquid blob top right that opens the list
 *                           (CmMenu below, 2026-11-25; the bottom row is gone)
 *   (STACK, words top-right on the lockup's edge, is built but unused since
 *   his 2026-11-09 "only use 2 different styles" note.)
 *
 * Same drop, same canvas; when the route changes the labels move to the new
 * form and the drop blooms in place on the new active word. No border, no
 * fill, no bracket: the liquid is the only decoration. Labels are real DOM
 * links in the display cut (wide Archivo), the same face as MELVIN.
 *
 * Reduced motion: the drop jumps instead of flowing and the surface is still.
 * No WebGL: a plain sand pill behind the active word.
 */

const pages = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/vision', label: 'Vision' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

type Form = 'row' | 'island' | 'stack'

function activeIndex(pathname: string) {
  const i = pages.findIndex((p) => (p.to === '/' ? pathname === '/' : pathname.startsWith(p.to)))
  return i < 0 ? 0 : i
}

// Melvin, 2026-11-09 (second change): "only use 2 different styles, for
// Home and about let's use the same style and then for work and vision let's
// use one style." Home + About = row, Work + Vision = island. The stack form
// stays in the code (the phone pass may want it) but no route uses it.
function formFor(pathname: string, wide: boolean): Form {
  if (!wide) return 'row'
  if (pathname.startsWith('/work') || pathname.startsWith('/vision') || pathname.startsWith('/contact')) return 'island'
  return 'row'
}

function useWide() {
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 768px)').matches))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/* Placement per form. The box is the canvas; labels sit inside it with room
   around them so the drop's soft edge is never clipped. */
const BOX: Record<Form, string> = {
  row: 'left-1/2 -translate-x-1/2 bottom-[calc(10px+env(safe-area-inset-bottom,0px))] h-[60px] w-[min(560px,97vw)] md:top-4 md:bottom-auto',
  island: 'left-1/2 -translate-x-1/2 top-4 h-[60px] w-[560px]',
  stack: 'top-4 right-10 h-[140px] w-[170px]',
}
const ITEMS: Record<Form, string> = {
  row: 'inset-x-0 top-[14px] h-8 flex-row justify-center',
  island: 'inset-x-0 top-[14px] h-8 flex-row justify-center',
  stack: 'inset-x-0 top-2 bottom-2 flex-col items-end justify-between',
}
const ITEM: Record<Form, string> = {
  // Five words must fit a 97vw bar on a 360px phone, so the row pads less there.
  row: 'h-8 px-2 md:px-5',
  island: 'h-8 px-5',
  stack: 'h-[26px] px-4',
}

type Vec = [number, number]

function MercuryMenu() {
  const { pathname } = useLocation()
  const wide = useWide()
  const reduced = usePrefersReducedMotion()
  const form = formFor(pathname, wide)
  const active = activeIndex(pathname)

  const boxRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [hover, setHover] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const [fallback, setFallback] = useState(false)

  // Live values the animation loop reads without re-rendering.
  const live = useRef({ form, active, hover, over, reduced })
  live.current = { form, active, hover, over, reduced }

  // a lags b; e is the island's open amount; grow is the bloom after a form
  // change. Written straight to the DOM each frame, never through React state.
  const sim = useRef({ a: [0, 0] as Vec, b: [0, 0] as Vec, e: 0, grow: 1, started: false, lastForm: form })

  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return
    const m: Mercury | null = createMercury(canvas)
    if (!m) { setFallback(true); return }

    let raf = 0
    const s = sim.current
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const { form, active, hover, over, reduced } = live.current
      const items = itemRefs.current
      const r = box.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return
      m.resize(r.width, r.height)
      const asp = r.width / r.height
      const unit = r.height / 2

      // A new form: the labels have already moved; the drop blooms in place.
      if (form !== s.lastForm) { s.lastForm = form; s.started = false; s.e = 0; s.grow = 0 }

      const kb = reduced ? 1 : 0.16
      const ka = reduced ? 1 : 0.085
      const ke = reduced ? 1 : 0.14
      const kg = reduced ? 1 : 0.12

      if (form === 'island') {
        s.e += ((over ? 1 : 0) - s.e) * ke
        items.forEach((el, i) => {
          if (!el) return
          if (i === active) {
            el.style.transform = 'none'
            const ir = el.getBoundingClientRect()
            const dx = r.left + r.width / 2 - (ir.left + ir.width / 2)
            el.style.transform = `translateX(${(dx * (1 - s.e)).toFixed(2)}px)`
            el.style.opacity = '1'
            el.style.pointerEvents = 'auto'
          } else {
            el.style.transform = 'none'
            el.style.opacity = s.e.toFixed(3)
            el.style.pointerEvents = s.e > 0.5 ? 'auto' : 'none'
          }
        })
      } else {
        items.forEach((el) => { if (el) { el.style.transform = ''; el.style.opacity = ''; el.style.pointerEvents = '' } })
      }

      const centers: Vec[] = []
      const halves: Vec[] = []
      items.forEach((el) => {
        if (!el) { centers.push([0, 0]); halves.push([0.5, 0.3]); return }
        const ir = el.getBoundingClientRect()
        centers.push([((ir.left + ir.width / 2 - r.left) / r.width) * 2 * asp - asp, -(((ir.top + ir.height / 2 - r.top) / r.height) * 2 - 1)])
        halves.push([ir.width / 2 / unit, ir.height / 2 / unit])
      })
      if (!s.started) { s.a = [...centers[active]] as Vec; s.b = [...centers[active]] as Vec; s.started = true }

      const idx = hover ?? active
      const target = centers[idx]
      s.b[0] += (target[0] - s.b[0]) * kb
      s.b[1] += (target[1] - s.b[1]) * kb
      s.a[0] += (s.b[0] - s.a[0]) * ka
      s.a[1] += (s.b[1] - s.a[1]) * ka
      s.grow += (1 - s.grow) * kg
      const g = Math.max(0.04, s.grow)

      // The word under the drop reads in graphite.
      items.forEach((el, i) => {
        if (!el) return
        const c = centers[i]
        el.classList.toggle('is-under', Math.hypot(c[0] - s.b[0], c[1] - s.b[1]) < 0.4)
      })

      const [hw, hh] = halves[idx]
      let ra: [number, number, number]
      let rb: [number, number, number]
      let k = 0.5
      let axis: 0 | 1 = 0
      let bodyOn = false
      let body: [number, number, number, number] = [0, 0, 0, 0]
      if (form === 'stack') {
        rb = [hw * 0.98 * g, hh * 0.9 * g, 0.3]
        ra = [hw * 0.85 * g, hh * 0.78 * g, 0.26]
        k = 0.45
        axis = 1
      } else if (form === 'island') {
        rb = [hw * 1.05 * g, hh * 1.0 * g, 0.36]
        ra = [hw * 0.85 * g, hh * 0.9 * g, 0.32]
        bodyOn = true
        const first = centers[0]
        const last = centers[pages.length - 1]
        const fullHalf = (last[0] - first[0]) / 2 + halves[0][0] * 1.1
        const cxFull = (first[0] + last[0]) / 2
        const act = centers[active]
        const actHalf = halves[active][0] * 1.05
        body = [act[0] + (cxFull - act[0]) * s.e, act[1], (actHalf + (fullHalf - actHalf) * s.e) * g, hh * 1.0 * g]
      } else {
        rb = [hw * 0.92 * g, hh * 0.95 * g, 0.36]
        ra = [hw * 0.8 * g, hh * 0.85 * g, 0.32]
      }

      // Ferrofluid: the head sprouts spikes while the drop travels between words
      // and a few while a word is hovered, relaxing once it has arrived.
      const sep = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
      const amp = Math.min(1.2, Math.min(1, sep * 3.2) + (hover != null ? 0.25 : 0))
      m.frame({
        time: now / 1000, a: s.a, b: s.b, ra, rb, k, body, bodyOn, axis, still: reduced,
        spike: { amp, at: [s.b[0], s.b[1]], spacing: 8 / unit, height: 13 / unit, zone: 40 / unit },
      })
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); m.dispose() }
  }, [])

  // Fallback pill (no WebGL): follows the active or hovered label.
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useEffect(() => {
    if (!fallback) return
    const el = itemRefs.current[hover ?? active]
    const box = boxRef.current
    if (!el || !box) return
    const r = box.getBoundingClientRect()
    const ir = el.getBoundingClientRect()
    setPill({ x: ir.left - r.left, y: ir.top - r.top, w: ir.width, h: ir.height })
  }, [fallback, hover, active, form, wide])

  return (
    <nav
      aria-label="Pages"
      ref={boxRef}
      data-form={form}
      className={`mercury-menu fixed z-50 ${BOX[form]}`}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => { setOver(false); setHover(null) }}
      onFocusCapture={() => setOver(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setOver(false); setHover(null) } }}
      onTouchStart={() => setOver(true)}
    >
      {!fallback && <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />}
      {fallback && pill && (
        <span
          aria-hidden
          className="ease-out-expo pointer-events-none absolute top-0 left-0 rounded-full bg-sand transition-[transform,width,height] duration-[420ms]"
          style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
        />
      )}
      <div className={`absolute flex ${ITEMS[form]}`}>
        {pages.map((p, i) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.to === '/'}
            ref={(el) => { itemRefs.current[i] = el }}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            className={({ isActive }) =>
              `mercury-item display-wide relative z-10 flex items-center justify-center rounded-full font-display text-[10px] font-semibold tracking-[0.04em] md:text-[12px] md:tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300 ${ITEM[form]} ${
                isActive ? 'text-sand' : 'text-sand-dim hover:text-sand'
              } ${fallback && i === (hover ?? active) ? 'is-under' : ''}`
            }
          >
            {p.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/**
 * THE CM MENU (Melvin, 2026-11-25), phones only (below 768px).
 *
 * "I don't like how the menu looks ... in the top right corner of the phone, we
 * should keep like a liquid thing that flows with my initials ... CM. And when
 * you click the CM, the menu comes ... Because it's cleaner like that."
 *
 * One blob of the same raymarched liquid (mercury.ts, same shader, same colour
 * source) sits top right holding CM. It is never still: two lobes drift inside
 * it and it breathes. Tapping it pours a drop out of the blob, which stretches
 * as the drop leaves, and the drop falls to the current page's word and becomes
 * the pill behind it, as the drop does on desktop. The five words appear under
 * the blob over a dark shade that dims the page so they read over the light.
 * Tapping a word sends the drop to it, navigates and closes; CM again, a tap
 * anywhere else, or Escape closes. Nothing is fixed at the bottom any more.
 *
 * Cost: one canvas (dpr capped at 2 in mercury.ts). While closed only a 76px
 * square around the blob is drawn (`clip`) and nothing is measured.
 *
 * Reduced motion: no drift, no pour; the menu and the pill simply appear.
 * No WebGL: a plain sand disc with CM and a sand pill behind the current word.
 * The disc is always there under the canvas, so CM stays readable even if the
 * canvas ever fails to draw.
 */
const CM_R = 20 // blob radius, CSS px
const CM_CLOSE_MS = 240 // the drop reaches the tapped word before the list leaves

type Slot = { x: number; y: number; hw: number; hh: number }

function CmMenu() {
  const { pathname } = useLocation()
  const reduced = usePrefersReducedMotion()
  const active = activeIndex(pathname)

  const navRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([])
  const closeTimer = useRef(0)
  const [open, setOpen] = useState(false)
  // The word being pressed or focused: the drop goes there first.
  const [aim, setAim] = useState<number | null>(null)
  const [fallback, setFallback] = useState(false)

  const live = useRef({ open, active, aim, reduced })
  live.current = { open, active, aim, reduced }

  const close = (refocus: boolean) => {
    window.clearTimeout(closeTimer.current)
    // Focus must not be left on a link that is about to become unfocusable.
    const nav = navRef.current
    const inside = nav && nav.contains(document.activeElement) && document.activeElement !== btnRef.current
    if (refocus || inside) btnRef.current?.focus({ preventScroll: true })
    setOpen(false)
    setAim(null)
  }
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => close(false), live.current.reduced ? 0 : CM_CLOSE_MS)
  }
  const closeRef = useRef({ close, closeSoon })
  closeRef.current = { close, closeSoon }

  // Any route change closes the menu (a tapped word, the wordmark, the back button).
  useEffect(() => {
    closeRef.current.closeSoon()
    return () => window.clearTimeout(closeTimer.current)
  }, [pathname])

  // While open: a tap anywhere outside, or Escape, closes it.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node | null)) closeRef.current.close(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current.close(true)
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    const canvas = canvasRef.current
    const nav = navRef.current
    const btn = btnRef.current
    if (!canvas || !nav || !btn) return
    const m: Mercury | null = createMercury(canvas)
    if (!m) { setFallback(true); return }

    // Everything below is CSS pixels from the canvas's top left; converted to the
    // shader's units (half the canvas height) only when the frame is handed over.
    const s = { a: [0, 0] as Vec, b: [0, 0] as Vec, e: 0, hw: CM_R, hh: CM_R, started: false, wasOpen: false, marked: false, dirty: true, last: 0 }
    const geo = { W: 0, H: 0, c: [0, 0] as Vec, slots: [] as Slot[] }
    const measure = () => {
      const r = nav.getBoundingClientRect()
      const b = btn.getBoundingClientRect()
      geo.W = r.width
      geo.H = r.height
      geo.c = [b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top]
      geo.slots = slotRefs.current.map((el) => {
        if (!el) return { x: geo.c[0], y: geo.c[1], hw: CM_R, hh: CM_R }
        const q = el.getBoundingClientRect()
        return { x: q.left + q.width / 2 - r.left, y: q.top + q.height / 2 - r.top, hw: q.width / 2, hh: q.height / 2 }
      })
    }
    const markDirty = () => { s.dirty = true }
    window.addEventListener('resize', markDirty)
    document.fonts?.ready.then(markDirty, () => {})

    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const { open, active, aim, reduced } = live.current
      const dt = s.last ? Math.min(0.05, Math.max(0.001, (now - s.last) / 1000)) : 0.016
      s.last = now
      // Measure only when something can have moved: opening, closing, a resize, the font arriving.
      if (s.dirty || open !== s.wasOpen) { measure(); s.dirty = false; s.wasOpen = open }
      if (geo.W < 2 || geo.H < 2 || geo.slots.length < pages.length) return
      m.resize(geo.W, geo.H)

      const ease = (rate: number) => (reduced ? 1 : 1 - Math.exp(-dt * rate))
      s.e += ((open ? 1 : 0) - s.e) * ease(9)
      if (!open && s.e < 0.003) s.e = 0
      if (open && s.e > 0.997) s.e = 1
      const e = s.e

      const [cx, cy] = geo.c
      const slot = geo.slots[aim ?? active]
      if (!s.started) { s.a = [cx, cy]; s.b = [cx, cy]; s.started = true }
      // b leads to the word (or back into the blob), a lags behind it: the bridge.
      const tx = open ? slot.x : cx
      const ty = open ? slot.y : cy
      s.b[0] += (tx - s.b[0]) * ease(10.5)
      s.b[1] += (ty - s.b[1]) * ease(10.5)
      s.a[0] += (s.b[0] - s.a[0]) * ease(5.3)
      s.a[1] += (s.b[1] - s.a[1]) * ease(5.3)
      s.hw += (slot.hw - s.hw) * ease(10.5)
      s.hh += (slot.hh - s.hh) * ease(10.5)
      const home = !open && e === 0 && Math.hypot(s.a[0] - cx, s.a[1] - cy) < 0.4
      if (home) { s.a = [cx, cy]; s.b = [cx, cy] }

      // The word under the drop reads in the ground colour.
      if (e > 0 || s.marked) {
        slotRefs.current.forEach((el, i) => {
          if (!el) return
          const g = geo.slots[i]
          el.classList.toggle('is-under', e > 0.2 && Math.hypot(g.x - s.b[0], g.y - s.b[1]) < 15)
        })
        s.marked = e > 0
      }

      // At rest in the blob the two drops are lobes that drift, so the blob flows.
      const t = now / 1000
      const idle = reduced ? 0 : 1 - e
      const ax = s.a[0] + Math.cos(t * 0.83) * 9 * idle
      const ay = s.a[1] + Math.sin(t * 0.61 + 1.3) * 8 * idle
      const bx = s.b[0] - Math.cos(t * 0.52 + 2.1) * 9 * idle
      const by = s.b[1] + Math.sin(t * 0.94) * 8 * idle
      const lobe = CM_R * 0.7
      const mix = (p: number, q: number) => p + (q - p) * e
      // The blob itself: it breathes, and stretches downward while the drop pours out or returns.
      const pour = reduced ? 0 : 4 * e * (1 - e)
      const sq = reduced ? 0 : Math.sin(t * 1.15) * 0.035
      const bodyY = cy + CM_R * 0.3 * pour
      const bodyW = CM_R * (1 + sq) * (1 - 0.1 * pour)
      const bodyH = CM_R * (1 - sq) * (1 + 0.3 * pour)

      // Ferrofluid: spikes on the head while the drop travels, a few while a word is held.
      const sep = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) / 30
      const amp = Math.min(1.2, Math.min(1, sep * 3.2) + (open && aim != null ? 0.25 : 0))

      const unit = geo.H / 2
      const ux = (x: number) => (x - geo.W / 2) / unit
      const uy = (y: number) => (geo.H / 2 - y) / unit
      m.frame({
        time: t,
        a: [ux(ax), uy(ay)],
        b: [ux(bx), uy(by)],
        ra: [mix(lobe, s.hw * 0.8) / unit, mix(lobe, s.hh * 0.85) / unit, mix(15, 11.5) / unit],
        rb: [mix(lobe, s.hw * 0.92) / unit, mix(lobe, s.hh * 0.95) / unit, 13 / unit],
        k: 14 / unit,
        body: [ux(cx), uy(bodyY), bodyW / unit, bodyH / unit],
        bodyOn: true,
        axis: 1,
        still: reduced,
        // The shader's wobble is sized for the 60px desktop bar; keep it that size here.
        wobble: Math.min(1, 30 / unit),
        spike: { amp, at: [ux(bx), uy(by)], spacing: 8 / unit, height: 13 / unit, zone: 40 / unit },
        clip: home ? [cx - 38, cy - 38, 76, 76] : undefined,
      })
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', markDirty)
      m.dispose()
    }
  }, [])

  return (
    <>
      {/* The shade: dims the page so the words read over the moving light, and
          swallows the tap that closes the menu so it does not hit the page. */}
      <div aria-hidden className={`cm-scrim ${open ? 'is-open' : ''}`} />
      <nav
        aria-label="Pages"
        ref={navRef}
        className={`cm-menu ${open ? 'is-open' : ''} ${fallback ? 'is-plain' : ''}`}
        onBlur={(e) => {
          const to = e.relatedTarget as Node | null
          if (open && to && !e.currentTarget.contains(to)) close(false)
        }}
      >
        <span aria-hidden className="cm-disc" />
        {!fallback && <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />}
        <button
          ref={btnRef}
          type="button"
          className="cm-button display-wide font-display"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="cm-pages"
          onClick={() => {
            if (open) close(false)
            else { window.clearTimeout(closeTimer.current); setOpen(true) }
          }}
        >
          <span aria-hidden>CM</span>
        </button>
        <ul id="cm-pages" className="cm-list" inert={!open}>
          {pages.map((p, i) => (
            <li key={p.to} style={{ '--i': i } as CSSProperties}>
              <NavLink
                to={p.to}
                end={p.to === '/'}
                className="cm-link"
                onPointerDown={() => setAim(i)}
                onPointerCancel={() => setAim(null)}
                onFocus={() => setAim(i)}
                onBlur={() => setAim(null)}
                onClick={() => { setAim(i); closeSoon() }}
              >
                <span ref={(el) => { slotRefs.current[i] = el }} className="cm-slot">
                  <span className="cm-word display-wide font-display">{p.label}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

export function Nav() {
  const wide = useWide()
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      // The brand hides going down and returns coming up; the menu never hides.
      setHidden(y > 140 && y > lastY.current)
      lastY.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`ease-out-expo pointer-events-none fixed top-0 left-0 z-40 transition-[transform,opacity] duration-500 ${
          hidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex h-16 items-center px-6 md:h-20 md:px-10">
          {/* The name, in the display cut: the one element on every page that
              is unmistakably the same object as the hero title. */}
          <NavLink
            to="/"
            className="ease-out-expo display-wide pointer-events-auto font-display text-[15px] font-bold tracking-tight text-sand uppercase transition-opacity duration-300 hover:opacity-70 md:text-base"
          >
            Melvin Chirag
          </NavLink>
        </div>
      </header>
      {/* 768px and wider: the row and island, unchanged. Below: the liquid CM. */}
      {wide ? <MercuryMenu /> : <CmMenu />}
    </>
  )
}
