/* ============================================================================
 * projects.ts — the three featured projects on the hero's "Present" frame
 * ----------------------------------------------------------------------------
 * Kept as data (not hard-coded JSX) so the card layout stays uniform and the
 * same list can feed the Work page later. Blurbs are no longer a strict
 * two-sentence rule (Manas and Lingo below both run longer, confirmed by
 * Melvin 2026-08-11 via the hero layout editor artifact) — card ALIGNMENT is
 * now handled by a fixed min-height in the card CSS (see .card-blurb in
 * index.css), not by capping how much anyone is allowed to say.
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
      'Manas is a desktop cosmic simulation console that aims to create physically accurate space simulations in one window in a terminal controlled environment. Every visual is computed from real physics equations, not animations. Built with TypeScript, WebGL2, and GLSL shaders. Created for the IIT-M hackathon.',
    stack: ['Tauri 2', 'WebGL2', 'React Vite', 'New', 'TypeScript'],
    href: '', // TODO: repo / demo link
  },
  {
    name: 'Portfolio (Melvin Chirag)',
    blurb:
      'A cinematic space built to tell a technical story through motion, interaction, and careful interface design. It runs as a real time WebGL experience I built from scratch, not a template.',
    stack: ['React', 'TypeScript', 'Three.js', 'React Three Fiber', 'WebGL / GLSL', 'GSAP'],
    href: '', // TODO: public repo link (if the source is to be shared)
  },
  {
    // Replaces the old "Hackathon Project / TBD" placeholder outright — this
    // is the real, won hackathon project. Blurb tightened from Melvin's
    // longer draft (2026-08-11: "keep the winning parts remove others if
    // needed") — kept what Lingo does and the SpartaHack win, cut the "my
    // first hackathon" framing and the built-with sentence (redundant with
    // the stack list right below it in the card).
    name: 'Lingo',
    blurb:
      "Lingo is an AI bridge for contextual communication. It breaks down grammar, idioms, and cultural nuance so non-native speakers never get lost in a conversation, and it won the Roots and Renewal track at SpartaHack 11.",
    stack: ['React Vite', 'OpenRouter', 'Gemini API', 'Tailwind CSS', 'Framer motion', 'FastAPI', 'Vercel v0'],
    href: '', // TODO: repo / demo link
  },
]
