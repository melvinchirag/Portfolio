/* ============================================================================
 * PhoneSwarm.tsx: the phone hero. Twelve small masks that BREAK into glyphs the
 * moment you start scrolling, leaving three that circle together and dance.
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-20 (phone pick-board variant A, then his notes after trying
 * it on a phone):
 *  - The masks must look exactly like the desktop mask, only smaller: so this
 *    now runs the SAME particle pipeline as ContactMaskSwarm / MaskField (a
 *    shared GPGPU spring-to-home sim, 84x84 dots per face, the same face crop,
 *    eye and nose weights, blink, speed-driven alpha, additive sand points and
 *    the same rising binary/Telugu glyph layer), not a cheaper stand-in.
 *  - The break is an EVENT, not a scrubbed animation. Cross a small scroll
 *    threshold and the nine faces break up over time; stop scrolling halfway
 *    and nothing is left half dissolved. Scroll back to the top and the faces
 *    regenerate, while glyphs that already left keep flying until they fade.
 *  - The three keepers circle together and then dance on their own clock, with
 *    no scrolling needed (scroll speed, a finger and taps only add energy).
 *
 * Cost: one sim of 84x84, twelve draws of 7,056 dots (about 85,000, versus about
 * 147,000 for the big mask), plus glyph layers. Burst layers are hidden while
 * idle. Dispose frees the geometry and materials.
 *
 * Face crop, features and glyph vocabulary are copied from ContactMaskSwarm so
 * that tuned file stays untouched.
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { heroScroll } from '../../hooks/heroScroll'
import { maskColor } from '../../velvetLab'
import { contactHandoff } from '../../hooks/contactVisibility'
import { heroIntro } from '../../hooks/heroIntro'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const SIZE = 84 // 84 x 84 = 7,056 dots per face, the same as the desktop swarm

// Face crop and features (same values as ContactMaskSwarm / MaskField).
const FRONT_FACING = 0.12
const BACK_CLIP = -0.11
const FACE_X_HALF = 0.32
const FACE_Y_BOTTOM = -0.64
const FACE_TOP_PEAK = 0.36
const FACE_TOP_CURVE = 2.2
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

/* Twelve starting places as fractions of the viewport. `keeper` = never breaks. */
type Slot = { fx: number; fy: number; scale: number; keeper?: boolean }
const SLOTS: Slot[] = [
  // Top band: clear of the copy.
  { fx: 0.14, fy: 0.08, scale: 1.0, keeper: true },
  { fx: 0.4, fy: 0.06, scale: 0.8 },
  { fx: 0.66, fy: 0.1, scale: 1.0 },
  { fx: 0.88, fy: 0.07, scale: 0.85 },
  // Second row.
  { fx: 0.24, fy: 0.2, scale: 0.8 },
  { fx: 0.52, fy: 0.21, scale: 0.9 },
  { fx: 0.84, fy: 0.2, scale: 1.0, keeper: true },
  // The edges beside the copy.
  { fx: 0.09, fy: 0.45, scale: 0.7 },
  { fx: 0.91, fy: 0.43, scale: 0.7 },
  { fx: 0.09, fy: 0.64, scale: 0.75, keeper: true },
  { fx: 0.91, fy: 0.66, scale: 0.75 },
  { fx: 0.09, fy: 0.82, scale: 0.7 },
]

const FACE_PX = 56 // on-screen width of a scale-1 face, CSS px
const FACE_LOCAL_W = 0.64
const INTRO_SECS = 1.2
const INTRO_STAGGER = 0.07
const INTRO_Z_DEEP = -3

/* THE EVENT. Break above BREAK_AT of hero progress, re-form below FORM_AT. */
const BREAK_AT = 0.012
const FORM_AT = 0.004
const BREAK_STAGGER = 0.07 // seconds between faces
const BREAK_DUR = 1.1 // seconds for a face's dots to lift off
const GLYPH_LIFE = 5.5 // seconds a released glyph keeps rising
const CIRCLE_SECS = 4.5 // circle first, then dance

// Roving glyphs (the ever-present ones, same mechanism and numbers as the desktop swarm).
const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const GLYPH_CHARS = [...BINARY, ...TELUGU]
const GLYPH_POOL_FRACTION = 0.07 // fewer roving glyphs on a phone: a cleaner screen
const GLYPH_ON_FRAC = 0.06
const GLYPH_ROVE_SPEED = 0.0024
const GLYPH_RISE_EXP = 1.6
const GLYPH_SIZE = 10
const BURST_STRIDE = 8 // one dot in eight becomes a burst glyph (about 880 per face)

