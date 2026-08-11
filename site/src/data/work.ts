/* ============================================================================
 * work.ts — the projects shown on the Work page
 * ----------------------------------------------------------------------------
 * SEPARATE from `projects.ts` on purpose. `projects.ts` holds the THREE curated
 * cards the hero's Present frame renders (it maps over every entry, so adding a
 * fourth would silently break that layout, which is tuned to exactly three).
 * The Work page needs a richer shape — full write-ups, media, multiple links,
 * tags — and ALL of Melvin's projects, so the two lists live apart.
 *
 * TAGS are ids from the canonical registry in `tags.ts`, never free strings —
 * that is what lets search reliably group "everything that used React". Each
 * project spans three tag axes (discipline / tech / purpose).
 *
 * `category` is the SECTION a project sits in (flagship / hackathon / personal).
 * Note purpose is ALSO a tag (e.g. a personal project tagged 'domainExpansion'),
 * because a project's section and its purpose are related but not identical.
 *
 * `tentative: true` marks placeholder copy awaiting Melvin's real details; the
 * row still renders, just flagged. A link with `href: ''` renders dimmed and
 * non-clickable (same convention as profile.ts / projects.ts).
 * ========================================================================= */

import type { TagId } from './tags'

export type ProjectLink = { label: string; href: string }

export type WorkProject = {
  /** Stable key for React lists and search anchors. */
  id: string
  name: string
  /** Which section the project sits in. */
  category: 'flagship' | 'hackathon' | 'personal'
  /** Short status chip, e.g. 'In Progress' or 'Winner'. */
  status?: string
  /** One or two sentences shown at the top of the expanded row. */
  blurb: string
  /** Tags — ids from the registry, spanning discipline / tech / purpose. */
  tags: TagId[]
  role?: string
  /** Full write-up, one string per paragraph. */
  detail?: string[]
  // Hackathon-specific metadata.
  event?: string
  award?: string
  team?: string
  /** Repo / demo / devpost / live links. Empty href → dimmed placeholder. */
  links?: ProjectLink[]
  /** Paths under /public. Absent → a "coming" placeholder is shown. */
  media?: { images?: string[]; video?: string }
  /** True while the copy is a placeholder awaiting real details. */
  tentative?: boolean
}

export const WORK_PROJECTS: WorkProject[] = [
  {
    id: 'osiris',
    name: 'Osiris',
    category: 'flagship',
    status: 'In Progress',
    // PLACEHOLDER copy — real Osiris write-up to come from Melvin. Kept honest
    // and non-committal so it can be replaced wholesale without leaving claims
    // he didn't make.
    blurb:
      'A computer-vision system exploring touchless control through the V-JEPA family of self-supervised video models.',
    tags: ['cs', 'aiml', 'computerVision', 'vjepa', 'modelTraining', 'fineTuning', 'flagship'],
    role: 'Creator & Lead Developer',
    detail: [
      'Osiris is the flagship. It works in the V-JEPA (V-JEPA family) space of self-supervised video representation learning, with model training and fine-tuning at its core.',
      'Full write-up, architecture, and results to be added.',
    ],
    links: [
      { label: 'GitHub', href: '' }, // TODO: repo
      { label: 'Demo', href: '' }, // TODO: demo / video
    ],
    tentative: true,
  },
  {
    id: 'manas',
    name: 'Manas',
    // Manas is NOT a flagship (Melvin, 2026-08-11) — it is a domain-expansion
    // personal project (CS + Engineering + Astronomy), so it lives in Personal.
    category: 'personal',
    status: 'In Progress',
    // Corrected copy. The old Work page wrongly called Manas an "AGI simulation
    // engine"; it is a physics-accurate space simulator.
    blurb:
      'A desktop console for physically accurate space simulation, driven from a terminal. Every visual is computed from real physics, not animation.',
    tags: ['cs', 'engineering', 'astronomy', 'tauri', 'webgl', 'typescript', 'domainExpansion'],
    role: 'Creator & Lead Developer',
    detail: [
      'Manas is a terminal-driven desktop console for physically accurate space simulation. Nothing on screen is keyframed or faked; every visual is computed from real physics.',
      'A domain-expansion project — where computer science, engineering, and astronomy meet. Built for the IIT-M hackathon.',
    ],
    links: [
      { label: 'GitHub', href: '' }, // TODO: repo
    ],
  },
  {
    id: 'lingo',
    name: 'Lingo',
    category: 'hackathon',
    status: 'Winner',
    blurb:
      'An AI bridge for contextual communication, breaking down grammar, idioms, and cultural nuance so non-native speakers never get lost.',
    tags: ['cs', 'aiml', 'react', 'gemini', 'openrouter', 'fastapi', 'tailwind', 'hackathon'],
    event: 'SpartaHack 11',
    award: 'Winner — Roots and Renewal track',
    team: 'Alex Thebolt, William Dalian, Melvin',
    detail: [
      'Won the Roots and Renewal track at SpartaHack 11. Lingo helps non-native speakers with the parts of language a dictionary misses: grammar in context, idioms, and cultural nuance.',
    ],
    links: [
      { label: 'Devpost', href: '' }, // TODO: real Devpost link
      { label: 'GitHub', href: '' }, // TODO: repo
    ],
  },
  {
    id: 'eventsos',
    name: 'EventsOS',
    category: 'hackathon',
    status: 'Winner',
    blurb:
      'An operating-system concept for event management, handling everything from ticketing logic to real-time attendee tracking at large college events.',
    tags: ['cs', 'react', 'fastapi', 'realtime', 'hackathon'],
    event: 'GrizHacks — Oakland University',
    award: 'Winner',
    team: 'Melvin, Alex Thebolt, Chanuth Devnaka Jayatissa, Karthikeya Thota',
    detail: [
      'A comprehensive operating system conceptualized for event management: ticketing logic, live attendee tracking, and coordination across the full run of a large-scale college event.',
    ],
    links: [
      { label: 'Devpost', href: '' }, // TODO: real Devpost link
      { label: 'GitHub', href: '' }, // TODO: repo
    ],
  },
]

/** Section title shown for each category (also used to open the right section
 *  when a search result is clicked). */
export const CATEGORY_LABEL: Record<WorkProject['category'], string> = {
  flagship: 'Flagship',
  hackathon: 'Hackathons',
  personal: 'Personal',
}
