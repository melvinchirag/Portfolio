# CONTEXT — Portfolio project handoff

Last updated: 2026-07-26 · Owner: Melvin
Read this first in any new session — **especially the "Current state" section
below, which was just rewritten and supersedes older material further down
this same file.** Companion docs: `PORTFOLIO_VISION.md` (full spec),
`site/CLAUDE.md` (build rules the coding agent must follow), `docs/concepts.md`
(**approved visual concepts + which page each is reserved for**),
`docs/references.md`, `docs/pages/home.md`, `docs/CODEBASE.md` (learning doc —
how the code works, and code-vs-assets guidance; **not yet updated for the
2026-07-26 nebula rebuild — do that before trusting it on this topic**).

---

## ✅ Working directory issue — RESOLVED 2026-07-24

**Original problem (2026-07-23):** this project's conversation was started
from `C:\Users\mkarupat\Desktop\Manas` (a *different*, unrelated project — the
Manas simulation engine). The portfolio lives in
`C:\Users\mkarupat\Desktop\Portfolio`.

Because the session was anchored to the wrong folder, anything that resolves
paths *relative to the working directory* reached into Manas instead of
Portfolio. Two visible symptoms:

1. Claude Code's internal memory/session files were stored under a path named
   after Manas (`.claude/projects/C--Users-mkarupat-Desktop-Manas/...`) — this
   is hidden bookkeeping, not files in the Manas project folder.
2. **The dev-server preview launched the Manas engine instead of the portfolio.**
   The preview tool searched for a launch config relative to the working
   directory, found Manas's, and started Manas's dev server on port 5199.

**What was NOT affected:** no Manas files were created, modified, or deleted.
Verified via `git status` — the Manas repo sat at the same commit
(`f983504`) with only the pre-existing untracked `galaxy_sim.py`. The Manas dev
server was only *run* (read-only) and was stopped.

**Resolution:** Melvin ended that session and started a fresh one anchored at
`C:\Users\mkarupat\Desktop\Portfolio` (the project root, one level above
`site`). Confirmed working directory now resolves inside the Portfolio
project, not Manas.

**One nuance carried forward:** the new session's root is `Portfolio`, not
`Portfolio\site`. `site/.claude/launch.json` (the dev-server config, port
5173) lives one level down, so a preview/launch tool that only looks for
`.claude/launch.json` in the exact working directory won't find it from the
Portfolio root. Either `cd site` before running `npm run dev` / starting a
preview, or point the preview tool explicitly at `site`. This is a minor
path-depth detail, not a repeat of the original wrong-project bug.

**⚠️ Still true — verify before building further:** as of the last session the
site had *never been visually confirmed by a human*. See "Verification
status" below for exactly what has and hasn't been checked, and why the agent
could not confirm the visual itself.

---

## Who Melvin is

Captured 2026-07-24, in his own framing. This is the raw material for every
page's content — draw from here before inventing anything.

**Studies.** Computer science student at Eastern Michigan University (EMU).
Transferred in Fall 2025 from Henry Ford College. Fall '25 was a hard first
semester at EMU; he is doing markedly better now. Several projects lined up.

**Where he's from.** Raised in Kuwait. Spent his junior and senior years of
high school in India. Then Michigan for university. Three countries — this is
the spine of the About (past) page.

**Leadership, current.** Treasurer, Google Developer Group at EMU · member of
the AI Club · leading finance for EMU's own hackathon. Aiming to become Vice
President of both GDG and the AI Club.

**Interests, in his ordering.** Computer science, AI/ML especially ·
filmmaking & storytelling · astronomy & physics, astrophysics especially ·
neuro-tech (tech + neuroscience) · robotics · aerospace, mostly interstellar
and space travel · mathematics · engineering (general knowledge, not deep).

**Trajectory.** Contributions are concentrated in CS today; he explicitly
plans to expand into the other fields promptly.

**Why this matters to the design:** the breadth *is* the story, and it maps
onto the three-tenses concept almost too neatly.

- **Past** — Kuwait → India → Michigan. A genuine three-act structure, already
  written by his life; the About page doesn't need inventing.
- **Present** — CS/AI, GDG treasurer, AI Club, hackathon finance. Concrete,
  verifiable, recruiter-legible.
- **Future** — the fields he hasn't reached yet: astrophysics, neurotech,
  interstellar travel. The Vision page has real content, not aspirational filler.

One more consequence: **filmmaking and storytelling are stated interests of
his**, which means a cinematic, scroll-directed site is self-expression rather
than decoration. That's the honest defense of this site's whole approach — use
it when the cinematic layer needs justifying.

---

## The project

**Concept: "A life in three tenses."** A personal world organized around time:
who Melvin was, is, and is becoming. A glowing **timeline thread** motif
persists across every page; scroll moves you along it.

**Audience — decided 2026-07-24: ~70% recruiter, 30% personal identity.**
Anyone landing here, recruiter or not, must be able to navigate easily and
find the work. The personality is expressed through *craft* — animation, 3D,
and nuanced eccentricities — never by making a visitor work for the content.
(Earlier drafts of the vision said "not a resume site"; that framing is
superseded. It is a recruiter-navigable site with a strong personal voice.)

