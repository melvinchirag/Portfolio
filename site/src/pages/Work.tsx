/* ============================================================================
 * Work.tsx — "The Present": what Melvin builds now (recruiter-critical page)
 * ----------------------------------------------------------------------------
 * Data-driven, tag-indexed, and deeply compartmentalized so it scales as
 * projects accumulate toward graduation. Sections, all built on one Collapsible
 * primitive:
 *   Flagship    — Osiris                    (expandable project rows)
 *   Hackathons  — Lingo, EventsOS
 *   Personal    — Manas + future builds     (for-fun / skill / domain-expansion)
 *   Foundations — core CS, by domain        (each skill is itself expandable)
 *   Leadership  — roles                      (a light list)
 *
 * WHY OPEN STATE LIVES HERE: the search bar must be able to click a result and
 * force the right section + project open and scroll to it. That only works if
 * one owner holds the open state, so the page owns two sets (open sections, open
 * projects) and passes controlled `open`/`onToggle` down. Foundations skill
 * tokens keep their own local state — search only needs to reach the section.
 *
 * This pass is STRUCTURE + CONTENT + the tag/search system. Visual look, WebGL
 * background, liquid glass and any skills-constellation pizzazz are a later pass
 * (rows already carry `sync-glass-rect` hooks). Placeholder copy is flagged in
 * the data files and fills in by editing data, not this component.
 * ========================================================================= */

import { useEffect, useState } from 'react'
import { WORK_PROJECTS, CATEGORY_LABEL, type WorkProject } from '../data/work'
import { TAGS, type TagId } from '../data/tags'
import { DOMAINS } from '../data/skills'
import { WorkSection } from '../components/work/WorkSection'
import { ProjectRow } from '../components/work/ProjectRow'
import { SkillDisclosure } from '../components/work/SkillDisclosure'
import { ProjectSearch } from '../components/work/ProjectSearch'

const LEADERSHIP = [
  { role: 'Executive Member & Treasurer', org: 'Google Developer Group @ EMU' },
  { role: 'Member', org: 'AI Club' },
  { role: 'Finance Lead', org: 'EMU Hackathon' },
]

// Toggle a value's presence in a Set immutably (React needs a new reference).
function toggleIn<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export function Work() {
  // Always land at the top when navigating in.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Which sections/projects are open. Flagship starts open; the rest closed.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Personal']))
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set())

  const toggleSection = (title: string) => setOpenSections((s) => toggleIn(s, title))
  const toggleProject = (id: string) => setOpenProjects((s) => toggleIn(s, id))

  // Open a project's section + the project, then scroll it into view. Used when
  // a search result is clicked. The small delay lets React commit the open state
  // (and the section begin expanding) before we measure where to scroll.
  const revealProject = (project: WorkProject) => {
    setOpenSections((s) => new Set(s).add(CATEGORY_LABEL[project.category]))
    setOpenProjects((s) => new Set(s).add(project.id))
    window.setTimeout(() => {
      document.getElementById(`project-${project.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 80)
  }

  const revealFoundations = () => {
    setOpenSections((s) => new Set(s).add('Foundations'))
    window.setTimeout(() => {
      document.getElementById('section-foundations')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  const flagship = WORK_PROJECTS.filter((p) => p.category === 'flagship')
  const hackathon = WORK_PROJECTS.filter((p) => p.category === 'hackathon')
  const personal = WORK_PROJECTS.filter((p) => p.category === 'personal')

  // Personal projects are grouped by their purpose tag into sub-sections
  // (Manas → Domain Expansion, the site → Skill Building, etc.). Only purposes
  // with at least one project show; anything without a purpose tag falls to an
  // unlabelled group at the end so it can never vanish.
  const PERSONAL_PURPOSES: TagId[] = ['domainExpansion', 'skillBuilding', 'forFun']
  const personalGroups = PERSONAL_PURPOSES.map((pid) => ({
    pid,
    label: TAGS[pid].label,
    projects: personal.filter((p) => p.tags.includes(pid)),
  })).filter((g) => g.projects.length > 0)
  const personalUngrouped = personal.filter(
    (p) => !PERSONAL_PURPOSES.some((pid) => p.tags.includes(pid)),
  )

  const renderRows = (projects: WorkProject[]) => (
    <div className="flex flex-col gap-3">
      {projects.map((p) => (
        <ProjectRow
          key={p.id}
          project={p}
          open={openProjects.has(p.id)}
          onToggle={() => toggleProject(p.id)}
        />
      ))}
    </div>
  )

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-6 pt-32 pb-24 md:px-10">
      <header className="mb-10">
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
          Work
        </h1>
        <p className="mt-4 max-w-xl text-sm text-white/40">What I'm building now.</p>
      </header>

      <ProjectSearch onRevealProject={revealProject} onRevealFoundations={revealFoundations} />

      <div className="flex flex-col">
        <WorkSection
          id="section-personal"
          title="Personal"
          count={personal.length}
          open={openSections.has('Personal')}
          onToggle={() => toggleSection('Personal')}
        >
          <div className="flex flex-col gap-8">
            {personalGroups.map((g) => (
              <div key={g.pid}>
                <h3 className="mb-3 text-[11px] tracking-[0.2em] text-white/40 uppercase">
                  {g.label}
                </h3>
                {renderRows(g.projects)}
              </div>
            ))}
            {personalUngrouped.length > 0 && renderRows(personalUngrouped)}
          </div>
        </WorkSection>

        <WorkSection
          id="section-flagship"
          title="Flagship"
          count={flagship.length}
          open={openSections.has('Flagship')}
          onToggle={() => toggleSection('Flagship')}
        >
          {renderRows(flagship)}
        </WorkSection>

        <WorkSection
          id="section-hackathons"
          title="Hackathons"
          count={hackathon.length}
          open={openSections.has('Hackathons')}
          onToggle={() => toggleSection('Hackathons')}
        >
          {renderRows(hackathon)}
        </WorkSection>

        <WorkSection
          id="section-foundations"
          title="Foundations"
          open={openSections.has('Foundations')}
          onToggle={() => toggleSection('Foundations')}
        >
          <div className="flex flex-col gap-8">
            {DOMAINS.map((domain) => (
              <div key={domain.name}>
                <h3 className="mb-3 text-[11px] tracking-[0.2em] text-white/40 uppercase">
                  {domain.name}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {domain.skills.map((skill) => (
                    <SkillDisclosure key={skill.name} skill={skill} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </WorkSection>

        <WorkSection
          id="section-leadership"
          title="Leadership"
          count={LEADERSHIP.length}
          open={openSections.has('Leadership')}
          onToggle={() => toggleSection('Leadership')}
        >
          <ul className="flex flex-col gap-4">
            {LEADERSHIP.map((l) => (
              <li key={l.role + l.org} className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-sm font-medium text-white/80">{l.role}</span>
                <span className="text-xs text-white/40">{l.org}</span>
              </li>
            ))}
          </ul>
        </WorkSection>
      </div>
    </div>
  )
}
