import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

type RevealTextProps = {
  text: string
  className?: string
  /** Seconds before the first character moves. */
  delay?: number
  /** Seconds between characters. */
  stagger?: number
}

/**
 * Per-character reveal — the pattern taken from Galekto, whose name is also its
 * hero element.
 *
 * The text is always in the DOM as a single accessible string; the animation
 * happens on aria-hidden spans layered over it. Content is never held hostage
 * by a tween, and a screen reader hears one word rather than eight letters.
 */
export function RevealText({ text, className = '', delay = 0, stagger = 0.045 }: RevealTextProps) {
  const reducedMotion = usePrefersReducedMotion()

  if (reducedMotion) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex overflow-hidden">
        {text.split('').map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="reveal-char"
            style={{ animationDelay: `${delay + i * stagger}s` }}
          >
            {char === ' ' ? ' ' : char}
          </span>
        ))}
      </span>
    </span>
  )
}
