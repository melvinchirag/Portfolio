/* ============================================================================
 * skills.ts — the "Foundations" section: core-CS work, by domain, by skill
 * ----------------------------------------------------------------------------
 * Melvin's brief (2026-08-11): Foundations is a system he FILLS as he builds.
 * Each skill is listed now; the per-skill write-up ("what I did with Python for
 * data structures", + repo links) comes later. So a skill with no write-up yet
 * renders as a plain static token (see SkillDisclosure) and only becomes
 * expandable once its `writeup`/`repos` are added here — no hollow "coming"
 * panels in the meantime.
 *
 * The list is drawn from the tech Melvin actually uses across his projects
 * (work.ts) and this site's own stack; it is not a wishlist. To activate a
 * skill's expander, add a `writeup` (one string per paragraph) and/or `repos`.
 * ========================================================================= */

export type SkillRepo = { label: string; href: string }

export type Skill = {
  name: string
  /** What he did with it, one string per paragraph. Add to enable the expander. */
  writeup?: string[]
  repos?: SkillRepo[]
}

export type SkillDomain = {
  name: string
  skills: Skill[]
}

// Shorthand for a skill whose write-up is still to be added.
const s = (name: string): Skill => ({ name })

export const DOMAINS: SkillDomain[] = [
  {
    name: 'Languages',
    skills: [s('Python'), s('Java'), s('C++'), s('TypeScript'), s('JavaScript')],
  },
  {
    name: 'AI & ML',
    skills: [
      s('PyTorch'),
      s('Computer Vision'),
      s('V-JEPA'),
      s('Model Training'),
      s('Fine-tuning'),
    ],
  },
  {
    name: 'Web & Graphics',
    skills: [s('React'), s('Three.js'), s('WebGL / GLSL'), s('GSAP'), s('Tailwind CSS')],
  },
  {
    name: 'Backend & Tools',
    skills: [s('FastAPI'), s('Tauri'), s('Vite'), s('Git'), s('Vercel')],
  },
]
