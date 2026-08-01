/* ============================================================================
 * MaskField.tsx — GPGPU particle mask (our own build)
 * ----------------------------------------------------------------------------
 * A from-scratch reimplementation of the "particles scattered on a 3D mask that
 * shimmer when disturbed" technique (studied in docs/particle-mask-technique.md).
 * NONE of the Codrops repo's code is used — only public MIT building blocks:
 *   - MeshSurfaceSampler  (three/examples, MIT) — scatter points on the surface
 *   - GPUComputationRenderer (three/examples, MIT) — GPU ping-pong simulation
 *   - three-mesh-bvh (MIT) — fast cursor→mask raycast
 *   - @react-three/postprocessing Bloom (MIT) — the glow
 * The GLSL below is our own. The 3D model (cyborg "Soulless") is CC BY 4.0 —
 * credit: Ali Rahimi (@Free-Radical-666). Technique ref: Codrops "Dreamy
 * Particles" by Dominik Fojcik.
 *
 * How it works (short): sample N² points on the mask surface → store as a
 * "home" texture. Each frame a velocity shader pulls every particle back to its
 * home (a spring) and shoves points near the cursor away; a position shader
 * integrates. We draw the live positions as additive points whose ALPHA = their
 * speed, so the mask glows brighter where it's disturbed. Bloom finishes it.
 * ========================================================================= */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { heroScroll } from '../../hooks/heroScroll'
import { heroIntro } from '../../hooks/heroIntro'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

