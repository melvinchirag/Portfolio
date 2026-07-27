# Artifacts index

Every standalone prototype/artifact built for this project, what it's for, and
its status. Artifacts are hosted preview pages (claude.ai/code/artifact/...);
their source, when we kept it, lives in `scratchpad/` or is noted below.

**Why this file exists:** prototypes are probed as standalone artifacts BEFORE
anything is wired into `site/` (see the working agreement). This is the registry
so no experiment gets lost between sessions/tools.

**Status legend:** 🟢 approved/reserved · 🟡 candidate, needs work · 🔵 decision tool · ⚪️ superseded/parked

| # | Artifact | For | Status | Source |
|---|----------|-----|--------|--------|
| 1 | [Hero prototype — "The Current"](https://claude.ai/code/artifact/dfabfa71-13fe-48d6-a619-825987bf081f) | Field-agnostic hero probe: scrollytelling + kinetic type + curl-noise "light current". Melvin: "good but needs massive improvements." | 🟡 | `scratchpad/hero-current.html` |
| 2 | [Ink fluid simulation](https://claude.ai/code/artifact/0c2546e1-2b6d-4137-9000-88c39653e3c2) | Real Navier-Stokes GPU fluid, luminous ink in black water. Melvin: "very, very pretty… I really love it." **Reserved concept — page TBD (Vision candidate).** | 🟢 | `scratchpad/ink-fluid.html` |
| 3 | [Loader / concept explorer](https://claude.ai/code/artifact/5752aa81-6bec-4447-9ba2-2afe24df14cd) | 5–6 loader directions side-by-side to pick from. The "concept explorer" process fix. | 🔵 | — |
| 4 | [Codebase learning doc](https://claude.ai/code/artifact/06f5580e-4945-4653-9978-015275579359) | Rendered version of `docs/CODEBASE.md` (how the code works). **May lag the code — trust the source.** | 🔵 | `docs/CODEBASE.md` |

<!-- Add a row per new artifact. Template:
| N | [name](url) | what it's for + Melvin's reaction | status emoji | source path or — |
-->

## Notes
- The **neural-net loader** (artifact #3's winner, rendition #6) is SHIPPED in
  `site/src/components/Loader.tsx` — not a standalone artifact anymore.
- The **nebula hero** was a real feature, now parked in `parked/hero-nebula/`
  (not an artifact). See that folder's README.
- When an artifact is approved and wired into `site/`, mark it 🟢 and note the
  file it became; when superseded, mark it ⚪️ and say what replaced it.
