# Portfolio — Vision & Build Spec

Owner: Melvin · Created: 2026-07-22 · Updated: 2026-07-24 · Status: vision + stack confirmed; audience decided; per-page design in progress, waiting on Melvin's reference folder

> **Deep per-page specs live in `docs/pages/`** — this doc is the spine and the
> resource playbook. When a page detail here disagrees with its page spec, the
> page spec wins. Who Melvin actually is: `CONTEXT.md`.

---

## Part 1 — The Vision

### Concept: "A life in three tenses"

A personal world organized around **time**: every visitor travels through who I
was, who I am, and who I'm becoming. A single glowing **timeline thread** is the
visual motif that persists across the whole site — it's the first thing you see
forming in the hero, it runs through every page, and scroll position moves you
along it.

**Audience — decided 2026-07-24: ~70% recruiter, 30% personal identity.**
Earlier drafts of this doc opened with "not a resume site." That framing is
**superseded.** The site must be effortless to navigate for anyone who lands on
it, recruiter or not — the work is easy to find, the résumé is always one click
away, and nothing important is hidden behind an experience you have to complete.
The remaining 30% is where the personality lives, and it lives in **craft**:
animation, 3D, and nuanced eccentricities. Personality is never expressed by
making a visitor work for the content.

Tone: **authentic first, cinematic second.** The 3D and shaders are a stage;
the content on that stage is real — real milestones, real projects, real writing
voice, real photos. No lorem-ipsum energy, no generic "passionate developer" copy.
Worth noting: filmmaking and storytelling are genuine interests of Melvin's, so
the cinematic treatment is self-expression, not decoration.

### Art direction

