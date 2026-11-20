/* ============================================================================
 * PhoneSwarm.tsx: the phone hero. Twelve small faces that dissolve into glyphs
 * as you scroll, leaving three that circle together and then dance.
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-20 (phone pick-board, variant A): "instead of one big mask,
 * small masks everywhere ... when I start scrolling only three remain and the
 * others dissipate into glyphs, almost like Star Trek ... those three should
 * dance, move together in a circle as I scroll, then bounce around the page."
 *
 * Why a new file and not ContactMaskSwarm: that one is hand-composed for the
 * desktop Contact section, anchored to #contact's rect, and runs a GPGPU sim
 * for 17 faces of 7,056 dots. A phone cannot afford that. This one is the same
 * idea built for a phone: 12 faces of 1,600 dots each (about 19,000 dots in
 * total, versus about 147,000 for the big mask), no GPGPU (a cheap vertex
 * shimmer instead), one draw call per face, glyphs drawn by the SAME dots (a
 * dissolving dot turns into a character and rises; nothing extra is added).
 *
 * Scroll drives everything and runs both ways: the hero's own progress
 * (heroScroll.progress, 0 to 1 across the four-frame pan) staggers the nine
 * dissolving faces over about the first sixth of the pan; the keepers go home,
 * then into a circle, then dance; at Contact they park in the right margin and
 * calm down. A tap kicks them, a finger makes them look, a focused form field
 * freezes the dance. Reduced motion: three still faces parked in the margin.
 *
 * Face sampling matches ContactMaskSwarm (same crop and eye/nose weights, so
 * the faces read the same way); constants are copied rather than imported to
 * leave that tuned file untouched.
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { heroScroll } from '../../hooks/heroScroll'
import { contactHandoff } from '../../hooks/contactVisibility'
import { heroIntro } from '../../hooks/heroIntro'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/** 40 x 40 = 1,600 dots per face. */
const SIZE = 40

// Face crop and features, copied from ContactMaskSwarm / MaskField.
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

/* Where the twelve faces start, as fractions of the viewport, with a size
 * factor. `keeper` marks the three that never dissolve. Spread around and
 * behind the hero copy; the dots are dim enough that text stays readable. */
type Slot = { fx: number; fy: number; scale: number; keeper?: boolean }
const SLOTS: Slot[] = [
  { fx: 0.12, fy: 0.1, scale: 1.0, keeper: true },
  { fx: 0.38, fy: 0.07, scale: 0.8 },
  { fx: 0.64, fy: 0.12, scale: 1.1 },
  { fx: 0.88, fy: 0.08, scale: 0.9 },
  { fx: 0.07, fy: 0.34, scale: 0.9 },
  { fx: 0.92, fy: 0.3, scale: 1.0, keeper: true },
  { fx: 0.06, fy: 0.56, scale: 0.8 },
  { fx: 0.94, fy: 0.53, scale: 0.85 },
  { fx: 0.14, fy: 0.76, scale: 1.0, keeper: true },
  { fx: 0.52, fy: 0.74, scale: 0.7 },
  { fx: 0.87, fy: 0.75, scale: 1.1 },
  { fx: 0.36, fy: 0.84, scale: 0.75 },
]

const FACE_PX = 52 // on-screen width of a scale-1 face, CSS px
const FACE_LOCAL_W = 0.64 // the crop is 0.64 local units wide
const INTRO_SECS = 1.2
const INTRO_STAGGER = 0.07
const INTRO_Z_DEEP = -3

/* Dissolve: face rank r (0..8 among the nine non-keepers) starts at
 * DISSOLVE_START + r * DISSOLVE_STEP of hero progress and takes DISSOLVE_SPAN.
 * All done by about 17% of the pan, i.e. within the first half of frame one. */
const DISSOLVE_START = 0.004
const DISSOLVE_STEP = 0.011
const DISSOLVE_SPAN = 0.075