// Teach BufferGeometry/Mesh the fast BVH raycast (one-time global patch).
;(THREE.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree
;(THREE.BufferGeometry.prototype as unknown as { disposeBoundsTree: typeof disposeBoundsTree }).disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

// √particle-count. 384 → ~147k particles (kept modest so the one-time surface
// sampling doesn't freeze the main thread; we'll add a pre-filtered mesh to push
// this higher without the rejection cost).
const SIZE = 384

// The mask sits fixed on the LEFT, VERTICALLY CENTRED (y=0). Melvin (2026-07-28):
// "perfectly in the center, not too up, not too down." World-space offset applied
// to both the rendered points and the raycast mesh so cursor interaction lines up.
const OFFSET = new THREE.Vector3(-0.62, 0, 0)

// Keep only front-facing samples (normal.z above this) → drops the back of the
// head and the helmet "crown", leaving the face/mask shell.
const FRONT_FACING = 0.12

/* ---- FACE CROP (Melvin, 2026-08-01) -------------------------------------------
 * "I only want to see the FACE, from all angles. Completely remove the crown and
 *  the jaw — gone, not hidden." So we keep ONLY the facial disc and every particle
 *  that survives IS the face (teal + glyphs). Nothing lives in the crown/jaw, so
 *  nothing (not even a glyph) traces those shapes anymore.
 *
 * The crop is a model-space region, so it's the same anatomical part at every
 * rotation. Measured from the geometry (draco3d headless map): this head is a
 * rounded HELMET that stays ~0.27 wide all the way up, so a flat horizontal top
 * cut looks CHOPPED. Instead the top is a DOME (a downward parabola) that curves
 * off at the corners like a real forehead. A point is kept when it is:
 *   front-facing (nose-ward)  AND  z ≥ BACK_CLIP (front shell, no rear ghost)
 *   AND  |x| ≤ FACE_X_HALF (drop ears)
 *   AND  y ≥ FACE_Y_BOTTOM (chin kept, neck cut)
 *   AND  y ≤ FACE_TOP_PEAK − FACE_TOP_CURVE·x²  (domed top: forehead kept, skull
 *        crown cut, corners rounded so it reads as a head, not a sliced blob).
 * All five are the live knobs; PEAK raises/lowers the forehead, CURVE controls
 * how round the top is (higher = tighter dome). Verified with ASCII previews. */
const BACK_CLIP = -0.11      // keep p.z ≥ this (front shell; drops the rear ghost)
const FACE_X_HALF = 0.32     // keep |p.x| ≤ this (drops the detached ear strips)
const FACE_Y_BOTTOM = -0.64  // keep p.y ≥ this (down to the chin TIP; neck is cut)
const FACE_TOP_PEAK = 0.36   // top of the forehead dome at centre (x = 0)
const FACE_TOP_CURVE = 2.2   // how fast the dome curves down toward the sides

// The "Soulless" sculpt is slightly LOPSIDED (≈6.5% more surface on one side +
// uneven features). Melvin wants a balanced face, so we MIRROR: every particle's
// x is folded to |x| and then split evenly to both sides by index parity, giving
// a perfectly symmetric face built from the model's own features. (The model is
// already near-symmetric, so this cleans it up without doubling features.)
const MIRROR_FACE = true

/* ---- FACIAL FEATURES (Melvin, 2026-08-01) -------------------------------------
 * "Make the facial features more prominent near the eyes and the lips... I want
 *  him to have facial features, make him feel alive." We brighten the particles
 *  that sit on the eyes and the lip band so those read as real features against
 *  the even teal field. Centres are MEASURED from the model's depth map (headless
 *  draco3d probe, 2026-08-01): the nose ridge protrudes y≈0.2→0.0, brow at
 *  y≈0.24, so the eyes sit between them at y≈0.11, flanking the bridge at
 *  |x|≈0.14; the lips are the forward bump at y≈-0.33, centred. featureWeight()
 *  returns 0→1 (1 = dead-centre of a feature) and the base shader multiplies each
 *  dot's brightness by (1 + weight·uFeatureBoost). This also gives us the eye
 *  region we'll later dim for the BLINK (idea D). */
// Positions REMEASURED from the model's depth map + Melvin's marked-up screenshot
// (2026-08-01, round 2). v1 put the eyes at y=0.11 — that sat ON the nose ridge /
// brow (the "sunglasses on the forehead" he circled in purple). The true eye
// hollows are the recessed flanks just below/beside the nose base at y≈-0.14,
// x≈±0.16; the lip bump is the protrusion at y≈-0.36. Nose was already right.
// Eyes drawn as ACTUAL eyes (Melvin, 2026-08-01): an almond eyelid OUTLINE (upper +
// lower lid, meeting at the inner/outer corners) with an IRIS dot in the middle —
// not a filled disc. Position kept from the earlier round (mid-face); it's the
// SHAPE that needed to read as an eye.
const EYE_Y = -0.14       // eye centre height (model-space y)
const EYE_X = 0.16        // eye centre distance from the centre line (mirrored)
const EYE_HW = 0.09       // eye half-width (corners at |x|-EYE_X = ±this)
const EYE_OPEN = 0.035    // how far the lids bow from the centre line (eye "openness")
const EYE_LINE_BW = 0.01  // half-thickness of the drawn eyelid lines
const EYE_IRIS_R = 0.028  // iris/pupil dot radius
// LIPS: highlight REMOVED entirely (Melvin, 2026-08-01). Repeated attempts to draw a
// mouth on this featureless mesh never landed where he wanted, so the mouth area is
// left at the normal (un-brightened) field — no lip term in featureWeight anymore.
// Nose: a tall narrow ellipse down the centre line, bridge → tip. Capped at NOSE_TOP
// so it doesn't creep up to the brow/forehead (Melvin: "a little brightening on the
// forehead — remove it"; that was the top of this ridge).
const NOSE_X_HALF = 0.055, NOSE_Y = 0.06, NOSE_Y_HALF = 0.17
const NOSE_TOP = 0.14
// Eye and nose weights are computed SEPARATELY (not merged) so the BLINK can animate
// the eyes alone: the shader multiplies the eye weight by uEyeOpen (1 open → 0 shut)
// while the nose stays put. See the blink cycle in useFrame.
// Eyes (mirrored via |x|): an almond eyelid outline + an iris dot. `enx` is 0 at the
// eye centre, ±1 at the corners; `et` is a parabola so the upper/lower lids converge
// to the corners (the almond shape). Light a point near either lid line OR the iris.
function eyeWeight(x: number, y: number): number {
  const edx = Math.abs(x) - EYE_X
  const edy = y - EYE_Y
  const enx = edx / EYE_HW
  if (Math.abs(enx) >= 1) return 0
  const et = 1 - enx * enx
  const dLid = Math.min(Math.abs(edy - EYE_OPEN * et), Math.abs(edy + EYE_OPEN * et))
  const lid = Math.max(0, 1 - dLid / EYE_LINE_BW) * Math.min(1, (1 - Math.abs(enx)) / 0.18)
  const iris = Math.max(0, 1 - Math.hypot(edx, edy) / EYE_IRIS_R)
  return Math.max(lid, iris)
}
// Nose: a centred vertical ellipse (taller than wide), hard-capped at NOSE_TOP so it
// never reaches the brow/forehead.
function noseWeight(x: number, y: number): number {
  if (y > NOSE_TOP) return 0
  const noseDist = Math.hypot(x / NOSE_X_HALF, (y - NOSE_Y) / NOSE_Y_HALF)
  return Math.max(0, 1 - noseDist) * 0.85
}

/* ---- SCROLL CHOREOGRAPHY (step 1 of the hero rebuild, 2026-07-31) ----------
 * The mask no longer just sits on the left — it travels a path, scales, and
 * rolls as you scroll the 5 hero beats, so scrolling reads as a real animation.
 * Each keyframe: p = scroll progress 0→1, (x,y) = world position, s = scale,
 * rz = z-roll (radians). Camera is at z=1.5, fov 50 → the visible box at z=0 is
 * roughly x∈[-1.1,1.1], y∈[-0.7,0.7], so these stay on-screen. This is a
 * FIRST-PASS path meant to be tuned live with Melvin, not a final composition. */
// Intro reveal timing (see introT). INTRO_SECS = how long the fly-in lasts;
// INTRO_Z_DEEP = how far back (in world z) the mask starts — camera is at z=1.5,
// so -9 is well into the black behind the scene, and easing it to 0 makes the
// mask rush toward the viewer out of the deep. 2.2→1.2 (Melvin: "exactly one
// second faster"). The fly-in does not START until the Loader is gone (heroIntro).
const INTRO_SECS = 1.2
const INTRO_Z_DEEP = -9

// BLINK (Melvin, 2026-08-01: "slow natural blink so the mask feels alive"). The eyes
// close + reopen over BLINK_DUR, then wait a random BLINK_MIN..BLINK_MAX before the
// next one, so it never feels metronomic. Both eyes blink together (uEyeOpen is global).
const BLINK_DUR = 0.16   // seconds for one full close→open
const BLINK_MIN = 3.2    // shortest gap between blinks
const BLINK_MAX = 7.0    // longest gap between blinks

// Each keyframe adds `ry` (yaw = the head TURNING left/right, radians) on top of
// x/y/scale/rz, so the mask reads as a living head that turns as it travels — the
// biggest lever for making the scroll feel like a real animation, not just a slide.
// (Melvin, 2026-08-01: the pure-slide path "felt the same".) Scale is more dramatic
// too (1.0 → 1.55 → 0.8). rz = z-roll, ry = yaw.
type Pose = { x: number; y: number; s: number; rz: number; ry: number }
const MASK_PATH: (Pose & { p: number })[] = [
  { p: 0.0, x: -0.62, y: 0.0, s: 1.0, rz: 0.0, ry: 0.0 }, // beat 1 — identity, left, facing you
  { p: 0.25, x: -0.18, y: 0.18, s: 1.28, rz: 0.06, ry: 0.5 }, // drifts up + grows, turns to look right
  { p: 0.5, x: 0.32, y: -0.02, s: 1.55, rz: -0.06, ry: -0.28 }, // big centred hero, turns back toward you
  { p: 0.75, x: 0.62, y: 0.22, s: 1.08, rz: 0.14, ry: -0.6 }, // swings right + shrinks, looks back left
  { p: 1.0, x: 0.12, y: 0.32, s: 0.8, rz: 0.0, ry: 0.0 }, // settles high, faces you, for the CTA
]

// Sample the path at scroll progress `p`, easing between keyframes with
// smoothstep so the travel feels inertial, never linear/robotic.
function samplePath(p: number, out: Pose): Pose {
  const prog = p < 0 ? 0 : p > 1 ? 1 : p
  let i = 0
  while (i < MASK_PATH.length - 2 && prog > MASK_PATH[i + 1].p) i++
  const a = MASK_PATH[i]
  const b = MASK_PATH[i + 1]
  const span = b.p - a.p
  const t = span <= 0 ? 0 : (prog - a.p) / span
  const e = t * t * (3 - 2 * t) // smoothstep easing
  out.x = a.x + (b.x - a.x) * e
  out.y = a.y + (b.y - a.y) * e
  out.s = a.s + (b.s - a.s) * e
  out.rz = a.rz + (b.rz - a.rz) * e
  out.ry = a.ry + (b.ry - a.ry) * e
  return out
}

/* ---- our simulation shaders (GPUComputationRenderer injects uCurrentPosition,
 * uCurrentVelocity and `resolution` automatically) ------------------------- */

const simPosition = /* glsl */ `
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(uCurrentPosition, uv).xyz;
    vec3 vel = texture2D(uCurrentVelocity, uv).xyz;
    pos += vel;
    gl_FragColor = vec4(pos, 1.0);
  }
`

const simVelocity = /* glsl */ `
  uniform sampler2D uHome;     // original sampled surface point
  uniform vec3  uMouse;        // cursor's 3D hit point on the mask
  uniform float uMouseSpeed;   // 1 on move, decays each frame
  uniform float uForce;        // velocity damping
  uniform float uTime;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos  = texture2D(uCurrentPosition, uv).xyz;
    vec3 home = texture2D(uHome, uv).xyz;
    vec3 vel  = texture2D(uCurrentVelocity, uv).xyz;

    vel *= uForce;                                  // damping

    // spring back to the home surface point
    vec3 toHome = home - pos;
    float d = length(toHome);
    if (d > 0.0001) vel += normalize(toHome) * d * 0.02;

    // cursor repulsion within a small radius on the surface
    float md = distance(pos, uMouse);
    float maxD = 0.12;
    if (md < maxD) {
      vel += normalize(pos - uMouse) * (1.0 - md / maxD) * 0.008 * uMouseSpeed;
    }

    // OUR touch: a whisper of ambient drift so it breathes without the mouse
    float n = sin(uTime * 0.7 + uv.x * 40.0) * cos(uTime * 0.5 + uv.y * 40.0);
    vel += vec3(n, -n, n * 0.4) * 0.00006;

    gl_FragColor = vec4(vel, 1.0);
  }
`

const renderVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uParticleSize;
  uniform float uTime;       // shared clock with the glyph layer
  uniform float uRoveSpeed;  // same value the glyph layer uses
  uniform float uOnFrac;     // same value the glyph layer uses
  attribute vec2 aRef;       // this particle's texel in the sim textures
  attribute float aGlyphSeed;// glyph seed if this dot is a glyph candidate, else -1
  attribute float aEye;      // eye-feature weight (0..1) — animated by the blink
  attribute float aNose;     // nose-feature weight (0..1) — static
  uniform float uEyeOpen;    // 1 = eyes open, 0 = shut (the blink)
  varying float vSpeed;
  varying float vGlyphFade;  // 1 while this dot's glyph is lit → dot fades to 0
  varying float vFeature;

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    vSpeed = length(texture2D(uVelocityTexture, aRef).xyz);
    // Eyes fade out as they blink shut; nose is unaffected.
    vFeature = max(aNose, aEye * uEyeOpen);

    // CONVERSION: if this dot is a glyph candidate, recompute the SAME life curve
    // the glyph layer uses, and report how "lit" its glyph is. The fragment fades
    // the dot out by exactly that amount, so the teal dot dissolves precisely as
    // its character forms in place — the particle turns INTO the glyph.
    vGlyphFade = 0.0;
    if (aGlyphSeed >= 0.0) {
      float life = fract(aGlyphSeed * 31.7 + uTime * uRoveSpeed);
      float edge = min(0.06, uOnFrac * 0.5);
      vGlyphFade = clamp(smoothstep(0.0, edge, life) - smoothstep(uOnFrac - edge, uOnFrac, life), 0.0, 1.0);
    }

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uParticleSize / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const renderFragment = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uMinAlpha;
  uniform float uMaxAlpha;
  uniform float uFade;       // 0→1 intro fade-in (the "emerge from the black" reveal)
  uniform float uFeatureFloor;
  varying float vSpeed;
  varying float vGlyphFade;
  varying float vFeature;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;   // round sprite
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
    a = max(a, vFeature * uFeatureFloor); // eyes/nose/lips get a solid shading floor
    a *= (1.0 - vGlyphFade);   // dot vanishes as its glyph forms (the conversion)
    a *= uFade;                // whole mask fades up on load
    gl_FragColor = vec4(uColor, a);
  }
