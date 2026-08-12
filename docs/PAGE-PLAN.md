# PAGE-PLAN.md — structure, content & the foundations/pizzazz split

**Purpose.** The plan for all five pages + a clear division of labour so Melvin
can build the **foundations** (content, structure, plain UI) with a cheaper tool
(Antigravity / any LLM) while the **high-fidelity pizzazz** (WebGL engine, mask,
scrollytelling motion, real liquid glass) is reserved for the strongest model.
Content below is drafted from `Otto_sys/NOTES.md` + CONTEXT's "Who Melvin is" —
refine with Melvin, don't invent beyond it. **Rule from NOTES.md:** he is
*actively building* in CS/AI-ML only; other fields are interests, never implied
as active work.

---

## 🧱 DIVISION OF LABOUR (read first)

### Foundations — safe for Antigravity / any tool (NOT high-fidelity)
- Writing/refining page copy and structure.
- Routing/layout scaffolding (routes already exist in `App.tsx`).
- Plain UI: project cards, lists, typography scaffolding, spacing, the beat
  text, filling placeholders, contact links, résumé layout.
- Must obey the hard rules: **dark only; TURQUOISE/TEAL/CYAN BANNED; Times New
  Roman is the current placeholder display face; comment non-obvious code;
  `tsc`+`oxlint` clean before commit; log changes to CONTEXT.md.**

### 🚫 DO NOT TOUCH unless you're the high-fidelity model (Claude)
These are the "pizzazz" surfaces — leave them for a focused Claude session:
- `site/src/components/scene/MaskField.tsx` (GPGPU particle mask)
- `site/src/components/scene/LiquidGlassField.tsx` (WebGL glass shader)
- The future **deep-space engine** (not built yet — see Home below)
- Any custom GLSL / shader / scroll-camera / postprocessing work
- The `heroScroll` contract (`site/src/hooks/heroScroll.ts`) — read-only for
  foundations; changing it risks the mask/scroll coupling.

---

## ⏸️ DEFERRED — later implementations (noted 2026-08-11, do NOT build now)
Confirmed by Melvin as intentional "later" items. Parked here so they aren't
lost between sessions. None of these are in scope for the current Work-page pass.
- **Testimonials slide** — a testimonials/quotes surface. Placement TBD (likely
  Home or Work). Not designed yet.
- **The second mask** — a second particle-mask instance (`MaskField.tsx`) beyond
  the first. High-fidelity/Claude work; hold until the first is locked.
- **Computer-vision integration** — a live in-browser CV demo (webcam), the
  natural tie-in to Osiris on the Work page. Deferred; ships as a plain case
  study first, live demo later.
- **On-site AI bot** — a small model trained only on Melvin's data, hosted on
  the site, so visitors can search and "talk about him". Deferred. The Work
  page's canonical tag registry (`src/data/tags.ts`) + search are the
  groundwork it will stand on.

## 🎨 FUTURE PHASES (Melvin, 2026-08-12) — this is only phase 1
Melvin is explicit: the current build is phase 1 of at least five. Big visual
work is coming and should NOT be attempted piecemeal now.
- **Work page UI makeover.** The whole page needs an aesthetics pass (look, feel,
  motion). The collapse/expand format is NOT final: a likely direction is each
  section opening into a **horizontal parallax gallery** navigated with arrows.
- **Insane three.js backgrounds from public repos.** Objective is explicitly a
  learning exercise: study how strong public three.js scenes are built, then
  rebuild "100x" as our own. Never ship someone else's repo as-is.
- Sequence these into the phased plan; keep phase 1 (structure, content, tags,
  search) stable underneath.

---

## HOME — the hero (the ONLY scrollytelling page; must shock & awe)
**Direction (decided 2026-07-28):** a real **three.js/R3F procedural deep-space
engine** (starfield + drifting nebula clouds + planets + depth + a scroll-driven
camera = the whole scene moves as you scroll). The particle mask lives inside
it. Non-turquoise palette. This is Claude/pizzazz work — NOT built yet; the
current hero is a placeholder (mask on black + centred name + clock rail).
- **5 beats** (waypoints the camera flies through). Working titles:
  1. Identity — name + one line.
  2. The Past — Kuwait → India → Michigan.
  3. The Present — what he builds now.
  4. The Future — where he's heading.
  5. The Invitation — a CTA into the rest of the site / contact.
