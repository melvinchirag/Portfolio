# Parked concept — "Hero nebula" (astronomy hero + sun cursor)

**Parked 2026-07-27. Not dead code — do not delete.**

**Update 2026-07-28:** the 5 photos in `nebula/` were **copied** (not moved —
these originals stay untouched) into `site/public/space/` for a NEW, different
concept: `site/src/components/scene/SpaceBackdrop.tsx`, a heavily dimmed
atmospheric backdrop behind the mask ("the mask is in space"), not a revival of
this folder's original identity-defining hero. See that file's header comment
for how the two differ. `NebulaField.tsx` and `SunCursor.tsx` here are still
unrevived, dead-but-kept code.

## Why it's here
This was the Home hero §1 background: a real JWST/Hubble/ESO nebula photograph
displayed in a WebGL shader (cover-fit, slow drift, pointer parallax), with a
custom **sun cursor** that pushed / swirled / cleared / lit the gas as it moved.
It was well-built and Melvin liked the craft — but it was **cut because it reads
as "astronomy person," and Melvin is a CS major** who needs recruiters to
register that immediately. The new hero direction is abstract/editorial, not
tied to any single field. This may come back later (a Vision page, an easter
egg, a section-2+ transition), so it's preserved intact.

## What's in this folder
- `NebulaField.tsx` — the full-screen WebGL nebula shader (was
  `site/src/components/scene/NebulaField.tsx`). Loads one image per page load,
  rotating through all five via `localStorage['melvin:nebula-index']`.
- `SunCursor.tsx` — the miniature-sun cursor (was
  `site/src/components/SunCursor.tsx`). Limb darkening, three glow layers, a
  static diffraction cross; grows/brightens over `a, button, [role=button],
  [data-glow]`. It also added `html.has-sun-cursor` to hide the native cursor.
- `nebula/` — the five downsampled images (was `site/public/nebula/`):
  - `carina.jpg` — Cosmic Cliffs (NASA/ESA/CSA/STScI, JWST) — public domain
  - `orion.jpg` — Orion Nebula (ESO/VISTA) — **CC BY 4.0, attribution required**
  - `tarantula.jpg` — Tarantula Nebula (NASA/ESA/CSA/STScI, JWST) — public domain
  - `eagle.jpg` — Pillars of Creation (NASA/ESA/Hubble) — **CC BY 4.0**
  - `lagoon.jpg` — Lagoon Nebula (NASA/ESA/Hubble) — **CC BY 4.0**
  - The CC BY images legally require the on-screen credit line NebulaField
    renders (bottom-right). If revived on a shipped page, keep that credit.

## How to revive
1. `mv nebula ../../site/public/nebula`
2. `mv NebulaField.tsx ../../site/src/components/scene/NebulaField.tsx`
3. `mv SunCursor.tsx ../../site/src/components/SunCursor.tsx`
4. In `Home.tsx`: re-import `NebulaField` and render `<NebulaField />` as the
   first child of the hero `<section>`.
5. In `App.tsx`: re-import `SunCursor` and render `<SunCursor />` before
   `<Loader />`. (The `html.has-sun-cursor` CSS in `index.css` was left in place
   and is dormant — it activates automatically once SunCursor mounts.)
6. `npx tsc --noEmit && npx oxlint` to confirm clean.
