import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

/**
 * Conventional labels, deliberately. The audience is ~70% recruiter and a
 * recruiter hunting for projects cannot be expected to guess that "Now" means
 * work. The three-tenses concept lives in each page's eyebrow line instead.
 *
 * 2026-10-29 (block 5): links are mono labels with a hairline that draws in
 * (`.nav-link`, index.css), the same treatment as the hero's meta links, so
 * the nav and the hero read as one system. The bar is frameless over the top
 * of a page and gains a graphite tint plus a hairline once there is content
 * behind it. No blur: a solid tint is the honest version of "a bar over the
 * page"; the glass look is what Melvin called cheap.
 */
const pages = [
  { to: '/work', label: 'Work' },
  { to: '/vision', label: 'Vision' },
  { to: '/about', label: 'About' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
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
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [menuOpen])

  const tinted = scrolled || menuOpen

  return (
    <header
      className={`ease-out-expo fixed top-0 right-0 left-0 z-50 transition-transform duration-500 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div
        className={`ease-out-expo border-b transition-[background-color,border-color] duration-500 ${
          tinted ? 'border-line bg-void/90' : 'border-transparent bg-transparent'
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:h-20 md:px-10">
          {/* The name, in the display cut, is the one element on every page
              that is unmistakably the same object as the hero title. */}
          <NavLink
            to="/"
            className="ease-out-expo display-wide font-display text-[15px] font-bold tracking-tight text-sand uppercase transition-opacity duration-300 hover:opacity-70 md:text-base"
          >
            Melvin Chirag
          </NavLink>

          <div className="flex items-center gap-1 md:gap-2">
            <div className="hidden items-center gap-7 md:flex">
              {pages.map((p) => (
                <NavLink
                  key={p.to}
                  to={p.to}
                  className={({ isActive }) => `nav-link label ${isActive ? 'is-active' : ''}`}
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
              className="ease-out-expo ml-1 flex h-9 w-9 items-center justify-center rounded-full text-sand-dim transition-colors hover:text-sand md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={`ease-out-expo absolute left-0 block h-px w-4 bg-current transition-transform duration-500 ${
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`ease-out-expo absolute left-0 block h-px w-4 bg-current transition-transform duration-500 ${
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
        className={`ease-out-expo overflow-hidden border-b border-line bg-void/95 transition-[max-height,opacity] duration-500 md:hidden ${
          menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col px-6 py-3">
          {pages.map((p, i) => (
            <NavLink
              key={p.to}
              to={p.to}
              onClick={() => setMenuOpen(false)}
              // Each link slides up a beat after the one above it when the
              // menu opens; collapsed, they sit low and faded, ready to rise.
              style={{ transitionDelay: menuOpen ? `${80 + i * 60}ms` : '0ms' }}
              className={({ isActive }) =>
                `ease-out-expo display-wide py-3 font-display text-2xl font-bold tracking-tight uppercase transition-[opacity,transform,color] duration-500 ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                } ${isActive ? 'text-sand' : 'text-sand-dim'}`
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
