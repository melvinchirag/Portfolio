/* ============================================================================
 * Reveal.tsx — arrive-on-scroll for any block of content (block 5)
 * ----------------------------------------------------------------------------
 * Wrap a card, a paragraph, a section header; it starts faded and 18px low and
 * comes up on the site's easing the first time it scrolls into view. `delay`
 * staggers siblings (pass `i * 80` or similar).
 *
 * ONE IntersectionObserver for the whole site, created lazily and shared by
 * every instance: dozens of observers would each cost a layout read per
 * scroll frame. Each element is unobserved after it arrives, so the work is
 * one-shot. If the API is missing (old WebView) the element is shown at once;
 * the content is never gated on it. Reduced motion is handled in CSS
 * (`.reveal` is static there) so this component does not need to know.
 * ========================================================================= */

import { createElement, useEffect, useRef, type CSSProperties, type JSX, type ReactNode } from 'react'

let observer: IntersectionObserver | null = null

function observe(el: Element) {
  if (typeof IntersectionObserver === 'undefined') {
    el.classList.add('is-in')
    return () => {}
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            observer?.unobserve(e.target)
          }
        }
      },
      // Fire once ~8% of the element is in, slightly before the bottom edge,
      // so the arrival reads as "already moving" when the eye gets there.
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    )
  }
  observer.observe(el)
  return () => observer?.unobserve(el)
}

export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  ...rest
}: {
  /** The HTML tag to render (div, p, header, section, footer, h1 …). */
  as?: keyof JSX.IntrinsicElements
  /** Milliseconds before this one starts, for staggering siblings. */
  delay?: number
  className?: string
  children?: ReactNode
  [key: string]: unknown
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observe(el)
  }, [])
  const style = delay ? ({ '--d': `${delay}ms` } as CSSProperties) : undefined
  // createElement rather than <Tag>: a JSX tag typed as a union of every
  // intrinsic element collapses its props to `never` under TS 6.
  return createElement(Tag, { ref, className: `reveal ${className}`, style, ...rest }, children)
}
