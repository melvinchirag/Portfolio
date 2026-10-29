/* ============================================================================
 * Footer.tsx — the site footer on every page except Home
 * ----------------------------------------------------------------------------
 * Home ends in the Contact section, which already carries every link, so the
 * footer would be a duplicate there (App.tsx skips it on "/"). On Work, Vision
 * and About there was previously NO way to reach the résumé or the contact
 * form at all (flagged in CONTEXT.md's "Resume reachability" note); this is
 * the fix. One row, mono labels, no decoration.
 * ========================================================================= */

import { Link } from 'react-router-dom'
import { PROFILE, SOCIALS } from '../data/profile'

export function Footer() {
  const link =
    'ease-out-expo text-sand-dim transition-colors duration-300 hover:text-sand focus-visible:text-sand focus-visible:outline-none'

  return (
    <footer className="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-4 border-t border-line px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
      <div className="label flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sand">Melvin Chirag Karupati</span>
        <a href={`mailto:${PROFILE.email}`} className={link}>
          {PROFILE.email}
        </a>
      </div>
      <nav aria-label="Footer" className="label flex flex-wrap items-center gap-x-5 gap-y-2">
        {SOCIALS.filter((s) => s.href).map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={link}>
            {s.label}
          </a>
        ))}
        <a href={PROFILE.resume} target="_blank" rel="noopener noreferrer" className={link}>
          Résumé ↗
        </a>
        <Link to="/#contact" className={link}>
          Contact
        </Link>
      </nav>
    </footer>
  )
}
