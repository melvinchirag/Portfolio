import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Loader } from './components/Loader'
import { Nav } from './components/Nav'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Work } from './pages/Work'
import { Vision } from './pages/Vision'
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/work" element={<Work />} />
          <Route path="/vision" element={<Vision />} />
        </Routes>
      </main>
      <div className="progressive-blur" />
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
