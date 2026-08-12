/* ============================================================================
 * ProjectRow.tsx — one expandable project inside a Work section (level 2)
 * ----------------------------------------------------------------------------
 * Collapsed, it is a full-width rectangle: name (+ status chip) on the left,
 * its tag-thread and a +/− on the right. Expanded, it reveals the blurb, the
 * full write-up, meta (role / event / team), links, and the media block. Rows
 * are independent — any number can be open at once — which is the layout Melvin
 * picked for scaling to many projects.
 *
 * `sync-glass-rect` stays on the outer rectangle: it is the hook the liquid-
 * glass field syncs to, so the later aesthetics pass can render glass behind
 * these rows without touching this component. Links with an empty href render
 * dimmed and non-interactive (the project has no repo/demo URL yet).
 * ========================================================================= */

import { Collapsible } from '../Collapsible'
import { TagThread } from '../TagThread'
import { ProjectMedia } from './ProjectMedia'
import { tagsOf } from '../../data/tags'
import type { WorkProject } from '../../data/work'

export function ProjectRow({
  project,
  open,
  onToggle,
}: {
  project: WorkProject
  open: boolean
  onToggle: () => void
}) {
  const hasDetail = (project.detail?.length ?? 0) > 0
  // Resolve tag ids → labels, ordered discipline → tech → purpose. Rendered as
  // one thread on the collapsed row; the three-axis structure powers search.
  const tagLabels = tagsOf(project.tags).map((t) => t.label)

  return (
    <Collapsible
      heading={3}
      open={open}
      onToggle={onToggle}
      id={`project-${project.id}`}
      className="sync-glass-rect scroll-mt-28 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
      triggerClassName="group flex flex-col gap-3 p-5 transition-colors hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between md:gap-6"
      contentClassName="border-t border-white/5 px-5 pb-6 pt-5"
      trigger={(open) => (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <span className="font-display text-xl text-white">{project.name}</span>
            {project.status && (
              <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] tracking-wider text-white/40 uppercase">
                {project.status}
              </span>
            )}
            {project.tentative && (
              <span className="shrink-0 text-[10px] tracking-wider text-accent/50 uppercase">draft</span>
            )}
          </span>
          <span className="flex items-center gap-4 md:min-w-0 md:flex-1 md:justify-end">
            <span className="min-w-0">
              <TagThread items={tagLabels} compact />
            </span>
            <span className="shrink-0 text-lg leading-none text-accent transition-colors group-hover:text-white">
              {open ? '−' : '+'}
            </span>
          </span>
        </>
      )}
    >
      <p className="max-w-2xl text-sm leading-relaxed text-white/70">{project.blurb}</p>

      {hasDetail && (
        <div className="mt-5 flex max-w-2xl flex-col gap-5">
          {project.detail!.map((block, i) => (
            <div key={i}>
              {block.heading && (
                <h4 className="mb-2 text-[11px] tracking-[0.18em] text-accent/70 uppercase">
                  {block.heading}
                </h4>
              )}
              {block.body?.map((para, j) => (
                <p key={j} className="mb-2 text-sm leading-relaxed text-white/55 last:mb-0">
                  {para}
                </p>
              ))}
              {block.points && (
                <ul className="mt-1 flex flex-col gap-2">
                  {block.points.map((pt, k) => (
                    <li key={k} className="text-sm leading-relaxed text-white/55">
                      {pt.label && <span className="text-white/85">{pt.label}. </span>}
                      {pt.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {project.stack && project.stack.length > 0 && (
        <div className="mt-5 max-w-2xl">
          <h4 className="mb-2 text-[11px] tracking-[0.18em] text-accent/70 uppercase">Tech Stack</h4>
          <p className="flex flex-wrap items-center gap-y-1 text-sm leading-relaxed">
            {project.stack.map((t, i) => (
              <span key={t}>
                <strong className="font-semibold text-white/85">{t}</strong>
                {i < project.stack!.length - 1 && <span className="text-white/25"> · </span>}
              </span>
            ))}
          </p>
        </div>
      )}

      {(project.role || project.event || project.team) && (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-xs text-white/40">
          {project.role && (
            <div>
              <dt className="inline text-white/25">Role: </dt>
              <dd className="inline">{project.role}</dd>
            </div>
          )}
          {project.event && (
            <div>
              <dt className="inline text-white/25">Event: </dt>
              <dd className="inline">{project.event}</dd>
            </div>
          )}
          {project.award && (
            <div>
              <dt className="inline text-white/25">Award: </dt>
              <dd className="inline">{project.award}</dd>
            </div>
          )}
          {project.team && (
            <div>
              <dt className="inline text-white/25">Team: </dt>
              <dd className="inline">{project.team}</dd>
            </div>
          )}
        </dl>
      )}

      {project.links && project.links.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {project.links.map((l) =>
            l.href ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-white/20 pb-0.5 text-xs text-white/70 transition-colors hover:border-accent hover:text-white"
              >
                {l.label} &rarr;
              </a>
            ) : (
              <span
                key={l.label}
                className="cursor-default border-b border-white/5 pb-0.5 text-xs text-white/20"
                title="Link coming soon"
              >
                {l.label}
              </span>
            ),
          )}
        </div>
      )}

      <ProjectMedia media={project.media} />
    </Collapsible>
  )
}
