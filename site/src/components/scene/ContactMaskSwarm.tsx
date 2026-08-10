/* ============================================================================
 * ContactMaskSwarm.tsx — ten small masks, fixed in place, that turn to face
 * the cursor. The Contact section's WebGL background.
 * ----------------------------------------------------------------------------
 * Melvin's spec (2026-08-09, revised 2026-08-10 after seeing v1 live):
 *   - Bigger and sharper — v1 read as "too blurry, can't see them properly".
 *   - Contained inside the Contact section's frame, never clipped at its edges.
 *   - Actually turn toward the cursor (v1 barely moved — see the bug below),
 *     with about a ONE second lag (not three — he corrected this after seeing
 *     it), easing back to neutral after ~10s of no cursor movement. Position
 *     never changes, only the turn.
 *   - Fly in from the deep/dark on first reveal, the same way the hero's
 *     single mask does on page load, not a plain opacity fade.
 *   - Carry the glyph layer (binary + Telugu) too, lingering longer and
 *     drifting a long way — out past the small face, toward the section's
 *     edge — before dissolving, not just a small local wobble.
 *
 * THE CURSOR BUG (v1): it used `useThree().pointer`, React Three Fiber's own
 * NDC pointer — which only updates while the CANVAS ELEMENT is the topmost
 * thing under the cursor. The Contact section is dense with real DOM content
 * (headings, the form, buttons) sitting above the canvas in stacking order, so
 * hovering any of that never reached the canvas and the pointer barely moved.
 * Fixed by tracking raw `pointermove` on `window` directly (clientX/clientY),
 * the same approach MaskField.tsx's OWN drag-rotation already uses — window
 * listeners aren't gated by DOM hit-testing, so this works everywhere on the
 * page regardless of what's drawn on top of the canvas.
 *
 * PERF — WHY THIS IS ONE SIMULATION, NOT TEN:
 * MaskField.tsx (the hero's single mask) is a GPGPU particle sim: a full
 * position+velocity compute pass every frame, at a fairly high resolution
 * (147k particles). Running that ten times over for ten small background
 * decorations would not hold 60fps. So there is exactly ONE shared
 * GPUComputationRenderer here, computed once per frame; the ten masks are ten
 * cheap draws of the SAME live position texture, each with its own transform
 * (fixed screen slot, its own yaw, its own intro timing). They breathe in sync,
 * which reads as one coordinated field rather than ten independently jittering
 * sims, and costs roughly a tenth-of-a-tenth of what ten real sims would.
 * Each instance gets its OWN cloned material (cheap — a handful of uniforms,
 * not new GPU work) so its intro fade can run independently while still
 * pointing at the one shared position/velocity texture.
 *
 * Reuses the proven face-crop constants, sim-shader shape, and glyph mechanism
 * from MaskField.tsx (same values, so it reads the same way) but duplicated
 * rather than imported: keeps the hero's tuned, working file completely
 * untouched (confirmed zero diff each time this file changes).
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

// A background texture of ten faces, not the hero focal point, but bigger and
// denser than the first pass (which read as "too blurry"). 84*84 = 7056
// particles per face; ten draws of that is still cheap next to the hero's 147k.
const SIZE = 84

// Same face-crop constants as MaskField.tsx (see that file for the full
// reasoning) — keeps the swarm's faces reading the same way as the hero's.
const FRONT_FACING = 0.12
const BACK_CLIP = -0.11
const FACE_X_HALF = 0.32
const FACE_Y_BOTTOM = -0.64
const FACE_TOP_PEAK = 0.36
const FACE_TOP_CURVE = 2.2

// Ten fixed slots, as FRACTIONS of the #contact section's own on-screen rect
// (0,0 = its top-left, 1,1 = its bottom-right). Recomputed to world space every
// frame from the section's live getBoundingClientRect, so the swarm scrolls
// naturally with the section instead of needing its own scroll-track logic.
// Margins tightened (was 0.06–0.92) now that the masks render bigger, so none
// of them clip past the section's own edges. Scale spread also narrowed (was
// 0.65–1.1) so the biggest instance doesn't clip on its own.
const SWARM_SLOTS: { fx: number; fy: number; scale: number }[] = [
  { fx: 0.1, fy: 0.1, scale: 0.85 },
  { fx: 0.24, fy: 0.42, scale: 1.05 },
  { fx: 0.36, fy: 0.18, scale: 0.78 },
  { fx: 0.48, fy: 0.6, scale: 0.95 },
  { fx: 0.58, fy: 0.1, scale: 0.88 },
  { fx: 0.68, fy: 0.38, scale: 0.8 },
  { fx: 0.78, fy: 0.16, scale: 1.0 },
  { fx: 0.86, fy: 0.48, scale: 0.85 },
  { fx: 0.18, fy: 0.68, scale: 0.75 },
  { fx: 0.72, fy: 0.72, scale: 0.92 },
]

// Overall "shrink to small" factor applied on top of each slot's own scale
// variation. Raised from 0.15 — v1 was reading as a blurry smudge because the
// individual dot size (uParticleSize below) didn't shrink along with it, so
// dots overlapped and swallowed the face's outline. Bigger face + smaller dots
// together is what actually reads as a small, SHARP face rather than a blob.
const BASE_SCALE = 0.27

// How far a head can turn (radians). ~40deg — reads clearly as "looking that
// way" without ever turning far enough to see the back of the mask.
const MAX_YAW = 0.7

// Time constants (seconds). YAW_LAG: how quickly the turn approaches the
// cursor's direction (exponential smoothing, so this is the smoothing time
// constant, not a hard cutoff — matches the smoothing style already used for
// scroll in MaskField.tsx). Melvin, 2026-08-10, after seeing 3s live: "the lag
// should be one second." IDLE_SECS: how long the cursor must sit still before
// every head eases back to neutral (unchanged from the original spec).
const YAW_LAG = 1.0
const IDLE_SECS = 10.0

// INTRO fly-in (Melvin, 2026-08-10: "the same thing" as the hero mask's own
// entrance — out of the deep/dark, not a plain opacity fade). Each instance's
// timer starts on its own small stagger (see INTRO_STAGGER in the component)
// so ten faces don't all pop in in the same instant — reads as emerging from
// an abyss rather than a single synchronized cue.
const INTRO_SECS = 1.3
const INTRO_Z_DEEP = -4
const INTRO_STAGGER = 0.09 // seconds between each instance's start

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
  uniform float uTime;
  uniform float uRoveSpeed;
  uniform float uOnFrac;
  varying float vSpeed;
  varying float vGlyphFade;

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    vSpeed = length(texture2D(uVelocityTexture, aRef).xyz);

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
  varying float vSpeed;
  varying float vGlyphFade;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
    a *= (1.0 - vGlyphFade);
    a *= uFade;
    gl_FragColor = vec4(uColor, a);
  }
`

/* ---- Glyph layer: binary + Telugu, roving, same mechanism as MaskField.tsx
 * (see that file for the full reasoning on WHY these two alphabets). Drift
 * distances are much larger here than the hero's own — Melvin, 2026-08-10:
 * "go completely above the page... float, go to the border of the contact
 * page, and then disappear there", not a small local wobble. Drift happens in
 * LOCAL (pre-group-transform) units, so it scales with each mask's own
 * BASE_SCALE; the values below are picked generously large so a glyph travels
 * well past its own tiny face before fading — an approximation of "reaches the
 * section border" rather than a precise per-instance distance-to-edge
 * calculation (that would need to know each slot's distance to its nearest
 * edge individually; this gets the spirit of it with one shared, tunable
 * distance). Lit duration also raised well past the hero's ~2.2s. ------- */
