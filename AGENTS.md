# AGENTS.md — start here (any AI tool, any session)

**This file is the tool-agnostic entry point to Melvin's portfolio project.**
It is written so that *any* assistant — Claude, Gemini, ChatGPT, Perplexity,
Google Antigravity, Cursor, etc. — can pick up the work cold. If you are an AI
reading this, read this whole file first, then the linked docs, before acting.

> Convention note: many agentic tools auto-read a root `AGENTS.md`. Gemini CLI
> reads `GEMINI.md`, Claude Code reads `CLAUDE.md`. To avoid drift, those are
> kept as thin pointers to THIS file plus `CONTEXT.md`. **This file + `CONTEXT.md`
> are the two things to feed a chat tool that can't browse the repo.**

---

## 1. What this is
Melvin Karupati's personal portfolio website. Melvin is a **Computer Science
student at Eastern Michigan University**. The site must read, immediately, as
the work of a CS person with wide range — **not** as belonging to any single
field. Concept spine: **"a life in three tenses"** (past / present / future),
carried by content and a glowing "timeline thread" motif, not by the nav.

Audience: ~70% recruiter, 30% personal identity. Easy to navigate; personality
expressed through *craft* (motion, 3D, detail), never by making a visitor work.

## 2. Read these, in this order
1. `CONTEXT.md` — **living decision log + current state. The top section is
   authoritative and supersedes everything below it.** Read this every session.
2. `PORTFOLIO_VISION.md` — the full vision/spec and the reference-driven process.
3. `site/CLAUDE.md` — hard build rules the coding work must follow.
4. `docs/references.md` — design reference sites (compartmentalized by their
   differences) **and the code/technique repos actually in use, with license
   + what each was used for** (see its "Code / technique repos" section).
5. `docs/artifacts.md` — index of every prototype/artifact link + what each is for.
6. `docs/concepts.md` — approved visual concepts and which page each is reserved for.
7. `docs/particle-mask-technique.md` — full teardown of the hero mask's
   technique (GPGPU particles on a 3D mesh) + the clean-rebuild plan we followed.
8. `docs/CODEBASE.md` — how the code works (learning doc; **stale as of
   2026-07-27, predates the mask/glass work — trust `CONTEXT.md` + the source
   over it until it's updated**).
9. `docs/pages/home.md` — the Home/hero spec.

## 3. Current priority (2026-07-27)
- The **hero direction is being chosen**: abstract / editorial / "insane" —
  deliberately NOT pointing at one field (no nebula, no neural nets, no binary).
  It is scrollytelling that mixes kinetic type + abstract motion across internal
  "beats". **Get the LOOK right first; font and copy come later.**
- Decision method: **references before build.** Study sites Melvin likes, extract
  approaches, let him pick — do NOT ship a blind guess into the site. Probe new
  visuals as a standalone prototype (its own HTML file / artifact) FIRST; wire
  into the site only after Melvin approves.
- The nebula hero was cut and **parked** in `parked/hero-nebula/` (not deleted).

## 4. Structure being built toward
| Surface | Concept |
|---|---|
| Hero | Scrollytelling; abstract/editorial; theme morphs across internal beats |
| About | Its own distinct concept (past — Kuwait → India → Michigan) |
| Work | Its own distinct concept (present — Manas flagship + projects) |
| Vision | Its own distinct concept (future — manifesto) |
| Contact | Its own distinct concept |
| Résumé | A *completely different* treatment — "the coolest way to display a resume" |

Each page owns its own visual world; there is no global background scene.
**Only the hero has scrollytelling — hard rule.**

## 5. Hard rules (full list in `site/CLAUDE.md`)
- Dark only. Near-black base `#06070d`, never pure black. No light mode.
- Custom GLSL for signature scenes; quality bar is raymarched/volumetric, not
  flat "web art". AI-generated stills may only feed a shader as source, never ship.
- **Never put a backtick inside a GLSL template-literal string** — it silently
  blanks the whole page. Syntax-check any file with inline shaders before shipping.
- Z-order: scene `z-1` < content `z-10` < progressive blur `z-30` < nav `z-50`.
- Comment non-obvious logic — **Melvin reads and edits the code himself.** Deep
  explanations go in `docs/CODEBASE.md`, not inline. Don't comment every line.
- Honor `prefers-reduced-motion`; content readable without any animation.
- Update `CONTEXT.md` (and `docs/CODEBASE.md` if code changed) in the SAME pass.

## 5b. The README is the master key (maintain it, finalize it at the end)
Root `README.md` is the project's **master key** — a detailed, learning-optimized,
rebuild-from-scratch document listing every tool / language / framework and
**what each part of the website is made with**. Requirements:
- It is a **living document**: when a feature is approved into `site/`, add its
  row to README §3 (what it's built with + the technique) and any learning note
  to §6, in the same pass.
- It must stay **detailed enough to rebuild the site from an empty folder**, and
  **structured to teach** — say what a thing is and why, not just what it does.
- **At the very end of the project, finalize it**: resolve every 🚧 marker,
  complete the rebuild-from-scratch guide, and commit it as the closing step.
- Details matter — exact versions, exact file paths, exact commands.

## 6. Stack & how to run
Vite + React + TypeScript · Tailwind v4 · Three.js (React Three Fiber + drei) ·
custom GLSL · GSAP ScrollTrigger + Lenis · React Router · deploys to Vercel.

```bash
cd site
npm install        # first time
npm run dev        # dev server (opens on 5173, or next free port)
npx tsc --noEmit   # typecheck — must be clean
npx oxlint         # lint — must exit 0
npm run build      # production build
```
The code lives in `site/`. Prototypes/experiments live in `scratchpad/` or as
standalone HTML, never wired in until approved.

## 7. Working agreement (how to not waste Melvin's time)
- References first, then build. No blind visual guesses into the site.
- One change goal at a time: structure → motion → polish, not all at once.
- Anything hard to reverse or outward-facing (deploys, deletes): confirm first.
- **End every session by updating `CONTEXT.md`'s top section** with what changed
  and what's next. The #1 failure mode here is context lost between sessions.
