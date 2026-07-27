# Particle-Mask Technique — study & clean-rebuild plan

A full teardown of the Codrops **"Dreamy Particles"** engine
(github.com/DGFX/codrops-dreamy-particles, by Dominik Fojcik — the demo Melvin
picked as the quality target), and the plan to **rebuild the technique ourselves,
cleanly**, in our React site.

**Why we study then rebuild, not copy:** their repo has **no license file** →
legally *all rights reserved*, so we may not ship their source. But the
*technique* is general computer graphics, and **every heavy-lifting library it
uses is MIT** and free for anyone. We reimplement using those same public tools +
our own code. See "Licensing" below.

---

## Licensing reality (the whole reason for this doc)
| Thing | License | Can we use it? |
|---|---|---|
| Fojcik's glue code (their `webgl/*.js`) | **none = all rights reserved** | ❌ Don't copy. Learn from it only. |
| `GPUComputationRenderer` (three/examples) | MIT | ✅ |
| `MeshSurfaceSampler` (three/examples) | MIT | ✅ |
| `UnrealBloomPass` / EffectComposer (three/examples) | MIT | ✅ |
| `three-mesh-bvh` | MIT | ✅ |
| `postprocessing` / `@react-three/postprocessing` | MIT | ✅ |
| Cyborg "Soulless" model | **CC BY 4.0** (Ali Rahimi) | ✅ with attribution |
| Leader (Squid Game) model | fan model of Netflix IP | ❌ skip (IP risk) |
| Venecia / Samurai models | Sketchfab, per-model | ⚠️ verify before use |

**Conclusion:** the look comes from MIT tools + a CC-BY model — both usable. We
write our own orchestration and shaders. Clean.

---

## What the engine does (one sentence)
Scatter ~1.4 million points across the **surface of a 3D mask mesh**, hold them
there with a spring, let the cursor shove them off so they fly and settle, and
draw them as additive glowing points whose **brightness = how fast they're
moving** — then bloom it. At rest it's a faint glowing mask; disturbed, it
shimmers and streaks.

## The pipeline, stage by stage
1. **Load the mask** — a `.glb` via `GLTFLoader` (+ DRACO). Take `scene.children[0]`.
2. **Sample the surface** (`GPGPUUtils` → `MeshSurfaceSampler`): pick `size²`
   random points uniformly on the mesh (size = **1200 → 1,440,000 particles**).
   Store each point's XYZ into a **`DataTexture`** ("position texture"), and build
   a `THREE.Points` `BufferGeometry` where every point also carries a **`uv`
   attribute = its own texel** in that texture (so the GPU sim and the render
   agree which particle is which). Velocity texture starts all-zero.
3. **GPU simulation** (`GPUComputationRenderer`, ping-pong FBOs, two variables):
   - **Velocity shader** (per particle, per frame):
     - `velocity *= uForce` (0.7) — damping.
     - **spring home:** `dir = normalize(original - pos); velocity += dir * dist * 0.02` — pulls each particle back to its sampled surface point.
     - **mouse repel:** if `distance(pos, uMouse) < 0.1`, push away by `(1 - d/0.1) * 0.007 * uMouseSpeed`.
   - **Position shader:** `position += velocity`.
   - `uMouse` = the **3D world point** where the cursor ray hits the mask.
4. **Mouse → mesh** (`GPGPUEvents` + `three-mesh-bvh`): raycast camera→cursor
   against the mask (BVH-accelerated); on hit, set `uMouse` and `uMouseSpeed = 1`
   (which decays `*0.85`/frame). So disturbance happens *on the mask surface*.
5. **Render** (`THREE.Points` + ShaderMaterial, **AdditiveBlending**, no depth):
   - *vertex:* read the particle's live position from the computed position
     texture (via its `uv`); `gl_PointSize = uParticleSize / -mvPosition.z`.
   - *fragment:* round sprite; `alpha = clamp(|velocity|·100, minAlpha 0.04, maxAlpha 0.8)`; `color = uColor`. **Moving particles are bright; still ones nearly invisible** — but 1.4M of them additively overlap into a solid glowing mask.
6. **Camera:** `PerspectiveCamera(50°)` at `z = 1.5`, **OrbitControls** (damped,
   no zoom/pan) — that's how you can rotate the mask to profile views.
7. **Post:** `EffectComposer` → RenderPass → **bloom** → OutputPass, with
   `ACESFilmicToneMapping`. Their bloom = **UnrealBloomPass with the horizontal
   blur direction changed from (1,0) to (2,1.1)** → the diagonal light streaks.
8. **Variations:** each mask class is identical except **`color` + which `.glb`**
   (Leader = pink `#F777A8`, Cyborg = teal `#80FFF0`, …). So the "changes every 6h"
   idea = swap model + color on a clock. Trivial to drive.

## Why it looks premium (the transferable lessons)
- **Real 3D geometry** (a modelled mask) → true volumetric depth + rotatable — the
  thing a 2D photo can never give (this is exactly why the photo approach failed).
- **Motion-as-brightness** → the surface *breathes* and reacts; life, not a static sprite.
- **Density** (1.4M additive points) → a solid form out of dust.
- **Filmic finish** — bloom + ACES tone mapping — the CGI-reads-as-CGI stack.

---

## Our clean-rebuild plan (React + R3F, our code)
A new `MaskField` component in `site/`, using only MIT tools + a CC-BY model:

| Their piece | Our clean equivalent |
|---|---|
| singleton `Experience`/`Handler` | one R3F `<Canvas>` + hooks |
| `GLTFLoader` | drei `useGLTF` (CC-BY cyborg glb, credited) |
| `MeshSurfaceSampler` | same MIT class, our sampling loop |
| `GPUComputationRenderer` + sim shaders | same MIT class; **our own** velocity/position GLSL (spring + repel + integrate — standard physics, written fresh) |
| `THREE.Points` render shaders | **our own** vertex/fragment (velocity→alpha) |
| `MotionBloomPass` | three's `UnrealBloomPass` (MIT) with our blur-direction, or `@react-three/postprocessing` Bloom |
| `three-mesh-bvh` raycast | same MIT lib (or plain raycast first, BVH if perf needs) |
| OrbitControls | drei `<OrbitControls>` |
| lil-gui panel | our own curated controls (later) |

**Ours-not-theirs additions:** our color grade, a touch of constant curl-noise
drift so it shimmers without the mouse, our overlay ("CS, and beyond" + name),
the 6-hour clock-driven model/color cycle, quality tiers (1.4M is heavy — scale
particle count by device), and credits (Ali Rahimi CC-BY + a nod to the Codrops
technique).

**New deps to add:** `three-mesh-bvh` (MIT). `GPUComputationRenderer`,
`MeshSurfaceSampler`, `UnrealBloomPass` all ship inside `three/examples`.

**Key numbers to start from (then tune by eye):** particles 1200² (drop to
~600² = 360k on our first pass for speed), force 0.7, spring 0.02, repel radius
0.1 / strength 0.007, size ~1.7, minAlpha 0.04, maxAlpha 0.8, camera fov 50 @
z 1.5, bloom strength ~1.2 / threshold ~0.06 / dirX (2, 1.1), ACES tone mapping.
