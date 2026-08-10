import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

/**
 * Conventional labels, deliberately. The audience is ~70% recruiter and a
 * recruiter hunting for projects cannot be expected to guess that "Now" means
 * work. The three-tenses concept lives in each page's eyebrow line instead.
 */
const pages = [
  { to: '/work', label: 'Work' },
  { to: '/vision', label: 'Vision' },
  { to: '/about', label: 'About' },
]

export function Nav() {
  const [, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      // Hide going down, return coming up — but never hide near the top, and
      // never while the mobile menu is open.
      setHidden(y > 140 && y > lastY.current && !menuOpen)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [menuOpen])

  return (
    <header
      className={`ease-out-expo fixed top-0 right-0 left-0 z-50 transition-transform duration-500 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Nearly frameless over the hero; the glass earns its background only
          once there is content behind it. */}
      <div className="ease-out-expo transition-all duration-500 border-b border-transparent bg-transparent">
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:h-20 md:px-10">
          {/* His name carries the site accent here as well as in the hero, so
              the one element that appears on every page reads as the same
              thing in both places. */}
          <NavLink
            to="/"
            className="text-accent ease-out-expo font-display text-lg tracking-tight transition-opacity duration-300 hover:opacity-75 md:text-xl"
          >
            Melvin Chirag
          </NavLink>

          <div className="flex items-center gap-1 md:gap-2">
            <div className="hidden items-center gap-1 md:flex">
              {pages.map((p) => (
                <NavLink
                  key={p.to}
                  to={p.to}
                  className={({ isActive }) =>
                    `ease-out-expo rounded-full px-4 py-2 text-sm tracking-wide transition-colors duration-300 ${
                      isActive ? 'text-accent' : 'text-accent/55 hover:text-accent/90'
                    }`
                  }
                >
                  {p.label}
                </NavLink>
              ))}
            </div>

            {/* NOTE: the nav Resume button was REMOVED (Melvin, 2026-08-07).
                There were two on screen at once, here and under his name in the
                hero, which made the page look unconsidered. The hero one is the
                keeper. Do not reinstate this without removing the other. */}

            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="ease-out-expo ml-1 flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={`ease-out-expo absolute left-0 block h-px w-4 bg-current transition-transform duration-300 ${
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`ease-out-expo absolute left-0 block h-px w-4 bg-current transition-transform duration-300 ${
                    menuOpen ? 'top-1.5 -rotate-45' : 'top-3'
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu.

          `inert` matters: collapsing with max-height leaves the links visually
          hidden but still in the tab order, so a keyboard user would tab
          through invisible links. */}
      <div
        inert={!menuOpen}
        className={`ease-out-expo overflow-hidden border-b border-white/[0.06] bg-[#06070d]/90 backdrop-blur-xl transition-[max-height,opacity] duration-500 md:hidden ${
          menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col px-6 py-2">
          {pages.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `py-3 text-base tracking-wide transition-colors ${
                  isActive ? 'text-accent' : 'text-accent/60'
                }`
              }
            >
              {p.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  )
}