`

/* ---- The "make it ours" layer: a subset of particles rendered as GLYPHS ----
 * Encodes Melvin: binary (the CS signal) + TELUGU letters (his heritage —
 * Kuwait → India → Michigan). Each glyph particle cycles binary ⇄ Telugu so the
 * face keeps "speaking" in code and mother tongue. */
// Two categories, contiguous ranges in the atlas so the shader can cycle a
// particle binary ⇄ Telugu by picking within the current range. (Hex removed
// 2026-07-31 per Melvin — binary + Telugu only.)
const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const GLYPH_CHARS = [...BINARY, ...TELUGU]
const BIN_START = 0
const TEL_START = BINARY.length
// The glyph layer is now ROVING (2026-07-31, per Melvin): a scattered candidate
// POOL of particles, of which only a small fraction is lit at any instant, and
// WHICH ones are lit keeps drifting — so glyphs appear at random spots, fade, and
// reappear elsewhere across the whole mask (not a fixed sprinkle, not a patch).
//
// GLYPH_POOL_FRACTION = fraction of all ~147k particles that are candidate glyph
// positions (the scatter "grid" the rove draws from). Bigger = finer/denser
// possible locations. It is NOT the on-screen amount — the shader's `uOnFrac`
// controls how much of this pool is actually lit at once.
//
// On-screen coverage ≈ GLYPH_POOL_FRACTION × uOnFrac × (footprint per glyph).
// Sizing history: glyphs were 20px vs the base dots' 1.7px (12× → each covered
// ~140 dot-spots → a solid sheet even at low counts). The real lever is glyph
// SIZE² (area), not the raw count. Now tuned for legible letters at ~1/7 coverage.
//
// ⚙️ THE KNOBS YOU'LL ACTUALLY TOUCH (all in the glyphMat uniforms below):
//   uGlyphSize  — character size / legibility (Telugu needs ~14+ to read as letters)
//   uOnFrac     — how much of the mask shows glyphs at once (THE coverage dial)
//   uRoveSpeed  — how fast the lit set relocates
// At uGlyphSize 15, uOnFrac ≈ 0.02 lands near 1/7 coverage; 0.03 ≈ 1/5; raise/lower
// uOnFrac to taste. If letters still aren't legible, raise uGlyphSize AND drop
// uOnFrac to keep coverage constant (bigger letters ⇒ fewer of them).
const GLYPH_POOL_FRACTION = 0.12

// Glyph TIMING — shared by BOTH the glyph layer AND the base-dot layer so they
// stay in exact lockstep. This is what makes a dot CONVERT into its glyph
// (Melvin, 2026-08-01: "each particle should first convert into the glyph, then
// flow"): the base dot fades out on exactly the same life curve the glyph fades
// IN, so the teal dot becomes the character in place, the character floats off,
// then the dot reforms. Both shaders recompute the same `life` from these two
// numbers + the particle's seed, so they MUST be identical on both materials.
//   GLYPH_ON_FRAC   = fraction of the pool lit at once (coverage / prominence)
//   GLYPH_ROVE_SPEED= how fast life advances. Lower = each glyph lingers and
//     dissipates SLOWER and the set relocates slower (Melvin: "make it slower").
//     Lit duration ≈ GLYPH_ON_FRAC / GLYPH_ROVE_SPEED seconds. 0.026/0.012 ≈ 2.2s.
const GLYPH_ON_FRAC = 0.032   // 0.026→0.032 (Melvin: "a bit more prominent")
const GLYPH_ROVE_SPEED = 0.012

// Bake all glyphs into one texture atlas (grid of cells) drawn on a canvas.
function makeGlyphAtlas() {
  const cols = Math.ceil(Math.sqrt(GLYPH_CHARS.length))
  const cell = 64
  const px = cols * cell
  const cvs = document.createElement('canvas')
  cvs.width = px
  cvs.height = px
  const ctx = cvs.getContext('2d')!
  ctx.clearRect(0, 0, px, px)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Nirmala UI / Gautami render Telugu on Windows; monospace fallback for digits
  ctx.font = '42px "Nirmala UI", "Gautami", "Noto Sans Telugu", monospace'
  GLYPH_CHARS.forEach((ch, i) => {
    const cx = (i % cols) * cell + cell / 2
    const cy = Math.floor(i / cols) * cell + cell / 2
    ctx.fillText(ch, cx, cy)
  })
  const tex = new THREE.CanvasTexture(cvs)
  tex.flipY = false // match gl_PointCoord's top-left origin
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return { texture: tex, cols }
}

const glyphVertex = /* glsl */ `
  uniform sampler2D uPositionTexture; // live (animated) positions
  uniform float uGlyphSize;
  uniform float uTime;
  uniform float uBinStart;
  uniform float uTelStart;
  uniform float uOnFrac;    // fraction of the candidate pool lit at any instant
  uniform float uRoveSpeed; // how fast the lit set drifts across the mask
  uniform float uDriftUp;   // how far a glyph rises off the face over its lifetime
  uniform float uDriftOut;  // how far it peels FORWARD (out of the face) as it goes
  uniform float uDriftSide; // random horizontal sway so the rise isn't a straight line
  attribute vec2 aRef;
  attribute float aSeed;
  varying float vGlyph;
  varying float vAlpha;

  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;

    // ROVING: each candidate has its own drifting "life" (0→1, staggered by seed).
    // It is lit only while life < uOnFrac, so at any instant ~uOnFrac of the pool
    // shows AND which points show keeps changing — glyphs bloom in at random
    // scattered spots, fade, and reappear elsewhere. Smooth in/out so they don't pop.
    float life = fract(aSeed * 31.7 + uTime * uRoveSpeed);
    float edge = min(0.06, uOnFrac * 0.5);
    float fade = smoothstep(0.0, edge, life) - smoothstep(uOnFrac - edge, uOnFrac, life);
    vAlpha = clamp(fade, 0.0, 1.0);

    // DISSIPATION (Melvin, 2026-08-01: glyphs should "float into the air and
    // disappear... peel off the face"). lp = 0→1 across the glyph's lit window.
    // We drift the glyph UP (+y) and OUT of the face (+z, model-local forward, so
    // it peels toward the viewer no matter how the mask is rotated), with a small
    // per-glyph horizontal sway. Combined with the fade above (which returns to 0
    // at the end of the window), each glyph blooms on the face, floats off, and
    // dissipates — then relights elsewhere. Ease with lp*lp so it accelerates away.
    float lp = clamp(life / uOnFrac, 0.0, 1.0);
    float rise = lp * lp;
    pos.y += uDriftUp * rise;
    pos.z += uDriftOut * rise;
    pos.x += (hash(aSeed * 17.0) - 0.5) * uDriftSide * rise;

    // Re-pick the character each time this particle relights (integer part of its
    // life advance), mixing binary ⇄ Telugu ~50/50 so both keep appearing.
    float relight = floor(aSeed * 31.7 + uTime * uRoveSpeed);
    float cat = step(0.5, hash(aSeed * 3.1 + relight));   // 0 = binary, 1 = Telugu
    float start = cat < 0.5 ? uBinStart : uTelStart;
    float cnt   = cat < 0.5 ? 2.0       : 16.0;
    float r = hash(aSeed * 7.0 + cat * 5.0 + relight);
    vGlyph = start + floor(r * cnt);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.002, vAlpha); // size 0 when unlit
    gl_Position = projectionMatrix * mv;
  }
