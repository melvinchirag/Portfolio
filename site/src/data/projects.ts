/* ============================================================================
 * projects.ts — the three featured projects on the hero's "Present" frame
 * ----------------------------------------------------------------------------
 * Kept as data (not hard-coded JSX) so the card layout stays uniform and the
 * same list can feed the Work page later. Each blurb is deliberately TWO
 * sentences (per the brief — never a single line).
 *
 * `tentative: true` flags copy/stack that is a placeholder direction, not
 * confirmed — Manas needs its real final scope, the hackathon slot needs its
 * real project. `href: ''` renders "Explore Project" as dimmed until a target
 * (repo / live demo) is supplied.
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
    name: 'Manas',
    blurb:
      'An astrophysics-inspired AI agent that turns dense scientific ideas into something you can question, probe, and explore. It pairs intelligent-system design with a genuine curiosity for how we come to understand the universe.',
    stack: ['AI Agents', 'Python', 'LLMs', 'Scientific Computing'],
    href: '', // TODO: repo / demo link
    tentative: true, // refine with Manas's actual final scope + stack
  },
  {
    name: 'This Portfolio',
    blurb:
      'A cinematic digital environment built to tell a technical story through motion, interaction, and intentional interface design. It runs as a real-time WebGL experience engineered from scratch — not a template.',
    stack: ['React', 'TypeScript', 'Three.js', 'React Three Fiber', 'WebGL / GLSL', 'GSAP'],
    href: '', // TODO: public repo link (if the source is to be shared)
  },
  {
    name: 'Hackathon Project',
    blurb:
      'A rapid prototype built under pressure to turn a real problem into a working experience. The final project, demo, and write-up are on the way.',
    stack: ['TBD'],
    href: '',
    tentative: true, // reserve for the strongest public hackathon project
  },
]
