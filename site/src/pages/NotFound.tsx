/* ============================================================================
 * NotFound.tsx — the 404 page
 * ----------------------------------------------------------------------------
 * Before 2026-10-29 an unknown path (e.g. /resume) rendered an empty black
 * page with just the nav, which looks like the site is broken. Vercel rewrites
 * every path to index.html (site/vercel.json), so React Router is the only
 * thing that can say "nothing here"; this is the catch-all route in App.tsx.
 * ========================================================================= */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function NotFound() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 pt-32 pb-24 md:px-10">
      <p className="label">404</p>
      <h1 className="display-wide mt-4 font-display text-5xl leading-[0.95] font-bold tracking-tight text-white md:text-7xl">
        Nothing here.
      </h1>
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/65">
        That address doesn’t exist on this site. The résumé is at{' '}
        <a href="/resume.pdf" className="beyond-link" target="_blank" rel="noopener noreferrer">
          /resume.pdf
        </a>
        , and everything else is one click away.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="glass-cta rounded-full px-6 py-2.5 text-sm tracking-wide">
          Home
        </Link>
        <Link to="/work" className="glass-cta is-secondary rounded-full px-6 py-2.5 text-sm tracking-wide">
          See the work
        </Link>
      </div>
    </div>
  )
}