const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const GLYPH_CHARS = [...BINARY, ...TELUGU]

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

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uDissolve;
  uniform float uEyeOpen;
  uniform float uDot;
  uniform float uGlyph;
  uniform float uPR;
  uniform float uRise;
  uniform float uStill;
  attribute float aRand;
  attribute float aSeed;
  attribute float aEye;
  attribute float aNose;
  varying float vA;
  varying float vGlyph;
  varying float vIsGlyph;
  varying float vFeat;

  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  void main() {
    vec3 pos = position;
    float live = 1.0 - uStill;
    pos += live * 0.006 * vec3(sin(uTime * 0.9 + aSeed * 40.0), cos(uTime * 0.7 + aSeed * 31.0), sin(uTime * 0.5 + aSeed * 17.0));

    // Each dot dissolves when the face's dissolve value passes its own threshold,
    // then spends 0.25 of the range turning into a glyph that rises and fades.
    float age = clamp((uDissolve - aRand * 0.75) / 0.25, 0.0, 1.0);
    vIsGlyph = step(0.0001, age);
    float rise = age * age * 0.6 + age * 0.4;
    pos.y += rise * uRise;
    pos.x += (hash(aSeed * 17.0) - 0.5) * rise * 2.4;
    pos.z += rise * 0.6;

    vFeat = max(aNose, aEye * uEyeOpen);
    vA = 1.0 - age;
    // The character keeps changing while it rises: the data-stream look.
    vGlyph = floor(hash(aSeed * 7.3 + floor(uTime * 0.9 * live + aSeed * 5.0)) * ${GLYPH_CHARS.length}.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = mix(uDot * (1.0 + vFeat * 0.8), uGlyph, vIsGlyph) * uPR * step(0.002, vA);
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform vec3 uColor;
  uniform vec3 uGlyphColor;
  uniform float uFade;
  varying float vA;
  varying float vGlyph;
  varying float vIsGlyph;
  varying float vFeat;

  void main() {
    if (vA < 0.01) discard;
    if (vIsGlyph > 0.5) {
      float idx = floor(vGlyph + 0.5);
      vec2 uv = (vec2(mod(idx, uCols), floor(idx / uCols)) + gl_PointCoord) / uCols;
      vec4 g = texture2D(uAtlas, uv);
      if (g.a < 0.15) discard;
      gl_FragColor = vec4(uGlyphColor, g.a * vA * uFade);
      return;
    }
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float a = mix(0.3, 1.0, vFeat) * uFade;
    gl_FragColor = vec4(uColor, a);
  }
`

type Dancer = { x: number; y: number; vx: number; vy: number }
type Blink = { clock: number; next: number; start: number }

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

  const [built, setBuilt] = useState<{ geometry: THREE.BufferGeometry; materials: THREE.ShaderMaterial[] } | null>(null)
  useEffect(() => {
    if (!geo) return
    if (!geo.attributes.normal) geo.computeVertexNormals()
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()
    const count = SIZE * SIZE
    const pos = new Float32Array(count * 3)
    const rand = new Float32Array(count)
    const seed = new Float32Array(count)
    const eye = new Float32Array(count)
    const nose = new Float32Array(count)
    const p = new THREE.Vector3()
    const n = new THREE.Vector3()
    const last = new THREE.Vector3(0, -0.08, 0.2)
    const inFace = (v: THREE.Vector3, nz: number) =>
      nz >= FRONT_FACING &&
      v.z >= BACK_CLIP &&
      Math.abs(v.x) <= FACE_X_HALF &&
      v.y >= FACE_Y_BOTTOM &&
      v.y <= FACE_TOP_PEAK - FACE_TOP_CURVE * v.x * v.x
    for (let i = 0; i < count; i++) {
      // Importance sampling: dots on the eyes and nose are kept far more often than
      // dots on bare skin, so at 50px wide the face still reads as a face.
      let tries = 0
      let ok = false
      do {
        sampler.sample(p, n)
        tries++
        ok = inFace(p, n.z) && Math.random() < 0.34 + 0.66 * Math.max(eyeWeight(p.x, p.y), noseWeight(p.x, p.y))
      } while (!ok && tries < 120)
      if (!ok) p.copy(last)
      else last.copy(p)
      p.x = Math.abs(p.x) * (Math.random() < 0.5 ? 1 : -1)
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      rand[i] = Math.random()
      seed[i] = Math.random()
      eye[i] = eyeWeight(p.x, p.y)
      nose[i] = noseWeight(p.x, p.y)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    geometry.setAttribute('aEye', new THREE.BufferAttribute(eye, 1))
    geometry.setAttribute('aNose', new THREE.BufferAttribute(nose, 1))

    const atlas = makeGlyphAtlas()
    const pr = gl.getPixelRatio()
    const make = () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDissolve: { value: 0 },
          uEyeOpen: { value: 1 },
          uDot: { value: 1.25 },
          uGlyph: { value: 11 },
          uPR: { value: pr },
          uRise: { value: 9 },
          uStill: { value: 0 },
          uAtlas: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uColor: { value: new THREE.Color('#c4a56c') },
          uGlyphColor: { value: new THREE.Color('#e6d2a4').multiplyScalar(1.5) },
          uFade: { value: 0 },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    setBuilt({ geometry, materials: SLOTS.map(make) })
  }, [geo, gl])

  // Per-face state lives outside React state (read and written every frame).
  const groups = useRef<(THREE.Group | null)[]>([])
  const intro = useMemo<number[]>(() => SLOTS.map(() => 0), [])
  const blinks = useMemo<Blink[]>(() => SLOTS.map((_, i) => ({ clock: 0, next: 1.4 + i * 0.41, start: -1 })), [])
  const yaw = useMemo<number[]>(() => SLOTS.map(() => 0), [])
  const pitch = useMemo<number[]>(() => SLOTS.map(() => 0), [])
  const dancers = useRef<Dancer[]>([])
  const clock = useRef({ t: 0, dance: 0, lastP: 0, speed: 0, kick: 0, init: false })
  const pointer = useRef({ x: -9999, y: -9999, at: -99, tapX: 0, tapY: 0 })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
      pointer.current.at = performance.now() / 1000
    }
    const down = (e: PointerEvent) => {
      move(e)
      pointer.current.tapX = e.clientX
      pointer.current.tapY = e.clientY
      clock.current.kick = 1
      // Impulse: the keepers hop away from the tap.
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
    if (!built) return
    const dt = Math.min(0.05, rawDt)
    const c = clock.current
    c.t += dt

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
    // Scroll speed, smoothed: it speeds the dance up while you are moving.
    const sv = Math.abs(p - c.lastP) / Math.max(dt, 0.001)
    c.lastP = p
    c.speed += (Math.min(1, sv * 6) - c.speed) * (1 - Math.exp(-dt * 6))
    const formFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName ?? '').toString())
    if (!reduced && !formFocused) c.dance += dt * (1 + c.speed * 2.2)
    c.kick = Math.max(0, c.kick - dt * 1.6)

    const introReady = heroIntro.ready && (heroIntro.nameDone || !heroIntro.nameExpected)
    const now = performance.now() / 1000
    const lookActive = !reduced && now - pointer.current.at < 3

    const nowT = c.t
    let keeperIdx = 0
    let rank = 0

    SLOTS.forEach((slot, i) => {
      const g = groups.current[i]
      const mat = built.materials[i]
      if (!g || !mat) return

      mat.uniforms.uTime.value = nowT
      mat.uniforms.uStill.value = reduced ? 1 : 0

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
      mat.uniforms.uEyeOpen.value = eyeOpen

      // Intro: fly in from the deep once the name is done, staggered.
      if (introReady && nowT > i * INTRO_STAGGER) intro[i] = Math.min(1, intro[i] + dt / INTRO_SECS)
      const e = 1 - Math.pow(1 - intro[i], 3)
      mat.uniforms.uFade.value = e
      const zIn = INTRO_Z_DEEP * (1 - e)

      let px = slot.fx * W
      let py = slot.fy * H
      let sc = baseScale * slot.scale
      let roll = 0

      if (slot.keeper) {
        const k = keeperIdx++
        const homeX = px
        const homeY = py
        const th = (p - 0.08) * Math.PI * 2 * 1.15 + c.dance * 0.5
        const ang = th + (k * Math.PI * 2) / 3
        const R = Math.min(W * 0.3, H * 0.2)
        const circX = W * 0.5 + R * Math.cos(ang)
        const circY = H * 0.46 + R * 1.15 * Math.sin(ang)
        const dt2 = c.dance
        const danceX = W * 0.5 + W * 0.36 * Math.sin(dt2 * (0.9 + 0.13 * k) + k * 2.1)
        const danceY = H * 0.46 + H * 0.3 * Math.sin(dt2 * (1.1 + 0.11 * k) + k * 1.3 + 1.0) - Math.abs(Math.sin(dt2 * 3 + k)) * H * 0.025
        const parkX = W * 0.93
        const parkY = H * (0.2 + 0.24 * k) + Math.sin(dt2 * 1.4 + k) * H * 0.012

        let tx = homeX
        let ty = homeY
        const bc = smooth(0.07, 0.15, p)
        tx += (circX - tx) * bc
        ty += (circY - ty) * bc
        const bd = smooth(0.36, 0.46, p)
        tx += (danceX - tx) * bd
        ty += (danceY - ty) * bd
        const bp = reduced || formFocused ? 1 : smooth(0.12, 0.7, contactAmt)
        tx += (parkX - tx) * bp
        ty += (parkY - ty) * bp
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
          // A slightly underdamped spring: it follows the target with a little bounce.
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
        roll = Math.max(-0.5, Math.min(0.5, d.vx / 900)) * 0.7 + Math.sin(c.dance * 2 + k) * 0.1 * bd
        sc *= (1 + 0.1 * Math.sin(c.dance * 3.2 + k) * bd + 0.3 * c.kick) * (1 - 0.22 * bp)
        mat.uniforms.uDissolve.value = 0
      } else {
        // Dissolving faces: staggered by scroll, reversible.
        const start = DISSOLVE_START + rank * DISSOLVE_STEP
        rank++
        mat.uniforms.uDissolve.value = reduced ? 1.2 : Math.max(0, Math.min(1, (p - start) / DISSOLVE_SPAN))
      }

      const w = toWorld(px, py)
      g.position.set(w.x, w.y, zIn)
      g.scale.setScalar(sc)

      // Heads follow a finger; otherwise they sway a little (more when dancing).
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

  if (!built) return null
  return (
    <>
      {SLOTS.map((_, i) => (
        <group key={i} ref={(el) => { groups.current[i] = el }}>
          <points geometry={built.geometry} material={built.materials[i]} frustumCulled={false} />
        </group>
      ))}
    </>
  )
}