- **Foundations AGY can do now:** finalise each beat's *copy* and the plain
  text/DOM layout of each beat (in `HeroBeats.tsx`, the non-shader parts);
  placeholder visuals per beat are fine. Do NOT build the engine.
- Liquid glass: to be reintroduced as a tasteful surface (per Melvin's JSON
  export spec) — Claude work; don't rebuild the old ugly tabs.

## ABOUT — "The Past"
**Story (already written by his life):** raised in **Kuwait** → junior/senior
year of high school in **India** → **Michigan** for university (transferred to
EMU from Henry Ford College, Fall 2025). A genuine three-act structure.
- **Structure:** milestone scrollytelling / timeline, 3 acts by country.
- **Foundations:** write the 6–10 milestone beats (the three countries, the
  transfer, finding his footing at EMU), lay out the timeline UI. High-fidelity
  motion later.

## WORK — "The Present" (recruiter-critical; lead with the work)
Content from NOTES.md (keep project lineages straight):
- **Osiris** — current flagship. Computer-vision hand-tracking for touchless
  control of any device with a webcam + OS. (Evolved from "Shadow", a hackathon
  ASL/gesture→speech prototype — Shadow is backstory, Osiris is the active name.)
- **Manas** — an astrophysics simulation engine (pulsar model, black-hole
  environment); in progress, describe honestly as such. (The deep-space engine
  we're building for the hero is inspired by Manas's own procedural approach.)
- **Hackathon wins** — **Lingo** (SpartaHack 11) and **EventsOS** (GrizHacks,
  Oakland University). Credit teammates by name when posting/among case studies
  (rosters in NOTES.md).
- **Leadership** — Treasurer, Google Developer Group @ EMU; AI Club; helping run
  EMU's hackathon finance.
- **Structure:** flagship case study (Osiris) + project cards + a skills area.
- **Foundations:** write each project card (name, one-liner, stack, his role,
  links to GitHub `melvinchirag`/Devpost `mkarupat`), build the card grid UI.
- **BUILT 2026-08-11 (structure + content + tag/search):** the page is now a
  data-driven, deeply-collapsible layout — sections **Flagship** (Osiris),
  **Hackathons** (Lingo, EventsOS), **Personal** (Manas, as a domain-expansion
  project — it is NOT a flagship), **Foundations** (skills by domain, each skill
  expandable, a scaffold Melvin fills as he builds), **Leadership**. A canonical
  three-axis tag registry (discipline / tech / purpose, `src/data/tags.ts`) tags
  every project, and a search bar finds projects by tag/name grouped by section.
  Aesthetics (glass, background, motion) are a later pass. Still needed from
  Melvin: real Osiris write-up + media, per-skill Foundations write-ups, real
  Devpost/repo links.

## VISION — "The Future"
The fields he intends to expand into (astrophysics, neurotech, interstellar/
aerospace, quantum, etc.) — framed as **direction, not current work**.
- **Reserved concept:** the **ink-fluid Navier-Stokes sim** (Melvin loved it) is
  earmarked for this page. Also his **50–60 synced masks in a deep-space scene**
  idea (colours vary by screen position off a chosen palette) fits here.
- **Foundations:** write the manifesto copy (bullets are fine). Visual = Claude.

## CONTACT
- Email, **LinkedIn** (linkedin.com/in/melvin-chirag-karupati-...), **GitHub**
  (github.com/melvinchirag), résumé link. Thread loops back to Home.
- **Foundations:** the whole page is foundation-safe — build the contact layout
  + links. Don't invent socials not in NOTES.md.

## RÉSUMÉ — "the coolest way to display a resume" (separate, memorable)
- Open concept — not designed yet. Could be an interactive/animated résumé.
- **Foundations:** get the actual résumé *content* structured first (roles,
  projects, skills, education) as data; the "cool" presentation is Claude work.
- Note: `/resume.pdf` is linked from nav but does not exist yet (404) — add the
  file or fix the link.

---

## Suggested order for the foundations phase (AGY)
1. Fill **Work** (highest recruiter value) — real project cards + copy.
2. Fill **About** — the three-country timeline copy.
3. Fill **Contact** — links + layout.
4. Structure **Résumé** content as data.
5. Draft **Vision** manifesto copy.
6. Finalise **Home** beat copy (text only; leave visuals to Claude).
Commit + log each to CONTEXT.md. When foundations are solid, hand back to Claude
for the deep-space engine + mask + scrollytelling motion + liquid glass.
