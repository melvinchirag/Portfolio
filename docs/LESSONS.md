# LESSONS.md — what went wrong, and what to do better

**Purpose.** A blunt, honest retrospective of the mistakes made building this
portfolio, so no AI (or Melvin) repeats them. Model-agnostic: any tool picking
up this project should read this file after `AGENTS.md`/`CONTEXT.md`. This is
not a blame doc — most failures were *process* failures shared between Melvin
(the vision) and the assistant (the execution + the duty to push back). Update
it whenever a new mistake teaches something.

**The framing Melvin gave:** "You're the weapon, I'm the archer; my archery is
weak but I have vision." The correction: **a good weapon warns the archer when
the shot is wrong.** Most of these failures happened because the assistant
built what was asked without pushing back hard enough, or guessed instead of
getting a target first. So the fixes below are mostly *assistant-side discipline*.

---

## The mistakes (each: what happened → why it was wrong → what to do instead)

### 1. Building visuals on a GUESS, with no agreed reference — the #1 time-sink
**Happened:** repeatedly built a full visual (particle face, 4 loader
renditions, procedural nebula, photo→particle mask, the glass, the name lockup)
against a guess of what Melvin wanted, then had it rejected. Each cost a full
build cycle.
**Why wrong:** Melvin has a specific image in his head and reacts to concrete
things, not adjectives. Guessing oscillates between wrong extremes.
**Do instead:** never build a signature visual blind. First get a reference
(a site, an image, his exported settings) or build 3–6 tiny side-by-side
options and let him point at one in 30s. Convert guess→build→reject into
pick→refine. **This rule was written down early and then repeatedly ignored —
following it is the single biggest available speedup.**

### 2. Procedural code cannot fake photoreal
**Happened:** procedural nebula shaders and a photo-to-particles "face mask"
were rejected for looking flat/fake.
**Why wrong:** a NASA nebula or a real face is enormous real-world detail;
noise functions have a hard ceiling below it.
**Do instead:** for photoreal, use real source data (a photo, a 3D scan/model).
For *abstract/stylised* motion (fields, particles, a stylised deep-space scene
like Manas), procedural is the right tool and looks great. Know which side of
that line the task is on before starting.

### 3. A static image is not scrollytelling
**Happened:** put a static nebula JPG behind the hero and "zoomed into it" on
scroll, called it scrollytelling.
**Why wrong:** scrollytelling means the *scene itself* animates and reacts as
you scroll — a living world — not content fading over a still image.
**Do instead:** the motion must live in the scene (a scroll-driven 3D camera,
parallax layers, elements entering/reacting). If it doesn't move as a scene,
it isn't scrollytelling.

### 4. Not pushing back enough
**Happened:** built things the assistant suspected were weak (or that
contradicted earlier decisions) without saying so first.
**Why wrong:** the assistant is supposed to be the expert on execution and warn
before spending a cycle on a weak idea. Silent compliance wastes Melvin's time
and credits.
**Do instead:** when a request is likely to disappoint or is technically risky,
say so with reasons BEFORE building. Melvin explicitly wants this and takes it
well.

### 5. Turquoise everywhere (ignoring restraint)
**Happened:** used a turquoise/teal accent (`#80fff0`) across nav, name, rails,
glyphs — Melvin found it cliché and banned it outright.
**Why wrong:** violated "one accent, used rarely," and leaned on a cliché
colour. An accent should be deliberate and sparse.
**Do instead:** TURQUOISE/TEAL/CYAN IS BANNED site-wide (see CONTEXT/AGENTS).
More generally: pick accents deliberately, use them rarely, confirm them.

### 6. Judging an effect in isolation (the glass)
**Happened:** spent hours "fixing" the liquid-glass shader when it looked flat —
the real cause was that it sat over a black void with nothing to refract. A
one-minute test (bright background behind it) proved the shader was fine.
**Why wrong:** debugged the wrong layer; refraction/blur are meaningless over
black.
**Do instead:** diagnose before tuning. When an effect depends on context
(what's behind/around it), test it in that context first.

### 7. Operational hygiene — stale dev servers caused a false "nothing changed"
**Happened:** 6 dev servers ran at once (5173–5178); Melvin was viewing an old
one and reasonably concluded no changes had landed.
**Do instead:** keep ONE dev server. Kill strays. Always tell Melvin the exact
current URL. (Also: Vite HMR poisons a tab if a component throws mid-edit —
open a FRESH tab; if black everywhere, `rm -rf site/node_modules/.vite` +
restart.)

### 8. Over-building in one pass without incremental verification
**Happened:** large multi-file changes shipped before looking at the result,
so problems compounded.
**Do instead:** structure → motion → polish, one change goal at a time; verify
live (screenshot, compare to reference) before piling on the next thing.

### 9. Type read as "vibe-coded"
**Happened:** default-ish serif faces (Instrument Serif) at big sizes read cheap.
**Why wrong:** type carries the whole page; a fallback/near-default face
undermines everything around it.
**Do instead:** treat type as a first-class decision, get the target face
agreed, and use genuinely refined fonts (self-hosted in the site, since
artifacts can't). Placeholder is fine if labelled as placeholder.

---

## The process we're adopting because of all this (Melvin's own structure)
1. **Foundations before pizzazz.** Get content, page structure, routing, and
   plain UI right FIRST (this needs no high fidelity — a cheaper model/AGY can
   do it). THEN layer on the signature high-fidelity moments.
2. **Division of labour by fidelity.** Foundations (content/structure/UI/page
   planning) → Melvin + Antigravity/other tools. High-fidelity pizzazz
   (deep-space engine, mask, real scrollytelling motion, liquid glass) → the
   strongest model (Claude), in focused sessions.
3. **Model-agnostic by construction.** The repo — not any chat history — is the
   source of truth (`AGENTS.md` → `CONTEXT.md` → `PROMPT.md` → this file →
   `docs/PAGE-PLAN.md`). Melvin can switch AI tools "like a pair of gloves."
4. **Log every change to `CONTEXT.md` immediately** (standing rule), and add new
   hard-won lessons here.