**Five pages:**

| Page | Tense | What it holds |
|---|---|---|
| Home | — | Cinematic volumetric hero, identity statement, three chapter portals |
| Journey | Past | Scrollytelling through 6–10 milestone scenes |
| Now | Present | Manas as flagship case study, project cards, 3D skills constellation |
| Ahead | Future | Manifesto that assembles from particle chaos as you scroll |
| Contact | — | Email, socials, resume; thread loops back to Home |

**Tone:** authentic first, cinematic second. Dark theme only, liquid glass UI
(lineage from the Manas shell), real content — no generic "passionate
developer" copy.

**Quality bar:** the Manas raymarched/volumetric work. Explicitly *not* flat
mesh-and-sprite "web art". Custom GLSL for signature scenes.

---

## Decisions made

| Decision | Choice | Notes |
|---|---|---|
| Structure | Multi-page (5 routes) | Chosen over one-page scroll |
| **Audience** | **70% recruiter / 30% identity** | 2026-07-24. Easy navigation for everyone; personality lives in craft, not in friction. Supersedes "not a resume site" |
| **Nav labels** | **Conventional** — Home · About · Work · Vision · Contact | 2026-07-24. A recruiter hunting for projects cannot be expected to guess that "Now" means work. Routes should follow: `/about`, `/work`, `/vision`, `/contact` |
| **Three-tenses concept** | Lives in content, not nav | Carried by each page's eyebrow ("the past" / "the present" / "the future"), the timeline thread, and oversized year numerals on About. `Chapter.tsx` already has an `eyebrow` prop |
| **Résumé placement** | Persistent nav button, styled as the site's one accent use | 2026-07-24. Satisfies the "one accent, used rarely" premium tell *and* gives the top recruiter action the most privileged element on every page. Repeats in the Home footer and on Contact — but nothing else gets the accent |
| **Portrait treatment** | **Triptych** — one face in three regions: neural network / nebulae / cinematic film, dissipating on scroll | 2026-07-24. Explicitly **not** three separate animations and not a blend — three visual languages composing a single face, making "the breadth is the story" literal. Photo feeds a GPU particle system as shader source only. See `docs/pages/home.md` |
| Aesthetic | Dark, scrollytelling + 3D, liquid glass | Melvin's call |
| Visual approach | **Hybrid** | Custom shaders for signature scenes; AI-generated stills only as *shader source material*, never final output; scroll-scrubbed video only for secondary content |
| Stack | Vite + React + TS + Tailwind v4 + R3F + GSAP/Lenis + Vercel | See below |
| Sequencing | Build started before references collected | Melvin said "let's get cracking" — agent over-read this as license to also make aesthetic decisions (palette/type/shader look) that should have waited for references. Infrastructure is real; the look is placeholder — see callout above. |

### Stack — and why (this was questioned twice)

Vite + React + TypeScript · Tailwind CSS v4 · Three.js via React Three Fiber +
drei · custom GLSL · GSAP ScrollTrigger + Lenis · React Router · Vercel.

