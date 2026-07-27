import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Loader } from './components/Loader'
import { Nav } from './components/Nav'
import { Chapter } from './pages/Chapter'
import { Home } from './pages/Home'
import { useLenis } from './hooks/useLenis'

/**
 * Routes use conventional names; the three-tenses concept lives in each page's
 * eyebrow instead. See docs/pages/home.md.
 */
function Shell() {
  useLenis()

  return (
    <>
      {/* No global background scene. Per the hero architecture, each page owns
          its own visual world. The sun cursor + nebula (astronomy concept) were
          parked 2026-07-27; the new abstract/editorial hero is TBD. */}
      <Nav />
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/about"
            element={
              <Chapter
                eyebrow="The past"
                title="About"
                blurb="Kuwait to India to Michigan — the milestone scrollytelling lands here."
              />
            }
          />
          <Route
            path="/work"
            element={
              <Chapter
                eyebrow="The present"
                title="Work"
                blurb="Manas as flagship, project cards, and the skills constellation land here."
              />
            }
          />
          <Route
            path="/vision"
            element={
              <Chapter
                eyebrow="The future"
                title="Vision"
                blurb="The scroll-assembled manifesto lands here."
              />
            }
          />
          <Route
            path="/contact"
            element={
              <Chapter
                eyebrow="Say hello"
                title="Contact"
                blurb="Email, socials, and résumé land here."
              />
            }
          />
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
