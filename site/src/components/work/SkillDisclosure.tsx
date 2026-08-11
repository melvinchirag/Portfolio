/* ============================================================================
 * SkillDisclosure.tsx — one expandable skill token in Foundations (level 3)
 * ----------------------------------------------------------------------------
 * The deepest disclosure: a single skill (e.g. "Python") that opens to a short
 * write-up of what Melvin did with it plus repo links. Not wrapped in a heading
 * (a skill token is an interactive control, not a document heading), so it uses
 * Collapsible without the `heading` prop. When the write-up is still a
 * placeholder it opens to a quiet "write-up coming" line rather than nothing,
 * keeping the structure demonstrable while content is gathered.
 * ========================================================================= */

import { Collapsible } from '../Collapsible'
import type { Skill } from '../../data/skills'

export function SkillDisclosure({ skill }: { skill: Skill }) {
  const hasWriteup = (skill.writeup?.length ?? 0) > 0
  const hasRepos = (skill.repos?.length ?? 0) > 0

  // No content yet → a plain, non-expandable token. It gains the expander
  // automatically once a write-up or repo is added in skills.ts. This is what
  // keeps empty expands off the page while Foundations is still being filled.
  if (!hasWriteup && !hasRepos) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.015] px-4 py-2.5 text-sm text-white/70">
        <span
          aria-hidden
          className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(243,198,127,0.55)]"
        />
        {skill.name}
      </div>
    )
  }

  return (
    <Collapsible
      className="rounded-lg border border-white/5 bg-white/[0.015]"
      triggerClassName="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
      contentClassName="px-4 pb-4 pt-1"
      trigger={(open) => (
        <>
          <span className="flex items-center gap-2 text-sm text-white/80">
            {/* Same glowing dot as TagThread, so a skill reads as part of the
                site's one tag motif. */}
            <span
              aria-hidden
              className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(243,198,127,0.55)]"
            />
            {skill.name}
          </span>
          <span className="text-sm leading-none text-accent transition-colors group-hover:text-white">
            {open ? '−' : '+'}
          </span>
        </>
      )}
    >
      {hasWriteup ? (
        <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-white/50">
          {skill.writeup!.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-white/30 italic">Write-up coming.</p>
      )}

      {skill.repos && skill.repos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {skill.repos.map((r) =>
            r.href ? (
              <a
                key={r.label}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-white/15 pb-0.5 text-xs text-white/60 transition-colors hover:border-accent hover:text-white"
              >
                {r.label} &rarr;
              </a>
            ) : (
              <span
                key={r.label}
                className="cursor-default border-b border-white/5 pb-0.5 text-xs text-white/20"
              >
                {r.label}
              </span>
            ),
          )}
        </div>
      )}
    </Collapsible>
  )
}
