/* ============================================================================
 * ProjectSearch.tsx — search the Work page by tag or name
 * ----------------------------------------------------------------------------
 * Melvin's brief (2026-08-11): type "React" and see every project that used it,
 * grouped by section, with a count and a note of WHERE it was used — so the
 * page stays navigable no matter how many projects accrue. This reads straight
 * off the canonical tag registry (tags.ts), which is exactly why one designated
 * tag vocabulary matters: a free-typed "react" vs "React.js" would fracture the
 * results.
 *
 * Matching is a case-insensitive substring over each project's resolved tag
 * LABELS and its name, plus the Foundations skill names. Clicking a result asks
 * the Work page to open the right section + project and scroll it into view
 * (the reveal logic lives there because it owns the open state).
 *
 * This is also the groundwork for the future on-site AI bot (see PAGE-PLAN.md):
 * the same tag index it would answer questions from.
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { WORK_PROJECTS, CATEGORY_LABEL, type WorkProject } from '../../data/work'
import { DOMAINS } from '../../data/skills'
import { tagsOf } from '../../data/tags'

type ProjectHit = { project: WorkProject; matched: string[]; nameMatch: boolean }
type FoundationHit = { skill: string; domain: string }

export function ProjectSearch({
  onRevealProject,
  onRevealFoundations,
}: {
  onRevealProject: (project: WorkProject) => void
  onRevealFoundations: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking anywhere outside the search.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const q = query.trim().toLowerCase()

  // Recompute matches only when the query changes.
  const { projectHits, foundationHits, total } = useMemo(() => {
    if (!q) return { projectHits: [] as ProjectHit[], foundationHits: [] as FoundationHit[], total: 0 }

    const projectHits: ProjectHit[] = []
    for (const project of WORK_PROJECTS) {
      const matched = tagsOf(project.tags)
        .filter((t) => t.label.toLowerCase().includes(q))
        .map((t) => t.label)
      const nameMatch = project.name.toLowerCase().includes(q)
      if (matched.length > 0 || nameMatch) projectHits.push({ project, matched, nameMatch })
    }

    const foundationHits: FoundationHit[] = []
    for (const domain of DOMAINS) {
      for (const skill of domain.skills) {
        if (skill.name.toLowerCase().includes(q)) {
          foundationHits.push({ skill: skill.name, domain: domain.name })
        }
      }
    }

    return { projectHits, foundationHits, total: projectHits.length + foundationHits.length }
  }, [q])

  // Group project hits by their section, preserving section order.
  const grouped = useMemo(() => {
    const order: WorkProject['category'][] = ['flagship', 'hackathon', 'personal']
    return order
      .map((cat) => ({ cat, hits: projectHits.filter((h) => h.project.category === cat) }))
      .filter((g) => g.hits.length > 0)
  }, [projectHits])

  const showDropdown = open && q.length > 0

  return (
    <div ref={rootRef} className="relative mb-10">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('')
            setOpen(false)
          }
        }}
        placeholder="Search by tech or field — try React, Python, Astronomy…"
        aria-label="Search projects by tag or name"
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder:text-white/25 focus:border-accent/50 focus:outline-none"
      />

      {showDropdown && (
        <div className="absolute z-20 mt-2 max-h-[60vh] w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0d0a07] p-2 shadow-2xl shadow-black/60">
          <div className="px-3 py-2 text-[11px] tracking-wider text-white/40 uppercase">
            {total} {total === 1 ? 'result' : 'results'}
          </div>

          {total === 0 && (
            <p className="px-3 py-4 text-sm text-white/30">No matches for &ldquo;{query.trim()}&rdquo;.</p>
          )}

          {grouped.map(({ cat, hits }) => (
            <div key={cat} className="mb-1">
              <div className="px-3 pt-2 pb-1 text-[10px] tracking-[0.18em] text-accent/60 uppercase">
                {CATEGORY_LABEL[cat]} ({hits.length})
              </div>
              {hits.map(({ project, matched, nameMatch }) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    onRevealProject(project)
                    setOpen(false)
                  }}
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="text-sm text-white/85">{project.name}</span>
                  <span className="mt-0.5 block text-xs text-white/40">
                    {matched.length > 0
                      ? `matched: ${matched.join(', ')}`
                      : nameMatch
                        ? 'matched: name'
                        : ''}
                    {' · '}
                    {CATEGORY_LABEL[project.category]}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {foundationHits.length > 0 && (
            <div className="mb-1">
              <div className="px-3 pt-2 pb-1 text-[10px] tracking-[0.18em] text-accent/60 uppercase">
                Foundations ({foundationHits.length})
              </div>
              {foundationHits.map((h) => (
                <button
                  key={`${h.domain}-${h.skill}`}
                  type="button"
                  onClick={() => {
                    onRevealFoundations()
                    setOpen(false)
                  }}
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="text-sm text-white/85">{h.skill}</span>
                  <span className="mt-0.5 block text-xs text-white/40">Foundations · {h.domain}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
