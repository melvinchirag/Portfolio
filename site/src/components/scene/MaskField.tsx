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

/* ---- SCROLL CHOREOGRAPHY (step 1 of the hero rebuild, 2026-07-31) ----------
 * The mask no longer just sits on the left — it travels a path, scales, and
 * rolls as you scroll the 5 hero beats, so scrolling reads as a real animation.
 * Each keyframe: p = scroll progress 0→1, (x,y) = world position, s = scale,
 * rz = z-roll (radians). Camera is at z=1.5, fov 50 → the visible box at z=0 is
 * roughly x∈[-1.1,1.1], y∈[-0.7,0.7], so these stay on-screen. This is a
 * FIRST-PASS path meant to be tuned live with Melvin, not a final composition. */
type Pose = { x: number; y: number; s: number; rz: number }
const MASK_PATH: (Pose & { p: number })[] = [
  { p: 0.0, x: -0.62, y: 0.0, s: 1.0, rz: 0.0 }, // beat 1 — identity, left
  { p: 0.25, x: -0.2, y: 0.22, s: 1.2, rz: 0.12 }, // drifts up + grows
  { p: 0.5, x: 0.3, y: -0.02, s: 1.35, rz: -0.1 }, // the big centred hero beat
  { p: 0.75, x: 0.62, y: 0.24, s: 1.1, rz: 0.2 }, // swings right, shrinks
  { p: 1.0, x: 0.1, y: 0.32, s: 0.8, rz: 0.0 }, // settles high for the CTA
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
  attribute vec2 aRef;   // this particle's texel in the sim textures
  varying float vSpeed;

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    vSpeed = length(texture2D(uVelocityTexture, aRef).xyz);
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
  varying float vSpeed;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;   // round sprite
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
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
    gl_FragColor = vec4(uColor, g.a * vAlpha);
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

      // Height clip: keep only the lower part of the model (face + jaw), dropping
      // the skull-top, helmet crown and the antenna above the forehead.
      maskGeometry.computeBoundingBox()
      const bb = maskGeometry.boundingBox!
      const yCap = bb.min.y + (bb.max.y - bb.min.y) * 0.66

      const count = SIZE * SIZE
      const homeData = new Float32Array(count * 4)
      const refs = new Float32Array(count * 2)
      const p = new THREE.Vector3()
      const n = new THREE.Vector3()

      for (let i = 0; i < SIZE; i++) {
        // Yield to the main thread every 4 rows to prevent UI freeze
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0))
        if (isCancelled) return

        for (let j = 0; j < SIZE; j++) {
          const idx = i * SIZE + j
          // resample until we get a front-facing point below the height cap
          // (drops back of head, crown and antenna → leaves the face shell)
          let tries = 0
          do {
            sampler.sample(p, n)
            tries++
          } while ((n.z < FRONT_FACING || p.y > yCap) && tries < 10)
          homeData[idx * 4 + 0] = p.x
          homeData[idx * 4 + 1] = p.y
          homeData[idx * 4 + 2] = p.z
          homeData[idx * 4 + 3] = 1
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

      // render geometry: one point per particle, carrying its texel ref
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
      geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uPositionTexture: { value: null },
          uVelocityTexture: { value: null },
          uParticleSize: { value: 1.7 },
          uColor: { value: new THREE.Color('#80fff0') },
          uMinAlpha: { value: 0.04 },
          uMaxAlpha: { value: 0.85 },
        },
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      // ---- glyph layer: a RANDOMLY SCATTERED candidate POOL of particles; the
      // shader lights a small roving subset at a time (binary ⇄ Telugu). Strided
      // selection over the random-order surface samples gives an even scatter. ----
      const atlas = makeGlyphAtlas()
      const glyphPool = Math.max(1, Math.floor(count * GLYPH_POOL_FRACTION))
      const stride = Math.max(1, Math.floor(count / glyphPool))
      const gPositions: number[] = []
      const gRefs: number[] = []
      const gSeeds: number[] = []
      for (let k = 0; k < count; k += stride) {
        gPositions.push(0, 0, 0)
        gRefs.push(refs[k * 2], refs[k * 2 + 1])
        gSeeds.push(Math.random())
      }
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
          uGlyphSize: { value: 15 },
          uTime: { value: 0 },
          uBinStart: { value: BIN_START },
          uTelStart: { value: TEL_START },
          // ⚙️ THE COVERAGE DIAL: fraction of the candidate pool lit at any instant.
          // ~0.02 ≈ 1/7 of the mask, 0.03 ≈ 1/5, at uGlyphSize 15. Raise for more.
          uOnFrac: { value: 0.02 },
          // ⚙️ how fast the change happens. Each glyph stays lit for
          // ~uOnFrac/uRoveSpeed seconds, so LOWER = each glyph lingers longer and
          // fades more gently (smoother), and the whole set relocates more slowly —
          // WITHOUT changing coverage (that's uOnFrac's job). 0.1 flickered (~0.2s
          // per glyph); 0.02 ≈ ~1s per glyph with a soft ~0.5s fade in/out.
          uRoveSpeed: { value: 0.02 },
          uAtlas: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uColor: { value: new THREE.Color('#b9fff2') },
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
  // Reused each frame by samplePath so scroll choreography allocates nothing.
  const poseScratch = useRef<Pose>({ x: 0, y: 0, s: 1, rz: 0 })

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
    // Smooth the scroll input first (frame-rate-independent exponential ease) so
    // the mask GLIDES with its own momentum rather than snapping to scroll — this
    // is the fix for the "rigid" feel. Higher constant = snappier, lower = floatier.
    smoothProg.current += (heroScroll.progress - smoothProg.current) * (1 - Math.exp(-delta * 6.0))
    const pose = samplePath(smoothProg.current, poseScratch.current)
    if (groupRef.current) {
      groupRef.current.position.set(pose.x, pose.y, 0)
      groupRef.current.scale.setScalar(pose.s)
      groupRef.current.rotation.set(rot.current.x, rot.current.y, pose.rz)
    }
    rayMesh.position.set(pose.x, pose.y, 0)
    rayMesh.scale.setScalar(pose.s)
    rayMesh.rotation.set(rot.current.x, rot.current.y, pose.rz)
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
  })

  if (!sim) return null
  return (
    <group ref={groupRef} position={[OFFSET.x, OFFSET.y, OFFSET.z]}>
      <points geometry={sim.geometry} material={sim.material} frustumCulled={false} />
      <points geometry={sim.glyphGeo} material={sim.glyphMat} frustumCulled={false} />
    </group>
  )
}