Melvin was unsure these were the right tools. What settled it: **three
independent sources converged on React + Vite + TypeScript** (Promptible's
Replit guide, Janus Tiu's cinematic guide, and our own reasoning), **two added
Tailwind**, and Promptible independently picked **Lenis**. It's also the
toolkit behind most award-tier interactive sites (Awwwards SOTD work, studios
like Active Theory/Resn). R3F is Three.js, not a different engine.

**GSAP ScrollTrigger chosen over Framer Motion** (which Promptible used):
Framer Motion is better at component enter/exit; ScrollTrigger is better at
scroll-scrubbed timelines pinned to sections — the core mechanic of Journey
and Ahead. Framer Motion can be added later for UI micro-interactions.

---

## Resources reviewed (5 total)

Melvin supplied Instagram-sourced guides. All were read in full and distilled
into `PORTFOLIO_VISION.md` Part 3. Summary of what was taken:

**Process rules adopted:**
- **Reference before build** — 5–8 curated references, each with a named job
  (mood / brand system / hero hook / structure / micro-detail). Skipping this
  is why AI-built sites look generic. *(Luke's PDF)*
- **Three rounds, not one prompt** — structure → motion → polish. *(Luke)*
- **Screenshot self-correction loop** — screenshot result, compare to
  reference, list differences, fix, repeat. *(Cindy Zhu)*
- **Show, don't describe** — feed real reference images/sites, not adjectives.
  *(Promptible)*
- **Import solved problems** — remix components from registries like 21st.dev,
  restyled to our system, never pasted as-is. *(Luke)*
- **Project CLAUDE.md** — encode art direction so every session starts
  opinionated. *(Luke)* — **done**, at `site/CLAUDE.md`.

**Techniques adopted:**
- Scroll-scrubbed video with the `!video.seeking` guard — prevents black frames
  and stutter. *(Promptible)*
- Lenis config: duration 1.2, exponential-decay easing, desktop only.
  *(Promptible)* — **implemented** in `src/hooks/useLenis.ts`.
- Progressive blur edge instead of a flat dark overlay. *(Promptible)* —
  **implemented** in `index.css`.
- Z-layer discipline: scene z-1 < content z-10 < blur z-30 < nav z-50.
  *(Promptible)* — **implemented**.
- `.liquid-glass` CSS recipe (blur + inset highlight + gradient-mask border).
  *(Janus Tiu)* — **implemented** and extended in `index.css`.
- Frame-sequence WebP scrub as the **no-WebGL/mobile fallback** so weak devices
  get a pre-rendered version of the *same* scene, never a blank div.
  *(Castimedia)* — planned, not built.

**"Premium tells" checklist** (the 50ms test — use in every design review):
generous space · one accent used rarely · one type family, few weights · one
focal point per screen · one ask per page. *(Luke)*

**Deliberately NOT adopted:** the tool stacks these guides push — Replit,
Google Antigravity, Higgsfield/Kling subscriptions. Their value was technique
and process, not toolchain.

---

## ⚠️ Current visual choices are PLACEHOLDER — not decisions

The scaffold below includes real code for routing, glass-CSS mechanics, and
scroll wiring — that part is legitimate infrastructure. But the *look* it
currently has was written by the agent before Melvin's reference folder
existed, which skips the process this whole project is built around (see
"Reference before build" below). Specifically placeholder, not chosen:

- **Palette**: ember `#ff6b35` → violet `#8b5cf6`
- **Typography**: Instrument Serif + Inter
- **Shader concept**: the drifting fBm volumetric field + glowing "thread" look
  in `SceneCanvas.tsx`

**How this gets resolved:** no separate rework phase, no ceremony — Melvin is
building the reference folder now, and as references come in, the palette,
type, and shader concept get replaced iteratively in normal course, the same
way any other feature would change. Don't treat the current look as a baseline
to preserve or protect. Don't cite "it's already built this way" as a reason to
keep something once real references arrive.

---

## Current state — 2026-07-27. Nebula CUT and parked. Hero direction reset to abstract/editorial.

**This section supersedes everything below it, including the 2026-07-26 nebula
section, which is now history.**

### ❌ The real-nebula hero was rejected — wrong *signal*, not bad craft (2026-07-27)

Melvin's words: the nebula hero *"looks like it was made for someone in
Astronomy. I'm a CS major and recruiters need to know that when they open the
website."* The build quality was fine and he liked it; it was cut because it
points the whole site at one field — the wrong one.

**The fix is NOT the opposite cliché.** Explicitly: *"That doesn't mean we need
neural nets or binary instead of nebulae."* The Hero should take an **abstract,
editorial, "insane" direction that does NOT point at any single field.** The
breadth is the story; the hero shouldn't collapse it to "space guy" or "AI guy."

**What was done:**
- `NebulaField.tsx`, `SunCursor.tsx`, and `public/nebula/*` (5 images) were
  **MOVED to `Portfolio/parked/hero-nebula/`** (outside `site`, so not built /
  linted / served). **Parked, NOT deleted** — Melvin: *"keep it safe so we can
  use it later if needed."* Revival steps are in that folder's `README.md`.
- `Home.tsx` hero background is now empty (name on black); `App.tsx` no longer
  mounts `SunCursor` (native cursor returns). Dormant `html.has-sun-cursor` CSS
  left in `index.css` — reactivates automatically if SunCursor is revived.
- Verified: `tsc --noEmit` clean, `oxlint` exit 0.

### 🧭 Site structure — Melvin's restatement (2026-07-27), build toward this

- **Hero** — scrollytelling. Either **one single epic video**, OR
  **editorial-style scrollytelling where the theme/elements change as you move
  through the hero's internal "tabs"/sections** (divide the hero smartly). The
  abstract/editorial concept above lives here.
- **About / Work / Vision / Contact** — each gets its **own distinct concept**
  (one per page), not the hero's concept repeated.
- **Résumé** — a *completely different* treatment. Open task: *"think of the
  coolest way to display my resume."*

### 🔁 LLM-independence (2026-07-27) — repo is now the source of truth, not any AI

Melvin will delegate across tools (Antigravity, Gemini, Perplexity, ChatGPT,
Claude) to survive session limits + credit caps. New files support this:
- **`AGENTS.md`** (root) — tool-agnostic entry point every AI reads first.
- **`docs/LLM-INDEPENDENCE.md`** — the full workflow: file roles, per-tool
  playbook, a copy-paste primer for chat tools, and the session-close ritual.
- **`GEMINI.md`** (root) — thin pointer to `AGENTS.md` + `CONTEXT.md`.
- **✅ DONE (2026-07-27):** project is now a git repo, pushed to the **private**
  repo **https://github.com/melvinchirag/Portfolio** (`main` branch, remote
  `origin`). `node_modules` etc. gitignored. Tools can now clone the full
  context; edits can be rolled back. Commit after meaningful changes — the log
  is a second decision trail. (`gh` CLI is NOT installed; repo was created in
  the browser. Note the repo name is capitalized `Portfolio`.)

**Root `README.md` = the "master key"** (added 2026-07-27): a living,
learning-optimized, rebuild-from-scratch doc of every tool/framework and what
each part of the site is made with. Update README §3/§6 whenever a feature lands;
**finalize (resolve all 🚧) as the closing step of the project.** Rule in
`AGENTS.md` §5b. `docs/references.md` now compartmentalizes refs by difference;
`docs/artifacts.md` indexes every prototype.

Working rule reinforced: **end every session by updating this top section**
(what changed / what's next / what's blocked) — that's what keeps any tool able
to continue.

### ✅ DIRECTION LOCKED (2026-07-27) — "The Blend" (A × B)

After deconstructing Melvin's 4 reference sites (see `docs/references.md`), they
split into two camps: **A · WebGL craft** (enzo-casalini.dev, lukebaffait.fr —
custom React+Three.js+GLSL+GSAP, Awwwards-tier) and **B · Editorial brand**
(noth.in, cinetica.studio — Webflow, bold type + brand voice + live details).

**Key finding:** enzo-casalini.dev is an Awwwards nominee built on **our exact
stack** (React + R3F + Three.js + GLSL + GSAP). The ceiling is reachable.

**Locked direction = The Blend:** an **editorial brand skeleton** (Camp B —
terse voice, corner metadata, bracket/paren labels, a live system detail, glitch
type) with **ONE signature WebGL abstract-motion centerpiece** (Camp A). Roughly
60% editorial / 40% WebGL. Chosen over WebGL-forward to concentrate all shader
risk into a single controllable place — full-WebGL means 5× the perf budgets,
fallbacks, silent-blank-page failures, and is the hardest thing to delegate to
other LLMs (the independence plan). Melvin's condition: best output for the
resources we have. Ceiling stays high; floor rises a lot.

**Sequencing (risk-ordered, matches structure→motion→polish):**
1. **Editorial hero shell first** — layout, type system, brand voice, corner
   metadata, bracket labels, live clock, (optional) glitch text. Cheap,
   deterministic, verifiable, delegable. Built as a standalone prototype with a
   reserved empty SLOT where the WebGL centerpiece will go.
2. **The one WebGL centerpiece** — designed/prototyped standalone, then dropped
   into the slot once approved. Concept TBD (candidates: refine "The Current";
   the reserved ink-fluid is earmarked elsewhere).
3. Only then wire into `site/`. Do NOT build hero sections 2–5 until Melvin says.

### ✅ HERO MASK BUILT (2026-07-27) — our own GPGPU particle mask, on branch `hero-build`

The hero centerpiece is real and working in the site (`site/src/components/scene/
MaskField.tsx`). Decision history: rejected photo-to-particles (a 2D photo can't
be a 3D sci-fi mask); studied the Codrops "Dreamy Particles" engine in full
(`docs/particle-mask-technique.md`); **rebuilt the technique from scratch** with
only MIT libs + our own shaders (NOT their code). What's done:
- GPGPU particle sim (GPUComputationRenderer + MeshSurfaceSampler + three-mesh-bvh,
  all MIT) on the **cyborg "Soulless" model** (CC BY 4.0 — MUST credit Ali Rahimi).
- **Fixed on the LEFT** (name goes centre), front-facing, no orbit; cursor still
  disturbs the particles (spring-back + repel).
- **De-crowned** — front-facing + height-clip leaves just the face.
- **"Make it ours" glyph layer (Melvin's idea):** ~5200 particles render as
  **binary + hexadecimal + TELUGU letters** (his heritage), reshuffling ~35%
  every 5s. Confirmed rendering.
- teal `#80fff0`, additive, UnrealBloom. Manual DRACO loader (self-hosted decoder
  path via gstatic) — NOT drei useGLTF (which hung after cache clears).

**Still TODO on the mask:** glowing eyes (Melvin asked, not built yet); push
density back up (currently SIZE=384/~147k, dropped from 262k to avoid a
mount-time freeze — do it via a PRE-FILTERED face mesh so no rejection cost);
remove last top-streak/antenna remnants (same pre-filter fixes it); the editorial
type overlay ("CS, and beyond" + name) on top; the 6-hour variation cycle.

**⚠️ Dev-env gotchas learned:** adding deps mid-session corrupts Vite's HMR →
black screen; fix = restart dev server + **open a FRESH browser tab** (old tab
stays poisoned). Dev server currently on **:5176**. Melvin's Chrome window keeps
collapsing to ~150px tall, so the agent can't always see full renders — Melvin
verifies full-size.

### 🎨 Hero direction (2026-07-27) — "look first", references studied

- Melvin's steer: **get the LOOK right before worrying about font/content.**
- A field-agnostic hero **prototype ("The Current")** was built as a standalone
  artifact (scrollytelling + kinetic type + a curl-noise "light current"):
  https://claude.ai/code/artifact/dfabfa71-13fe-48d6-a619-825987bf081f · source
  `scratchpad/hero-current.html`. Melvin: *"it's good but it can use massive
  improvements."* Directionally OK, not the target yet.
- **BLOCKED on Melvin's reference sites.** He said he'd send sites he likes so we
  can reverse-engineer approach + tool stack + art style and pick a direction;
  the URLs did not arrive in that message. **First thing: get the links, then
  deconstruct each into a "pick your direction" menu.**

### ❓ Open questions to resolve with Melvin

1. **"Under construction" launch version?** Melvin leans **NO** — first
   portfolio, wants to *"start with a bang and shock everyone"* rather than ship
   a half-built holding page. Not final; revisit if scope balloons.
2. **The direction itself is still unchosen.** Prior attempt: concept-explorer
   artifacts (didn't land the decision) → then asking Melvin which sites he
   likes and *which parts* (more productive). He offered to re-supply those
   references. **Next step: collect the reference sites + the specific parts he
   likes, then converge on the abstract/editorial hero concept from those —
   don't build a guess first.**

---

## Superseded 2026-07-27 — the nebula hero (kept for history)

## Current state — 2026-07-26. Loader shipped + fixed. Hero §1 rebuilt on real NASA/ESA imagery.

**Read this whole section before touching Home or the loader — it supersedes
everything below it in this file that talks about the particle field.**

Other four pages (About/Work/Vision/Contact) are still placeholders.

### ✅ Loader bug fixed (2026-07-26)

Melvin reported the loader was invisible (blank screen for the full sequence,
then straight to hero). Root cause: `site/src/components/Loader.tsx`'s cleanup
called `gl.getExtension('WEBGL_lose_context')?.loseContext()`. **React
StrictMode runs every effect twice in dev** (mount → cleanup → mount) —
`loseContext()` is *permanent* for that canvas, so the second mount got a dead
context back and every draw silently no-op'd. Fixed by removing that call
(context is released anyway when the canvas unmounts); left a comment
explaining why so it isn't re-added. **Verify this still displays correctly
next session** — it was fixed but not re-watched by Melvin afterward.

### 🎨 Hero §1 background — REBUILT on real photographs, not procedural noise (2026-07-26)

**What happened:** the procedural nebula shader (ridged-multifractal noise,
described further down this file) was shown to Melvin and rejected again —
*"it doesn't look like a picture from a NASA satellite… from a human
perspective, that just looks like a poorly done nebula."* Also flagged: the
sun cursor was *"too big… looks like Cartoon Network… too much flaring
plasma."*

**Diagnosis — same lesson as the face triptych, hit a third time.**
Procedural code cannot produce a photograph. Real nebula images are turbulent
physics evolved over millions of years, captured at extreme dynamic range,
processed by scientists for hours — no noise function reproduces that. Melvin
independently proposed the fix himself: *"we should directly reference
satellite images of NASA."* That is now the architecture.

**What's built now:**
- **`site/src/components/scene/NebulaField.tsx`** — full-screen WebGL shader
  that displays a REAL JWST/Hubble/ESO photograph as the background (cover-fit,
  slow drift, pointer parallax), and layers on interaction a still image can't
  provide: the sun-cursor **pushes** the gas radially, **swirls** it at the
  cavity wall, **clears**/dims it near the cursor, and **lights** the
  surrounding gas with warm scattered light (physically motivated — hot young
  stars really do blow cavities into their birth nebulae via radiation
  pressure and stellar wind).
- **Five real images ship in `site/public/nebula/`** (~800KB–1.2MB each,
  downsampled from originals up to 123 MP via a one-off script,
  `scratchpad/prep-neb.js`, which needed jpeg-js's decode limits raised —
  `maxResolutionInMP`/`maxMemoryUsageInMB` — to handle the JWST originals):
  - `carina.jpg` — Cosmic Cliffs (NASA/ESA/CSA/STScI, JWST) — public domain
  - `orion.jpg` — Orion Nebula (ESO/VISTA) — **CC BY 4.0, attribution required**
  - `tarantula.jpg` — Tarantula Nebula (NASA/ESA/CSA/STScI, JWST) — public domain
  - `eagle.jpg` — Pillars of Creation (NASA/ESA/Hubble) — **CC BY 4.0**
  - `lagoon.jpg` — Lagoon Nebula (NASA/ESA/Hubble) — **CC BY 4.0**
  - **A small on-screen credit line (bottom-right) is required by the CC BY
    images and is rendered by `NebulaField`. Do not remove it.**
- **Rotation:** one nebula per page load, advancing through all five via
  `localStorage` (`melvin:nebula-index`), so reload → next nebula. This is
  Melvin's stated long-term vision (*"every time somebody opens the website...
  we should have five different nebulas"*) already fully implemented, not a
  stub.
- **`site/src/components/SunCursor.tsx`** — completely rebuilt, smaller and
  restrained per Melvin's notes: real limb darkening (brighter centre, cooler
  edge — the single detail that sells "star" over "circle"), three
  exponential glow layers at different falloff rates instead of one, a
  **static** (not animated) faint diffraction cross, no more animated flares.
  Grows and brightens on hover of `a, button, [role=button], [data-glow]`.

**Architecture change:** the global `<SceneCanvas>` was removed from `App.tsx`
entirely. Per Melvin's *"each page can have a concept"* direction, the nebula
is mounted **inside `Home.tsx` only** — other pages currently render on plain
black until they get their own concepts.

**⚠️ DEAD CODE — not yet deleted, do not resurrect by accident:**
`site/src/components/SceneCanvas.tsx`, `site/src/components/scene/ParticleField.tsx`,
`site/src/components/scene/particles.glsl.ts`, and `site/src/components/scene/noise.ts`
are still on disk but **no longer imported anywhere**. They were the old
global procedural field, superseded by `NebulaField.tsx`. `Cursor.tsx` (the
old lerped-dot cursor, pre-sun) has already been deleted. Clean up the four
remaining orphans next session unless Melvin wants the procedural field kept
as a reference/fallback.

**Also fixed:** `NEBULAS` array in `NebulaField.tsx` was made non-exported
(oxlint fast-refresh warning) — no other file needs it.

**Verified this pass:** `npx tsc --noEmit` clean, `oxlint` clean, dev server
serves clean, all five `/nebula/*.jpg` return 200. **NOT yet re-confirmed
visually by Melvin after the rebuild** — he watched an early version
("impressed, but a caveat") right as this file was being updated; the caveat
itself was not yet stated when this section was written. Get that caveat
first thing next session.

### 🏗️ Still the standing architecture (unchanged, keep building toward this)

- **The hero page is the ONLY page with scrollytelling.** Hard rule.
- Hero is **five scroll sections**, each its own theme/transition — not one
  continuous effect.
- **The nebula belongs to Section 1 only**; sections 2–5 undesigned. Melvin
  wants to try **anime.js** (not installed) and add elements himself before
  the full 5-section scroll is built. **Do not build sections 2–5 until he
  says so.**
- **Comment every important aspect of the code** — Melvin reads it and edits
  it himself. Both new files above are heavily commented for this reason.
  Keep `docs/CODEBASE.md` + its artifact current with these changes (not yet
  done as of this update — do next).

---

## Superseded below — kept for history only

Everything from here to the next `---` describes the OLD procedural-noise
nebula attempt (ridged multifractal, domain warping, ionisation colour) and
the old global `SceneCanvas`/`ParticleField` system. **It has been replaced by
the real-imagery system described above.** Left in place so the reasoning
trail isn't lost, not because it's current.

**The face triptych is DROPPED (2026-07-25).** History for context: the
particle-assembled face failed (yellow blob); we pivoted to an *image* triptych
(neural / film / contour treatments of his real photo). Melvin looked at the
wired-in version and rejected it — too small, floating in a busy field, reads
unfinished. He officially dropped the face idea for now ("will look into it
later"). `PortraitTriptych.tsx` and `site/public/portrait/*` were deleted. The
`scratchpad/portrait-bake/` tools (`triptych.js`, `bake.js`) still exist for if
it returns. **Do not rebuild the face without Melvin re-opening it.**

**The lasting lesson (now in `docs/CODEBASE.md` §7c):** representational art (a
real face) needs real tools — photo / 3D / generative-AI image. Abstract
generative motion (particles, growing networks, fields) is code's home turf.
Getting this line wrong cost several rounds.

**New hero direction — Melvin's vision (2026-07-25):**
- A **loading sequence** first: black screen → a neuron appears → it grows and
  connects, a neural network building itself → dissolves into the hero. Built in
  **code, not video** (Melvin considered Google Flow/Veo; we established code is
  right here — precise timing, seamless dissolve into the LIVE hero, KB not MB,
  full control). Reasoning written up in `docs/CODEBASE.md` §7c.
- Keep **scrollytelling**. The hero itself (what the loader dissolves into) is
  still just the clean name-on-field placeholder — to be designed next.

### ⚠️ Loader: FOUR rejected renditions, then a process fix (2026-07-25)

Melvin liked v1's *behaviour* (B&W, ~5s, accelerating, random origin — all
keepers) but rejected v2–v4 on **look**. Every rendition read as a microscope /
CT image:

| # | What was built | Why it failed |
|---|---|---|
| 2 | Accurate dendrite growth, thin white ink | "Looks like a neuron culture / scanner" |
| 3 | + bloom, sparks, signals, birth flashes | Same, plus washed out |
| 4 | + 3-layer depth-of-field, camera, haze, grain | **Blurry and cluttered** — the DOF blur made it muddy |
| 5 | Lichtenberg/electric: sharp, angular, sparse, 3D | Over-corrected — thin, spindly, unbalanced. "Looks terrible" |

**THE REAL DIAGNOSIS (this is the important part).** It was never a rendering
problem. **There was no agreed visual target.** Melvin had an image in his head;
I had no reference, so each round I guessed, built ~250 lines against the guess,
and got rejected — oscillating between "too dense/soft" and "too sparse/sharp".
Note the irony: the project's own **"reference before build"** rule was followed
for the *site* (8 reference sites) and skipped entirely for the *loader*.

**THE PROCESS FIX — use this for any future visual work.** Stop building one
guess at a time. Build a **concept explorer**: one artifact with 5–6 genuinely
different directions animating side by side, let Melvin point at one in 30
seconds, *then* go deep on the winner. Converts guess→build→reject into
pick→refine. Explorer artifact:
https://claude.ai/code/artifact/5752aa81-6bec-4447-9ba2-2afe24df14cd
**Corollary: probe new visuals as a standalone artifact FIRST; only wire into
the site once approved.** Wiring an unapproved concept in wastes a full cycle.

**Result:** Melvin picked #1 (ink/fluid) — but **not for the loader**. See below.

### 🎨 NEW ARCHITECTURAL DECISION — one page, one concept (2026-07-25)

Melvin, on seeing the ink sim: *"we shouldn't use it as a loading page. I have
bigger plans for this kind of thing… each page can have a concept."* So the
site's variety comes from **each page having its own visual world**, not one
effect repeated everywhere. Approved concepts get **reserved** in
`docs/concepts.md` rather than spent on the first surface that needs something.

Corollary worth remembering: **match the concept's weight to the surface's
dwell time.** A loader is glanced at for 5 seconds; a page is sat with. Don't
burn the best idea on the shortest moment.

**Reserved so far:** the **ink fluid simulation** — a real Navier-Stokes GPU sim
(vorticity confinement, 28-iteration pressure solve), luminous ink in black
water. Melvin: *"very, very pretty… reads as a fluid… a nice Chinese art / comic
style feel. I really love it."* Artifact:
https://claude.ai/code/artifact/0c2546e1-2b6d-4137-9000-88c39653e3c2 · source
`scratchpad/ink-fluid.html`. **Page assignment still open** — Vision (manifesto)
is the strongest candidate.

### 🏗️ HERO ARCHITECTURE — Melvin's direction, 2026-07-25 (build toward this)

- **The hero page is the ONLY page with scrollytelling.** About / Work / Vision
  / Contact must NOT have it. This is a hard rule.
- The hero is **five scroll sections**, each with its **own theme and its own
  transition** between them. It is explicitly *not* one continuous effect.
- **The particle/nebula field belongs to SECTION 1 ONLY.** On arrival you see
  it; as you scroll it transitions into something else. Do not extend it across
  the whole hero.
- **Section 1 = name + identity line over the nebula.** That is the current
  work; sections 2–5 are undesigned.
- Melvin wants to try **anime.js** for some of this — not installed yet, and he
  wants to add elements himself before we build the full 5-section scroll. Do
  not build sections 2–5 until he says.

**Section 1 brief (current task):**
- The field currently *"looks too much like just random particles"*. It must
  read as a **nebula — specifically Orion, a gaseous cluster**, not points.
- **Mouse-interactive.**
- **Custom cursor = a miniature SUN**, built in WebGL: it should glow and look
  like a sun, and **glow brighter when hovering anything important**.
- **Comment every important aspect of the code** — Melvin reads it and will
  make changes himself. Keep `docs/CODEBASE.md` + its artifact current.

### ✅ LOADER — SOLVED AND SHIPPED (2026-07-25)

Rendition #6 was **approved outright**: *"That's exactly what I wanted. That's
literally what I wanted. Perfect. Lock it, fix it. We're using it."*

It is live in `site/src/components/Loader.tsx` — raw WebGL: neuron cell bodies
igniting in a cascade, growing dendrites, arcing across to connect, rendered as
**volumetric point clouds with multi-pass bloom** in real 3D with a camera
pushing through. Cool blue dendrites, warm gold cell bodies. 5.2s, once per tab
session, skippable, fresh network every visit, reduced-motion and no-WebGL safe,
full GPU cleanup on unmount. Verified: tsc + lint clean, serving clean.
**Do not restyle without Melvin re-opening it.** Full detail in
`docs/concepts.md`.

**THE TRANSFERABLE LESSON — why #6 worked when #2–#5 failed.** All four failures
were 2D canvas **line drawings**, and flat line art reads as a diagram or a scan
no matter how it is graded. CGI reads as CGI because of: **volumetric mass**
(overlapping soft sprites, never wireframe) + **real multi-pass bloom** +
**real 3D with a moving camera** + **atmosphere** (fog, dust) + **filmic finish**
(tone mapping, chromatic aberration, vignette, grain). Reach for that stack
whenever the brief is "make it look like VFX".

**Hero field contrast pass (2026-07-25):** the field kept reading as a flat,
bright orange wall. Reduced particle counts (~120k→62k high), made density
sampling far more selective (exp 2.1→3.0) to carve real black voids, trimmed
the buffer instead of uniform-filling, and lowered bloom (0.55→0.4, threshold
→0.62) + deepened vignette. Goal: deep field with voids and bright cores, not a
uniform sheet. Needs Melvin's eyes.

**Codebase learning doc** now exists: `docs/CODEBASE.md` (source of truth) +
artifact at https://claude.ai/code/artifact/06f5580e-4945-4653-9978-015275579359.
Keep both current when code changes — **NOT yet updated for the 2026-07-26
nebula rebuild above; do that next.** Per-line comments were tried and
reversed — see `site/CLAUDE.md` "Comments and documentation".

**File tree below is STALE** (pre-dates the 2026-07-26 rebuild — no
`NebulaField.tsx`/`SunCursor.tsx`/`public/nebula/`, and still lists the
now-orphaned `ParticleField.tsx`/`particles.glsl.ts`/`noise.ts` as if they were
live). Kept for history only.

```
Desktop\Portfolio\
├── PORTFOLIO_VISION.md          spine: vision, phases, resource playbook
├── CONTEXT.md                   this file
├── .claude\launch.json          dev server, runs `npm --prefix site run dev`
├── docs\
│   ├── references.md            8 reference sites, each with a named job
│   └── pages\home.md            the Home spec — 5 beats, current truth
└── site\
    ├── CLAUDE.md                art direction + hard rules
    ├── .claude\launch.json      older config, only works if cwd is site\
    └── src\
        ├── App.tsx              routes /about /work /vision /contact
        ├── index.css            tokens, .liquid-glass, accent CTA, reveals, cursor
        ├── components\
        │   ├── Nav.tsx          top bar, accent Résumé button, hide/show on scroll
        │   ├── SceneCanvas.tsx  canvas host, post-processing, camera parallax,
        │   │                    no-WebGL fallback
        │   ├── Loader.tsx       counts in, skippable, first visit only
        │   ├── Cursor.tsx       lerped glow dot, desktop only
        │   ├── RevealText.tsx   per-character reveal, accessible
        │   └── scene\
        │       ├── ParticleField.tsx   fBm-sampled filamentary distribution
        │       ├── particles.glsl.ts   vertex/fragment shaders + simplex noise
        │       └── noise.ts            CPU value-noise fBm for the distribution
        ├── hooks\
        │   ├── useLenis.ts             tuned — don't change casually
        │   ├── useQualityTier.ts       particle count + DPR by device
        │   └── usePrefersReducedMotion.ts
        └── pages\
            ├── Home.tsx        hero: centre stack + corner metadata + live clock
            └── Chapter.tsx     shared placeholder for the other 4 routes
```

**Architecture note that matters:** particles carry two positions — `position`
(chaos) and `aTarget` — and resolve via a single `uResolve` uniform. Beat 2's
portrait fills `aTarget` from Melvin's photo and animates that uniform. **No
GPGPU, and no rewrite required.** `aTarget` currently holds a placeholder
sphere so the mechanism is wired and testable.

### Verification status

**Confirmed (2026-07-24):**
- `npx tsc --noEmit` passes; `oxlint` clean.
- Dev server starts clean from the repo root via the new `.claude/launch.json`.
- Page loads with **zero console errors or warnings**.
- DOM correct: nav renders Melvin/About/Work/Vision/Contact/Résumé; hero name
  renders as 6 animated characters plus an `sr-only` full string; corner
  metadata and the live clock render; routes resolve.
- WebGL context is created and alive at full viewport size.
- Accessibility: the collapsed mobile menu is `inert`, so its links are no
  longer in the tab order (this was a real bug, found and fixed).

**NOT confirmed — needs Melvin to look:**
- **Whether the particle field renders at all**, and whether it reads as deep
  and volumetric rather than as flat dots.
- Whether drift feels organic, and whether pointer parallax reads as depth.
- Whether the name reveal glides without bouncing.
- Whether the nav is legible over the scene without a dark overlay.
- Frame rate.
- Typography, spacing, colour balance — the entire aesthetic judgement.

**Why the agent cannot self-verify — confirmed again 2026-07-24.** The
automated browser pane does not composite. `document.visibilityState` reports
`"visible"` and a WebGL context is created at the correct size, **but
`requestAnimationFrame` never fires** — verified directly: a rAF-based probe
timed out after 30s without a single callback. React Three Fiber's render loop
runs on rAF, so the scene has never drawn a frame in that environment, and
`gl.readPixels` therefore proves nothing.

**This is a limitation of the verification environment, not a defect in the
code.** Do not "fix" canvas sizing or the render loop based on a blank
screenshot from the pane. Verify in a real browser first.

**How to verify properly:**
```bash
cd site; npm run dev
```
Then open the printed localhost URL in a normal browser window.

---

## What's next

**Immediate — Melvin looks at Beat 1 and reacts:**
1. Run the dev server, open Home in a real browser.
2. Judge it against `docs/references.md`, list what's visually wrong.
3. Then the screenshot self-correction loop: compare, list differences, fix,
   repeat. **This is where the look actually gets found** — not in a spec.

**Then Beat 2** — the field resolves into the triptych portrait. Blocked on
Melvin's photo. The `aTarget` mechanism is already wired for it.

**Content still owed by Melvin:**
- [ ] Identity line (the hero currently ships a visible placeholder)
- [ ] "Who I am" — 3–4 sentences, real voice
- [ ] A portrait photo to feed the particle system
- [ ] Featured projects: Manas + 2 — name, one-liner, stack, role, links
- [ ] 6–10 About milestones (Kuwait → India → Michigan)
- [ ] Skills grouped into constellations
- [ ] Vision: the manifesto (bullets are fine)
- [ ] Résumé PDF (nav links `/resume.pdf`, which does not exist yet), email,
      socials, domain name

**Still-open decisions:** accent palette + type pair (ember `#ff6b35` → violet
`#8b5cf6`, Instrument Serif + Inter — **placeholder, not locked**) · the
field's character · which language sits left/centre/right in the triptych ·
domain name · sound in/out.

**Known issues:**
- `npm audit` reports a high-severity advisory in `react-router` (RSC-mode CSRF
  bypass). **Not reachable here** — this is a client-only SPA with no server
  actions. The fix is a breaking downgrade, so it is knowingly deferred.
- `/resume.pdf` is linked from the nav but not yet present — it 404s.