function makeGlyphAtlas() {
  const cols = Math.ceil(Math.sqrt(GLYPH_CHARS.length))
  const cell = 64
  const px = cols * cell
  const cvs = document.createElement('canvas')
  cvs.width = px
  cvs.height = px
  const ctx = cvs.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '42px "Nirmala UI", "Gautami", "Noto Sans Telugu", monospace'
  GLYPH_CHARS.forEach((ch, i) => {
    ctx.fillText(ch, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2)
  })
  const tex = new THREE.CanvasTexture(cvs)
  tex.flipY = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return { texture: tex, cols }
}

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

// The face dots: identical to the desktop swarm, plus `uForm` (dots lift off and
// vanish as it falls, in a per-dot random order, and return as it rises).
const renderVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uParticleSize;
  uniform float uForm;
  attribute vec2 aRef;
  attribute float aGlyphSeed;
  attribute float aEye;
  attribute float aNose;
  attribute float aRand;
  uniform float uTime;
  uniform float uRoveSpeed;
  uniform float uOnFrac;
  uniform float uEyeOpen;
  varying float vSpeed;
  varying float vGlyphFade;
  varying float vFeature;
  varying float vAlive;

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    vSpeed = length(texture2D(uVelocityTexture, aRef).xyz);
    vFeature = max(aNose, aEye * uEyeOpen);
    vGlyphFade = 0.0;
    if (aGlyphSeed >= 0.0) {
      float life = fract(aGlyphSeed * 31.7 + uTime * uRoveSpeed);
      float edge = min(0.06, uOnFrac * 0.5);
      vGlyphFade = clamp(smoothstep(0.0, edge, life) - smoothstep(uOnFrac - edge, uOnFrac, life), 0.0, 1.0);
    }
    float th = aRand * 0.8;
    vAlive = smoothstep(th, th + 0.2, uForm);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uParticleSize / -mv.z) * step(0.002, vAlive);
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
  varying float vAlive;
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
    a = max(a, vFeature * uFeatureFloor);
    a *= (1.0 - vGlyphFade);
    a *= uFade * vAlive;
    gl_FragColor = vec4(uColor, a);
  }
`

// The ever-present roving glyphs (same as the desktop swarm).
const roveVertex = /* glsl */ `
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
    float cnt = cat < 0.5 ? 2.0 : 16.0;
    float r = hash(aSeed * 7.0 + cat * 5.0 + relight);
    vGlyph = start + floor(r * cnt);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.002, vAlpha);
    gl_Position = projectionMatrix * mv;
  }