- **Palette**: deep near-black base (dark navy/charcoal, not pure #000), one
  signature accent gradient (e.g. ember-orange → violet, final pick during design
  pass), restrained neutrals for text. Dark theme only — no light-mode fork.
- **Surfaces**: liquid glass for all UI chrome — nav, cards, modals. Frosted blur,
  specular edge highlight, subtle refraction on hover. (Direct lineage from the
  Manas liquid-glass shell — this is a signature, reuse and refine it.)
- **Light**: volumetric, HDR-feeling glow moments — the quality bar is the Manas
  raymarched work, not flat mesh-and-sprite "web art".
- **Typography**: large expressive display face for headlines (candidates: a
  high-contrast serif or a wide grotesk — decide in Phase 1), clean sans for body.
  Oversized type is itself a design element (hero name, chapter numerals).
- **Motion language**: slow, physical, inertial. Smooth (lerped) scrolling,
  scroll-scrubbed camera moves, magnetic hover on interactive elements, parallax
  depth layers. Nothing bounces; everything glides.

### The pages

**Naming — decided 2026-07-24.** Nav labels are **conventional**, because a
recruiter hunting for projects cannot be expected to guess that "Now" means
work. The three-tenses concept moves *into* the pages instead: each carries an
eyebrow line naming its tense, plus the timeline thread and oversized year
numerals. `src/pages/Chapter.tsx` already has an `eyebrow` prop for this.

| Nav label | Route | Was | Eyebrow (the tense) |
|---|---|---|---|
| Home | `/` | — | — |
| About | `/about` | Journey | the past |
| Work | `/work` | Now | the present |
| Vision | `/vision` | Ahead | the future |
| Contact | `/contact` | — | — |

A **Résumé** button sits persistently in the nav and is the site's one accent
use — see "Site-wide systems" below. Descriptions that follow still use the
original chapter names where they describe the *content*; the mapping is above.

**1. Home — the arrival**
- Full-viewport WebGL hero: a volumetric scene (nebula / aurora / particle field —
  concept art decides) that slowly evolves and reacts to the pointer. The timeline
  thread coalesces out of the particles.
- Name and a one-line identity statement reveal over it. Scroll cue.
- Scrolling pins the hero and scrubs a camera move; the scene parts to reveal a
  short "who I am" section — 3–4 sentences, honest voice, a real photo treated
  with the site's look.
- Then three **chapter portals** (liquid glass cards): Journey / Now / Ahead —
  each with a live miniature of its page's scene. Hover tilts and refracts.
- Compact footer: email, socials, resume.

**2. Journey — the past**
- Pure scrollytelling. A vertical trip along the timeline thread; each milestone
  is a *scene* (year numeral in huge type, 1–2 sentences, optional image/artifact),
  entered and exited with scroll-driven transitions — camera dolly, depth-of-field
  shift, particles reforming between scenes.
- A slim progress rail shows where you are in the years.
- 6–10 milestones max. Ends by handing off: "…which brings us to now" → link to Now.

**3. Now — the present**
- What I'm currently building and who I currently am.
- **Flagship project feature**: Manas gets a hero-sized case block — live WebGL
  embed or captured video loop, not a static screenshot — plus stack + role +
  links. 2–5 more projects as liquid glass cards with refractive hover and a
  FLIP-style expand for details.
- **Skills constellation**: an interactive 3D node graph — skills as stars,
  related skills linked; hover a star to highlight its constellation.
- Optional "currently" strip: building / reading / exploring — small, human.

**4. Ahead — the future**
- The most abstract page. A manifesto-style scroll piece: where I'm headed, what
  I want to build, the kind of problems I care about.
- Visual: a generative scene that *assembles as you scroll* — particles gradually
  organizing from chaos into structure, mirroring the text. Ends unresolved and
  open (the future isn't finished) with a final CTA: "Build it with me → contact".

**5. Contact**
- Short and warm. Big email link (copy-on-click with a satisfying interaction),
  socials, resume download, location/timezone. The timeline thread ends here,
  looping back toward Home.

### Site-wide systems

- **Persistent liquid-glass nav**: conventional page names + a **Résumé button**
  + a miniature timeline scrubber showing which tense you're in. Hides on
  scroll-down, returns on scroll-up.
- **Résumé is the one accent element.** The ember→violet gradient belongs almost
  exclusively to the résumé CTA — it satisfies the "one accent, used rarely"
  premium tell while giving the single most important recruiter action the most
  visually privileged element on every page. Résumé repeats in the Home footer
  and on Contact; nothing else gets the accent treatment.
- **Page transitions**: WebGL crossfade/wipe (shader transition) between routes —
  the site should feel like one continuous space, never a hard page load.
- **Loading sequence**: a designed 1–2s intro (thread drawing itself in) that
  doubles as asset preload. Skippable, and only full-length on first visit.
- **Custom cursor**: subtle glow dot + context morphing (expands over links,
  becomes "drag"/"view" hints). Desktop only.
- **Sound**: optional, off by default — a single ambient loop + soft interaction
  ticks behind a glass toggle. (Cut if time is short; nice-to-have.)

### Quality gates (non-negotiable)

- 60fps on a mid-range desktop GPU; adaptive quality tiers (resolution scale,
  particle counts) chosen by a startup benchmark.
- Mobile gets tuned-down but *real* scenes — never a blank div where 3D was.
- `prefers-reduced-motion` honored: scroll-scrub becomes simple fades, no autoplay
  motion. No-WebGL fallback: static rendered imagery of each scene.
- Content readable without JS-driven animation ever finishing (no text held
  hostage by a tween).
- Lighthouse: performance ≥ 85 mobile, accessibility ≥ 95, SEO ≥ 95. Proper
  meta/OG images so links preview beautifully.

### Content checklist — Melvin's homework (blocks Phase 3+)

- [ ] One-line identity statement (the hero line)
- [ ] "Who I am" — 3–4 sentences, real voice
- [ ] 6–10 Journey milestones: year, title, 1–2 sentences, optional image
- [ ] Projects: Manas + 2–5 others — name, one-liner, stack, role, links, media
- [ ] Skills list grouped into constellations
- [ ] Ahead: the manifesto — even bullet points; we'll shape the prose together
- [ ] 1–2 photos of you, resume PDF, email + socials, domain name choice

---

## Part 2 — Implementation Plan

### Stack

| Layer | Choice | Why |
|---|---|---|
| Build/framework | **Vite + React + TypeScript** | Fast iteration, componentized pages, huge R3F ecosystem |
| Styling | **Tailwind CSS v4** + CSS custom-property design tokens | Converged on by 2 of the 3 source guides; fast component styling |
| 3D | **Three.js via React Three Fiber + drei** | Declarative scenes per route, easy scene sharing/portals |
| Shaders | **Custom GLSL** (raymarch hero, transitions) | The quality bar — this is where "web art" is avoided |
| Scroll/animation | **GSAP ScrollTrigger + Lenis** | Scroll-scrubbed timelines (Journey/Ahead) + buttery smooth scroll |
| Routing | **React Router + custom WebGL transition layer** | Multi-page feel, single WebGL canvas persists across routes |
| Hosting | Static deploy — **Vercel** | Free, instant, custom domain, OG image support |

Validated by convergence: three independent guides (Promptible, Janus Tiu,
plus our own reasoning) land on React + Vite + TypeScript; two add Tailwind;
Promptible independently picked Lenis. This is also the toolkit behind most
award-tier interactive sites (Awwwards SOTD work, studios like Active
Theory/Resn). R3F is Three.js, not a different engine.

**GSAP ScrollTrigger over Framer Motion** (Promptible's pick): Framer Motion is
better at component enter/exit; ScrollTrigger is better at scroll-scrubbed
timelines pinned to sections — which is the core mechanic of Journey and Ahead.
Framer Motion can be added later for UI micro-interactions if wanted.

### Hero/scene visual approach: hybrid

Signature moments (hero, chapter transitions, the Ahead assembly scene) stay
**fully custom GLSL/R3F** — procedural, live-reactive to scroll and pointer,
matching the Manas raymarched quality bar. AI-generated stills (Nano Banana /
Whisk-style) are permitted only as *source material feeding the shader* — e.g.
a generated portrait or texture reprojected into the scene — never as the final
rendered output on their own. No scroll-scrubbed AI video stands in for a scene
that should be procedural; that technique is reserved for secondary content
(Now-page project loops, milestone atmosphere) where a rendered clip is
appropriate rather than a compromise.

### Phases

Each phase ends with an in-browser verification pass (console clean, fps check,
mobile viewport) before moving on.

- **Phase 0 — Content & concept (parallel, no code)**
  Melvin fills the content checklist **and builds a reference folder** (see
  Part 3): 5–8 curated references, each with a named job — mood, brand system,
  hero impact, structure, micro-detail. Meanwhile: pick accent palette + type
  pair, produce a one-page style tile (HTML) to lock the look before any 3D work.

- **Phase 1 — Foundation**
  Scaffold (Vite/React/TS), design tokens, the liquid-glass component kit
  (nav, card, button, toggle), Lenis smooth scroll, routing shell with the
  persistent-canvas architecture and a placeholder shader transition.
  *Exit: you can navigate 5 empty pages and it already feels expensive.*

- **Phase 2 — The hero**
  The signature raymarched/volumetric home scene + pointer reactivity + timeline
  thread + loading sequence + hero→about scroll scrub. Hardest single deliverable;
  do it early while energy is high.
  *Exit: home page alone is screenshot-worthy.*

- **Phase 3 — Journey**
  Scrollytelling engine (scene manager keyed to scroll progress), milestone scene
  template, progress rail, populate real milestones.

- **Phase 4 — Now**
  Manas flagship block (live embed or video loop), project card system with
  expand, skills constellation graph.

- **Phase 5 — Ahead + Contact**
  Scroll-assembled generative scene, manifesto typesetting, contact page,
  copy-email interaction, timeline thread closure.

- **Phase 6 — Polish & ship**
  Adaptive quality tiers, mobile tuning, reduced-motion + no-WebGL fallbacks,
  a11y pass (keyboard, focus, contrast, alt text), SEO/meta/OG images, favicon,
  analytics (optional), custom domain, deploy. Full quality-gate audit.

---

## Part 3 — Resource Playbook

Distilled from Melvin's collected resources (2026-07-22 to 2026-07-23): "Build
Premium Sites with AI" (Luke, PDF), cindyzhu.com.au Claude rebuild guide,
motionsites.ai, Promptible's Replit 3D master prompt, Castimedia interactive
portfolio guide, Janus Tiu's "Cinematic sites in ten minutes" (PDF).

**Janus Tiu's guide — the third independent source landing on React + Vite +
TypeScript**, this time with Tailwind CSS added (also used by Promptible). Two
concrete things adopted directly:
- **Tailwind CSS added to the stack.** Three sources now converge on it
  independently; it's a speed multiplier for exactly the kind of component
  styling this build needs, without fighting our CSS-variable design tokens.
- **A working `.liquid-glass` CSS recipe** (blur + inset highlight + gradient
  mask border) — adopted as the literal starting point for our glass component
  kit rather than reinventing it, then extended with refraction/hover states.
- **The "one seamless 5s video loop behind a glass hero" technique** — confirms
  the video-loop approach is worth having in the toolbox for secondary/section
  content, still distinct from the fully-custom shader hero per our hybrid
  visual decision.
- **Ship checklist** (video attrs `autoPlay muted loop playsInline`, black
  section bg to prevent white-flash, invisible loop seam, compressed + muted
  file, tested on a real phone) — folded into our Phase 6 quality gate.

### Process rules adopted

1. **Reference before build** (Luke). Never design from a blank screen — that's
   how "AI-generic" happens. Phase 0 reference folder, 5–8 items, each with a
   job: Pinterest for mood (search the *vibe*, not "website design"), Behance
   for brand system, motionsites.ai for hero hooks, Dribbble for structure +
   micro-details (a hover, a footer, a form transition). References that
   contradict each other confuse the direction — pick one vibe sentence first.
2. **Three rounds, not one prompt** (Luke). Structure → motion → polish. Matches
   our phases; also applies *within* every page build. Never ask for everything
   at once; when something breaks, describe the break + the want, don't restart.
3. **Screenshot self-correction loop** (Cindy Zhu). Each phase's verification:
   screenshot the result, compare against the reference, list visual
   differences, fix, repeat. Add to every phase exit.
4. **Show, don't describe** (Promptible). When directing the build, feed actual
   reference images/sites/videos rather than adjectives.
5. **Import solved problems** (Luke). Contact form, marquee, pricing-style
   blocks: pull from component registries (21st.dev) as *references to remix*,
   restyled into our liquid-glass system — never pasted as-is.
6. **Project CLAUDE.md** (Luke). At Phase 1 scaffold, write a CLAUDE.md in the
   portfolio repo encoding: art direction, premium tells, quality gates, the
   three-round rule — so every future session starts opinionated.

### Premium tells (fold into design reviews — the 50ms test)

- Generous space: emptiness reads as intent; cramming reads cheap.
- One accent color, used rarely — power through scarcity.
- One type family, few weights, before reaching for a second face.
- One focal point per screen; everything else waits its turn.
- One ask per page — a single obvious next move, not five loud buttons.

### Techniques to steal (with credit to source)

- **Scroll-scrubbed video, done right** (Promptible master prompt): drive
  `video.currentTime` from scroll via rAF with LERP smoothing (~0.12), and only
  seek when `!video.seeking` — queue the next seek for the `seeked` event.
  Without the guard: black frames + stutter. Use for the Manas flagship block
  (video loop scrub) and any pre-rendered cinematic sections.
- **Lenis config that feels right** (Promptible): duration 1.2, easing
  `1.001 - 2^(-10t)` exponential decel, smooth on desktop only, touch left native.
- **Text scramble in/out** (Promptible): character-decode reveal on load, scramble-out
  on scroll; reserve for hero headline + nav hover — a signature, not a default.
- **Progressive blur edge** (Promptible): bottom-of-viewport backdrop-blur
  gradient instead of a flat dark overlay — depth without dimming the scene.
- **Z-layer discipline** (Promptible): scene (z-1) < content (z-10) < blur edge
  (z-30) < nav (z-50); never put an opaque bg on a layer above the scene, and no
  lazy dark overlays on top of the hero visual.
- **AI asset pipeline** (Luke + Castimedia): hero/section imagery can be
  generated — image model (Google AI Studio / Whisk, Claude writes the visual
  prompt: subject, lighting, mood, composition, 16:9) → animate (Kling / Whisk,
  ONE motion per prompt, 5s, loopable) → compress (ezgif, <2MB). Candidate uses:
  a stylized cinematic portrait of Melvin for the About/Journey sections;
  atmosphere loops for milestone scenes.
- **Frame-sequence scrub as fallback** (Castimedia): pre-render a scene to a
  WebP frame sequence and scrub it on a canvas by scroll. Adopted as our
  **no-WebGL / low-tier mobile fallback** for the hero — the site degrades to a
  pre-rendered version of the *same* scene, never to a blank div.

### Order of decisions still open

1. Accent palette + typography pair — Phase 0 style tile
2. Hero scene concept (nebula vs aurora vs abstract particle field) — Phase 0/2
3. Domain name — before Phase 6
4. Sound design in/out — Phase 5

**Sequencing note**: Melvin is collecting the reference folder before any
scaffolding starts (Phase 1 does not begin until references + content
checklist are in hand) — deliberately not built in parallel.