`

const glyphFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform vec3 uColor;
  uniform float uFade;   // 0→1 intro fade-in, shared with the base dot layer
  varying float vGlyph;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    float idx = floor(vGlyph + 0.5);
    float cx = mod(idx, uCols);
    float cy = floor(idx / uCols);
    vec2 uv = (vec2(cx, cy) + gl_PointCoord) / uCols;
    vec4 g = texture2D(uAtlas, uv);
    if (g.a < 0.15) discard;
    gl_FragColor = vec4(uColor, g.a * vAlpha * uFade);
  }
`

export function MaskParticles() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)

  // Load the CC-BY cyborg mask ourselves (draco-compressed). Manual loader (no
  // Suspense) so failures surface as console errors instead of a silent hang.
  const [maskGeometry, setMaskGeometry] = useState<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    const draco = new DRACOLoader()
    // Self-hosted decoder (copied from three/examples into public/draco/). Was
    // loading from the gstatic CDN, which is an external dependency — flaky
    // offline, and blocked entirely in some sandboxed browsers, which left the
    // mask permanently invisible. Local files fix reliability AND make the mask
    // load in any environment. Update these if `three` is upgraded.
    draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.load(
      '/models/cyborg.glb',
      (gltf) => {
        let geo: THREE.BufferGeometry | null = null
        gltf.scene.traverse((o) => {
          if (!geo && (o as THREE.Mesh).isMesh) geo = (o as THREE.Mesh).geometry
        })
        if (!geo) console.error('[MaskField] no mesh found in cyborg.glb')
        setMaskGeometry(geo)
      },
      undefined,
      (err) => console.error('[MaskField] model load error:', err),
    )
    return () => { draco.dispose() }
  }, [])

  // Build everything once we have geometry + renderer.
  const [sim, setSim] = useState<{
    gpu: GPUComputationRenderer
    posVar: any
    velVar: any
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
    rayMesh: THREE.Mesh
    glyphGeo: THREE.BufferGeometry
    glyphMat: THREE.ShaderMaterial
  } | null>(null)

  useEffect(() => {
    if (!maskGeometry) return
    let isCancelled = false

    const buildSim = async () => {
      if (!maskGeometry.attributes.normal) maskGeometry.computeVertexNormals()
      const mesh = new THREE.Mesh(maskGeometry)
      const sampler = new MeshSurfaceSampler(mesh).build()

      const count = SIZE * SIZE
      const homeData = new Float32Array(count * 4)
      const refs = new Float32Array(count * 2)
      const eyeData = new Float32Array(count)  // per-dot eye-feature weight (blinks)
      const noseData = new Float32Array(count) // per-dot nose-feature weight (static)
      const p = new THREE.Vector3()
      const n = new THREE.Vector3()

      // Is this sampled point inside the face crop? (see FACE CROP block up top)
      const inFace = (v: THREE.Vector3, nz: number) =>
        nz >= FRONT_FACING &&
        v.z >= BACK_CLIP &&
        Math.abs(v.x) <= FACE_X_HALF &&
        v.y >= FACE_Y_BOTTOM &&
        v.y <= FACE_TOP_PEAK - FACE_TOP_CURVE * v.x * v.x
      // Fallback so a particle NEVER lands outside the face (no stray dots): if the
      // rejection loop can't find a face point in time, we reuse the last one that
      // did. Seeded with a guaranteed in-face point (mid-face, forward = the nose).
      const last = new THREE.Vector3(0, -0.08, 0.2)

      for (let i = 0; i < SIZE; i++) {
        // Yield to the main thread every 4 rows to prevent UI freeze
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0))
        if (isCancelled) return

        for (let j = 0; j < SIZE; j++) {
          const idx = i * SIZE + j
          // Resample until the point is inside the FACE crop. Up to 40 tries (the
          // face is a small slice of the whole-head surface, so first hits often
          // miss); if it still fails, fall back to the last good face point so we
          // never leave a stray dot in the crown/jaw.
          let tries = 0
          do {
            sampler.sample(p, n)
            tries++
          } while (!inFace(p, n.z) && tries < 40)
          if (!inFace(p, n.z)) p.copy(last)
          else last.copy(p)
          // Symmetry: fold to |x| and pick a side so the face is balanced. The
          // side must be RANDOM, not idx-parity: the glyph pool is strided (every
          // 8th particle → all even idx), so an idx%2 rule sent every glyph to the
          // same side (Melvin, 2026-08-01: "glyphs only on the right"). A random
          // flip decorrelates the mirror from the stride → glyphs scatter both sides.
          if (MIRROR_FACE) p.x = Math.abs(p.x) * (Math.random() < 0.5 ? 1 : -1)
          homeData[idx * 4 + 0] = p.x
          homeData[idx * 4 + 1] = p.y
          homeData[idx * 4 + 2] = p.z
          homeData[idx * 4 + 3] = 1
          // Eye + nose weights from the FINAL (mirrored) position, so they line up
          // with where the dot actually renders. Kept separate for the blink.
          eyeData[idx] = eyeWeight(p.x, p.y)
          noseData[idx] = noseWeight(p.x, p.y)
          refs[idx * 2 + 0] = (j + 0.5) / SIZE
          refs[idx * 2 + 1] = (i + 0.5) / SIZE
        }
      }

      // GPU sim
      const gpu = new GPUComputationRenderer(SIZE, SIZE, gl)
      const homeTex = gpu.createTexture()
      homeTex.image.data!.set(homeData)
      const velTex = gpu.createTexture() // starts at 0

      const posVar = gpu.addVariable('uCurrentPosition', simPosition, homeTex)
      const velVar = gpu.addVariable('uCurrentVelocity', simVelocity, velTex)
      gpu.setVariableDependencies(posVar, [posVar, velVar])
      gpu.setVariableDependencies(velVar, [posVar, velVar])

      // clone the home texture so it's a stable "original" reference
      const homeRef = gpu.createTexture()
      homeRef.image.data!.set(homeData)
      velVar.material.uniforms.uHome = { value: homeRef }
      velVar.material.uniforms.uMouse = { value: new THREE.Vector3(999, 999, 999) }
      velVar.material.uniforms.uMouseSpeed = { value: 0 }
      velVar.material.uniforms.uForce = { value: 0.72 }
      velVar.material.uniforms.uTime = { value: 0 }

      const err = gpu.init()
      if (err) console.error('[MaskField] GPGPU init error:', err)

      // ---- glyph pool: a strided (even-scattered) subset of particles are glyph
      // candidates. Build the seeds FIRST because the base dot layer needs each
      // dot's glyph seed to fade itself out as its glyph forms (the conversion). ----
      const glyphPool = Math.max(1, Math.floor(count * GLYPH_POOL_FRACTION))
      const stride = Math.max(1, Math.floor(count / glyphPool))
      const gPositions: number[] = []
      const gRefs: number[] = []
      const gSeeds: number[] = []
      // Per-BASE-particle glyph seed (or -1). Lets the base dot layer recompute the
      // exact same glyph life curve, so a dot fades out precisely as its glyph
      // forms — the dot converts INTO the glyph rather than sitting under it.
      const baseGlyphSeed = new Float32Array(count).fill(-1)
      for (let k = 0; k < count; k += stride) {
        const seed = Math.random()
        gPositions.push(0, 0, 0)
        gRefs.push(refs[k * 2], refs[k * 2 + 1])
        gSeeds.push(seed)
        baseGlyphSeed[k] = seed
      }

      // render geometry: one point per particle, carrying its texel ref
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
      geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
      geometry.setAttribute('aGlyphSeed', new THREE.BufferAttribute(baseGlyphSeed, 1))
      geometry.setAttribute('aEye', new THREE.BufferAttribute(eyeData, 1))
      geometry.setAttribute('aNose', new THREE.BufferAttribute(noseData, 1))

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uPositionTexture: { value: null },
          uVelocityTexture: { value: null },
          uParticleSize: { value: 1.7 },
          uColor: { value: new THREE.Color('#80fff0') },
          uMinAlpha: { value: 0.04 },
          uMaxAlpha: { value: 0.85 },
          // Shared with the glyph layer so a dot converts into its glyph in sync.
          uTime: { value: 0 },
          uRoveSpeed: { value: GLYPH_ROVE_SPEED },
          uOnFrac: { value: GLYPH_ON_FRAC },
          uFade: { value: 0 }, // intro fade-in (see the reveal in useFrame)
          // ⚙️ Eye/nose shading FLOOR. A feature dot's brightness is lifted to AT
          // LEAST this (independent of motion), so the eyes and nose read as solid
          // shading against the dim resting field (base rest alpha ≈ 0.04). Raise for
          // stronger features, lower for subtler.
          uFeatureFloor: { value: 0.34 },
          uEyeOpen: { value: 1 }, // 1 open → 0 shut; driven by the blink in useFrame
        },
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      // ---- glyph layer: draws the candidate POOL built above; the shader lights a
      // small roving subset at a time (binary ⇄ Telugu) and floats each off-face. ----
      const atlas = makeGlyphAtlas()
      const glyphGeo = new THREE.BufferGeometry()
      glyphGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gPositions), 3))
      glyphGeo.setAttribute('aRef', new THREE.BufferAttribute(new Float32Array(gRefs), 2))
      glyphGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(gSeeds), 1))

      const glyphMat = new THREE.ShaderMaterial({
        uniforms: {
          uPositionTexture: { value: null },
          // ⚙️ glyph char size in px. Big enough that Telugu letters read as LETTERS
          // (they collapse to a dot below ~12px). Footprint scales with size², so
          // this is the strongest coverage lever — raise it and drop uOnFrac to keep
          // total coverage steady.
          uGlyphSize: { value: 17 }, // 15→17 (Melvin: "a little bigger, not too much")
          uTime: { value: 0 },
          uBinStart: { value: BIN_START },
          uTelStart: { value: TEL_START },
          // ⚙️ THE COVERAGE DIAL — shared with the base layer (see GLYPH_ON_FRAC).
          uOnFrac: { value: GLYPH_ON_FRAC },
          // ⚙️ roving/dissipation speed — shared with the base layer so the
          // conversion stays in lockstep (see GLYPH_ROVE_SPEED). Lower = slower.
          uRoveSpeed: { value: GLYPH_ROVE_SPEED },
          // ⚙️ DISSIPATION knobs — how a glyph floats off the face as it fades.
          // uDriftUp = rise in model units over its lifetime (face is ~1.2 tall);
          // uDriftOut = how far it peels forward off the surface; uDriftSide = sway.
          // Bigger = more theatrical lift-off; 0 = glyphs stay put on the face.
          uDriftUp: { value: 0.16 },
          uDriftOut: { value: 0.1 },
          uDriftSide: { value: 0.05 },
          uAtlas: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uFade: { value: 0 }, // intro fade-in, shared with the base dot layer
          // ⚙️ Overdriven past (1,1,1) on purpose: additive blending + Bloom read
          // values >1 as "hotter", so this pushes brightness without touching the
          // shared Bloom intensity (which would also brighten the base dot layer,
          // not just the glyphs Melvin asked about). Same hue, 1.7x intensity
          // (1.5→1.7, 2026-08-01: "a bit more prominent").
          uColor: { value: new THREE.Color('#b9fff2').multiplyScalar(1.7) },
        },
        vertexShader: glyphVertex,
        fragmentShader: glyphFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      // a hidden mesh (with BVH) purely for cursor→surface raycasting
      ;(maskGeometry as unknown as { computeBoundsTree: () => void }).computeBoundsTree()
      const rayMesh = new THREE.Mesh(maskGeometry)
      rayMesh.position.copy(OFFSET) // match the rendered points' left offset
      rayMesh.updateMatrixWorld()

      if (!isCancelled) {
        setSim({ gpu, posVar, velVar, geometry, material, rayMesh, glyphGeo, glyphMat })
      }
    }

    buildSim()

    return () => {
      isCancelled = true
    }
  }, [maskGeometry, gl])

  const raycaster = useRef(new THREE.Raycaster())
  const mouseSpeed = useRef(0)
  // Smoothed scroll progress — gives the mask its own inertia so it GLIDES
  // instead of tracking scroll 1:1 (that 1:1 tracking is what read as "rigid").
  const smoothProg = useRef(0)
  const groupRef = useRef<THREE.Group>(null)
  const rot = useRef({ x: 0, y: 0 })
  // Intro reveal (Melvin, 2026-08-01: "coming from far, from the deep/black, it
  // zooms into view"). Ramps 0→1 over INTRO_SECS on first load; drives a big
  // negative-z start that flies the mask forward to z=0 (perspective makes it
  // rush toward you) plus a fade-up, so the mask emerges out of the black.
  const introT = useRef(0)
  // Melvin (2026-08-01): "he should start from a different point every time, but
  // always end up in the same place." A random x/y birth offset chosen ONCE per
  // page load; it decays to 0 as the intro completes, so the mask flies in from a
  // fresh spot each visit and always settles into the identical home pose.
  const introOffset = useRef({ x: (Math.random() * 2 - 1) * 1.3, y: (Math.random() * 2 - 1) * 0.7 })
  // Blink state: `clock` accumulates time, `next` is when the next blink starts,
  // `start` is when the current blink began (-1 = not blinking). See useFrame.
  const blink = useRef({ clock: 0, next: 3.0, start: -1 })
  // Reused each frame by samplePath so scroll choreography allocates nothing.
  const poseScratch = useRef<Pose>({ x: 0, y: 0, s: 1, rz: 0, ry: 0 })

  // Drag anywhere to spin the mask 360° (it stays on the left; we rotate the
  // group, not the camera). Plain mouse-move still disturbs the particles.
  useEffect(() => {
    let active = false, lx = 0, ly = 0
    const down = (e: PointerEvent) => { active = true; lx = e.clientX; ly = e.clientY }
    const move = (e: PointerEvent) => {
      if (!active) return
      rot.current.y += (e.clientX - lx) * 0.006
      rot.current.x += (e.clientY - ly) * 0.006
      rot.current.x = Math.max(-1.1, Math.min(1.1, rot.current.x)) // limit pitch
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { active = false }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  useFrame((_, delta) => {
    if (!sim) return
    const { gpu, posVar, velVar, material, glyphMat, rayMesh } = sim

    // SCROLL CHOREOGRAPHY: the mask travels a path, scales, and rolls as you
    // scroll the hero. Drives off heroScroll.progress (the read-only contract, so
    // it can't desync the sim). Drag rotation (pitch/yaw) still composes on top.
    // The raycast mesh gets the SAME transform so cursor interaction stays aligned
    // wherever the mask has flown to.
    //
    // Track the scroll input near-directly (Melvin, 2026-08-01: "responsive, 1:1 —
    // you move it directly", not floaty). The constant is high, so smoothProg stays
    // almost glued to heroScroll.progress — only enough smoothing to absorb per-frame
    // jitter (Lenis already smooths the underlying scroll). The "settle" on each beat
    // now comes purely from the smoothstep easing BETWEEN keyframes in samplePath, not
    // from input lag. Lower this toward ~6 for a floatier feel; raise for even tighter.
    smoothProg.current += (heroScroll.progress - smoothProg.current) * (1 - Math.exp(-delta * 26.0))
    const pose = samplePath(smoothProg.current, poseScratch.current)

    // INTRO REVEAL: ramp introT 0→1, ease-out so it decelerates as it arrives.
    // zIn starts deep in the black (INTRO_Z_DEEP) and flies to 0; fade 0→1. After
    // it completes, zIn=0 and fade=1, so this leaves the resting pose untouched.
    // GATED on heroIntro.ready — the Loader flips it once the neurons are gone, so
    // the mask stays invisible+deep until then and only THEN begins its entrance.
    if (heroIntro.ready && introT.current < 1) {
      introT.current = Math.min(1, introT.current + delta / INTRO_SECS)
    }
    const te = introT.current
    const eIntro = 1 - Math.pow(1 - te, 3) // easeOutCubic
    const zIn = INTRO_Z_DEEP * (1 - eIntro)
    // Random birth offset that decays to 0 → starts somewhere new, ends at home.
    const offX = introOffset.current.x * (1 - eIntro)
    const offY = introOffset.current.y * (1 - eIntro)
    const fade = eIntro
    material.uniforms.uFade.value = fade
    glyphMat.uniforms.uFade.value = fade

    // BLINK: advance the clock; when it's time, run a close→open over BLINK_DUR
    // (uEyeOpen 1→0→1 via a sine so it's smooth), then schedule the next at a random
    // interval. Only blink once the mask has arrived (fade≈1), so it doesn't blink
    // while still flying in from the deep.
    const bk = blink.current
    bk.clock += delta
    let eyeOpen = 1
    if (fade > 0.9) {
      if (bk.start < 0 && bk.clock >= bk.next) bk.start = bk.clock
      if (bk.start >= 0) {
        const bt = (bk.clock - bk.start) / BLINK_DUR
        if (bt >= 1) {
          bk.start = -1
          bk.next = bk.clock + BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN)
        } else {
          eyeOpen = 1 - Math.sin(bt * Math.PI) // 1 → 0 (shut at mid) → 1
        }
      }
    }
    material.uniforms.uEyeOpen.value = eyeOpen

    if (groupRef.current) {
      groupRef.current.position.set(pose.x + offX, pose.y + offY, zIn)
      groupRef.current.scale.setScalar(pose.s)
      groupRef.current.rotation.set(rot.current.x, rot.current.y + pose.ry, pose.rz)
    }
    rayMesh.position.set(pose.x + offX, pose.y + offY, zIn)
    rayMesh.scale.setScalar(pose.s)
    rayMesh.rotation.set(rot.current.x, rot.current.y + pose.ry, pose.rz)
    rayMesh.updateMatrixWorld()

    // cursor → 3D point on the (possibly rotated) mask → sim-local space
    raycaster.current.setFromCamera(pointer as THREE.Vector2, camera)
    const hit = raycaster.current.intersectObject(rayMesh)
    if (hit.length > 0) {
      velVar.material.uniforms.uMouse.value.copy(rayMesh.worldToLocal(hit[0].point.clone()))
      mouseSpeed.current = 1
    }
    mouseSpeed.current *= 0.9
    velVar.material.uniforms.uMouseSpeed.value = mouseSpeed.current
    velVar.material.uniforms.uTime.value += delta

    gpu.compute()
    const posTex = gpu.getCurrentRenderTarget(posVar).texture
    material.uniforms.uPositionTexture.value = posTex
    material.uniforms.uVelocityTexture.value = gpu.getCurrentRenderTarget(velVar).texture
    glyphMat.uniforms.uPositionTexture.value = posTex
    glyphMat.uniforms.uTime.value += delta
    // Keep the base dot layer's clock identical so the dot→glyph conversion stays
    // frame-exact (both recompute the same life curve from this shared time).
    material.uniforms.uTime.value = glyphMat.uniforms.uTime.value
  })

  if (!sim) return null
  return (
    <group ref={groupRef} position={[OFFSET.x, OFFSET.y, OFFSET.z]}>
      <points geometry={sim.geometry} material={sim.material} frustumCulled={false} />
      <points geometry={sim.glyphGeo} material={sim.glyphMat} frustumCulled={false} />
    </group>
  )
}

