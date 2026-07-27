# References

Reference websites Melvin likes, compartmentalized by their **differences** so
we can pick a direction deliberately. Two rounds:

- **Round 2 (current, 2026-07-27)** — for the abstract/editorial hero direction.
  Look-first. Fill the table as links come in.
- **Round 1 (2026-07-24)** — the original 8, gathered for the earlier direction.
  Kept as history further down; still useful, but predates the "no single field"
  and abstract/editorial steer.

---

## Round 2 — abstract / editorial hero (2026-07-27)

**How to use this table:** each column isolates ONE axis of difference so we can
mix-and-match rather than copy a whole site. When Melvin drops a link, we fill a
row from a quick pass, then a deeper deconstruction below.

Studied 2026-07-27 (Melvin's 4 links). They fall into **two camps** — see below the table.

| # | Site | Camp | Art style | Motion technique | Tool stack | Steal / avoid |
|---|------|------|-----------|------------------|------------|---------------|
| 1 | [enzo-casalini.dev](https://www.enzo-casalini.dev/) | **A · WebGL craft** | Premium, 3D-forward, immersive | Real-time WebGL + hand-written GLSL shaders, GSAP-timed | **React + R3F + Three.js + GLSL + GSAP** — *our exact stack* | STEAL: proof our stack reaches Awwwards; shader-driven hero, R3F architecture |
| 2 | [lukebaffait.fr](https://lukebaffait.fr/) | **A · WebGL craft** | Cinematic, experimental, playful-confident | Scroll-driven storytelling, page transitions, 3D | React/Next, GSAP, Lenis, **Barba.js** (page transitions), Three.js, **Blender** (3D assets), Vercel | STEAL: transition choreography, cinematic scroll, terse voice ("Basically, I make websites."), `works/ info/ contact/` nav. AVOID: Barba (we route in React); Blender needs asset skill |
| 3 | [noth.in](https://www.noth.in/) | **B · Editorial brand** | Minimalist, bold type, brand-voice-led, no 3D | Webflow interactions, **glitch/scramble text** ("we are nothin'"), carousel | **Webflow** (no-code) | STEAL: brand voice, glitch text, corner metadata, bracket labels `( 07 )`, loading counter. AVOID: the tool — rebuild the *look* in React |
| 4 | [cinetica.studio](https://www.cinetica.studio/) | **B · Editorial brand** | Aspirational cinematic, imagery-led, animation-light | Webflow scroll-triggers, parallax imagery, a raster `.gif` sphere (not WebGL) | **Webflow** (no-code) | STEAL: **live clock/date**, cinematic taglines, `(WHO WE ARE)` labels, themed loader copy. AVOID: gif-as-hero (we do it in real-time) |

### The two camps (this is the whole decision)
- **Camp A — WebGL craft (Enzo, Luke).** Custom React + Three.js/GLSL + GSAP/Lenis.
  Abstract motion, cinematic, Awwwards-tier. Highest ceiling, highest effort
  (GLSL + possibly Blender). **Enzo proves our stack can reach this tier.**
- **Camp B — Editorial brand system (Noth, Cinetica).** Webflow, type + copy +
  imagery + small interactions. Restraint, brand voice, corner metadata, live
  details, glitch type. Fast, safe, recruiter-legible — but not "insane".

**The synthesis Melvin asked for = A × B:** build in *our* stack (Enzo's stack),
use a **WebGL abstract-motion centerpiece** (Camp A craft) governed by **Camp B's
editorial discipline** (terse brand voice, corner metadata, bracket/paren labels,
a live system detail, glitch type). That is literally "abstract + editorial",
and it's feasible because Enzo shows the stack reaches the ceiling.

### Per-site deconstruction

#### enzo-casalini.dev — the ceiling, in our exact stack
- **Camp A.** WebFetch returned only the title = a JS-rendered SPA shell, itself
  a tell of a heavy client-side WebGL app. Awwwards nominee.
- **Built with:** React + React Three Fiber + Three.js + custom GLSL + GSAP.
- **Why it matters most:** removes the "can we even do this with what we have?"
  question. Same tools, so its techniques are directly reproducible. Treat as
  the north-star for the abstract-motion hero.

#### lukebaffait.fr — cinematic scroll + transitions
- **Camp A.** Awwwards Honorable Mention. He lists his own stack: React/Next.js,
  GSAP, Lenis, Barba.js, Three.js/WebGL, Blender, Vercel.
- **Signature:** "cinematic motion, WebGL and scroll-driven storytelling through
  experimental interactions and handcrafted elements." Playful terse copy.
- **For us:** steal the *choreography* (page/section transitions, scroll story),
  do it with React Router + GSAP instead of Barba; Blender-made 3D is a stretch.

#### noth.in — the editorial brand system
- **Camp B.** Webflow (`cdn.prod.website-files.com`). No WebGL.
- **Signature:** paradoxical brand voice ("Nothin' is Everythin'"), corrupted/
  scramble text, conventional nav + corner metadata, bracket section labels,
  loading counter to 100.
- **For us:** the cheapest high-impact layer. All reproducible in React with CSS
  + a little JS. This is the "editorial skeleton" the WebGL hangs on.

#### cinetica.studio — cinematic brand + live details
- **Camp B.** Webflow. Animation-light (parallax + a gif sphere).
- **Signature:** cinematic taglines ("The impossible is only the beginning"), a
  **live clock/date** on the page, parenthetical labels, themed loading copy.
- **For us:** take the brand/copy discipline and the live system detail; render
  its "immersive" promise for real in WebGL rather than via a gif.

### Axes we're sorting on
The point of Round 2 is to separate these so we choose each independently:
- **Structure** — one epic scroll sequence vs. discrete morphing beats vs. static hero.
- **Art style** — minimal/editorial vs. maximalist/dimensional; palette; type register.
- **Motion source** — WebGL/shader, DOM/CSS, scroll-scrubbed video, or physics sim.
- **Field signal** — must stay field-agnostic (no nebula/neural-net/binary clichés).
- **Feasibility** — how hard in Vite + R3F + GSAP/Lenis, and whether it needs assets made.

---

## Round 1 — the original 8 (2026-07-24) · history

Supplied by Melvin 2026-07-24. **Structure and copy studied; the sites were
never seen** — screenshots unavailable in this environment, so conclusions are
from DOM, copy, and structure only. Palette/type conclusions are therefore NOT
here. Note: this round predates the abstract/editorial + "no single field" steer,
so weigh it against the current direction before adopting anything.

### The vibe sentence (Round 1 draft)
> A dark, dimensional space that feels alive and moves with weight — where the
> craft is in the depth and the motion, and the words stay out of the way.

### What Melvin was drawn to (Round 1)
Asked directly, he chose **darkness and mood**, **3D/WebGL depth**, and **motion
and transitions** — **not** huge sparse typography. Impact comes from the scene
and its motion; type stays quiet and legible. (Still-relevant finding, but
revisit under the new editorial steer, which may push type louder than Round 1.)

### The references
| # | Site | Job | What to steal |
|---|---|---|---|
| 1 | [igloo.inc](https://www.igloo.inc/) | **Hero impact** | Entire page is canvas — DOM essentially empty. Most extreme scene-over-document commitment. Proof the ground can carry everything. |
| 2 | [galekto.com](https://galekto.com/) | **Structure — closest analog** | Individual portfolio where the name IS the hero, rendered letter by letter (`E V R E N`) over a WebGL ground. Nearest to Melvin's situation. |
| 3 | [noth.in](https://www.noth.in/) | **Brand system** | Loading counter to 100. Conventional nav. Facts as corner metadata. Terse one-line project descriptors. Bracketed labels `( 07 )`. |
| 4 | [cinetica.studio](https://www.cinetica.studio/) | **Hero hook** | Display words split around a nested paragraph. Themed loading copy. A live clock/date on the page. Parenthetical labels `(WHO WE ARE)`. |
| 5 | [iancoad.com](https://www.iancoad.com/) | **Micro-detail / restraint** | Cinematographer's reel — homepage is four fields (Title/Director/Producer/Awards). Work first, zero prose. Most disciplined restraint in the set. |
| 6 | [daiki-design.com](https://daiki-design.com/) | **Mood** | One enormous kanji (誠) as graphic element. Bilingual. Philosophy: "functional logic over mere ornamentation." |
| 7 | [ricardochance.com](https://www.ricardochance.com/) | **Structure — recruiter read** | Hero pattern: role label → memorable claim → substantiating paragraph → client logos → FEATURED WORK. Supports work-on-home. |
| 8 | [armory.framer.ai](https://armory.framer.ai/) | **Micro-detail only** | Animated stat counters, word-by-word paragraph reveals, `//2026` date prefixes. (Framer template — take micro-details, nothing structural.) |

### Round 1 notes
- The set is unusually coherent — dark, dimensional, motion-led, terse.
- Outliers: *Armory* (Framer AI-agency template, weakest fit — micro-details only);
  *Ricardo Chance* (copy-heavy — take the hero pattern, not the word volume).

### Patterns already adopted into the build
1. A designed loading sequence (validated by Noth.in + Cinetica).
2. Facts in the corners as small system text, never in the headline.
3. Per-character name reveal (Galekto).
4. Terse one-line project descriptors (Noth.in).
5. Bracketed/parenthetical section labels as a typographic tic.
6. A live system detail — clock/date/coordinates (Cinetica).

---

## Working method (applies to both rounds)
1. **Three rounds, never one prompt:** structure → motion → polish.
2. **Screenshot self-correction loop:** screenshot the result, compare to these
   references, list the differences, fix, repeat. This is where the look gets found.
3. **Show, don't describe** — feed the actual reference, not adjectives.
