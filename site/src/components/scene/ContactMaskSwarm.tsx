/* ============================================================================
 * ContactMaskSwarm.tsx — a composed field of small masks, fixed in place, that
 * turn AND tilt to face the cursor. Lives across the hero's Future frame and
 * the whole Contact section as one continuous presence.
 * ----------------------------------------------------------------------------
 * Round 6 (Melvin, 2026-08-10) changed two things, both documented in full at
 * their own definitions further down: the layout is now HAND-COMPOSED to frame
 * the reading column rather than evenly cover the section (see SWARM_SLOTS),
 * and the glyphs drift roughly half as fast (see GLYPH_ROVE_SPEED).
 *
 * Round 9 (Melvin, 2026-08-10): scrolling Future → Present used to cut every
 * glyph off mid-flight, because the whole component hard-unmounted the instant
 * you left Future. Fixed at the SOURCE, not here — see `swarmExit` in
 * contactVisibility.ts for the real explanation — this file just multiplies
 * that scalar into `uFade` below so opacity eases out while position (the
 * rise) keeps going untouched.
 * ----------------------------------------------------------------------------
 * Round 3 (Melvin, 2026-08-10, after seeing round 2 live):
 *   - Still can't make out facial features → added the hero's eye/nose
 *     brightening AND its blink cycle (each instance blinks on its own timer).
 *   - Uneven empty space, not symmetric → laid out on a real 2-row grid,
 *     mirrored left/right, count raised from 10 to 12 (he said feel free to
 *     go over 10 if it helps the balance).
 *   - Glyphs too fast, want them "more lived in" → GLYPH_ROVE_SPEED slowed
 *     further, GLYPH_ON_FRAC raised — roughly 13s lit, versus round 2's ~7s.
 *   - Glyphs should float "all the way to the top of the site" → uDriftUp
 *     raised hugely (32 local units — at this scale that's several viewport
 *     heights of travel, not a local wobble).
 *   - The big hero mask and this swarm were vanishing and reappearing every
 *     time he crossed Future ↔ Contact — read as a glitch. Fixed in
 *     GlobalScene.tsx: the big mask now fades itself out on scroll instead of
 *     hard mount-toggling (see MaskField.tsx), and this swarm mounts across
 *     Future + Contact as one continuous span (see `showSwarm` there) so its
 *     sim/glyph state never resets crossing that boundary. (Round 3 got the
 *     mounting span right but broke the LAYOUT during that span — see the
 *     round 4 note further down for the actual fix.)
 *   - "They follow me but don't look up or down properly" → added pitch
 *     (rotation.x) alongside yaw, same lag/idle behaviour.
 *
 * Round 4 (Melvin, 2026-08-10, screenshots): round 3's viewport-rect fallback
 * (below) was the actual bug behind "the big mask still overlaps" — it forced
 * the faces into the CURRENT viewport during Future, which is exactly what
 * put them on screen at the same time as the big mask. Removed entirely: this
 * component now ALWAYS anchors to `#contact`'s real live rect, on-screen or
 * not. During Future that rect is still below the viewport (large positive
 * top), so the faces sit at their true position and are simply not visible —
 * no collision, nothing force-relocated. Their GLYPHS still become visible
 * during Future because they drift a large distance upward (see uDriftUp
 * below): far enough that some of them cross back up into the visible
 * viewport even though the face they came from is off-screen below. That is
 * the actual effect wanted: faces only "fly in" once you've genuinely
 * scrolled to Contact (their real position is on-screen for the first time),
 * but glyphs already in flight keep floating up into view if you scroll back
 * to Future — and stop existing at all once you scroll further back than that
 * (Present or earlier), because the whole component unmounts there
 * (`showSwarm` in GlobalScene.tsx).
 * Also fixed the same round: the grid only had 2 rows, which left the bottom
 * of the Contact section empty — now 4 rows (see GRID_FY below).
 *
 * WHY THIS USED TO TAKE A `contactInView` PROP: it doesn't anymore. The
 * mounting condition (`showSwarm` in GlobalScene.tsx) still needs to know
 * whether Future or Contact triggered the mount, but this component's OWN
 * layout logic no longer needs to know — it just always reads the real DOM
 * rect, which is correct in every case now.
 *
 * PERF — WHY THIS IS ONE SIMULATION, NOT TWELVE: see MaskField.tsx for the
 * full reasoning (unchanged from round 1) — one shared GPUComputationRenderer,
 * twelve cheap draws of the same live position texture, each with its own
 * material clone (for independent intro fade) and its own transform.
 *
 * Reuses the proven face-crop constants, feature weights, blink cycle, and
 * glyph mechanism from MaskField.tsx (same values, so it reads the same way)
 * but duplicated rather than imported: keeps the hero's tuned, working file
 * completely untouched (confirmed zero diff each time this file changes).
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { swarmExit } from '../../hooks/contactVisibility'

// A field of small faces, not the hero focal point, but bigger/denser than
// round 1 (which read as "too blurry"). 84*84 = 7056 particles per face.
const SIZE = 84

// Same face-crop constants as MaskField.tsx (see that file for the full
// reasoning) — keeps the swarm's faces reading the same way as the hero's.
const FRONT_FACING = 0.12
const BACK_CLIP = -0.11
const FACE_X_HALF = 0.32
const FACE_Y_BOTTOM = -0.64
const FACE_TOP_PEAK = 0.36
const FACE_TOP_CURVE = 2.2

// Same eye/nose feature weights as MaskField.tsx (see that file for the
// measurement notes) — added back in round 3 so these read as FACES, not
// featureless silhouettes.
const EYE_Y = -0.14
const EYE_X = 0.16
const EYE_HW = 0.09
const EYE_OPEN = 0.035
const EYE_LINE_BW = 0.01
const EYE_IRIS_R = 0.028
const NOSE_X_HALF = 0.055
const NOSE_Y = 0.06
const NOSE_Y_HALF = 0.17
const NOSE_TOP = 0.14

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
function noseWeight(x: number, y: number): number {
  if (y > NOSE_TOP) return 0
  const noseDist = Math.hypot(x / NOSE_X_HALF, (y - NOSE_Y) / NOSE_Y_HALF)
  return Math.max(0, 1 - noseDist) * 0.85
}

// Same blink timing as MaskField.tsx, but run PER INSTANCE with independent
// random gaps (see the blink state in the component) — twelve faces blinking
// in lockstep would read as mechanical; staggered, it reads as alive.
const BLINK_DUR = 0.16
const BLINK_MIN = 3.2
const BLINK_MAX = 7.0

/* ---- WHERE THE FACES SIT ------------------------------------------------
 * 17 slots as FRACTIONS of the Contact section's rect (0,0 = its top-left).
 *
 * History, because this has now failed in three different ways:
 *   round 2 — freehand scatter        → "uneven empty space"
 *   rounds 3-4 — strict 6x4 grid      → "too symmetrical, rows and columns"
 *   round 5 — jittered/stratified grid → still not it: "arranged in a more
 *             pleasing manner ... well placed from an aesthetic pov"
 *
 * Round 5 is the interesting failure. A jittered grid is the textbook answer to
 * "irregular but evenly spread", and it delivered exactly that — the offline
 * search scored it on no-overlaps, edge-to-edge coverage, and no two faces
 * sharing a row or column, and it passed all three. It still looked wrong,
 * because EVEN COVERAGE IS THE PROBLEM, not the solution. Spreading 18 faces
 * uniformly over the section is wallpaper: no focal point, no hierarchy, no
 * relationship to the thing the section is actually for. That is what reads as
 * unconsidered, and no amount of extra randomness fixes it.
 *
 * So this round is COMPOSED, by hand, not searched. Three rules:
 *
 * 1. THE FACES FRAME THE CONTENT, THEY DON'T SIT BEHIND IT. The reading column
 *    (headline, form, the social loop) is deliberately left empty; the faces
 *    live in the outer margins, the top-right corner, and the floor of the
 *    section. Thematically this is also just better — these are watchers, and
 *    watchers stand around the edge of a room.
 * 2. DENSITY IS UNEVEN ON PURPOSE. A cluster gathers in the upper right, thins
 *    down the right side, and re-gathers along the bottom, with a sparse
 *    single-file descent down the left margin. Measured density by quarter:
 *    x 6/1/4/6, y 5/3/3/6.
 * 3. SIZE READS AS DEPTH. Bigger faces sit low and outboard (near the viewer),
 *    smaller ones high and inboard (further away). Scale spans 0.55-1.15.
 *
 * Verified offline against real world-unit footprints (a scale-1.0 face is
 * 103x161 px, i.e. 0.071 x 0.146 of the section rect): zero overlapping pairs,
 * tightest clearance 1.15x, and zero intrusions into the headline, the social
 * loop, or the Return-to-Start button. Hand-composed means any single face can
 * be nudged one line at a time without re-running anything.
 * --------------------------------------------------------------------- */
