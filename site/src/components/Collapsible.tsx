/* ============================================================================
 * Collapsible.tsx — the one expand/collapse primitive used everywhere on Work
 * ----------------------------------------------------------------------------
 * The Work page nests disclosures three levels deep: a section opens to reveal
 * project rows, a project row opens to reveal its write-up, and a Foundations
 * skill token opens to reveal what Melvin did with it. Rather than write that
 * open/close mechanic three times, it lives here once and each level supplies
 * its own trigger look via the `trigger` render-prop.
 *
 * HOW THE ANIMATION WORKS (the non-obvious part): height cannot be transitioned
 * from 0 to "whatever the content needs" because `auto` is not an animatable
 * value. The trick is a CSS grid whose single row animates between `0fr` and
 * `1fr` — fractional units DO interpolate — with the body wrapped in an
 * `overflow-hidden` cell so it is clipped while the row is collapsed. This is
 * the same mechanic the previous inline Work accordion used, promoted to a
 * shared component.
 *
 * ACCESSIBILITY: the trigger is a real <button> carrying `aria-expanded` and
 * `aria-controls`, and for the section/row levels it is wrapped in the correct
 * heading tag (via `heading`) so the page keeps a valid h2/h3 outline — a
 * heading is not phrasing content and may not live *inside* a button, so the
 * wrapper goes on the outside with `display:contents` to stay layout-neutral.
 * Under `prefers-reduced-motion` the transition is dropped (the content still
 * shows instantly), satisfying the "readable without animation" rule.
 * ========================================================================= */

import { createElement, useId, useState, type ReactNode } from 'react'

type CollapsibleProps = {
  /** Renders the clickable header. Receives `open` so it can flip its +/− and
   *  restyle. Must return phrasing content only (spans, not headings). */
  trigger: (open: boolean) => ReactNode
  /** The body revealed when open. */
  children: ReactNode
  defaultOpen?: boolean
  /** Wrap the trigger button in an <h2>/<h3> for document outline. Omit for
   *  interactive tokens (skills) that are not real headings. */
  heading?: 2 | 3
  /** CONTROLLED mode: when `open` is passed, the parent owns the state and this
   *  component just reflects it (used so a clicked search result can force a
   *  section/project open). Pair with `onToggle`. Omit both for the normal
   *  self-managed (uncontrolled) behaviour. */
  open?: boolean
  onToggle?: () => void
  /** Applied to the outer wrapper — a scroll anchor for search "reveal". */
  id?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

export function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  heading,
  open: controlledOpen,
  onToggle,
  id,
  className = '',
  triggerClassName = '',
  contentClassName = '',
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  // Controlled when a parent passes `open`; otherwise self-managed.
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const toggle = () => {
    if (isControlled) onToggle?.()
    else setUncontrolledOpen((o) => !o)
  }
  // A stable id linking the button's aria-controls to the body region.
  const contentId = useId()

  const button = (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-controls={contentId}
      className={`block w-full cursor-pointer text-left ${triggerClassName}`}
    >
      {trigger(open)}
    </button>
  )

  return (
    <div id={id} className={className}>
      {/* `contents` makes the heading box vanish so the button's own flex
          layout is unaffected, while the heading tag still exists for a11y. */}
      {heading ? createElement(`h${heading}`, { className: 'contents' }, button) : button}

      <div
        id={contentId}
        className={`grid transition-[grid-template-rows] duration-500 ease-out-expo motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>
  )
}
