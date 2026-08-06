/* ============================================================================
 * profile.ts — single source of truth for Melvin's contact + social links
 * ----------------------------------------------------------------------------
 * Both the hero and the Contact section link out to the same places, so the
 * URLs live here once and are imported wherever needed. Keeping them in one
 * file means a changed handle is a one-line edit, never a hunt across pages.
 *
 * `href: ''` marks a link Melvin hasn't supplied yet (X, Instagram). The UI
 * renders those as a dimmed, non-clickable icon rather than a broken link, so
 * the row is visually complete but nothing navigates nowhere. Fill the URL in
 * and it becomes a live link automatically.
 * ========================================================================= */

export const PROFILE = {
  /** Direct email. NOTE: confirm which address is canonical before production. */
  email: 'melvinchirag@gmail.com',
  /** Résumé lives in /public. Currently 404s until the real PDF is added. */
  resume: '/resume.pdf',
} as const

export type Social = { label: string; href: string }

/** Order here is the render order in the hero + contact icon rows. */
export const SOCIALS: Social[] = [
  { label: 'GitHub', href: 'https://github.com/melvinchirag' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/melvin-chirag-karupati-a34452380' },
  { label: 'X', href: '' }, // TODO: real X (Twitter) profile URL pending from Melvin
  { label: 'Instagram', href: '' }, // TODO: real Instagram profile URL pending from Melvin
]
