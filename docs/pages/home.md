# Home — page spec

Route `/` · Last updated 2026-07-24
Governed by `../../site/CLAUDE.md` · Visual identity blocked on `../references.md`

> This doc is the current truth for Home. Where it disagrees with
> `PORTFOLIO_VISION.md`, this wins.

---

## Purpose

Convince a recruiter in about thirty seconds that Melvin is worth talking to,
while making them feel they walked into someone's world rather than opened a CV.

Both halves are load-bearing. Only fast, and it's a resume. Only beautiful, and
it fails the 70% it was built for.

## The one ask

**See the work.** Everything else either builds the credibility that makes that
click worth making, or gets out of its way. Résumé is a persistent nav
affordance, not a competing ask. Contact lives in the footer.

---

## The spine — one particle system, three states

The organizing idea of the page, and the reason it holds together:

> **The hero field and the portrait are the same particles.**

The page opens on an unorganized nebular field. As you scroll, that field
**resolves into Melvin's face**. It holds. Then it **dissipates** and you
continue into the content.

**Chaos → a person → chaos.**

Three reasons this is the right structure:

1. **It unifies the page's two best moments** into one continuous gesture rather
   than two unrelated WebGL scenes that happen to sit next to each other.
2. **It's cheaper and faster** — one particle system, one draw path, one set of
   uniforms. Not two scenes competing for GPU budget.
3. **It means something.** He assembles out of the same material he came from.
   That reads without being explained, which is the only kind of meaning worth
   putting in a visual.

Noted tension: the Vision page also planned a particle-assembly scene. Home
spends that idea first. Defensible as a **motif** — Home assembles into a
*person*, Vision assembles into *structure* — but if Vision later feels like a
retread, Home keeps the idea and Vision changes, not the other way round.

---

## The triptych portrait

**One face, three vertical regions**, each rendered in a different visual
language, resolving into a single portrait. Not three animations. Not a blend.

| Region | Rendered as | Stands for |
|---|---|---|
| A third | **Neural network** — nodes with edges tracing facial structure | AI/ML — his strongest current signal |
| A third | **Nebulae** — stellar gas and dust, additive, glowing | Astrophysics |
| A third | **Cinematic film** — grain, halation, gate texture | Filmmaking & storytelling |

**Why this is the strongest idea on the site:** it makes the page's thesis
literal. Melvin's story is that his breadth *is* the point — three fields that
look unrelated composing one person. The portrait argues that in one image,
before a word is read. It also could not be lifted onto anyone else's portfolio.

**Geometry — decided:** vertical thirds with **soft transition zones**. Narrow
bands where particles trade allegiance between languages rather than meeting at
a hard seam. Deliberate enough to read as a triptych, soft enough to stay
unmistakably one face. Hard seams were rejected — they read as three images set
side by side.

Implementation consequence: domain is **not a hard enum**. Each particle carries
blend weights across neighbouring domains, so styling interpolates through the
transition bands.

Which language goes left/centre/right is a composition choice for the reference
pass.

**Rule compliance:** CLAUDE.md permits a photo only as *source material feeding
a shader*. The photo is sampled by luminance into particle target positions and
is never displayed. This satisfies that exactly.

---

## Scroll choreography — beat by beat

Five beats. Roughly five viewport-heights total.

### Beat 1 · Arrival `0–100vh`

**Revised 2026-07-24 against the reference set. The scene is the focal point,
not the type.** Asked what drew him to his eight references, Melvin chose
darkness, 3D depth, and motion — and explicitly *not* typography. An earlier
draft made his name "oversized display type, the single focal point"; that was
wrong. Impact comes from the field and its motion; type is quiet, legible, and
supporting. Do not re-inflate it.

**Layout — a quiet centre with a system HUD around it:**

```
┌──────────────────────────────────────────────────────┐
│  Melvin              About  Work  Vision  [Résumé]   │  ← nav, nearly frameless
│                                                      │
│                     MELVIN                           │  ← name, moderate scale
│              < identity line — his words >           │  ← one claim
│                                                      │
│  Computer Science · EMU                    scroll ↓  │  ← corner metadata
└──────────────────────────────────────────────────────┘
```

Two text elements in the centre; facts in the corners. **The role line moved out
of the headline stack** to bottom-left as small system text — present and
scannable for a recruiter, no longer competing for attention. This follows every
reference that carries metadata (Nothin's "Creative studio in Paris", Cinetica's
live clock).

- **Name** — per-character reveal, soft stagger, fade and rise. No bounce.
  Pattern taken from Galekto, whose name is also its hero element.
