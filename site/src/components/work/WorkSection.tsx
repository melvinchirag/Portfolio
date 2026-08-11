/* ============================================================================
 * WorkSection.tsx — a top-level collapsible section on the Work page
 * ----------------------------------------------------------------------------
 * Level 1 of the Work page's nested disclosures: "Flagship", "Hackathons",
 * "Personal", "Foundations", "Leadership". The header is a real <h2> with the
 * count beside it and a +/− that tracks open state.
 *
 * Open state is CONTROLLED by the Work page (not self-managed) so that clicking
 * a search result can force the right section open. It also carries an `id`
 * anchor for scroll-into-view from search.
 * ========================================================================= */

import type { ReactNode } from 'react'
import { Collapsible } from '../Collapsible'

export function WorkSection({
  id,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  id?: string
  title: string
  count?: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/10">
      <Collapsible
        heading={2}
        open={open}
        onToggle={onToggle}
        triggerClassName="group flex items-baseline justify-between py-6"
        contentClassName="pb-10"
        trigger={(isOpen) => (
          <>
            <span className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-white/90 md:text-3xl">{title}</span>
              {count != null && (
                <span className="text-xs font-light text-white/30">{count}</span>
              )}
            </span>
            <span className="text-lg leading-none text-accent transition-colors group-hover:text-white">
              {isOpen ? '−' : '+'}
            </span>
          </>
        )}
      >
        {children}
      </Collapsible>
    </section>
  )
}