`
// The burst: when a face breaks, a third of its dots become glyphs that peel off
// in the same random order, then rise and fade on their own clock (uTime - uBreakT),
// so they keep flying whatever the face does afterwards.
const burstVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform float uGlyphSize;
  uniform float uTime;
  uniform float uBreakT;
  uniform float uBreakDur;
  uniform float uLife;
  uniform float uRise;
  attribute vec2 aRef;
  attribute float aSeed;
  attribute float aRand;
  varying float vGlyph;
  varying float vAlpha;
  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    float start = 0.8 * (1.0 - aRand) * uBreakDur;
    float t = (uTime - uBreakT - start) / uLife;
    float on = step(0.0, t) * step(t, 1.0) * step(0.0, uBreakT);
    float tc = clamp(t, 0.0, 1.0);
    float rise = pow(tc, 1.35);
    pos.y += uRise * rise;
    pos.x += (hash(aSeed * 17.0) - 0.5) * uRise * 0.22 * rise;
    pos.z += uRise * 0.12 * rise;
    vAlpha = on * smoothstep(0.0, 0.06, tc) * (1.0 - smoothstep(0.5, 1.0, tc));
    vGlyph = floor(hash(aSeed * 7.3 + floor(uTime * 8.0 + aSeed * 5.0)) * ${GLYPH_CHARS.length}.0);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.002, vAlpha);
    gl_Position = projectionMatrix * mv;
  }
`
// THE ATMOSPHERE: glyphs that left the faces stay in the air for good. Each one drifts
// from where its face was to a random place on the screen, then wanders and twinkles
// there, on its own clock (uTime - uStart), whatever the faces do afterwards.
const atmosVertex = /* glsl */ `
  attribute vec2 aHome;
  attribute vec2 aTarget;
  attribute float aSeed;
  attribute float aDelay;
  uniform float uTime;
  uniform float uStart;
  uniform float uAtmos;
  uniform float uGlyphSize;
  uniform vec2 uWorld;
  varying float vGlyph;
  varying float vAlpha;
  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  void main() {
    float t = uTime - uStart - aDelay;
    float on = step(0.0, t) * step(0.0, uStart);
    float travel = smoothstep(0.0, 6.0, t);
    vec2 f = mix(aHome, aTarget, travel);
    float s = aSeed * 6.2831;
    f += 0.035 * vec2(sin(t * 0.33 + s), cos(t * 0.27 + s * 1.7)) * travel;
    f += 0.012 * vec2(sin(t * 0.9 + s * 3.1), cos(t * 0.8 + s * 2.3));
    vec3 pos = vec3((f.x - 0.5) * uWorld.x, -(f.y - 0.5) * uWorld.y, 0.0);
    float tw = 0.5 + 0.5 * sin(t * 1.2 + s * 2.0);
    vAlpha = on * smoothstep(0.0, 1.5, t) * (0.35 + 0.65 * tw) * uAtmos;
    vGlyph = floor(hash(aSeed * 7.3 + floor(t * 0.45 + aSeed * 9.0)) * ${GLYPH_CHARS.length}.0);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.002, vAlpha);
    gl_Position = projectionMatrix * mv;
  }
`
const ATMOS_COUNT = 560
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
    vec2 uv = (vec2(mod(idx, uCols), floor(idx / uCols)) + gl_PointCoord) / uCols;
    vec4 g = texture2D(uAtlas, uv);
    if (g.a < 0.15) discard;
    gl_FragColor = vec4(uColor, g.a * vAlpha * uFade);
  }
