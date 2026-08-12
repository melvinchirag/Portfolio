/* ============================================================================
 * projects.ts — the three featured projects on the hero's "Present" frame
 * ----------------------------------------------------------------------------
 * Kept as data (not hard-coded JSX) so the card layout stays uniform and the
 * same list can feed the Work page later.
 *
 * BLURB LENGTH IS A HARD RULE (Melvin, 2026-08-11, after seeing the Present
 * frame overflow the viewport on his laptop and clip the tech stack off the
 * bottom): "the project card summary needs to only cover the important parts
 * and just give people the introduction... only in the detailed projects page
 * people can read what actually it was."
 *
 * So a card blurb is roughly 2 short sentences / ~180 characters, which wraps
 * to about 4 lines at the card widths this rail actually uses. It answers
 * "what is it, and why should I care" and stops. Anything longer — the
 * origin story, what it meant, the full stack rationale — belongs on the
 * project's own page, not here. Measured, not guessed: the Present glass box
 * was 774px tall against a 770px viewport before this trim, and the card
 * blurb block was the single biggest line item in it.
 *
 * Card ALIGNMENT (every card's tag row starting at the same Y) is handled at
 * runtime in HeroBeats.tsx's ProjectRail, NOT by a fixed height here — see
 * the comment there for why a hardcoded min-height was the wrong tool.
 *
 * `tentative: true` flags copy/stack that is a placeholder direction, not
 * confirmed. `href: ''` renders the card as non-clickable until a target
 * (repo / live demo) is supplied — see HeroBeats.tsx's ProjectRail.
 * ========================================================================= */

export type Project = {
  name: string
  blurb: string
  stack: string[]
  href: string
  /** True while the copy/stack is a placeholder awaiting real details. */
  tentative?: boolean
}

export const PROJECTS: Project[] = [
  {
    // Full rewrite, confirmed 2026-08-11: Manas is now a real, specific
    // project (a hackathon build), not a placeholder direction — `tentative`
    // dropped accordingly.
    name: 'Manas',
    blurb:
      'A desktop console that runs four real space simulations in one window, driven from a terminal. Every visual is computed from physics, not animated.',
    stack: ['TypeScript', 'WebGL2', 'GLSL', 'Tauri 2'],
    href: '', // TODO: repo / demo link
  },
  {
    name: 'Portfolio (Melvin Chirag)',
    blurb:
      'A cinematic space built to tell a technical story through motion and interface design. A real time WebGL experience I built from scratch, not a template.',
    stack: ['React', 'TypeScript', 'Three.js', 'React Three Fiber', 'WebGL / GLSL', 'GSAP'],
    href: '', // TODO: public repo link (if the source is to be shared)
  },
  {
    // Replaces the old "Hackathon Project / TBD" placeholder outright — this
    // is the real, won hackathon project.
    name: 'Lingo',
    blurb:
      'An AI bridge for contextual communication, breaking down grammar, idioms, and cultural nuance so non-native speakers never get lost. Won the Roots and Renewal track at SpartaHack 11.',
    stack: ['React Vite', 'OpenRouter', 'Gemini API', 'Tailwind CSS', 'Framer motion', 'FastAPI', 'Vercel v0'],
    href: '', // TODO: repo / demo link
  },
]