- **Identity line** — one claim, his voice. _Outstanding — ships as a marked
  placeholder rather than an invented line._
- **Corner metadata** — role bottom-left, scroll cue bottom-right. Scroll cue
  fades permanently after the first scroll input.

All of it readable before any animation completes. Hard rule.

**Preceded by a designed loading sequence** — validated by two references
(Nothin' counts to 100; Cinetica themes it "LOADING NEW REALITY…"). Skippable,
full-length on first visit only, doubles as asset preload.

**The field must not look like "some dots."** This is the line between the
quality bar CLAUDE.md demands and "web art":

- **Filamentary density, not uniform random** — positions rejection-sampled
  against an fBm density field at init, giving clusters and voids like real
  nebular structure. Uniform random points are the tell of a cheap scene.
- **Real depth** — wide Z range, perspective camera, size attenuation. Near
  particles large and soft, far ones fine. Depth is what he picked.
- **Curl-noise flow** so drift is organic rather than linear.
- **Colour temperature variance** across the field, not one flat hue.
- **Bloom** so bright cores actually glow.

> **Status 2026-07-24 — Beats 2 & 3 built as an IMAGE triptych** (pivoted from
> particles — see below). The particle-assembled face failed (unrecognizable
> blob) and was retired. The face is now three image treatments of the real
> photo — neural (cyan mesh), film (warm grade), contour (violet iso-lines) —
> composed into one. `PortraitTriptych.tsx` layers the composite + film over the
> ambient particle field; scroll brightens the face and cross-fades composite →
> film, holds, then dissipates as the bio rises. The nebula third was dropped
> (code can't do gas well); contour replaced it. The neural/film/contour mapping
> below still holds conceptually — only the rendering method changed (images,
> not particles).

### Beat 2 · Resolution `~100–200vh`

A **short pin** — about one viewport of scrub. The field organizes: particles
migrate to their target positions and the triptych face resolves. Camera pushes
in slightly.

Deliberately short. Long pins are the biggest friction risk for a skimming
visitor, and at 70% recruiter that cost isn't worth paying.

### Beat 3 · Hold, then handoff `~200–300vh`

The face holds alone for a beat — **no text competing with it**. Then it begins
to dissipate, and as it does, the **3–4 sentence bio rises into its place**.

Sequential, not simultaneous: the face gets its moment, then hands off to the
words. This is what keeps "one focal point per screen" true through the most
visually loaded part of the page.

### Beat 4 · Proof, then work `~300–400vh`

Field returns to a calm drift in the background. Content takes over.

**Proof strip** — compact, factual, scannable in one glance:

> EMU Computer Science · Treasurer, Google Developer Group · AI Club ·
> Finance Lead, EMU Hackathon

*Not in the original vision — added because the 70/30 audience split created the
need. A skimming recruiter needs verifiable credibility early and nothing else
was playing that role. Keep it visually quiet; it earns its place by being true,
not loud.*

**Featured work** — two or three projects surfaced **on Home**. Manas as
flagship plus two. Each: name, one-liner, stack, role, links. Ends with
"see all work →". This is the page's payoff.

*Why on Home: at 70% recruiter, making someone click through before they see a
single project is friction we can't justify.*

### Beat 5 · Footer

Email · socials · résumé · location and timezone. Compact. The field settles to
near-black behind it.

---

## Navigation

**Placement: fixed top bar, full width.** Not the top-centre pill currently in
the code — a conventional bar is what a recruiter's eye expects, and this is the
70% talking.

```
┌────────────────────────────────────────────────────────┐
│  Melvin            About  Work  Vision  Contact  [Résumé] │
└────────────────────────────────────────────────────────┘
```

- **Left** — name or monogram, doubles as the home link.
- **Right** — page links, then the **Résumé button**, in the corner most
  reached for.
- **Résumé is the site's one accent element.** The accent gradient belongs
  almost exclusively to it. This satisfies "one accent, used rarely" *and* gives
  the top recruiter action the most privileged element on every page. Résumé
  repeats in the footer and on Contact; nothing else gets the accent.

**Behaviour:**

- Over the hero the bar is **nearly frameless** — links floating on the scene,
  minimal glass, so it doesn't fight the arrival moment.
- **Glass intensifies as you scroll** past the hero, earning its background only
  once there's content to sit above.
- **Hides on scroll down, returns on scroll up.**
- Mobile: name left, hamburger right; Résumé stays visible outside the menu —
  it's too important to hide behind a tap.

**The three-tenses concept survives here** not in the labels but in each page's
eyebrow line — About reads "the past", Work "the present", Vision "the future".
`src/pages/Chapter.tsx` already has an `eyebrow` prop for this.

---

## Cursor and pointer

Desktop only. Entirely disabled on touch and under `prefers-reduced-motion`.
This is where most of the 30% identity budget gets spent.

**1 · The custom cursor.** A small glow dot that **lerps behind** the true
pointer — trailing slightly, never snapping. This single detail sets the site's
motion language before anything else moves: physical, inertial, nothing bounces.

**2 · The field responds.** Particles near the pointer drift — a gentle push
outward with slow recovery. Continuous, subtle, always on. The page should feel
like it notices you without demanding you notice back.

**3 · The portrait rewards exploration.** *The best interaction on the page.*
Hovering a third **intensifies that third's language** — neural edges brighten
and trace, nebular gas blooms, film grain and halation swell. The face is
interactive rather than a cutscene, and the interaction teaches you what the
three regions mean without a caption explaining it.

**4 · Magnetic hover.** Résumé button and project cards pull slightly toward the
cursor on approach. Reserved for things worth clicking — a magnetic element is
a promise that something happens.

**5 · Depth parallax.** Content layers shift a few pixels against the field with
pointer position. Barely perceptible; felt, not seen.

**Restraint rule:** cursor effects are a signature, not a default. If everything
reacts, nothing reads as special.

---

## Scroll mechanics

- **Lenis** smooth scroll on desktop, native on touch. Config is already tuned
  (duration 1.2, exponential decay) in `src/hooks/useLenis.ts` — don't change
  it casually.
- **GSAP ScrollTrigger** drives the scrubbed beats. Resolution and dissipation
  are **one scalar uniform each**, not per-particle animation.
- **Never trap the scroll.** One short pin only. No scroll-jacking, no
  sequence a visitor cannot escape by scrolling.
- Reveals in beats 4–5 are simple: fade plus a slight rise. Nothing clever
  after the portrait — the page has already spent its attention budget.
- Progressive blur at the viewport bottom (already built in `index.css`).

**Z-layers**, non-negotiable per CLAUDE.md: scene `z-1` < content `z-10` <
progressive blur `z-30` < nav `z-50`. No opaque background above the scene, and
no flat dark overlay to make hero text legible — that's what the blur edge is for.

---

## Content inventory

**Written by Melvin — outstanding:**

- [ ] Identity line (the hero line)
- [ ] Bio — 3–4 sentences, real voice
- [ ] Which 2–3 projects are featured: name, one-liner, stack, role, links
- [ ] Portrait photo to feed the particle system
- [ ] Résumé PDF, email, socials, preferred display name

**Known and usable now:**

- Role line — Computer Science · Eastern Michigan University
- Proof strip — EMU CS · Treasurer, GDG · AI Club · Finance Lead, EMU Hackathon
- Footer location — Michigan, EST

---

## Responsive and fallbacks

- **Mobile** — a real particle scene at reduced count, never a substitute
  image. Portrait resolves in a shorter scroll distance. Cursor effects off.
  Nav collapses but Résumé stays visible.
- **`prefers-reduced-motion`** — the face is present and fully resolved on
  arrival. No assembly, no dissipation, no drift, no cursor reaction. Content
  order is unchanged.
- **No WebGL** — pre-rendered WebP frame sequence of the same shot, scrubbed on
  a canvas. The site degrades to a rendered version of the *same* scene, never
  a blank div.

---

## Blocked on `../references.md`

Deliberately unresolved until the reference folder exists — the project's own
"reference before build" rule. Current values in `site/src/` are placeholders
and must not harden into decisions.

- [ ] Palette (currently placeholder ember → violet)
- [ ] Type pair (currently placeholder Instrument Serif + Inter)
- [ ] The field's character — nebula vs aurora vs abstract
- [ ] The portrait's grade, and which language sits left/centre/right

---

## Notes for the build pass

- `SceneCanvas.tsx` is currently a single fullscreen fBm quad. Home needs it to
  become **one persistent particle system with scroll-driven state**, which is
  a rewrite rather than an extension.
- `@react-three/postprocessing` is **not yet a dependency** — needed for the
  film third's grain and halation, masked to that region.
- `@react-three/drei` *is* a dependency and provides `View` if multiple viewport
  regions are ever needed.
- Routes still need renaming to `/about`, `/work`, `/vision`, `/contact`.
- Build in **three rounds — structure, then motion, then polish.** Never at once.
