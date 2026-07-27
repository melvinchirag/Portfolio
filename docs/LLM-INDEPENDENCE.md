# LLM-Independence Plan

**Goal:** Melvin can keep building this portfolio with *any* AI tool — Google
Antigravity, Gemini, ChatGPT, Perplexity, Cursor, or a fresh Claude session —
without losing context, and without depending on one assistant's memory or
credits. The **repository is the single source of truth; the model is
disposable.**

This is a workflow, not a one-time task. Below: the principle, the file system
that carries context, a per-tool playbook, the copy-paste primer for chat tools,
and the rituals that keep it all from rotting.

---

## 1. Core principle
Nothing important lives in an AI's head or chat history. Every decision, every
piece of state, every rule lives in a **plain-text file in the repo.** When a
session ends or a tool runs out of credits, you lose nothing, because the next
tool reads the same files. Your job as the human is to be the **librarian**:
make sure the files stay current. The tools do the typing; the repo remembers.

## 2. The context file system (already in place)
| File | Role | Update cadence |
|---|---|---|
| `AGENTS.md` | Tool-agnostic entry point. First thing any AI reads. | When rules/structure change |
| `CONTEXT.md` | **Living decision log + current state.** Top section is law. | **Every working session** |
| `PORTFOLIO_VISION.md` | Full vision + process playbook | Rarely — on big pivots |
| `site/CLAUDE.md` | Hard build rules for coding | When a rule is added/changed |
| `docs/references.md` | Reference sites, each with a named job | When you add references |
| `docs/concepts.md` | Approved visual concepts, reserved per page | When a concept is approved |
| `docs/CODEBASE.md` | How the code works (learning doc) | Same pass as any code change |
| `parked/` | Cut-but-kept concepts (e.g. `hero-nebula/`) | When something is shelved |

**Thin pointers** keep tool-specific entry files from drifting: `site/CLAUDE.md`
already exists for Claude; add a one-line `GEMINI.md` (for Gemini CLI) and any
`.antigravity`/rules file that just says *"Read `AGENTS.md` and `CONTEXT.md`
first."* One brain, many doors.

## 3. Prerequisite: put it under version control (do this first)
The project is **not yet a git repo.** Without git there's no history, no undo,
no clean handoff. One-time setup:
```bash
cd "C:/Users/mkarupat/Desktop/Portfolio"
git init
printf "node_modules/\ndist/\n.DS_Store\n" >> .gitignore   # site/.gitignore already covers its own
git add -A
git commit -m "Portfolio: baseline before multi-tool workflow"
```
Then push to a **private GitHub repo.** This is what lets Antigravity/Cursor/any
IDE agent clone the full context, and lets you roll back a bad AI edit instantly.
Commit after every meaningful change with a clear message — the commit log
becomes a second, automatic decision log.

## 4. Per-tool playbook — use the right tool for the job
- **Google Antigravity / Cursor (agentic IDEs)** — best for *building*: multi-file
  edits, running the dev server, refactors. They read the repo directly, so they
  get `AGENTS.md` + `CONTEXT.md` automatically. Point them at those first. Use
  for implementing an approved concept, wiring pages, fixing bugs.
- **Gemini (CLI or web)** — strong for *large-context reasoning* and studying many
  reference sites at once. Add a `GEMINI.md` pointer. Good for "analyze these 6
  sites and compare approaches." Big free/cheap context is its edge.
- **ChatGPT** — good for *ideation, copywriting, and second opinions*. It can't
  browse your repo, so feed it the **primer in §5** + paste the relevant file.
  Use for identity line, project blurbs, naming, art-direction debate.
- **Perplexity** — best for *research*: "how did site X build that effect,"
  "what library does this technique," "examples of editorial scroll heroes."
  Cite-backed answers. Use to reverse-engineer references and find techniques.
- **Fresh Claude session** — same as any: it reads `AGENTS.md`/`CONTEXT.md`.

Rule of thumb: **research → Perplexity; study/compare → Gemini; build →
Antigravity/Cursor; write/ideate → ChatGPT; whichever has credits → Claude.**

## 5. Copy-paste primer (for chat tools that can't see the repo)
Paste this, then paste whichever file(s) the task needs (usually `CONTEXT.md`,
plus `site/CLAUDE.md` for code or `docs/references.md` for design):

> You are helping build my personal portfolio website. I'm Melvin, a Computer
> Science student at EMU. The site must read as a CS person with wide range —
> not tied to any one field (no space/nebula, no neural-net, no binary clichés).
> Stack: Vite + React + TypeScript + Tailwind v4 + React Three Fiber + custom
> GLSL + GSAP/Lenis. Dark theme only. Each page has its own visual concept; only
> the hero has scrollytelling. I read and edit the code myself, so comment
> non-obvious logic and explain your reasoning. Current focus: choosing the
> hero's abstract/editorial look — get the LOOK right before font/content, and
> propose from references, don't ship blind guesses. I'm pasting my project's
> context file(s) next; treat them as the source of truth. When you're done,
> tell me exactly what to write back into CONTEXT.md so my next tool has it.

That last sentence is the trick: **make every tool hand you the CONTEXT.md
update**, so the repo stays current no matter who did the work.

## 6. Session-close ritual (the one habit that makes this work)
Before you stop — or before a tool runs out — make sure `CONTEXT.md`'s top
section answers three things:
1. **What changed** this session (decisions + code).
2. **What's next** (the immediate next action).
3. **What's blocked / waiting on Melvin.**

If a tool won't do it, do it yourself in 2 minutes. A stale `CONTEXT.md` is the
only thing that can actually break this workflow. Everything else is recoverable.

## 7. Guardrails when delegating to autonomous agents
- Work on a **branch**, review the diff, then merge — never let an agent commit
  straight to main unreviewed.
- Keep prototypes in `scratchpad/` or standalone HTML until *you* approve the
  look; only then wire into `site/`.
- After any AI edit: `npx tsc --noEmit` and `npx oxlint` must stay clean, and the
  dev server must still run, before you trust it.
