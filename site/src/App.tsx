import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Loader } from './components/Loader'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { Cursor } from './components/Cursor'
import { PageTransition } from './components/PageTransition'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Work } from './pages/Work'
import { Vision } from './pages/Vision'
import { NotFound } from './pages/NotFound'
import { useLenis } from './hooks/useLenis'
import { GlobalScene } from './components/scene/GlobalScene'

/**
 * Routes use conventional names; the three-tenses concept lives in each page's
 * eyebrow instead. See docs/pages/home.md.
 */
function Shell() {
  useLenis()

  return (
    <>
      <GlobalScene />
      {/* No global background scene. Per the hero architecture, each page owns
          its own visual world. The sun cursor + nebula (astronomy concept) were
          parked 2026-07-27; the new abstract/editorial hero is TBD. */}
      <Nav />
      <main className="relative z-10">
        {/* PageTransition renders the routes against a location that lags the
            real one by one fade-out, so the old page leaves before the new one
            arrives. The footer is inside it so it fades with its page. */}
        <PageTransition>
          {(location) => (
            <>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/work" element={<Work />} />
                <Route path="/vision" element={<Vision />} />
                {/* Catch-all: Vercel rewrites every path here, so this is the 404. */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* Home ends in its own Contact section; every other page gets the footer. */}
              {location.pathname !== '/' && <Footer />}
            </>
          )}
        </PageTransition>
      </main>
      <div className="progressive-blur" />
      <Cursor />
      <Loader />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