const SWARM_SLOTS: { fx: number; fy: number; scale: number }[] = [
  // Upper-right cluster — the densest group, and the section's focal weight.
  { fx: 0.735, fy: 0.055, scale: 0.62 },
  { fx: 0.845, fy: 0.115, scale: 0.95 },
  { fx: 0.665, fy: 0.165, scale: 0.8 },
  { fx: 0.945, fy: 0.235, scale: 0.58 },
  { fx: 0.795, fy: 0.27, scale: 0.9 },
  // Left margin — a sparse single-file descent beside the form.
  { fx: 0.055, fy: 0.145, scale: 0.7 },
  { fx: 0.035, fy: 0.375, scale: 0.92 },
  { fx: 0.085, fy: 0.605, scale: 0.55 },
  { fx: 0.045, fy: 0.82, scale: 1.0 },
  // Right side — the cluster above thinning out as it falls.
  { fx: 0.925, fy: 0.48, scale: 0.72 },
  { fx: 0.68, fy: 0.655, scale: 1.1 },
  { fx: 0.88, fy: 0.705, scale: 0.85 },
  { fx: 0.575, fy: 0.775, scale: 0.62 },
  // Floor — the largest faces, anchoring the bottom of the section.
  { fx: 0.245, fy: 0.905, scale: 1.15 },
  { fx: 0.415, fy: 0.845, scale: 0.68 },
  { fx: 0.76, fy: 0.93, scale: 1.0 },
  { fx: 0.13, fy: 0.96, scale: 0.6 },
]

