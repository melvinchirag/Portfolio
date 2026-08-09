/* ============================================================================
 * contactVisibility.ts — is the #contact section on screen right now?
 * ----------------------------------------------------------------------------
 * GlobalScene needs to know when to swap the hero's single big mask for the
 * Contact section's swarm of ten small ones. Both live on the same route ('/'),
 * so the usual route-based gating (isHome/isAbout in GlobalScene) can't tell
 * them apart — this is the missing signal. IntersectionObserver rather than a
 * scroll-position rAF loop (heroScroll's pattern) because we only need a
 * boolean "is it in view", not a continuous progress value; the browser's own
 * observer is cheaper and simpler for that.
 * ========================================================================= */

import { useEffect, useState } from 'react'

export function useContactInView(): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = document.getElementById('contact')
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.15,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // TEMPORARY, browser-automation-only escape hatch (2026-08-09): Chrome
  // suppresses IntersectionObserver callbacks for a document.hidden tab, which
  // is exactly the state an automated/remote-controlled tab reports even while
  // its screenshots render normally. That made verification impossible through
  // that surface, NOT a bug in the observer logic above. Polling
  // window.__forceContactInView lets a devtools check drive real React state
  // without touching real users. REMOVE once this has shipped and been
  // confirmed in a normal foregrounded tab.
  useEffect(() => {
    const id = setInterval(() => {
      const forced = (window as unknown as { __forceContactInView?: boolean }).__forceContactInView
      if (forced !== undefined) setInView(forced)
    }, 200)
    return () => clearInterval(id)
  }, [])

  return inView
}