`

type Dancer = { x: number; y: number; vx: number; vy: number }
type Blink = { clock: number; next: number; start: number }
type Face = { form: number; formT: number; formAt: number; breakT: number }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function PhoneSwarm() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const reduced = usePrefersReducedMotion()

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
        setGeo(g)
      },
      undefined,
      (err) => console.error('[PhoneSwarm] model load error:', err),
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
    roveGeo: THREE.BufferGeometry
    burstGeo: THREE.BufferGeometry
    atmosGeo: THREE.BufferGeometry
    atmosMat: THREE.ShaderMaterial
    faceMats: THREE.ShaderMaterial[]
    roveMats: THREE.ShaderMaterial[]
    burstMats: THREE.ShaderMaterial[]
  } | null>(null)

  useEffect(() => {
    if (!geo) return
    let cancelled = false

    const build = async () => {
      if (!geo.attributes.normal) geo.computeVertexNormals()
      const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()
      const count = SIZE * SIZE
      const homeData = new Float32Array(count * 4)
      const refs = new Float32Array(count * 2)
      const eyeData = new Float32Array(count)
      const noseData = new Float32Array(count)
      const randData = new Float32Array(count)
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
          p.x = Math.abs(p.x) * (Math.random() < 0.5 ? 1 : -1)
          homeData[idx * 4] = p.x
          homeData[idx * 4 + 1] = p.y
          homeData[idx * 4 + 2] = p.z
          homeData[idx * 4 + 3] = 1
          eyeData[idx] = eyeWeight(p.x, p.y)
          noseData[idx] = noseWeight(p.x, p.y)
          randData[idx] = Math.random()
          refs[idx * 2] = (j + 0.5) / SIZE
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
      if (err) console.error('[PhoneSwarm] GPGPU init error:', err)

      // Roving-glyph candidates (strided, as in the desktop swarm) and burst dots.
      const glyphPool = Math.max(1, Math.floor(count * GLYPH_POOL_FRACTION))
      const stride = Math.max(1, Math.floor(count / glyphPool))
      const gRefs: number[] = []
      const gSeeds: number[] = []
      const baseGlyphSeed = new Float32Array(count).fill(-1)
      for (let k = 0; k < count; k += stride) {
        const seed = Math.random()
        gRefs.push(refs[k * 2], refs[k * 2 + 1])
        gSeeds.push(seed)
        baseGlyphSeed[k] = seed
      }
      const bRefs: number[] = []
      const bSeeds: number[] = []
      const bRand: number[] = []
      for (let k = 0; k < count; k += BURST_STRIDE) {
        bRefs.push(refs[k * 2], refs[k * 2 + 1])
        bSeeds.push(Math.random())
        bRand.push(randData[k])
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
      geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
      geometry.setAttribute('aGlyphSeed', new THREE.BufferAttribute(baseGlyphSeed, 1))
      geometry.setAttribute('aEye', new THREE.BufferAttribute(eyeData, 1))
      geometry.setAttribute('aNose', new THREE.BufferAttribute(noseData, 1))
      geometry.setAttribute('aRand', new THREE.BufferAttribute(randData, 1))

      const roveGeo = new THREE.BufferGeometry()
      roveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((gRefs.length / 2) * 3), 3))
      roveGeo.setAttribute('aRef', new THREE.BufferAttribute(new Float32Array(gRefs), 2))
      roveGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(gSeeds), 1))

      const burstGeo = new THREE.BufferGeometry()
      burstGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((bRefs.length / 2) * 3), 3))
      burstGeo.setAttribute('aRef', new THREE.BufferAttribute(new Float32Array(bRefs), 2))
      burstGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(bSeeds), 1))
      burstGeo.setAttribute('aRand', new THREE.BufferAttribute(new Float32Array(bRand), 1))

      // The atmosphere: homes are the nine dissolving faces' places (as viewport fractions).
      const homes = SLOTS.filter((sl) => !sl.keeper)
      const aHome = new Float32Array(ATMOS_COUNT * 2)
      const aTarget = new Float32Array(ATMOS_COUNT * 2)
      const aSeed = new Float32Array(ATMOS_COUNT)
      const aDelay = new Float32Array(ATMOS_COUNT)
      for (let k = 0; k < ATMOS_COUNT; k++) {
        const h = homes[k % homes.length]
        aHome[k * 2] = h.fx + (Math.random() - 0.5) * 0.07
        aHome[k * 2 + 1] = h.fy + (Math.random() - 0.5) * 0.09
        aTarget[k * 2] = 0.04 + Math.random() * 0.92
        aTarget[k * 2 + 1] = 0.04 + Math.random() * 0.86
        aSeed[k] = Math.random()
        aDelay[k] = Math.random() * 1.6
      }
      const atmosGeo = new THREE.BufferGeometry()
      atmosGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ATMOS_COUNT * 3), 3))
      atmosGeo.setAttribute('aHome', new THREE.BufferAttribute(aHome, 2))
      atmosGeo.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 2))
      atmosGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1))
      atmosGeo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1))

      const atlas = makeGlyphAtlas()
      const mk = (vs: string, fs: string, uniforms: Record<string, { value: unknown }>) =>
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader: vs,
          fragmentShader: fs,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      const faceMats = SLOTS.map(() =>
        mk(renderVertex, renderFragment, {
          uPositionTexture: { value: null },
          uVelocityTexture: { value: null },
          uParticleSize: { value: 0.95 },
          uColor: { value: maskColor('#d9bb7c') },
          uMinAlpha: { value: 0.17 },
          uMaxAlpha: { value: 1.0 },
          uFeatureFloor: { value: 0.8 },
          uEyeOpen: { value: 1 },
          uFade: { value: 0 },
          uForm: { value: 1 },
          uTime: { value: 0 },
          uRoveSpeed: { value: GLYPH_ROVE_SPEED },
          uOnFrac: { value: GLYPH_ON_FRAC },
        }),
      )
      const roveMats = SLOTS.map(() =>
        mk(roveVertex, glyphFragment, {
          uPositionTexture: { value: null },
          uGlyphSize: { value: GLYPH_SIZE },
          uTime: { value: 0 },
          uBinStart: { value: 0 },
          uTelStart: { value: BINARY.length },
          uOnFrac: { value: GLYPH_ON_FRAC },
          uRoveSpeed: { value: GLYPH_ROVE_SPEED },
          uDriftUp: { value: 32 },
          uDriftOut: { value: 1.5 },
          uDriftSide: { value: 3 },
          uRiseExp: { value: GLYPH_RISE_EXP },
          uAtlas: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uFade: { value: 0 },
          uColor: { value: maskColor('#e6d2a4', 1.7) },
        }),
      )
      const burstMats = SLOTS.map(() =>
        mk(burstVertex, glyphFragment, {
          uPositionTexture: { value: null },
          uGlyphSize: { value: GLYPH_SIZE * 0.85 },
          uTime: { value: 0 },
          uBreakT: { value: -1 },
          uBreakDur: { value: BREAK_DUR },
          uLife: { value: GLYPH_LIFE },
          uRise: { value: 9 },
          uAtlas: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uFade: { value: 0 },
          uColor: { value: maskColor('#e6d2a4', 1.0) },
        }),
      )
      const atmosMat = mk(atmosVertex, glyphFragment, {
        uTime: { value: 0 },
        uStart: { value: -1 },
        uAtmos: { value: 0 },
        uGlyphSize: { value: GLYPH_SIZE * 0.8 },
        uWorld: { value: new THREE.Vector2(1, 1) },
        uAtlas: { value: atlas.texture },
        uCols: { value: atlas.cols },
        uFade: { value: 1 },
        uColor: { value: maskColor('#ecd9ab', 1.15) },
      })
      if (!cancelled) setSim({ gpu, posVar, velVar, geometry, roveGeo, burstGeo, atmosGeo, atmosMat, faceMats, roveMats, burstMats })
    }
    build()
    return () => {
      cancelled = true
    }
  }, [geo, gl])

  // Per-face and global state, outside React state (read and written every frame).
  const groups = useRef<(THREE.Group | null)[]>([])
  const burstPts = useRef<(THREE.Object3D | null)[]>([])
  const intro = useMemo<number[]>(() => SLOTS.map(() => 0), [])
  const blinks = useMemo<Blink[]>(() => SLOTS.map((_, i) => ({ clock: 0, next: 1.4 + i * 0.41, start: -1 })), [])
  const yaw = useMemo<number[]>(() => SLOTS.map(() => 0), [])
  const pitch = useMemo<number[]>(() => SLOTS.map(() => 0), [])
  const faces = useMemo<Face[]>(() => SLOTS.map(() => ({ form: 1, formT: 1, formAt: 0, breakT: -1 })), [])
  const dancers = useRef<Dancer[]>([])
  const clock = useRef({ t: 0, dance: 0, lastP: 0, speed: 0, kick: 0, broken: false, brkAt: 0, brkW: 0, atmosStart: -1, atmos: 0 })
  const pointer = useRef({ x: -9999, y: -9999, at: -99 })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
      pointer.current.at = performance.now() / 1000
    }
    const down = (e: PointerEvent) => {
      move(e)
      clock.current.kick = 1
      dancers.current.forEach((d) => {
        const dx = d.x - e.clientX
        const dy = d.y - e.clientY
        const len = Math.hypot(dx, dy) || 1
        d.vx += (dx / len) * 520
        d.vy += (dy / len) * 520 - 260
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
    }
  }, [])

  useFrame((_s, rawDt) => {
    if (!sim) return
    const dt = Math.min(0.05, rawDt)
    const c = clock.current
    c.t += dt
    const nowT = c.t

    // The shared sim, then push its live textures into every material.
    sim.velVar.material.uniforms.uTime.value += dt
    sim.gpu.compute()
    const posTex = sim.gpu.getCurrentRenderTarget(sim.posVar).texture
    const velTex = sim.gpu.getCurrentRenderTarget(sim.velVar).texture
    const tSim = sim.velVar.material.uniforms.uTime.value

    const W = size.width
    const H = size.height
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const worldH = 2 * Math.tan(fovRad / 2) * camera.position.z
    const worldW = worldH * (W / H)
    const pxPerWorld = H / worldH
    const toWorld = (px: number, py: number) => ({ x: (px / W - 0.5) * worldW, y: -(py / H - 0.5) * worldH })
    const baseScale = FACE_PX / (FACE_LOCAL_W * pxPerWorld)

    const p = heroScroll.progress
    const contactAmt = 1 - contactHandoff.t
    const sv = Math.abs(p - c.lastP) / Math.max(dt, 0.001)
    c.lastP = p
    c.speed += (Math.min(1, sv * 6) - c.speed) * (1 - Math.exp(-dt * 6))
    const formFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName ?? '').toString())
    if (!reduced && !formFocused) c.dance += dt * (1 + c.speed * 2.2)
    c.kick = Math.max(0, c.kick - dt * 1.6)

    // THE EVENT: cross the threshold once and the break plays out on its own clock.
    const introReady = heroIntro.ready && (heroIntro.nameDone || !heroIntro.nameExpected)
    if (!reduced && introReady) {
      if (!c.broken && p > BREAK_AT) {
        c.broken = true
        c.brkAt = nowT
        if (c.atmosStart < 0) c.atmosStart = nowT
        let r = 0
        SLOTS.forEach((s, i) => {
          if (s.keeper) return
          faces[i].breakT = tSim + r * BREAK_STAGGER
          faces[i].formT = 0
          faces[i].formAt = nowT + r * BREAK_STAGGER
          r++
        })
      } else if (c.broken && p < FORM_AT) {
        c.broken = false
        let r = 0
        SLOTS.forEach((s, i) => {
          if (s.keeper) return
          faces[i].formT = 1
          faces[i].formAt = nowT + r * 0.06
          r++
        })
      }
    }
    c.brkW += ((c.broken ? 1 : 0) - c.brkW) * (1 - Math.exp(-dt * 2.2))
    const tb = c.broken ? nowT - c.brkAt : 0
    // Atmosphere strength: full while broken, a fair share kept once the faces re-form.
    c.atmos += ((c.broken ? 1 : 0.45) - c.atmos) * (1 - Math.exp(-dt * 0.8))
    const am = sim.atmosMat.uniforms
    am.uTime.value = nowT
    am.uStart.value = c.atmosStart
    am.uAtmos.value = reduced ? 0 : c.atmos * (c.atmosStart >= 0 ? 1 : 0)
    ;(am.uWorld.value as THREE.Vector2).set(worldW, worldH)

    const now = performance.now() / 1000
    const lookActive = !reduced && now - pointer.current.at < 3
    let keeperIdx = 0

    SLOTS.forEach((slot, i) => {
      const g = groups.current[i]
      const fm = sim.faceMats[i]
      const rm = sim.roveMats[i]
      const bm = sim.burstMats[i]
      if (!g || !fm || !rm || !bm) return

      fm.uniforms.uPositionTexture.value = posTex
      fm.uniforms.uVelocityTexture.value = velTex
      fm.uniforms.uTime.value = tSim
      rm.uniforms.uPositionTexture.value = posTex
      rm.uniforms.uTime.value = tSim
      bm.uniforms.uPositionTexture.value = posTex
      bm.uniforms.uTime.value = tSim

      // Blink, independent per face.
      const bk = blinks[i]
      bk.clock += dt
      let eyeOpen = 1
      if (bk.start < 0 && bk.clock >= bk.next) bk.start = bk.clock
      if (bk.start >= 0) {
        const bt = (bk.clock - bk.start) / 0.16
        if (bt >= 1) {
          bk.start = -1
          bk.next = bk.clock + 3.2 + Math.random() * 3.8
        } else eyeOpen = 1 - Math.sin(bt * Math.PI)
      }
      fm.uniforms.uEyeOpen.value = eyeOpen

      // Intro: fly in from the deep once the name is done, staggered.
      if (introReady && nowT > i * INTRO_STAGGER) intro[i] = Math.min(1, intro[i] + dt / INTRO_SECS)
      const e = 1 - Math.pow(1 - intro[i], 3)
      const zIn = INTRO_Z_DEEP * (1 - e)

      // This face's own form: ramps to its target once its stagger has passed.
      const f = faces[i]
      if (reduced && !slot.keeper) {
        f.form = 0
      } else if (nowT >= f.formAt) {
        const step = dt / BREAK_DUR
        f.form += Math.max(-step, Math.min(step, f.formT - f.form))
      }
      fm.uniforms.uForm.value = f.form
      fm.uniforms.uFade.value = e
      rm.uniforms.uFade.value = e * (0.35 + 0.65 * f.form)
      // The burst keeps flying on its own clock, whatever the face is doing now.
      bm.uniforms.uFade.value = e * 0.7
      bm.uniforms.uBreakT.value = f.breakT
      const bp = burstPts.current[i]
      if (bp) bp.visible = f.breakT >= 0 && tSim - f.breakT < GLYPH_LIFE + BREAK_DUR + 0.6

      let px = slot.fx * W
      let py = slot.fy * H
      let sc = baseScale * slot.scale * (0.86 + 0.14 * Math.max(0, f.form))
      let roll = 0

      if (slot.keeper) {
        const k = keeperIdx++
        const homeX = px
        const homeY = py
        const parkW = reduced || formFocused ? 1 : smooth(0.12, 0.7, contactAmt)

        // Circle, then dance: both run on the clock since the break, not on scroll.
        const circ = c.brkW * (1 - smooth(CIRCLE_SECS, CIRCLE_SECS + 2, tb))
        const dnc = c.brkW * smooth(CIRCLE_SECS, CIRCLE_SECS + 2, tb)
        const th = tb * 0.9 + (k * Math.PI * 2) / 3
        const R = Math.min(W * 0.3, H * 0.2)
        const circX = W * 0.5 + R * Math.cos(th)
        const circY = H * 0.46 + R * 1.15 * Math.sin(th)
        const d2 = c.dance
        const danceX = W * 0.5 + W * 0.36 * Math.sin(d2 * (0.9 + 0.13 * k) + k * 2.1)
        const danceY = H * 0.46 + H * 0.3 * Math.sin(d2 * (1.1 + 0.11 * k) + k * 1.3 + 1.0) - Math.abs(Math.sin(d2 * 3 + k)) * H * 0.025
        const parkX = W * 0.93
        const parkY = H * (0.2 + 0.24 * k) + Math.sin(d2 * 1.4 + k) * H * 0.012

        let tx = homeX
        let ty = homeY
        tx += (circX - tx) * circ
        ty += (circY - ty) * circ
        tx += (danceX - tx) * dnc
        ty += (danceY - ty) * dnc
        tx += (parkX - tx) * parkW
        ty += (parkY - ty) * parkW
        if (reduced) {
          tx = parkX
          ty = H * (0.2 + 0.24 * k)
        }

        let d = dancers.current[k]
        if (!d) {
          d = { x: homeX, y: homeY, vx: 0, vy: 0 }
          dancers.current[k] = d
        }
        if (reduced) {
          d.x = tx
          d.y = ty
          d.vx = 0
          d.vy = 0
        } else {
          const steps = Math.max(1, Math.ceil(dt / 0.008))
          const h = dt / steps
          for (let s = 0; s < steps; s++) {
            d.vx += (62 * (tx - d.x) - 9.5 * d.vx) * h
            d.vy += (62 * (ty - d.y) - 9.5 * d.vy) * h
            d.x += d.vx * h
            d.y += d.vy * h
          }
        }
        px = d.x
        py = d.y
        roll = Math.max(-0.5, Math.min(0.5, d.vx / 900)) * 0.7 + Math.sin(c.dance * 2 + k) * 0.1 * dnc
        sc *= (1 + 0.1 * Math.sin(c.dance * 3.2 + k) * dnc + 0.3 * c.kick) * (1 - 0.22 * parkW)
      }

      const w = toWorld(px, py)
      g.position.set(w.x, w.y, zIn)
      g.scale.setScalar(sc)

      let lookYaw = 0
      let lookPitch = 0
      if (lookActive) {
        lookYaw = Math.max(-0.7, Math.min(0.7, ((pointer.current.x - px) / (W * 0.5)) * 0.7))
        lookPitch = Math.max(-0.35, Math.min(0.35, ((pointer.current.y - py) / (H * 0.5)) * 0.35))
      } else if (!reduced) {
        lookYaw = Math.sin(c.t * 0.6 + i) * 0.18
      }
      const lag = 1 - Math.exp(-dt / 0.35)
      yaw[i] += (lookYaw - yaw[i]) * lag
      pitch[i] += (lookPitch - pitch[i]) * lag
      g.rotation.set(pitch[i], yaw[i], roll)
    })
  })

  useEffect(() => {
    return () => {
      if (!sim) return
      sim.geometry.dispose()
      sim.roveGeo.dispose()
      sim.burstGeo.dispose()
      sim.atmosGeo.dispose()
      sim.atmosMat.dispose()
      sim.faceMats.forEach((m) => m.dispose())
      sim.roveMats.forEach((m) => m.dispose())
      sim.burstMats.forEach((m) => m.dispose())
    }
  }, [sim])

  if (!sim) return null
  return (
    <>
      <points geometry={sim.atmosGeo} material={sim.atmosMat} frustumCulled={false} />
      {SLOTS.map((_, i) => (
        <group key={i} ref={(el) => { groups.current[i] = el }}>
          <points geometry={sim.geometry} material={sim.faceMats[i]} frustumCulled={false} />
          <points geometry={sim.roveGeo} material={sim.roveMats[i]} frustumCulled={false} />
          <points
            ref={(el) => { burstPts.current[i] = el }}
            geometry={sim.burstGeo}
            material={sim.burstMats[i]}
            frustumCulled={false}
            visible={false}
          />
        </group>
      ))}
    </>
  )
}
