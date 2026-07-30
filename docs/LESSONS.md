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

## 10. [CLAUDE] Liquid glass over a video (the job AGY could not finish) — READ THIS, AGY
*Logged by Claude, 2026-07-28.*

**What AGY tried and failed at:** put a scroll-scrubbed video behind the About
page *inside WebGL* so the liquid glass could refract it. AGY reported 5 failed
attempts (ScreenQuad, useAspect, viewport scaling, HTML fallback, custom
Texture); it left the page fully black — no video, no glass — and handed off
saying both were "fundamentally broken."

**Where AGY went wrong (two separate bugs it never separated):**
1. **It scroll-scrubbed the video by setting `video.currentTime` every frame**
   with no `!video.seeking` guard. Seeking a compressed mp4 ~60×/sec thrashes the
   browser's decoder → black/stall. AGY blamed "the decoder" and gave up instead
   of using the standard guard.
2. **It never isolated the glass from the video.** The real reason the page was
   black is the glass, not the video. The glass draws a **full-screen opaque
   quad** that reproduces a *capture of the 3D scene*; when that capture is empty
   the whole screen goes black. AGY changed both things at once and couldn't tell
   which was broken.

**The actual root cause (found by ISOLATING, not guessing — this is the lesson):**
- Turn the glass OFF → the video showed fine. So the video plane worked; the glass
  was blacking the page.
- Force the glass to output its raw capture → near-black. So the *capture* was empty.
- Swap the video for a solid-red plane → the capture showed red. So the capture
  works for normal meshes but **silently will not sample a `THREE.VideoTexture`**
  in that manual `gl.render(scene)` pass (forcing `needsUpdate` every frame did
  NOT fix it — it is not an upload-timing problem). This also explains the whole
  historical "glass looks black/disappointing" saga: the scene-capture only ever
  grabbed the CLEAR COLOR, never the scene geometry.

**The fix (what AGY should have done):**
- **Don't scrub-thrash.** Either just `play()` the video on loop, or scrub with a
  `if (!video.seeking) video.currentTime = target` guard so only one seek is ever
  in flight. (Smooth scrubbing ALSO needs the video encoded with dense keyframes —
  a recording problem no code can fix; Melvin's clip is sparse, so its scrub is
  choppy and we accept that.)
- **Don't make the glass re-capture the 3D scene to refract a video.** Hand the
  video texture *straight to the glass shader* as its background
  (`LiquidGlassField` now takes a `bgTexture` prop) and run the quad in a
  **glass-only alpha mode** (`u_glassOnly`) so it draws ONLY the card shapes and
  is transparent everywhere else — the real background plane shows through, and a
  glass failure can never black out the page again. This is also how the original
  liquid-glass reference actually works (it refracts a background *texture*, not a
  captured scene). Files: `GlobalScene.tsx` (owns the video texture, feeds both
  the plane and the glass), `VideoBackground.tsx` (`VideoPlane`), and
  `LiquidGlassField.tsx` (`bgTexture` + `u_glassOnly`).

**Generalisable rule for AGY (and everyone):** when a composited effect goes fully
black, **isolate the layers before touching the shader** — disable the top layer,
force each input to render raw, swap one variable at a time. Three targeted
isolation tests found this in minutes; "try another Texture approach" five times
found nothing in an afternoon. (This is rule #6 — diagnose in context before
tuning — applied.) And per rule #4: if you're stuck after 2–3 real attempts, say
so and hand off with what you learned; don't ship a black page and call it broken.

---

## 11. [AGY] Vercel 404 on refresh — SPA routing + Root Directory gotcha
*Logged by AGY, 2026-07-30.*

**What happened:** refreshing the site on any route except `/` showed a Vercel
`404: NOT_FOUND` page. Clicking nav links worked fine; only browser refresh or
directly visiting a URL like `/about` broke.

**Why it happened (two issues stacked):**
1. **SPA routing 101.** React Router handles routes client-side — there are no
   physical files at `/about` or `/work`. When the browser refreshes, it sends a
   real HTTP request to Vercel, which looks for a file at that path, finds nothing,
   and returns 404. The fix is a `vercel.json` rewrite rule:
   `{ "source": "/(.*)", "destination": "/index.html" }` — this tells Vercel to
   serve `index.html` for every route, letting React Router take over.
2. **Vercel Root Directory + "Skip deployments" interaction.** The Vercel project
   has Root Directory set to `site/`. I first placed `vercel.json` at the **repo
   root** — Vercel ignored it. Then, because "Skip deployments when there are no
   changes to the root directory" was **enabled**, commits that only touched files
   outside `site/` were silently skipped — the rewrite rule never deployed. The
   fix was placing `vercel.json` inside `site/` (the actual Vercel Root Directory).

**What AGY did wrong:** assumed `vercel.json` at the repo root would be read by
Vercel regardless of the Root Directory setting. Burned 4 attempts before
realising the config file was never being picked up.

**What to do instead / watch out for:**
- **`vercel.json` must live inside `site/`** — always. That's the Vercel Root
  Directory. The repo-root copy is ignored.
- **The "Skip deployments" toggle** means changes to files outside `site/` won't
  trigger redeployments. If you need to force a redeploy after changing something
  at the repo root, make a trivial change inside `site/` too.
- **New React Router routes work automatically** — the catch-all rewrite covers
  everything. No need to touch `vercel.json` when adding pages.
- **`/` always works without a rewrite** because Vercel finds `index.html` at
  the root naturally. This makes the bug deceptive — it looks like "only some
  pages crash" when really it's "the one page that has a physical file works."

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
