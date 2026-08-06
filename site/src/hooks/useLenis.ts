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
