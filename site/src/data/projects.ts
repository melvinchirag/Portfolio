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
  /** A real picture under /public. Absent means the card has no picture box. */
  image?: string
  /** True while the copy/stack is a placeholder awaiting real details. */
  tentative?: boolean
}

// Order and choice approved by Melvin, 2026-11-26: Otto, ADE, Lingo, Manas.
export const PROJECTS: Project[] = [
  {
    name: 'Otto',
    blurb:
      'The system I run my work with. I talk to one command center, it sends jobs to AI sessions in the background, and anything risky comes back to me.',
    stack: ['Python', 'Textual', 'Claude', 'Markdown'],
    href: '/work',
    image: '/work/otto.svg',
  },
  {
    name: 'ADE',
    blurb:
      'A team of AI agents that live on your desktop as small 3D animals. You talk to one, it hands out the work, and a warden approves every action. Three prizes at Hack Dearborn 5.',
    stack: ['Electron', 'React', 'TypeScript', 'Three.js'],
    href: 'https://devpost.com/software/agentique-desktop-ecosystem',
    image: '/work/ade.svg',
  },
  {
    name: 'Lingo',
    blurb:
      'An AI layer between two people texting that explains idioms, grammar and cultural references. Won the Roots and Renewal track at SpartaHack 11.',
    stack: ['React', 'FastAPI', 'Gemini', 'OpenRouter'],
    href: 'https://devpost.com/software/culture-bridge',
    image: '/work/lingo.svg',
  },
  {
    name: 'Manas',
    blurb:
      'A desktop console that runs four real space simulations in one window, driven from a terminal. Every visual is computed from physics, not animated.',
    stack: ['TypeScript', 'WebGL2', 'GLSL', 'Tauri 2'],
    href: 'https://github.com/melvinchirag/Manas',
    image: '/work/manas.svg',
  },
]
