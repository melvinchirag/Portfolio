# The Portfolio Codebase, Explained

This is the learning companion to the site. It explains the whole thing from the
ground up — the languages, the frameworks, the systems, and every file — for
someone who can program but hasn't worked in this particular stack before.

It is the **source of truth**. A browsable web version is published as an
artifact (https://claude.ai/code/artifact/06f5580e-4945-4653-9978-015275579359),
but this file is what lives with the code and gets updated first — when the code
changes, edit this file, then republish the artifact from its file path.

> **Rule for anyone editing the code:** when you change how something works,
> update this file in the same pass. A stale explanation is worse than none.

---

## Table of contents

1. [The 30-second picture](#1--the-30-second-picture)
2. [The languages](#2--the-languages)
3. [The frameworks and tools](#3--the-frameworks-and-tools)
4. [How the pieces fit — architecture](#4--how-the-pieces-fit--architecture)
5. [How data flows each frame](#5--how-data-flows-each-frame)
6. [The file-by-file walkthrough](#6--the-file-by-file-walkthrough)
7. [The hardest part, explained slowly — the particle field](#7--the-hardest-part-explained-slowly--the-particle-field)
8. [Glossary](#8--glossary)

---

## 1 · The 30-second picture

The site is a **single-page application**: one HTML file loads, and JavaScript
draws everything and swaps "pages" without ever reloading. Behind all the
content sits one full-screen **3D canvas** running a cloud of glowing particles
on the graphics card. On top of that float ordinary web elements — the nav, your
name, the text.

The whole thing is written in **TypeScript**, organized with **React**, and the
3D is done with **Three.js** (via a React-friendly wrapper). A tool called
**Vite** stitches it together while we develop and packages it for the web when
we ship.

That's the entire mental model. The rest of this document is detail.

---

## 2 · The languages

### HTML — the skeleton

HTML describes *what is on a page* — a heading, a paragraph, a link. Our site has
exactly one hand-written HTML file (`index.html`), and it is nearly empty: it
contains a single empty `<div id="root">` that JavaScript fills in. Everything
you see is generated at runtime.

### CSS — the appearance

CSS describes *how things look* — colour, size, spacing, animation. We write it
in one file (`index.css`) plus thousands of tiny "utility classes" from Tailwind
(more on that below). CSS is also where the design tokens live — the named
colours and fonts that the rest of the site refers to.

### JavaScript and TypeScript — the behaviour

JavaScript is the language that runs in every web browser; it's what makes a page
*do* things. **TypeScript is JavaScript with a type checker bolted on.** You
write almost the same code, but you also declare what *kind* of value each thing
is — a number, a string, a list of particles — and a checker catches mistakes
*before* the code ever runs. When you see `: number` or `: string` in the code,
that's TypeScript. The `.ts` and `.tsx` file extensions mean TypeScript.

Why bother? On a project with 3D maths and dozens of moving parts, the type
checker catches a whole category of bugs (passing the wrong thing to the wrong
function) instantly, in the editor, instead of as a mysterious crash later.

### GLSL — the language of the graphics card

This is the exotic one. **GLSL** (OpenGL Shading Language) is a separate,
C-like language that runs not on the normal processor but on the **GPU** — the
graphics card. It exists because drawing 120,000 glowing particles 60 times a
second is far too much work for the normal processor to do one at a time. The
GPU does thousands of them *simultaneously*, but only if you hand it a tiny
program written in its own language. Those programs are called **shaders**, and
ours live in `particles.glsl.ts` as text strings.

---

## 3 · The frameworks and tools

A framework is pre-written code that handles the repetitive parts so we can
focus on what's unique to our site. Here's every one we use and why.

### React — building the interface from components

React lets you build a UI out of reusable, self-contained pieces called
**components**. A component is a function that returns a description of some UI.
Our `Nav` is a component; so is `Home`; so is the whole `App`. React's core
trick: when a component's data changes, React figures out the smallest possible
change to the actual page and makes only that change. You describe *what the UI
should look like for the current data*, and React handles the *how*.

Two React ideas you'll see everywhere:

- **State** — data that, when it changes, causes the component to redraw. "Is
  the mobile menu open?" is state. Created with `useState`.
- **Hooks** — functions whose names start with `use`. They let a component tap
  into React features (`useState`, `useEffect`, `useRef`) or into logic we've
  written ourselves (`useLenis`, `usePointerTracker`). A hook is how a component
  "hooks into" behaviour that lives outside it.

### Three.js — 3D in the browser

The browser's low-level 3D system (**WebGL**) is extremely powerful but
punishingly tedious to use directly. **Three.js** is the library that wraps it in
human terms: cameras, meshes, materials, geometries. When we talk about "the
scene", "the camera", or "a material", those are Three.js concepts.

### React Three Fiber — Three.js *as* React

Normally you'd build a Three.js scene with a long list of imperative commands.
**React Three Fiber** (R3F) lets you write the 3D scene as React components
instead — `<points>`, `<bufferGeometry>`, `<shaderMaterial>` — so the 3D world
and the interface are built the same way. The `useFrame` hook it provides is
crucial: it runs a function you give it *on every single animation frame*, which
is how anything moves.

### drei and postprocessing — the add-ons

- **@react-three/drei** — a box of ready-made helpers for R3F. We use it lightly
  now; it's there for later.
- **@react-three/postprocessing** — applies effects to the *finished* rendered
  image, like a photo filter. Our glow (**bloom**), edge-darkening (**vignette**),
  and film **grain** come from here.

### Tailwind CSS — styling in the markup

Instead of writing custom CSS rules with names, Tailwind gives you thousands of
tiny single-purpose classes you apply directly in the markup: `flex` (lay out in
a row), `px-6` (horizontal padding), `text-white/40` (white text at 40% opacity).
It's faster for the common 90% of styling; the genuinely custom 10% (the glass,
the cursor, the shaders) still lives in `index.css`.

### GSAP + Lenis — motion and smooth scrolling

- **Lenis** intercepts the mouse wheel and makes scrolling glide with weight
  instead of jumping. It's a big part of why the site feels "expensive".
- **GSAP** is an animation engine; its **ScrollTrigger** add-on ties animations
  to scroll position. This is the machinery the later scroll scenes will use.

### React Router — fake pages, real URLs

The site never actually reloads, but the URL still changes and the Back button
still works. **React Router** watches the URL and swaps which page component is
shown. `/`, `/about`, `/work`, `/vision`, `/contact` are all handled in one place.

### Vite — the workshop

**Vite** is the tool that runs while we develop. It serves the site instantly,
and — this is its best trick — when you save a file, it updates the running page
*without a reload* (called **hot module replacement**). It also bundles and
minifies everything into a small, fast package when it's time to ship. It's the
`npm run dev` command.

### The supporting cast

- **npm** — installs and tracks the libraries above (listed in `package.json`).
- **oxlint** — a fast "linter" that flags suspicious code patterns.
- **TypeScript compiler (`tsc`)** — the type checker, run to prove the whole
  project is type-consistent before shipping.

---

## 4 · How the pieces fit — architecture

Here is the whole system, top to bottom, as it exists when the page is running:

```
┌──────────────────────────────────────────────────────────────┐
│ index.html — one empty <div id="root">                       │
│                                                              │
│  main.tsx  mounts React into that div                        │
│    │                                                         │
│    └── App.tsx — the whole app                               │
│         │                                                    │
│         ├── <SceneCanvas>   the 3D layer   (z-index 1, back) │
│         │     └── <ParticleField> + post-processing          │
│         │                                                    │
│         ├── <Nav>           top bar        (z-index 50)      │
│         │                                                    │
│         ├── <main>          the page content (z-index 10)    │
│         │     └── <Routes>  shows Home / About / …           │
│         │                                                    │
│         ├── <Cursor>        the glow dot    (z-index 200)    │
│         └── <Loader>        intro counter   (z-index 100)    │
└──────────────────────────────────────────────────────────────┘
```

Two things are worth calling out because they're the load-bearing design
decisions:

**One persistent canvas.** `SceneCanvas` is rendered *once*, by `App`, and sits
behind every page. When you navigate from Home to About, the 3D scene does not
tear down and rebuild — it stays alive and continuous. That's what makes the
site feel like one space rather than a set of separate pages.

**The z-index ladder.** Every layer has a fixed depth, defined in `CLAUDE.md`
and never violated: scene at the back (1), page content above it (10), the blur
edge (30), the nav (50), the loader (100), the cursor on top of everything
(200). No layer ever puts an opaque background over the one behind it — that's
why the particle scene shows through everything.

---

## 5 · How data flows each frame

The site's motion comes from a loop that runs ~60 times a second. Understanding
this loop is understanding the whole thing. Here's one frame:

```
   YOU MOVE THE MOUSE
          │
          ▼
   window 'pointermove' event
          │
          ▼
   usePointerTracker  ──writes──▶  pointerState { x, y }   (one shared object)
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              ▼                          ▼                         ▼
        ParticleField              CameraRig                  Cursor
        reads pointerState         reads pointerState         reads its own
              │                          │                    target position
   uploads it as the                drifts the camera              │
   uPointer uniform                 toward the pointer        moves the glow dot
              │                          │                    a bit closer
              ▼                          ▼                         │
        ┌──────────────────────────────────────┐                  │
        │  GPU runs the vertex shader for       │                  │
        │  every particle: computes drift,      │                  │
        │  pushes particles from the pointer,   │                  │
        │  carves the text clearing             │                  │
        │           ▼                           │                  │
        │  GPU runs the fragment shader for     │                  │
        │  every pixel: warm colour + falloff   │                  │
        └──────────────────────────────────────┘                  │
              │                                                    │
              ▼                                                    ▼
        post-processing (bloom, vignette, grain)          DOM updates
              │                                                    │
              └──────────────────┬─────────────────────────────────┘
                                 ▼
                          THE FRAME YOU SEE
```

The key insight: **JavaScript never touches individual particles.** It only
updates a few shared numbers (the "uniforms") — the clock, the mouse position.
The GPU does the per-particle work. That division is why the site can afford
120,000 particles without stuttering.

---

## 6 · The file-by-file walkthrough

Organized by the folders in `site/src/`.

### Entry points

**`index.html`** — The one real HTML file. Holds the empty `#root` div, the page
`<title>`, and the `<script>` that boots everything. Nearly empty by design.

**`src/main.tsx`** — Four lines that matter: find the `#root` div, and tell React
to render `<App>` inside it. Wrapped in `<StrictMode>`, a development-only helper
that double-checks for common React mistakes.

**`src/App.tsx`** — The whole application assembled. Sets up React Router,
declares the five routes, and stacks the persistent layers (scene, nav, content,
cursor, loader) in their z-order. This is the map of the entire site.

### The 3D scene — `src/components/scene/` + `SceneCanvas.tsx`

**`SceneCanvas.tsx`** — Creates the actual `<Canvas>` (the WebGL surface), the
camera, and the post-processing chain. Decides the quality tier, checks for
reduced-motion and no-WebGL, and drives the camera parallax. This is the bridge
between React and the 3D world.

**`scene/ParticleField.tsx`** — The particle system itself. Does two jobs: builds
the 120,000 particles once at startup (position, size, colour), then updates the
shared uniforms every frame. Explained in full in section 7.

**`scene/particles.glsl.ts`** — The two GPU programs, as text. The **vertex
shader** positions every particle; the **fragment shader** colours every pixel.
Also contains the reusable simplex-noise function that makes drift organic.

**`scene/noise.ts`** — A CPU version of noise, used once at startup to decide
*where* particles clump. This is separate from the GPU noise because it does a
different job at a different time.

**`scene/ContactMaskSwarm.tsx`** — The seventeen small faces that inhabit the
Contact section and turn to follow your cursor. One simulation, seventeen draws:
a single `GPUComputationRenderer` produces one live position texture per frame,
and each face is a cheap re-draw of that same texture with its own transform and
its own material clone (so each can blink, fade in, and float glyphs on its own
clock). Their positions are **hand-composed, not evenly spread** — they frame
the reading column rather than sit behind it, which is the whole difference
between "background" and "wallpaper"; the reasoning is written out at
`SWARM_SLOTS` in that file.

> ⚠ This section still describes the earlier `SceneCanvas` / `ParticleField` /
> `PortraitTriptych` structure. The scene has since moved to a persistent
> `GlobalScene.tsx` with `MaskField.tsx` as the hero mask. Section 7 remains
> accurate about the *technique*; the file names around it have drifted.

### The interface — `src/components/`

**`Nav.tsx`** — The top bar. Name on the left, page links and the glass Resume
button on the right. Strengthens its glass background as you scroll, hides going
down and returns going up, and collapses to a hamburger on mobile.

**`Cursor.tsx`** — Replaces the system arrow with a trailing amber glow dot that
grows over clickable things. Desktop only. Its smoothing maths are the fix for
the "sometimes fast, sometimes slow" cursor.

**`Loader.tsx`** — The neuron-growth intro. On a black screen a single brain
neuron appears, grows branching dendrites that curl and taper outward, plants
new neurons as they reach, fills the screen (accelerating toward the end), then
dissolves to reveal the hero. A `<canvas>` drawing built with an agent-based
growth model (see "Why code, not video" below). First visit only, skippable.

**`RevealText.tsx`** — Animates text in character by character. Keeps the full
word available to screen readers so the animation never hides content.

**`PortraitTriptych.tsx`** — The hero face. Layers the composite and film
portrait images over the ambient field and cross-fades them on scroll (arrival →
resolve → hold → dissipate). See section 7b.

### The pages — `src/pages/`

**`Home.tsx`** — The arrival screen and the scroll choreography. The centred name
and identity line, the corner metadata (course, university, live clock, scroll
cue), and the tall scroll track that fades the hero out as the face resolves and
the bio in as it dissipates. Mounts `PortraitTriptych` behind the text.

**`public/portrait/hero-triptych.png`, `hero-film.png`** — The two shipped hero
images (composite and film), feathered to transparency at the edges so the face
sits within the particle dust. Produced offline; the raw photo never ships.

**`Work.tsx`** — "The Present": the recruiter-critical page, and the most
structured one. It is **data-driven**, **tag-indexed**, and deeply collapsible
so it scales as projects pile up toward graduation. Five sections — **Flagship**
(Osiris), **Hackathons** (Lingo, EventsOS), **Personal** (Manas + future
for-fun / skill-building / domain-expansion builds), **Foundations** (core CS by
domain), and **Leadership** — every one built on a single expand/collapse
primitive. Collapsed, the whole page is five headings; you open only what you
want. A search bar on top finds any project by tag or name.

The page **owns the open state** (two sets: open sections, open projects) and
passes it down as controlled props, because that is what lets a clicked search
result force the right section + project open and scroll to it.

Its building blocks:

- **`components/Collapsible.tsx`** — the one expand/collapse primitive, reused
  at all three depths (section → project → skill). Animates height with the CSS
  grid `0fr → 1fr` trick (real height is not animatable), exposes a `trigger`
  render-prop so each level supplies its own look, wraps the button in an
  `h2`/`h3` when asked for a valid document outline, supports both uncontrolled
  and controlled (parent-owned) open state, and honours reduced motion.
- **`components/work/WorkSection.tsx`** — a top-level collapsible section
  (title + count), open state controlled by the page.
- **`components/work/ProjectRow.tsx`** — one expandable project: name + tags
  collapsed; blurb, write-up, meta, links and media expanded. Keeps the
  `sync-glass-rect` hook for the later glass pass, and an `id` anchor for
  search reveal.
- **`components/work/ProjectMedia.tsx`** — the images/video block, degrading to
  a "coming" placeholder when a project has no media yet.
- **`components/work/SkillDisclosure.tsx`** — a Foundations skill token that
  opens to a per-skill write-up + repo links.
- **`components/work/ProjectSearch.tsx`** — the search bar. Substring-matches a
  query against each project's resolved tag LABELS + name (and Foundations skill
  names), shows a result count grouped by section with a "where used" note, and
  on click asks the page to reveal that project.
- **`data/tags.ts`** — THE canonical tag registry: every tag a project can carry,
  on three axes (discipline / tech / purpose). Projects reference tags by id, so
  the type system forbids an unregistered tag — that closed vocabulary is what
  makes search reliable. Groundwork for the future on-site AI bot.
- **`data/work.ts`** — the Work projects (separate from `data/projects.ts`,
  which the hero owns and renders as exactly three cards). Rich shape: category
  (= section), tag ids, write-up, links, media, hackathon metadata. Placeholder
  copy is flagged `tentative` so unfinished rows still render cleanly.
- **`data/skills.ts`** — the Foundations content: domains → skills → write-up +
  repos, most awaiting Melvin's real per-skill detail.

**`Chapter.tsx`** — A shared placeholder still used by pages that haven't got
their own real design yet.

### The reusable logic — `src/hooks/`

**`useLenis.ts`** — Sets up smooth scrolling. Tuned carefully; don't change
casually.

**`usePointerTracker.ts`** — The single source of truth for where the mouse is.
Listens on `window` so it works everywhere on the page, not just over the canvas.

**`useQualityTier.ts`** — Picks how many particles to draw based on the device,
once at startup.

**`usePrefersReducedMotion.ts`** — Reports whether the visitor has asked their
system to reduce motion, so the whole site can respect it.

### The styles

**`src/index.css`** — Global styles, the design tokens (the warm-film palette and
the fonts), and every custom class Tailwind can't express: the liquid glass, the
progressive blur, the text reveal, the cursor, the Resume button.

### The configuration

**`vite.config.ts`** — Tells Vite to enable React and Tailwind. Two lines.

**`package.json`** — The list of every library the project uses and the commands
(`dev`, `build`, `lint`).

**`CLAUDE.md`** — The rules any coder (human or AI) must follow on this project:
art direction, the z-index ladder, the commenting standard, the quality gates.

---

## 7 · The hardest part, explained slowly — the particle field

Everything else is ordinary web development. This is the part worth understanding
deeply, because it's where the site earns its look. We'll build it up in layers.

### Layer 1 — what a particle actually is

A "particle" here is just a **point**: a single position in 3D space that the GPU
draws as a small round dot. There's no image, no model. 120,000 points, each a
dot, together reading as a cloud of glowing gas.

### Layer 2 — where the points go (and why not randomly)

If you scatter 120,000 points completely at random, you get a flat, even fog —
the visual tell of a cheap effect. Real nebulae have **structure**: dense
filaments and empty voids.

To get that, `noise.ts` provides an **fBm** function — a kind of smooth,
cloud-like randomness. At startup, `ParticleField` uses **rejection sampling**:
it picks a random spot, asks the noise "how dense should it be here?", and keeps
the point more often where the answer is high. The result is clumps and voids
instead of an even spread. This is the single most important reason the field
looks like *something* rather than static.

This work happens once, on the CPU, during the loading counter — which is part of
why the loading sequence exists at all.

### Layer 3 — the field is atmosphere, not the face

The particle field used to try to *assemble your face* — every particle stored a
second position and a single number blended the cloud into a portrait. It was
elegant in theory, but reconstructing a recognizable face from blank glowing
points (with additive blending piling brightness up) produced an unrecognizable
blob. The lesson: procedural code inventing the art has a low ceiling.

So the particle field is now **pure atmosphere** — a drifting warm cloud behind
the hero — and the face is rendered a completely different way: as **image
treatments** (see the triptych below). This is the same division of labour as
the reference sites, where crafted assets are displayed by simple code.

### Layer 4 — the per-frame motion (the vertex shader)

Every frame, for every particle, the vertex shader:

1. Adds **drift** — samples the GPU noise function (moving through time) to nudge
   the particle along a slow, organic flow.
2. Applies **mouse push** — particles near the pointer slide gently away.
3. Computes **size** — near particles large, far ones small, which is what makes
   a flat screen read as a deep volume.
4. Carves the **text clearing** — thins out the particles nearest the camera in a
   soft, ragged ellipse behind the hero text, so the words are readable *without*
   dimming the scene with an overlay.

### Layer 5 — the per-pixel colour (the fragment shader)

For each pixel of each particle, the fragment shader:

1. Discards pixels outside a circle (turning the default square into a dot).
2. Fades from a bright core to a soft edge (so it glows rather than being a flat
   disc).
3. Picks a colour between deep bronze and hot gold based on the particle's
   "temperature", with most particles cool and only a few hot — the "one accent,
   used rarely" rule applied to the scene itself.

Notably, it does **not** brighten particles near the mouse. An earlier version
did, and combined with bloom it blew the whole screen white when you moved to the
centre. The pointer now moves particles without lighting them up.

### Layer 6 — the finishing pass (post-processing)

After the whole scene is drawn, three photo-style effects are applied to the
finished image: **bloom** (bright cores bleed light), **vignette** (edges darken),
and **grain** (a faint film texture). Tuned gently — the bloom threshold is
deliberately high so only genuinely hot cores glow.

---

## 7b · The face — an image triptych

The particle field is atmosphere. Your **face** is rendered a different way, and
this is the part that took the most iteration to get right.

The first attempt built the face *from* the particles. It failed — a face is
light and shadow, and blank glowing points with additive blending just piled up
into a bright blob. The fix was a change of approach, not parameters: **start
from a real photograph** (which already contains every bit of your likeness) and
**apply treatments to it**, rather than asking code to invent a face from nothing.

An offline tool (`scratchpad/portrait-bake/triptych.js`) takes one cropped photo
and produces **three treatments**, each a distinct visual language over the same
underlying face:

- **Neural** — a cyan wireframe. Nodes are placed on your strongest facial edges
  and wired to their neighbours. Reads as an AI face-map — the "how he builds"
  language.
- **Film** — a warm cinematic grade with halation and grain. The most
  photographic of the three; it anchors the likeness. The "how he sees" language.
- **Contour** — violet topographic iso-lines that treat brightness as elevation,
  like a 3D scan. The "how he thinks" language.

Because all three derive from the same photo, the features line up, so they
compose into **one continuous face** across three vertical bands (the composite).

`PortraitTriptych.tsx` is the display layer: it stacks the composite image and
the film image over the ambient field. On scroll the face brightens out of a dim
arrival (so the name reads first), then cross-fades from the composite to the
pure film treatment — the three facets resolving into one recognizable person —
holds, and dissipates as the bio rises. The crafted images carry the quality;
the code stays thin and elegant. This is the same division of labour as the
award-winning reference sites: **assets, displayed well.**

*(A fourth "nebula / gas" language was tried and dropped — dissolving a face into
gas is a generative-AI problem, not a procedural one. It may return later as an
image-to-image pass.)*

---

## 7c · Why code, not video — a rule of thumb

This project kept running into the same fork: should a striking visual be *made
in code* or *made as an asset* (a photo, a rendered video, a designed image)?
The answer isn't "code is worse" or "code is better" — it depends on the kind of
image, and getting this wrong cost real time here.

**The dividing line is representational vs. abstract.**

- **Representational** — it has to look like a specific real thing (your actual
  face, a product, a place). Code can't *invent* this convincingly; you need a
  photograph, a 3D render, or a generative-AI image. This is why the
  particle-assembled face failed and the image triptych worked.
- **Abstract / generative motion** — flowing particles, a growing network,
  fields, waveforms, geometric systems. There's no "correct" real thing to match,
  so the computer generating it *is* the art. Code is not just adequate here, it's
  the **right** tool — it's what the creative developers behind award sites ship.

**The neuron loader is squarely abstract, so it's built in code.** And for a
loading animation specifically, code beats a generated video on every axis:

- **Timing & control** — one neuron, then branching, then a seamless dissolve
  into the *live* hero. A video hard-cuts; code dissolves continuously into what
  comes next. A video model also can't be directed that precisely.
- **Weight** — the canvas animation is a few KB and starts instantly. A video
  loading-screen has to download megabytes *before* it can cover the load — you'd
  be loading the loader.
- **Adaptivity** — code fills any screen size crisply; a video letterboxes.
- **Cost** — a video that plays once for five seconds isn't worth the render time
  and money when code does it perfectly and free.

**How the loader actually works (the technique):** it's an *agent-based growth*
model, the same family as an L-system. A few "tips" (growing dendrite ends) each
step forward a little every frame, turning by a small random angle plus a gentle
outward push. Now and then a tip **bifurcates** (splits into two thinner
branches) or **plants a new cell body**. The strokes accumulate on an offscreen
canvas so they persist like ink. Growth **accelerates** because the number of
steps per frame ramps up over time. No AI, no video — a couple hundred lines of
geometry, tunable from one `CONFIG` block.

---

## 8 · Glossary

- **Attribute** — a value that differs per particle (position, size). Uploaded
  once to the GPU.
- **Bloom** — a glow effect where bright areas bleed light into their surroundings.
- **Component** — a reusable, self-contained piece of UI in React.
- **DOM** — the live, in-memory representation of the page that JavaScript edits.
- **fBm** (fractional Brownian motion) — layered noise that looks cloud-like and
  natural; used to give the particle field structure.
- **Fragment shader** — a GPU program that runs per pixel and decides its colour.
- **GLSL** — the C-like language shaders are written in.
- **GPU** — the graphics card; runs thousands of shader invocations in parallel.
- **Hook** — a React function (name starts with `use`) that taps into React
  features or shared logic.
- **Lerp** — linear interpolation; smoothly moving a value a fraction of the way
  toward a target each frame.
- **Post-processing** — effects applied to the finished rendered image.
- **Rejection sampling** — keeping random samples more often where a target
  density is high, to shape a distribution.
- **Shader** — a small program that runs on the GPU.
- **Simplex noise** — a specific, efficient kind of smooth noise; drives drift.
- **State** — React data that triggers a redraw when it changes.
- **Uniform** — a value that is the same for every particle in a given frame
  (the clock, the mouse); how JavaScript talks to a shader.
- **Vertex shader** — a GPU program that runs per particle and decides where it
  lands on screen.
- **z-index** — which layer sits in front of which.

---

*Last updated 2026-07-24. Keep this current with the code.*
