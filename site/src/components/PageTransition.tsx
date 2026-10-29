/* ============================================================================
 * PageTransition.tsx — the route change (block 5, 2026-10-29)
 * ----------------------------------------------------------------------------
 * On a route change the current page fades out (220ms), THEN the new page
 * mounts and fades in (650ms). Two decisions worth knowing about:
 *
 *   1. The old page keeps rendering during the fade-out. React Router's
 *      <Routes> accepts a `location` prop, so this component holds a "shown"
 *      location that lags the real one by one fade, and renders the routes
 *      against that. Everything else (nav, scene) reads the real location and
 *      switches at once, which is what you want: the nav highlight moves on
 *      the click, the content follows.
 *   2. Opacity only, never a transform on this wrapper. A transformed
 *      ancestor becomes the containing block for `position: fixed` children,
 *      and the hero's clock rail is fixed; a transform here would pin it to
 *      the page instead of the viewport. The rise that goes with the fade is
 *      done per element by Reveal.tsx instead.
 *
 * Reduced motion: the shown location updates immediately and the CSS turns the
 * fades off, so the swap is a plain cut.
 * ========================================================================= */

import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, type Location } from 'react-router-dom'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/** Must match `.page-out`'s transition in index.css. */
const OUT_MS = 220

export function PageTransition({ children }: { children: (location: Location) => ReactNode }) {
  const location = useLocation()
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(location)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Same path, different hash (e.g. "/#contact" from the footer): no fade,
    // just let the page handle its own scroll.
    if (location.pathname === shown.pathname) {
      if (location !== shown) setShown(location)
      return
    }
    if (reduced) {
      setShown(location)
      return
    }
    setLeaving(true)
    const t = window.setTimeout(() => {
      setShown(location)
      setLeaving(false)
    }, OUT_MS)
    return () => window.clearTimeout(t)
  }, [location, shown, reduced])

  return (
    // `key` remounts the wrapper on every swap so the fade-in animation
    // restarts for the new page rather than carrying over mid-way.
    <div key={shown.pathname} className={leaving ? 'page-out' : 'page-in'}>
      {children(shown)}
    </div>
  )
}
