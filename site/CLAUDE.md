# Portfolio — build rules

Full vision/plan: `../PORTFOLIO_VISION.md`. Read it before non-trivial work.

## What this is

Melvin's personal portfolio. Concept: **"a life in three tenses"** — Home,
Journey (past), Now (present), Ahead (future), Contact. A glowing **timeline
thread** motif persists across every page; scroll moves you along it.

## Art direction

- Dark only. Near-black base (`#06070d`), never pure black, no light mode.
- One accent gradient: ember `#ff6b35` → violet `#8b5cf6`. Used rarely — power
  through scarcity.
- Liquid glass for all UI chrome (`.liquid-glass` in `index.css`).
- Display face: General Sans (Melvin's pick, 2026-08-09, chosen against the
  eladiodieste.com reference — see index.css for the full note). Body: Inter,
  weight 300.
- Motion is slow, physical, inertial. Nothing bounces; everything glides.

## Hard rules

- **NEVER put a backtick inside a GLSL string.** Shaders are stored in JS
  template literals, which are delimited by backticks — a stray one inside
  (e.g. writing `` `prev` `` in a comment) closes the string early, throws a
  syntax error, and the ENTIRE script silently fails to run. Symptom: a totally
  blank page, which looks like a browser problem rather than a code problem.
  This has now bitten twice. Write `see prev`, not backticked names.
  **Before shipping any file with inline shaders, syntax-check it** — extract
  each `<script>`/module and run it through `new Function(src)`; a clean parse
  proves the backticks are balanced.
- **Custom GLSL for signature scenes** (hero, transitions, Ahead assembly).
  Never substitute a mesh/sprite scene or a stock video loop for these — the
  quality bar is raymarched/volumetric, not "web art". AI-generated stills may
  only feed a shader as source material, never ship as the final render.
- **Z-layer order**: scene `z-1` < content `z-10` < progressive blur `z-30` <
  nav `z-50`. Never put an opaque background on a layer above the scene, and
  never dim the hero with a flat dark overlay — use the progressive blur edge.
- **Premium tells** (design review checklist): generous space; one accent used
  rarely; one type family, few weights; one focal point per screen; one ask
  per page.
- **Three rounds per page**: structure → motion → polish. Never all at once.
- Content must be readable without any animation completing.
- `prefers-reduced-motion` honored; no-WebGL falls back to a pre-rendered frame
  sequence of the *same* scene, never a blank div.

## Comments and documentation

Melvin's requirement (2026-07-24): **he does not want to be in the dark about
any part of this codebase.** It is met in two places, deliberately split.

**In the code — every file gets:**
1. A header block: what this file is, why it exists, how it fits the system.
2. Inline comments wherever something is **non-obvious** — shader math, CSS
   mask tricks, WebGL setup, framerate-dependent maths, anything where the
   *why* isn't visible from the code.

Write for someone who can program but doesn't know this stack. Say what a thing
*is*, not just what it does: "useRef stores a value that survives re-renders
without causing one" beats "create a ref".

**Do NOT comment every line.** An earlier version of this rule demanded it; it
was tried, and it tripled file length while burying the logic that mattered
among explanations of imports and closing braces. Skip the obvious.

**In `docs/CODEBASE.md` — the deep explanation lives here**, not in the source.
Architecture, data flow, the stack from languages up, and per-file walkthroughs
with background on the concepts. It is the learning material; the code carries
only what a maintainer needs at the point of reading.

**When you change code, update `docs/CODEBASE.md` in the same pass**, and
republish its artifact. A stale explanation is worse than none.

## Stack

Vite + React + TypeScript · Tailwind v4 · Three.js via React Three Fiber + drei
· custom GLSL · GSAP ScrollTrigger + Lenis · React Router · Vercel.

Lenis config is tuned (duration 1.2, exponential decay, desktop only) — don't
change it casually. Scroll-scrubbed video must use the `!video.seeking` guard.

## Quality gates

60fps mid-range desktop GPU · adaptive quality tiers · real scenes on mobile,
tuned down · Lighthouse perf ≥85 mobile, a11y ≥95, SEO ≥95.