/* A face's on-screen size is derived from the camera's visible extent, which
 * depends on viewport HEIGHT — so on a narrow phone the faces keep their full
 * desktop size while the content column collapses around them, and they end up
 * sitting on top of the text instead of framing it. Shrink them with the
 * viewport WIDTH to keep the margins readable. Floored at 0.5 so they stay
 * legible as faces rather than dissolving into specks. */
const FIT_REF_WIDTH = 1100
const FIT_MIN = 0.5

// Overall "shrink to small" factor applied on top of each slot's own scale
// variation. (Round 2 note, still true: individual dot size — uParticleSize
// below — has to shrink WITH this or dots overlap and swallow the outline.)
const BASE_SCALE = 0.25

// How far a head can turn/tilt (radians). Yaw ~40deg reads clearly as "looking
// that way"; pitch is capped tighter (~20deg) since real heads tilt up/down
// less dramatically than they turn side to side.
const MAX_YAW = 0.7
const MAX_PITCH = 0.35

// Time constants (seconds). LOOK_LAG: exponential-smoothing time constant for
// both yaw and pitch (so "one second" is how quickly it settles, not a hard
// cutoff — matches MaskField.tsx's own scroll smoothing). IDLE_SECS: how long
// the cursor must sit still before every head eases back to neutral.
const LOOK_LAG = 1.0
const IDLE_SECS = 10.0

// INTRO fly-in: out of the deep/dark, same shape as the hero mask's own
// entrance, staggered per instance so twelve faces don't pop in at once.
const INTRO_SECS = 1.3
const INTRO_Z_DEEP = -4
const INTRO_STAGGER = 0.08

const simPosition = /* glsl */ `
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(uCurrentPosition, uv).xyz;
    vec3 vel = texture2D(uCurrentVelocity, uv).xyz;
    pos += vel;
    gl_FragColor = vec4(pos, 1.0);
  }
`

