# Portfolio — the Master Key

> **This README is the project's master key.** It is a **living document** that
> grows as the site is built and is **finalized at the very end of the project**.
> Its goal is twofold:
>
> 1. **Rebuildable** — detailed enough that following it, you could recreate a
>    site that looks and behaves the same from an empty folder.
> 2. **A learning doc** — structured so that reading it teaches you *what* we
>    used, *why*, and *how each piece works*.
>
> Sections marked **🚧 (completed at project end)** are scaffolds to fill in as
> features land — don't treat their current emptiness as final.

Melvin Karupati's personal portfolio. A Computer Science student's site that
reads as wide-ranging craft, not any single field. Concept spine: **"a life in
three tenses"** (past / present / future).

For planning/decisions/context, see `AGENTS.md` (AI entry point) and `CONTEXT.md`
(living decision log). This README is the *technical* master key.

---

## 1. The stack at a glance

Every tool, the layer it serves, and **why it's here** (not just what it is).

| Layer | Tool (version) | What it does | Why this one |
|---|---|---|---|
| Language | **TypeScript** `~6.0` | Typed JavaScript | Catches errors before runtime; self-documenting for a codebase Melvin edits himself |
| UI library | **React** `19.2` | Component-based UI | Industry standard; huge ecosystem; R3F is built on it |
| Build tool / dev server | **Vite** `8.1` | Bundler + instant hot-reload dev server | Fast HMR, near-zero config, first-class TS/React |
| Styling | **Tailwind CSS** `4.3` (via `@tailwindcss/vite`) | Utility-first CSS in markup | Fast, consistent spacing/scale; v4 is CSS-config, no JS config file |
| 3D / WebGL | **Three.js** `0.185` | WebGL rendering engine | The standard for web 3D; powers all custom scenes |
| 3D in React | **@react-three/fiber** `9.6` | React renderer for Three.js | Write 3D as React components instead of imperative Three.js |
| 3D helpers | **@react-three/drei** `10.7` | Ready-made R3F helpers (cameras, loaders) | Saves reimplementing common 3D plumbing |
| Post-processing | **@react-three/postprocessing** `3.0` + **postprocessing** `6.39` | Bloom, vignette, chromatic aberration | The "filmic finish" that makes CGI read as CGI, not web-art |
| Scroll animation | **GSAP** `3.15` (ScrollTrigger) | Scroll-scrubbed, pinned timelines | Best-in-class for the scrollytelling hero; better than Framer Motion for scrubbing |
| Smooth scroll | **Lenis** `1.3` | Inertial smooth-scroll | Gives the "weight"/glide feel; tuned in `useLenis.ts` (don't change casually) |
| Routing | **react-router-dom** `7.18` | Client-side routes (`/about` etc.) | Standard SPA routing |
| Linter | **oxlint** `1.71` | Fast Rust-based linter | Catches issues; must exit 0 before shipping |
| Hosting | **Vercel** | Deploy target | Zero-config for Vite; preview URLs per push |

**Custom GLSL** (shader language) is written by hand for signature scenes —
stored in JS template literals (see the hard rule about backticks in `site/CLAUDE.md`).

## 2. Project structure

```
Portfolio/
├── README.md            ← THIS master key
├── AGENTS.md            ← entry point any AI reads first (tool-agnostic brief)
├── GEMINI.md            ← thin pointer → AGENTS.md + CONTEXT.md
├── CONTEXT.md           ← living decision log + current state (top = authoritative)
├── PORTFOLIO_VISION.md  ← full vision + reference-driven process
├── .gitignore           ← keeps node_modules/dist/secrets out of git
│
├── docs/                ← the shared knowledge base
│   ├── references.md    ← reference sites, compartmentalized by their differences
│   ├── artifacts.md     ← index of every prototype/artifact + what each is for
│   ├── concepts.md      ← approved visual concepts, reserved per page
│   ├── CODEBASE.md      ← how the code works (deeper learning doc)
│   ├── LLM-INDEPENDENCE.md ← multi-tool workflow plan
│   └── pages/home.md    ← the Home/hero spec
│
├── parked/              ← cut-but-kept concepts (safe, not deleted)
│   └── hero-nebula/     ← astronomy hero + sun cursor + 5 nebula images + README
│
└── site/                ← THE ACTUAL WEBSITE (the app you run/build)
    ├── README.md        ← dev-setup notes (Vite boilerplate)
    ├── CLAUDE.md        ← hard build rules for coding
    ├── package.json     ← dependencies + npm scripts
    ├── vite.config.ts   ← Vite + React + Tailwind plugin wiring
    ├── tsconfig*.json   ← TypeScript config
    ├── .oxlintrc.json   ← linter config
    ├── index.html       ← single HTML entry point
    ├── public/          ← static assets served as-is (favicon, etc.)
    └── src/
        ├── main.tsx     ← boots React into index.html
        ├── App.tsx      ← routes: / /about /work /vision /contact
        ├── index.css    ← design tokens, .liquid-glass recipe, cursor, reveals
        ├── components/  ← Loader, Nav, RevealText, SceneCanvas, …
        │   └── scene/   ← WebGL scene pieces (shaders, fields)
        ├── hooks/       ← useLenis, useQualityTier, usePrefersReducedMotion, …
        └── pages/       ← Home.tsx (hero) + Chapter.tsx (placeholder pages)
```

**The key distinction:** everything *outside* `site/` is planning/knowledge
(markdown). Everything *inside* `site/` is the real website code.

## 3. How each part of the site is built  🚧 (grows per feature)

A per-feature breakdown: what technique + which tools built it. Fill a row when
a feature is done and approved into `site/`.

| Feature | Built with | Technique / how it works | Source file(s) |
|---|---|---|---|
| Loading sequence | Raw WebGL + Three.js | Neuron cell-bodies igniting, dendrites growing/connecting as a volumetric point-cloud with multi-pass bloom, 3D camera push-through. Once per tab session, skippable. | `site/src/components/Loader.tsx` |
| Smooth scroll | Lenis | Inertial scroll (duration 1.2, exponential decay, desktop only) | `site/src/hooks/useLenis.ts` |
| Liquid-glass UI (base recipe) | CSS | Blur + inset highlight + gradient-mask border | `site/src/index.css` (`.liquid-glass`) |
| **Hero particle mask** | React Three Fiber + Three.js `GPUComputationRenderer` + `MeshSurfaceSampler` + `three-mesh-bvh` (all MIT) + custom GLSL | 1.4M-particle-scale GPGPU sim scattered on a real 3D face mesh (CC BY 4.0 model), spring-held + cursor-repelled; brightness = particle velocity; drag to rotate 360°. A subset of particles render as glyphs (binary/Telugu/hex, cycling) in roving "hotspot" patches. Clean-room rebuild of a studied technique — see `docs/particle-mask-technique.md`. | `site/src/components/scene/MaskField.tsx` |
| **Hero liquid-glass info tabs** | React Three Fiber + a hand-ported WebGL2 shader (MIT-licensed technique reference) | Real glass: a full-screen shader captures the 3D scene, Gaussian-blurs it in 2 passes, then renders SDF rounded-rects (merged with a metaball blend across up to 10 shapes) with true Snell's-law refraction, RGB chromatic dispersion, Fresnel, and angular glare. The shapes track real DOM elements' `getBoundingClientRect()` every frame, so the WebGL glass sits exactly under the DOM tab/panel text. Ported from `iyinchao/liquid-glass-studio` (MIT) — see `docs/references.md` and `docs/particle-mask-technique.md`-style teardown in `CONTEXT.md`. **Known issue:** still reads as flat/disappointing because the scene behind it is mostly black — the shader has nothing colourful to refract yet (fix = the deep-space background, not more shader work). An earlier CSS/SVG-filter attempt (`GlassFilterDefs.tsx`, class `.uses-glass-distort`) is superseded dead code, left on disk but unmounted. | `site/src/components/scene/LiquidGlassField.tsx`, `site/src/components/HeroInfoTabs.tsx`, `.glass-panel`/`.glass-tab`/`.sync-glass-rect` in `site/src/index.css` |
| Hero — scrollytelling | ✅ 5-beat sticky scroll track; beat 1 is real (mask/name/glass), beats 2-5 are placeholders awaiting their own concepts | One shared `heroScroll` store (progress/beat/beatProgress) is the only thing scroll writes to; the mask and glass never read or write scroll state directly, so scroll changes can't break them | `site/src/hooks/heroScroll.ts`, `site/src/components/HeroBeats.tsx`, `site/src/pages/Home.tsx` |
| About / Work / Vision / Contact | _each its own concept_ | 🚧 | `site/src/pages/…` |
| Résumé | _"coolest way to display a resume"_ | 🚧 | 🚧 |

## 4. Run, build, deploy

```bash
cd site
npm install          # install dependencies (first time)
npm run dev          # dev server with hot-reload (http://localhost:5173 or next free port)
npx tsc --noEmit     # typecheck — must be clean
npx oxlint           # lint — must exit 0
npm run build        # production build (tsc -b && vite build) → site/dist
npm run preview      # serve the production build locally
```

Deploy: push to GitHub → Vercel builds `site/` and serves `dist/`. 🚧 (exact
Vercel project settings documented at project end.)

## 5. Rebuild from scratch  🚧 (completed at project end)

Step-by-step to recreate this site from an empty folder — scaffold below,
fleshed out once the build is final so it's genuinely followable end-to-end.

1. `npm create vite@latest site -- --template react-ts`
2. Add Tailwind v4: install `tailwindcss @tailwindcss/vite`, wire the plugin in
   `vite.config.ts`, import Tailwind in `index.css`.
3. Add libraries: `three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing gsap lenis react-router-dom`.
4. Set up routing in `App.tsx`; smooth scroll in a `useLenis` hook.
5. 🚧 …the hero, each page's concept, the résumé treatment (documented as built).

## 6. Concepts & techniques — learning notes  🚧 (grows as we build)

The *why it works* explanations, written for someone who can program but is new
to this stack. The deep versions live in `docs/CODEBASE.md`; this section is the
index + the highlights.

- **Why CGI reads as CGI** — volumetric mass (soft overlapping sprites, never
  wireframe) + real multi-pass bloom + real 3D with a moving camera + atmosphere
  + filmic finish (tone-mapping, chromatic aberration, vignette, grain). See the
  loader.
- **Representational vs. abstract art in code** — abstract generative motion
  (fields, particles, fluid) is code's home turf; a real face/photograph needs
  real tools (photo/3D/AI image), not procedural noise. (Lesson learned twice —
  once on a face made of particles, again trying to turn a 2D photo into a "3D
  mask". Both failed for the same reason: no real geometry, no real result.)
- **GPGPU particles on a 3D surface** — sample thousands of points across a
  mesh (`MeshSurfaceSampler`), store them as pixels in a texture, then let the
  GPU simulate physics on that texture every frame (`GPUComputationRenderer`):
  a spring pulls each particle back "home", the cursor repels nearby ones.
  Render as `THREE.Points` whose *brightness* = each particle's velocity, so
  motion is what makes the shape glow — stillness fades to near-invisible.
  Full walkthrough: `docs/particle-mask-technique.md`.
- **Motion is what sells "liquid"** — a static blur/distortion reads as a
  textured surface, not fluid; matter has to visibly move. The hero's glass
  panels only started reading as liquid once the SVG distortion noise was
  animated (`requestAnimationFrame` nudging a `feOffset`) and a highlight was
  made to travel around the edge, instead of everything sitting frozen.
- 🚧 Scroll-scrubbed timelines (GSAP ScrollTrigger) · quality tiers — added as
  each is used.

---

**Status:** 🚧 In progress. This master key is finalized — every section
completed, every 🚧 resolved — as the last step before the project is called done.
