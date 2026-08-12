/* ============================================================================
 * tags.ts — THE canonical tag registry for the Work page
 * ----------------------------------------------------------------------------
 * Melvin's brief (2026-08-11): every project must draw its tags from ONE
 * designated set, not free-typed strings, so labels stay consistent across the
 * whole page and a search can reliably find "every project that used React".
 * This file is that single source of truth.
 *
 * Tags live on three AXES:
 *   - discipline — the field/genre: Computer Science, Engineering, Astronomy...
 *   - tech       — languages, frameworks, tools, techniques: React, WebGL...
 *   - purpose    — why it exists: Flagship, Hackathon, Domain Expansion...
 * A project references tags by id (e.g. 'react'); the type system then forbids
 * a tag that isn't registered here — that is what keeps the vocabulary closed.
 *
 * This registry is also the groundwork for two future features (see
 * docs/PAGE-PLAN.md): richer search, and eventually a small on-site AI model
 * trained on Melvin's data that can answer questions about his work.
 * ========================================================================= */

export type TagAxis = 'discipline' | 'tech' | 'purpose'

export type Tag = { label: string; axis: TagAxis }

/* The registry. Keys are the ids projects reference. `satisfies` keeps each
 * entry's literal `axis` type while still checking the whole shape, so
 * `TagId` below resolves to the exact union of keys. */
export const TAGS = {
  // ── discipline ────────────────────────────────────────────────────────────
  cs: { label: 'Computer Science', axis: 'discipline' },
  aiml: { label: 'AI & ML', axis: 'discipline' },
  engineering: { label: 'Engineering', axis: 'discipline' },
  astronomy: { label: 'Astronomy', axis: 'discipline' },

  // ── tech (languages · frameworks · tools · techniques) ─────────────────────
  python: { label: 'Python', axis: 'tech' },
  cpp: { label: 'C++', axis: 'tech' },
  java: { label: 'Java', axis: 'tech' },
  typescript: { label: 'TypeScript', axis: 'tech' },
  react: { label: 'React', axis: 'tech' },
  threejs: { label: 'Three.js', axis: 'tech' },
  webgl: { label: 'WebGL', axis: 'tech' },
  glsl: { label: 'GLSL', axis: 'tech' },
  gsap: { label: 'GSAP', axis: 'tech' },
  mongodb: { label: 'MongoDB', axis: 'tech' },
  tauri: { label: 'Tauri', axis: 'tech' },
  vite: { label: 'Vite', axis: 'tech' },
  fastapi: { label: 'FastAPI', axis: 'tech' },
  pytorch: { label: 'PyTorch', axis: 'tech' },
  gemini: { label: 'Gemini API', axis: 'tech' },
  openrouter: { label: 'OpenRouter', axis: 'tech' },
  tailwind: { label: 'Tailwind CSS', axis: 'tech' },
  realtime: { label: 'Real-time', axis: 'tech' },
  computerVision: { label: 'Computer Vision', axis: 'tech' },
  vjepa: { label: 'V-JEPA', axis: 'tech' },
  modelTraining: { label: 'Model Training', axis: 'tech' },
  fineTuning: { label: 'Fine-tuning', axis: 'tech' },

  // ── purpose ────────────────────────────────────────────────────────────────
  flagship: { label: 'Flagship', axis: 'purpose' },
  hackathon: { label: 'Hackathon', axis: 'purpose' },
  domainExpansion: { label: 'Domain Expansion', axis: 'purpose' },
  skillBuilding: { label: 'Skill Building', axis: 'purpose' },
  forFun: { label: 'For Fun', axis: 'purpose' },
} satisfies Record<string, Tag>

export type TagId = keyof typeof TAGS

/** Render order + display label for the axes (used wherever tags are grouped). */
export const AXIS_ORDER: TagAxis[] = ['discipline', 'tech', 'purpose']
export const AXIS_LABEL: Record<TagAxis, string> = {
  discipline: 'Discipline',
  tech: 'Tech',
  purpose: 'Purpose',
}

/** Resolve ids → tag objects, in registry-safe order (discipline, tech, purpose). */
export function tagsOf(ids: TagId[]): (Tag & { id: TagId })[] {
  return ids
    .map((id) => ({ id, ...TAGS[id] }))
    .sort((a, b) => AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis))
}

/** Group a project's tags by axis, e.g. for the expanded, labelled tag view. */
export function tagsByAxis(ids: TagId[]): Record<TagAxis, (Tag & { id: TagId })[]> {
  const out: Record<TagAxis, (Tag & { id: TagId })[]> = {
    discipline: [],
    tech: [],
    purpose: [],
  }
  for (const id of ids) out[TAGS[id].axis].push({ id, ...TAGS[id] })
  return out
}