// Spring-to-home + a little ambient drift only — no cursor repulsion (the
// requested cursor interaction here is the head turning, not the particles
// themselves reacting).
const simVelocity = /* glsl */ `
  uniform sampler2D uHome;
  uniform float uTime;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos  = texture2D(uCurrentPosition, uv).xyz;
    vec3 home = texture2D(uHome, uv).xyz;
    vec3 vel  = texture2D(uCurrentVelocity, uv).xyz;

    vel *= 0.72;

    vec3 toHome = home - pos;
    float d = length(toHome);
    if (d > 0.0001) vel += normalize(toHome) * d * 0.02;

    float n = sin(uTime * 0.7 + uv.x * 40.0) * cos(uTime * 0.5 + uv.y * 40.0);
    vel += vec3(n, -n, n * 0.4) * 0.00006;

    gl_FragColor = vec4(vel, 1.0);
  }
`

const renderVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uParticleSize;
  attribute vec2 aRef;
  attribute float aGlyphSeed; // glyph seed if this dot is a glyph candidate, else -1
  attribute float aEye;       // eye-feature weight (0..1) — animated by the blink
  attribute float aNose;      // nose-feature weight (0..1) — static
  uniform float uTime;
  uniform float uRoveSpeed;
  uniform float uOnFrac;
  uniform float uEyeOpen;     // 1 = eyes open, 0 = shut (this instance's blink)
  varying float vSpeed;
  varying float vGlyphFade;
  varying float vFeature;

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    vSpeed = length(texture2D(uVelocityTexture, aRef).xyz);
    vFeature = max(aNose, aEye * uEyeOpen);

    // Same conversion trick as the hero mask: a glyph-candidate dot fades
    // itself out exactly as its glyph forms, so it reads as converting INTO
    // the glyph rather than sitting underneath it.
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
  uniform vec3 uColor;
  uniform float uMinAlpha;
  uniform float uMaxAlpha;
  uniform float uFade;
  uniform float uFeatureFloor;
  varying float vSpeed;
  varying float vGlyphFade;
  varying float vFeature;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
    a = max(a, vFeature * uFeatureFloor);
    a *= (1.0 - vGlyphFade);
    a *= uFade;
    gl_FragColor = vec4(uColor, a);
  }
`

/* ---- Glyph layer: binary + Telugu, roving, same mechanism as MaskField.tsx.
 * Round 3: slower (GLYPH_ROVE_SPEED down, GLYPH_ON_FRAC up → ~13s lit, versus
 * round 2's ~7s — Melvin: "too fast... more lived in") and drifting MUCH
 * further (uDriftUp way up — "float up all the way to the top of the site").
 * Drift happens in LOCAL (pre-group-transform) units, so it scales with each
 * mask's own BASE_SCALE; picked generously large rather than computed exactly
 * per instance — this same distance is now also what makes glyphs visible
 * during the Future frame even though their origin face is off-screen below
 * (see the file header's round 4 note). Exact would need each slot's distance
 * to the actual top of the document, which moves as the page's total height
 * changes — a fixed generous distance gets the spirit of "way above,
 * disappearing" without that bookkeeping). ------------------------------- */
const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const GLYPH_CHARS = [...BINARY, ...TELUGU]
const BIN_START = 0
const TEL_START = BINARY.length
const GLYPH_POOL_FRACTION = 0.14
// Lit duration ≈ GLYPH_ON_FRAC / GLYPH_ROVE_SPEED ≈ 0.06 / 0.0024 ≈ 25s.
//
// Round 6 (still "too fast"): the number that actually governs perceived speed
// isn't the lit duration, it's how fast a glyph is TRAVELLING, and that had
// been hiding behind the rise curve. A glyph covers uDriftUp (32 local units,
// ~8 world units after the group scale, ~5.7 viewport heights) over its whole
// lit life, and because rise is a power curve it does most of that at the END:
// at 13.3s the top-of-arc speed worked out to ~0.86 viewport heights per
// second, which is a streak, not a drift. Lengthening the life to 25s AND
// softening the exponent (see uRiseExp) brings that down to ~0.35 — slow
// enough to actually read as floating. Density is untouched: ON_FRAC is the
// same, so the same proportion of the pool is lit at any instant.
const GLYPH_ON_FRAC = 0.06
const GLYPH_ROVE_SPEED = 0.0024
// Exponent on the rise curve. 1.0 would be dead-linear; the old 2.0 was
// constant-acceleration (buoyancy), which is the right SHAPE but whips at the
// top. 1.6 keeps the slow start and takes ~20% off the peak speed.
const GLYPH_RISE_EXP = 1.6
const GLYPH_SIZE = 13

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
  ctx.font = '42px "Nirmala UI", "Gautami", "Noto Sans Telugu", monospace'
  GLYPH_CHARS.forEach((ch, i) => {
    const cx = (i % cols) * cell + cell / 2
    const cy = Math.floor(i / cols) * cell + cell / 2
    ctx.fillText(ch, cx, cy)
  })
  const tex = new THREE.CanvasTexture(cvs)
  tex.flipY = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return { texture: tex, cols }
}

const glyphVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform float uGlyphSize;
  uniform float uTime;
  uniform float uBinStart;
  uniform float uTelStart;
  uniform float uOnFrac;
  uniform float uRoveSpeed;
  uniform float uDriftUp;
  uniform float uDriftOut;
  uniform float uDriftSide;
  uniform float uRiseExp;
  attribute vec2 aRef;
  attribute float aSeed;
  varying float vGlyph;
  varying float vAlpha;

  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;

    float life = fract(aSeed * 31.7 + uTime * uRoveSpeed);
    float edge = min(0.06, uOnFrac * 0.5);
    float fade = smoothstep(0.0, edge, life) - smoothstep(uOnFrac - edge, uOnFrac, life);
    vAlpha = clamp(fade, 0.0, 1.0);

    float lp = clamp(life / uOnFrac, 0.0, 1.0);
    float rise = pow(lp, uRiseExp);
    pos.y += uDriftUp * rise;
    pos.z += uDriftOut * rise;
    pos.x += (hash(aSeed * 17.0) - 0.5) * uDriftSide * rise;

    float relight = floor(aSeed * 31.7 + uTime * uRoveSpeed);
    float cat = step(0.5, hash(aSeed * 3.1 + relight));
    float start = cat < 0.5 ? uBinStart : uTelStart;
    float cnt   = cat < 0.5 ? 2.0       : 16.0;
    float r = hash(aSeed * 7.0 + cat * 5.0 + relight);
    vGlyph = start + floor(r * cnt);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.002, vAlpha);
    gl_Position = projectionMatrix * mv;
  }
`

const glyphFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform vec3 uColor;
  uniform float uFade;
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

/** Per-instance look state: current/target, both in radians. Shared shape for
 *  yaw and pitch — two independent arrays of this type, not one merged array,
 *  so each axis's lag math stays a one-line `+=` like MaskField's own smoothing. */
type LookState = { current: number; target: number }

/** Per-instance blink state, same shape as MaskField.tsx's single blink clock. */
type BlinkState = { clock: number; next: number; start: number }

export function ContactMaskSwarm() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    const draco = new DRACOLoader()
    draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.load(
      '/models/cyborg.glb',
      (gltf) => {
        let g: THREE.BufferGeometry | null = null
        gltf.scene.traverse((o) => {
          if (!g && (o as THREE.Mesh).isMesh) g = (o as THREE.Mesh).geometry
        })
        if (!g) console.error('[ContactMaskSwarm] no mesh found in cyborg.glb')
        setGeo(g)
      },
      undefined,
      (err) => console.error('[ContactMaskSwarm] model load error:', err),
    )
    return () => {
      draco.dispose()
    }
  }, [])

  const [sim, setSim] = useState<{
    gpu: GPUComputationRenderer
    posVar: any
    velVar: any
    geometry: THREE.BufferGeometry
    // One material clone per instance so each can run its own intro fade and
    // blink independently while all twelve still read the same shared
    // position/velocity texture.
    materials: THREE.ShaderMaterial[]
    glyphGeo: THREE.BufferGeometry
    glyphMaterials: THREE.ShaderMaterial[]
  } | null>(null)

  useEffect(() => {
    if (!geo) return
    let cancelled = false

    const build = async () => {
      if (!geo.attributes.normal) geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo)
      const sampler = new MeshSurfaceSampler(mesh).build()

      const count = SIZE * SIZE
      const homeData = new Float32Array(count * 4)
      const refs = new Float32Array(count * 2)
      const eyeData = new Float32Array(count)
      const noseData = new Float32Array(count)
      const p = new THREE.Vector3()
      const n = new THREE.Vector3()

      const inFace = (v: THREE.Vector3, nz: number) =>
        nz >= FRONT_FACING &&
        v.z >= BACK_CLIP &&
        Math.abs(v.x) <= FACE_X_HALF &&
        v.y >= FACE_Y_BOTTOM &&
        v.y <= FACE_TOP_PEAK - FACE_TOP_CURVE * v.x * v.x
      const last = new THREE.Vector3(0, -0.08, 0.2)

      for (let i = 0; i < SIZE; i++) {
        if (i % 8 === 0) await new Promise((r) => setTimeout(r, 0))
        if (cancelled) return
        for (let j = 0; j < SIZE; j++) {
          const idx = i * SIZE + j
          let tries = 0
          do {
            sampler.sample(p, n)
            tries++
          } while (!inFace(p, n.z) && tries < 40)
          if (!inFace(p, n.z)) p.copy(last)
          else last.copy(p)
          p.x = Math.abs(p.x) * (Math.random() < 0.5 ? 1 : -1) // mirror, matches the hero
          homeData[idx * 4 + 0] = p.x
          homeData[idx * 4 + 1] = p.y
          homeData[idx * 4 + 2] = p.z
          homeData[idx * 4 + 3] = 1
          eyeData[idx] = eyeWeight(p.x, p.y)
          noseData[idx] = noseWeight(p.x, p.y)
          refs[idx * 2 + 0] = (j + 0.5) / SIZE
          refs[idx * 2 + 1] = (i + 0.5) / SIZE
        }
      }

      const gpu = new GPUComputationRenderer(SIZE, SIZE, gl)
      const homeTex = gpu.createTexture()
      homeTex.image.data!.set(homeData)
      const velTex = gpu.createTexture()

      const posVar = gpu.addVariable('uCurrentPosition', simPosition, homeTex)
      const velVar = gpu.addVariable('uCurrentVelocity', simVelocity, velTex)
      gpu.setVariableDependencies(posVar, [posVar, velVar])
      gpu.setVariableDependencies(velVar, [posVar, velVar])

      const homeRef = gpu.createTexture()
      homeRef.image.data!.set(homeData)
      velVar.material.uniforms.uHome = { value: homeRef }
      velVar.material.uniforms.uTime = { value: 0 }

      const err = gpu.init()
      if (err) console.error('[ContactMaskSwarm] GPGPU init error:', err)

      // ---- glyph pool (same strided-candidate approach as MaskField.tsx) ----
      const glyphPool = Math.max(1, Math.floor(count * GLYPH_POOL_FRACTION))
      const stride = Math.max(1, Math.floor(count / glyphPool))
      const gPositions: number[] = []
      const gRefs: number[] = []
      const gSeeds: number[] = []
      const baseGlyphSeed = new Float32Array(count).fill(-1)
      for (let k = 0; k < count; k += stride) {
        const seed = Math.random()
        gPositions.push(0, 0, 0)
        gRefs.push(refs[k * 2], refs[k * 2 + 1])
        gSeeds.push(seed)
        baseGlyphSeed[k] = seed
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
      geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
      geometry.setAttribute('aGlyphSeed', new THREE.BufferAttribute(baseGlyphSeed, 1))
      geometry.setAttribute('aEye', new THREE.BufferAttribute(eyeData, 1))
      geometry.setAttribute('aNose', new THREE.BufferAttribute(noseData, 1))

      const makeMaterial = () =>
        new THREE.ShaderMaterial({
          uniforms: {
            uPositionTexture: { value: null },
            uVelocityTexture: { value: null },
            uParticleSize: { value: 0.65 },
            uColor: { value: new THREE.Color('#80fff0') },
            uMinAlpha: { value: 0.05 },
            uMaxAlpha: { value: 0.8 },
            uFeatureFloor: { value: 0.34 },
            uEyeOpen: { value: 1 },
            uFade: { value: 0 },
            uTime: { value: 0 },
            uRoveSpeed: { value: GLYPH_ROVE_SPEED },
            uOnFrac: { value: GLYPH_ON_FRAC },
          },
          vertexShader: renderVertex,
          fragmentShader: renderFragment,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      const materials = SWARM_SLOTS.map(() => makeMaterial())

      const atlas = makeGlyphAtlas()
      const glyphGeo = new THREE.BufferGeometry()
      glyphGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gPositions), 3))
      glyphGeo.setAttribute('aRef', new THREE.BufferAttribute(new Float32Array(gRefs), 2))
      glyphGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(gSeeds), 1))

      const makeGlyphMaterial = () =>
        new THREE.ShaderMaterial({
          uniforms: {
            uPositionTexture: { value: null },
            uGlyphSize: { value: GLYPH_SIZE },
            uTime: { value: 0 },
            uBinStart: { value: BIN_START },
            uTelStart: { value: TEL_START },
            uOnFrac: { value: GLYPH_ON_FRAC },
            uRoveSpeed: { value: GLYPH_ROVE_SPEED },
            // Big, generous drift — see the file header note above the glyph
            // section for why this is one shared distance, not a precise
            // per-instance distance-to-the-top-of-the-document calculation.
            uDriftUp: { value: 32 },
            uDriftOut: { value: 1.5 },
            uDriftSide: { value: 3 },
            uRiseExp: { value: GLYPH_RISE_EXP },
            uAtlas: { value: atlas.texture },
            uCols: { value: atlas.cols },
            uFade: { value: 0 },
            uColor: { value: new THREE.Color('#b9fff2').multiplyScalar(1.7) },
          },
          vertexShader: glyphVertex,
          fragmentShader: glyphFragment,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      const glyphMaterials = SWARM_SLOTS.map(() => makeGlyphMaterial())

      if (!cancelled) setSim({ gpu, posVar, velVar, geometry, materials, glyphGeo, glyphMaterials })
    }

    build()
    return () => {
      cancelled = true
    }
  }, [geo, gl])

  // Per-instance state, all living outside React state — read/written every
  // frame, exactly the kind of value that must NOT trigger a re-render (see
  // heroScroll.ts for the same reasoning in this codebase).
  const yaws = useMemo<LookState[]>(() => SWARM_SLOTS.map(() => ({ current: 0, target: 0 })), [])
  const pitches = useMemo<LookState[]>(() => SWARM_SLOTS.map(() => ({ current: 0, target: 0 })), [])
  const blinks = useMemo<BlinkState[]>(
    () => SWARM_SLOTS.map((_, i) => ({ clock: 0, next: 1.5 + i * 0.37, start: -1 })),
    [],
  )
  // Per-instance intro clocks, staggered (see INTRO_STAGGER). swarmClock is
  // time-since-mount (accumulated from useFrame's own delta), NOT wall-clock —
  // that distinction matters: comparing a stagger offset of a fraction of a
  // second against performance.now() (which is huge, browser uptime) would
  // never gate correctly.
  const introT = useMemo<number[]>(() => SWARM_SLOTS.map(() => 0), [])
  const swarmClock = useRef(0)
  const groupRefs = useRef<(THREE.Group | null)[]>([])

  // Raw cursor tracking on `window`, NOT r3f's `useThree().pointer` — see
  // round 2's notes for why the latter silently fails here (DOM content
  // occludes the canvas over most of this section). clientX/clientY are
  // already in the same CSS-pixel space as getBoundingClientRect(), so no NDC
  // conversion needed.
  const mousePx = useRef({ x: -9999, y: -9999 })
  const lastMoveAt = useRef(0)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mousePx.current.x = e.clientX
      mousePx.current.y = e.clientY
      lastMoveAt.current = performance.now() / 1000
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_state, delta) => {
    if (!sim) return
    const { gpu, posVar, velVar, materials, glyphMaterials } = sim

    velVar.material.uniforms.uTime.value += delta
    gpu.compute()
    const posTex = gpu.getCurrentRenderTarget(posVar).texture
    const velTex = gpu.getCurrentRenderTarget(velVar).texture
    const t = velVar.material.uniforms.uTime.value

    // Always the real #contact rect, on-screen or not (see the file header,
    // round 4) — during Future this is a rect below the viewport (large
    // positive top), which is exactly what keeps the faces genuinely
    // off-screen there instead of force-relocated into view.
    const el = document.getElementById('contact')
    const rect = el?.getBoundingClientRect()
    if (!rect) return

    // Screen px → world units at z=0, for THIS camera (see the hero mask's own
    // comment on visible extents — same derivation).
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const worldH = 2 * Math.tan(fovRad / 2) * camera.position.z
    const worldW = worldH * (size.width / size.height)
    const toWorld = (px: number, py: number) => ({
      x: (px / size.width - 0.5) * worldW,
      y: -(py / size.height - 0.5) * worldH,
    })

    const now = performance.now() / 1000
    const idle = now - lastMoveAt.current > IDLE_SECS
    const lagT = 1 - Math.exp(-delta / LOOK_LAG)
    swarmClock.current += delta

    // See FIT_REF_WIDTH — face size tracks viewport height, so narrow windows
    // need an explicit shrink or the margin faces climb onto the text.
    const fit = Math.max(FIT_MIN, Math.min(1, size.width / FIT_REF_WIDTH))

    SWARM_SLOTS.forEach((slot, i) => {
      const group = groupRefs.current[i]
      const mat = materials[i]
      const gmat = glyphMaterials[i]
      if (!group || !mat || !gmat) return

      // Shared live sim state, pushed into this instance's own material clone.
      mat.uniforms.uPositionTexture.value = posTex
      mat.uniforms.uVelocityTexture.value = velTex
      mat.uniforms.uTime.value = t
      gmat.uniforms.uPositionTexture.value = posTex
      gmat.uniforms.uTime.value = t

      // BLINK — same close→open→wait cycle as MaskField.tsx, run per instance
      // with its own random gap so twelve faces don't blink in lockstep.
      const bk = blinks[i]
      bk.clock += delta
      let eyeOpen = 1
      if (bk.start < 0 && bk.clock >= bk.next) bk.start = bk.clock
      if (bk.start >= 0) {
        const bt = (bk.clock - bk.start) / BLINK_DUR
        if (bt >= 1) {
          bk.start = -1
          bk.next = bk.clock + BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN)
        } else {
          eyeOpen = 1 - Math.sin(bt * Math.PI)
        }
      }
      mat.uniforms.uEyeOpen.value = eyeOpen

      // INTRO: staggered per-instance fly-in from the deep, easing out as it
      // arrives — same shape as the hero mask's own entrance, not a flat fade.
      if (swarmClock.current > i * INTRO_STAGGER) {
        introT[i] = Math.min(1, introT[i] + delta / INTRO_SECS)
      }
      const eIntro = 1 - Math.pow(1 - introT[i], 3) // easeOutCubic
      const zIn = INTRO_Z_DEEP * (1 - eIntro)
      // `swarmExit.fade` (contactVisibility.ts) is 1 while we're in Future/
      // Contact and ramps to 0 over real time once you scroll back out — see
      // that file for why. Multiplying it in here, rather than just hard-
      // unmounting on the way out, is what lets glyphs already in flight keep
      // rising and fade out instead of snapping off. Position is untouched by
      // this — only opacity.
      const fade = eIntro * swarmExit.fade
      mat.uniforms.uFade.value = fade
      gmat.uniforms.uFade.value = fade

      const px = rect.left + slot.fx * rect.width
      const py = rect.top + slot.fy * rect.height
      const w = toWorld(px, py)
      group.position.set(w.x, w.y, zIn)
      group.scale.setScalar(BASE_SCALE * slot.scale * fit)

      // Target look: idle → straight ahead (0,0); otherwise turn/tilt toward
      // the cursor, proportional to how far off-centre it is from THIS mask.
      const yaw = yaws[i]
      const pitch = pitches[i]
      if (idle) {
        yaw.target = 0
        pitch.target = 0
      } else {
        const dx = mousePx.current.x - px
        const dy = mousePx.current.y - py
        yaw.target = Math.max(-MAX_YAW, Math.min(MAX_YAW, (dx / (size.width * 0.5)) * MAX_YAW))
        pitch.target = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, (dy / (size.height * 0.5)) * MAX_PITCH))
      }
      yaw.current += (yaw.target - yaw.current) * lagT
      pitch.current += (pitch.target - pitch.current) * lagT
      group.rotation.set(pitch.current, yaw.current, 0)
    })
  })

  if (!sim) return null
  return (
    <>
      {SWARM_SLOTS.map((_, i) => (
        <group key={i} ref={(el) => { groupRefs.current[i] = el }}>
          <points geometry={sim.geometry} material={sim.materials[i]} frustumCulled={false} />
          <points geometry={sim.glyphGeo} material={sim.glyphMaterials[i]} frustumCulled={false} />
        </group>
      ))}
    </>
  )
}
