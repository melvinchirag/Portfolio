import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * The live Lenis instance, shared so UI outside this hook (e.g. the hero's
 * Contact button) can trigger a smooth programmatic scroll. `null` on mobile,
 * where Lenis is not created and we fall back to native scrolling.
 */
let activeLenis: Lenis | null = null

/**
 * Smoothly scroll to an element by id (e.g. the contact section). Uses Lenis
 * when it's running so the motion matches the rest of the page's inertia; falls
 * back to the browser's native smooth scroll on mobile / before Lenis mounts.
 */
export function heroScrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (activeLenis) {
    activeLenis.scrollTo(el, {
      duration: 1.6,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
  } else {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

/**
 * Smoothly scroll back to the very top through Lenis. IMPORTANT: never use the
 * browser's native `window.scrollTo({behavior:'smooth'})` while Lenis is
 * running — the two scroll engines fight each other, which is what made the
 * "Return to Start" button feel stuck. Routing through Lenis keeps it smooth.
 */
export function heroScrollToTop() {
  if (activeLenis) {
    activeLenis.scrollTo(0, {
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

/**
 * Scroll so hero frame `index` is centred. Because the strip pans exactly one
 * viewport-height of scroll per frame, the target Y is simply the track's top
 * plus `index × viewportHeight`. Used by the hero's "Projects" button to glide
 * to the Present frame without the visitor hunting for it.
 */
export function heroScrollToFrame(index: number) {
  const track = document.getElementById('hero-track')
  const top = track ? track.offsetTop : 0
  const y = top + index * window.innerHeight
  if (activeLenis) {
    activeLenis.scrollTo(y, {
      duration: 1.6,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

export function useLenis() {
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    })
    activeLenis = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      activeLenis = null
    }
  }, [])
}
