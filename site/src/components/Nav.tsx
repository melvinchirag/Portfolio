import { useEffect, useRef, useState } from 'react'
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
 *   Phone (any)     ROW     at the bottom, thumb reach
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
  if (pathname.startsWith('/work') || pathname.startsWith('/vision')) return 'island'
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
  row: 'left-1/2 -translate-x-1/2 bottom-[calc(10px+env(safe-area-inset-bottom,0px))] h-[60px] w-[min(440px,94vw)] md:top-4 md:bottom-auto',
  island: 'left-1/2 -translate-x-1/2 top-4 h-[60px] w-[440px]',
  stack: 'top-4 right-10 h-[140px] w-[170px]',
}
const ITEMS: Record<Form, string> = {
  row: 'inset-x-0 top-[14px] h-8 flex-row justify-center',
  island: 'inset-x-0 top-[14px] h-8 flex-row justify-center',
  stack: 'inset-x-0 top-2 bottom-2 flex-col items-end justify-between',
}
const ITEM: Record<Form, string> = {
  // Four words must fit a 94vw bar on a 360px phone, so the row pads less there.
  row: 'h-8 px-3 md:px-5',
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

      m.frame({ time: now / 1000, a: s.a, b: s.b, ra, rb, k, body, bodyOn, axis, still: reduced })
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
              `mercury-item display-wide relative z-10 flex items-center justify-center rounded-full font-display text-[12px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300 ${ITEM[form]} ${
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

export function Nav() {
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
      <MercuryMenu />
    </>
  )
}
