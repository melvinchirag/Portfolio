# Visual concepts — the bank

Concepts that are **approved and reserved**, so they don't get lost or spent on
the wrong surface. One page, one concept — the site's variety comes from each
page having its own visual world rather than one effect repeated everywhere.

---

## ✅ INK — GPU fluid simulation · RESERVED, unassigned page

**Status:** built, approved by Melvin 2026-07-25. *"Looks very, very pretty…
reads as a fluid… a very nice Chinese art / comic style feel to it. I really
love it."*

**Artifact:** https://claude.ai/code/artifact/0c2546e1-2b6d-4137-9000-88c39653e3c2
**Source:** `scratchpad/ink-fluid.html`

**What it is:** a real Navier-Stokes fluid simulation (Stable Fluids) in WebGL —
velocity field, 28-iteration Jacobi pressure solve, vorticity confinement for
the swirls, dye advected through it. Luminous silver ink dispersing in black
water. Monochrome, filmic shoulder on highlights, gradient rim for volume.

**Why it works:** nothing is ever painted, so there is no residue — the dye is
re-advected every frame and thins physically. The tendrils and mushroom plumes
emerge from the physics, not from drawing.

**Deliberately NOT the loader.** Melvin: *"we shouldn't use it as a loading page.
I have bigger plans for this kind of thing."* A loader is glanced at for five
seconds; this deserves a surface people sit with.

**Candidate pages:** Vision (the manifesto — ink spreading as ideas forming) is
the strongest fit. Work or About also possible. **Assignment still open.**

---

## ✅ NEBULA — real NASA/ESA imagery + sun-cursor · RESERVED, moved OFF the hero

**Status:** built and loved 2026-07-26 — *"it looks really cool… so it looks
really good."* **But pulled from the Home hero the same day** for a
positioning reason, not a quality one (see below). **Do not delete — reserve
it whole (the component, the interaction, the rotation system, the images) for
another surface.**

**Source:** `site/src/components/scene/NebulaField.tsx` +
`site/src/components/SunCursor.tsx` + `site/public/nebula/*.jpg` (5 licensed
images) + the `melvin:nebula-index` localStorage rotation.

**What it is:** a real, licensed NASA/ESA/ESO nebula photograph rendered as a
WebGL background — cover-fit, slow drift/breathe, pointer parallax — with the
sun-cursor physically **carving a cavity into the gas** as it moves (radial
push + swirl at the cavity wall + a clearing/dimming core + warm light added
to surrounding gas, gated by local luminance). One of 5 photos shows per page
load, advancing in sequence via localStorage. ESA/ESO images are CC BY 4.0 →
the on-screen credit line is **required, do not remove**.

**WHY IT LEFT THE HERO (the caveat):** it's beautiful but it reads as an
**astronomy student's** site, not a CS student's. A recruiter forms that
impression before reading a word, and Melvin doesn't get to caption it. His
passion for astronomy is real but belongs revealed later (About / Vision), not
as the CS-career headline. *"a recruiter would not understand that and would be
confused, so we have to think of something else and perhaps use the nebula
thing elsewhere."*

**Candidate pages:** Vision or About — a place where "the cosmos as a lens on
who I am" is framed and earned, rather than mistaken for the subject.
**Assignment open.** The sun-cursor can travel with it or be reused separately.

---

## ✅ NEURONS — cinematic CGI · the LOADER · **APPROVED & SHIPPED**

**Status:** approved by Melvin 2026-07-25 — *"That's exactly what I wanted.
That's literally what I wanted. Perfect. Lock it, fix it. We're using it."*
**Wired into `site/src/components/Loader.tsx`. Do not restyle without Melvin
re-opening it.**

**Reference build:** https://claude.ai/code/artifact/2152b364-4b6c-49c7-9e3b-a5afd8ba0916
**Source of the look:** `scratchpad/neurons-cgi.html` (the artifact; the
component is a verbatim port with loader behaviour added).

**What it is:** raw WebGL. Cell bodies ignite in a cascade, grow dendrites, and
arc across to connect with neighbours. Rendered as **volumetric point clouds**
(thousands of soft glowing sprites accumulating into mass — never wireframe),
with **multi-pass bloom** (bright-pass → two blur scales → composite), real 3D
perspective and a camera pushing through the network, depth fog, 1,400 dust
motes, and a filmic finish (ACES-ish tone map, chromatic aberration on the
bloom, lifted cool black, vignette, grain).

**Palette (deliberate):** cool electric blue dendrites, **warm gold cell
bodies**, near-white at the instant energy arrives. Plain blue-on-black is the
generic sci-fi cliché; the warm/cool split is what reads as art-directed.

**Loader behaviour:** 5.2s, once per tab session, skippable (click/key/scroll →
jumps to the dissolve), fresh network every visit, skipped under reduced motion,
silently steps aside with no WebGL. Full GPU cleanup on unmount — the hero runs
its own WebGL context and browsers cap simultaneous contexts.

**WHY THIS ONE WORKED after four failures:** the earlier attempts were all 2D
canvas **line drawings**. Flat line art reads as a diagram or a scan no matter
how it is graded. CGI reads as CGI because of volumetric mass + real bloom +
real 3D + atmosphere. That is the transferable lesson.

**The brief, in Melvin's words:** photorealistic neurons but *"something
cinematic that you would see in some sort of a Marvel movie or a Christopher
Nolan movie… high quality, high fidelity."* Crucially NOT microscope-accurate:
*"we need to kind of lie a bit because we want it to look cool. We want it to
look like science fiction."* The read should be *"there's one kind of cell over
there, it looks like a neuron — that makes another connection."*

**So: legible individual cells, connections forming between them, rendered as
premium sci-fi VFX.** CGI, not documentary.

**Four failed attempts before this, all 2D canvas line drawings.** Root cause
was diagnosed as: no agreed visual target (fixed by the concept explorer), and
flat 2D line art can never read as CGI regardless of grading. The fix is real
3D + real bloom post-processing.

---

## Rejected

- **Face triptych** (image treatments of Melvin's photo) — built and dropped
  2026-07-25. May return later; tools remain in `scratchpad/portrait-bake/`.
- **Particle-assembled face** — failed, retired.