const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const GLYPH_CHARS = [...BINARY, ...TELUGU]
const BIN_START = 0
const TEL_START = BINARY.length
const GLYPH_POOL_FRACTION = 0.14
// Lit duration ≈ GLYPH_ON_FRAC / GLYPH_ROVE_SPEED ≈ 0.05 / 0.007 ≈ 7.1s — well
// past the hero's ~2.2s, giving each glyph time to travel the longer distance.
const GLYPH_ON_FRAC = 0.05
const GLYPH_ROVE_SPEED = 0.007
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
    float rise = lp * lp;
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

/** Per-instance turn state: current/target yaw, both in radians. */
type YawState = { current: number; target: number }

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
    // One material clone per instance so each can run its own intro fade
    // independently while all ten still read the same shared position texture.
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

      const makeMaterial = () =>
        new THREE.ShaderMaterial({
          uniforms: {
            uPositionTexture: { value: null },
            uVelocityTexture: { value: null },
            uParticleSize: { value: 0.65 },
            uColor: { value: new THREE.Color('#80fff0') },
            uMinAlpha: { value: 0.05 },
            uMaxAlpha: { value: 0.8 },
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
            // Big, generous drift so a glyph clears its own tiny face and
            // travels a long way before fading — see the file header note.
            uDriftUp: { value: 6.5 },
            uDriftOut: { value: 1.5 },
            uDriftSide: { value: 2.2 },
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

  // Ten independent yaw states, one per slot. Lives outside React state — it's
  // read/written every frame, exactly the kind of value that must NOT trigger
  // a re-render (see heroScroll.ts for the same reasoning in this codebase).
  const yaws = useMemo<YawState[]>(() => SWARM_SLOTS.map(() => ({ current: 0, target: 0 })), [])
  // Per-instance intro clocks, staggered (see INTRO_STAGGER). swarmClock is
  // time-since-mount (accumulated from useFrame's own delta), NOT wall-clock —
  // that distinction matters: comparing a stagger offset of a fraction of a
  // second against performance.now() (which is huge, browser uptime) would
  // never gate correctly.
  const introT = useMemo<number[]>(() => SWARM_SLOTS.map(() => 0), [])
  const swarmClock = useRef(0)
  const groupRefs = useRef<(THREE.Group | null)[]>([])

  // Raw cursor tracking on `window`, NOT r3f's `useThree().pointer` — see the
  // file header for why the latter silently fails here (DOM content occludes
  // the canvas over most of this section). clientX/clientY are already in the
  // same CSS-pixel space as getBoundingClientRect(), so no NDC conversion.
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

    // Where is #contact on screen RIGHT NOW? Read every frame so the swarm
    // tracks the section as it scrolls, with no scroll-track bookkeeping of its
    // own — matches how the section actually moves (plain document flow).
    const el = document.getElementById('contact')
    const rect = el?.getBoundingClientRect()
    if (!rect) return

    // Screen px → world units at z=0, for THIS camera (see file header for the
    // derivation; matches the hero mask's own comment on visible extents).
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const worldH = 2 * Math.tan(fovRad / 2) * camera.position.z
    const worldW = worldH * (size.width / size.height)
    const toWorld = (px: number, py: number) => ({
      x: (px / size.width - 0.5) * worldW,
      y: -(py / size.height - 0.5) * worldH,
    })

    const now = performance.now() / 1000
    const idle = now - lastMoveAt.current > IDLE_SECS
    const lagT = 1 - Math.exp(-delta / YAW_LAG)
    swarmClock.current += delta

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

      // INTRO: staggered per-instance fly-in from the deep, easing out as it
      // arrives — same shape as the hero mask's own entrance, not a flat fade.
      // Instance i doesn't start ramping until its own stagger delay has
      // elapsed SINCE MOUNT (swarmClock), so the ten arrive one after another
      // rather than all at once.
      if (swarmClock.current > i * INTRO_STAGGER) {
        introT[i] = Math.min(1, introT[i] + delta / INTRO_SECS)
      }
      const eIntro = 1 - Math.pow(1 - introT[i], 3) // easeOutCubic
      const zIn = INTRO_Z_DEEP * (1 - eIntro)
      mat.uniforms.uFade.value = eIntro
      gmat.uniforms.uFade.value = eIntro

      const px = rect.left + slot.fx * rect.width
      const py = rect.top + slot.fy * rect.height
      const w = toWorld(px, py)
      group.position.set(w.x, w.y, zIn)
      group.scale.setScalar(BASE_SCALE * slot.scale)

      // Target yaw: idle → look straight (0); otherwise turn toward the cursor,
      // proportional to how far off-centre it is horizontally from THIS mask.
      const yaw = yaws[i]
      if (idle) {
        yaw.target = 0
      } else {
        const dx = mousePx.current.x - px
        yaw.target = Math.max(-MAX_YAW, Math.min(MAX_YAW, (dx / (size.width * 0.5)) * MAX_YAW))
      }
      yaw.current += (yaw.target - yaw.current) * lagT
      group.rotation.y = yaw.current
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
