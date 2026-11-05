import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * THE DETECTION DOCK (Melvin, 2026-11-05: "option A ... but think of something
 * more unique ... surprise me").
 *
 * Option A was a capsule with a pill that slides to the current page. The
 * site's concept is computer vision, so the indicator here is a detector's
 * bounding box instead of a pill: four corner brackets that lock onto the page
 * you are on. Hover or focus another page and the box re-targets onto it, a
 * scan line sweeps through it, and a detection tag reads it out with a
 * confidence score that counts up ("WORK 0.97"), the way an object detector
 * labels what it sees. Leave the dock and the box settles back on the page
 * you are on.
 *
 * Laptop: the capsule floats top-centre; the brand sits alone top-left.
 * Phone: the same capsule is a thumb bar at the bottom edge; no hamburger.
 * Reduced motion: the box jumps instead of gliding, no scan, no count-up.
 *
 * Labels stay conventional (Work, Vision, About) because most visitors are
 * recruiters looking for projects; the three-tenses idea lives in each page's
 * eyebrow. Confidence scores are fixed per page, not random, so the dock reads
 * the same every visit.
 */
const pages = [
  { to: '/', label: 'Home', conf: 0.99 },
  { to: '/work', label: 'Work', conf: 0.97 },
  { to: '/vision', label: 'Vision', conf: 0.94 },
  { to: '/about', label: 'About', conf: 0.96 },
]

type Box = { x: number; w: number }

function activeIndex(pathname: string) {
  return pages.findIndex((p) => (p.to === '/' ? pathname === '/' : pathname.startsWith(p.to)))
}

function DetectionDock() {
  const reduced = usePrefersReducedMotion()
  const { pathname } = useLocation()
  const active = activeIndex(pathname)
  const [hover, setHover] = useState<number | null>(null)
  const target = hover ?? (active >= 0 ? active : null)

  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [box, setBox] = useState<Box | null>(null)

  const measure = useCallback(() => {
    const el = target === null ? null : itemRefs.current[target]
    if (!el) { setBox(null); return }
    setBox({ x: el.offsetLeft, w: el.offsetWidth })
  }, [target])

  useLayoutEffect(() => { measure() }, [measure])
  useEffect(() => {
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // The confidence read-out counts up from 0.00 each time the box re-targets
  // onto a hovered page. At rest (no hover) there is no tag at all.
  const [shown, setShown] = useState(0)
  const [scanKey, setScanKey] = useState(0)
  useEffect(() => {
    if (hover === null) return
    setScanKey((k) => k + 1)
    const goal = pages[hover].conf
    if (reduced) { setShown(goal); return }
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 420)
      setShown(goal * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [hover, reduced])

  const glide = reduced ? '' : 'transition-[transform,width] duration-[420ms] ease-out-expo'
  const corner = 'absolute h-[7px] w-[7px] border-sand'

  return (
    <nav
      aria-label="Pages"
      className="fixed left-1/2 z-50 -translate-x-1/2 bottom-[calc(14px+env(safe-area-inset-bottom,0px))] md:top-5 md:bottom-auto"
    >
      <div
        onMouseLeave={() => setHover(null)}
        className="relative flex items-center rounded-full border border-line bg-void/85 p-1"
      >
        {/* The bounding box, positioned in the row's own coordinates. */}
        {box && (
          <div
            aria-hidden
            className={`pointer-events-none absolute top-1 bottom-1 left-0 ${glide}`}
            style={{ transform: `translateX(${box.x}px)`, width: box.w }}
          >
            <span className={`${corner} top-0 left-0 border-t border-l`} />
            <span className={`${corner} top-0 right-0 border-t border-r`} />
            <span className={`${corner} bottom-0 left-0 border-b border-l`} />
            <span className={`${corner} bottom-0 right-0 border-b border-r`} />
            {!reduced && hover !== null && (
              <span key={scanKey} className="dock-scan absolute inset-x-1 top-0 h-px bg-sand/60" />
            )}
            {/* The detection tag: above the box on phones (dock at the bottom),
                below it on laptops (dock at the top). */}
            {hover !== null && (
              <span className="label absolute -top-6 left-0 bg-sand px-1.5 py-[1px] text-[10px] whitespace-nowrap text-void md:top-auto md:-bottom-6">
                {pages[hover].label} {shown.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {pages.map((p, i) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.to === '/'}
            ref={(el) => { itemRefs.current[i] = el }}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={({ isActive }) =>
              `label relative z-10 rounded-full px-4 py-2 transition-colors duration-300 md:px-5 ${
                isActive ? 'text-sand' : 'text-sand-dim hover:text-sand'
              }`
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
      // The brand hides going down and returns coming up; the dock never hides.
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
      <DetectionDock />
    </>
  )
}
