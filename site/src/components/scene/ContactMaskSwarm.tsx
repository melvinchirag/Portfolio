/* ============================================================================
 * ContactMaskSwarm.tsx — ten small masks, fixed in place, that turn to face
 * the cursor. The Contact section's WebGL background.
 * ----------------------------------------------------------------------------
 * Melvin's spec (2026-08-09): shrink the mask down and fit about ten of them
 * across the Contact section. They never MOVE — each sits at its own fixed
 * spot — they only ANGLE toward the cursor, like a head turning while the body
 * stays put. The turn lags the cursor by roughly three seconds. If the cursor
 * sits idle for about ten seconds, they ease back to neutral and look straight
 * ahead again.
 *
 * PERF — WHY THIS IS ONE SIMULATION, NOT TEN:
 * MaskField.tsx (the hero's single mask) is a GPGPU particle sim: a full
 * position+velocity compute pass every frame, at a fairly high resolution
 * (147k particles). Running that ten times over for ten small background
 * decorations would not hold 60fps. So there is exactly ONE shared
 * GPUComputationRenderer here, computed once per frame; the ten masks are ten
 * cheap draws of the SAME live position texture, each with its own transform
 * (fixed screen slot + its own yaw). They breathe in sync, which reads as one
 * coordinated field rather than ten independently jittering sims, and costs
 * roughly a tenth-of-a-tenth of what ten real sims would.
 *
 * DELIBERATELY SIMPLER than the hero mask, and this is a v1 — flag these if
 * they should be brought up to parity later:
 *   - No glyph layer (the roving binary/Telugu text) — perf + scope for a
 *     background decoration that's meant to be "very small" anyway.
 *   - No blink cycle, no eye/nose feature brightening — not visible at this
 *     scale, so the cost isn't worth paying ten times over.
 *   - No cursor-repulsion shimmer in the sim (the hero's uMouse/uMouseSpeed
 *     terms) — the requested cursor interaction here is the HEAD TURNING,
 *     not the particles themselves reacting, so that term is dropped and the
 *     sim keeps only "spring to home" + a little ambient drift so it still
 *     reads as alive at rest.
 *   - Yaw only (rotation around Y), not full look-at pitch+yaw — reads clearly
 *     as "turning toward the cursor" without needing real 3D look-at math.
 *
 * Reuses the proven face-crop constants and sim shaders' SHAPE from
 * MaskField.tsx (same values, so the sampled face reads the same way) but
 * duplicated rather than imported: this keeps the hero's tuned, working file
 * completely untouched, at the cost of some repetition.
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

// Small: this is a background texture of ten faces, not the hero focal point.
// 56*56 = 3136 particles per face; ten draws of that is still cheap.
const SIZE = 56

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
// Scattered, not a rigid grid — reads as organic rather than a pattern.
const SWARM_SLOTS: { fx: number; fy: number; scale: number }[] = [
  { fx: 0.06, fy: 0.08, scale: 0.85 },
  { fx: 0.2, fy: 0.42, scale: 1.1 },
  { fx: 0.32, fy: 0.16, scale: 0.7 },
  { fx: 0.46, fy: 0.62, scale: 1.0 },
  { fx: 0.58, fy: 0.06, scale: 0.9 },
  { fx: 0.7, fy: 0.36, scale: 0.75 },
  { fx: 0.82, fy: 0.12, scale: 1.05 },
  { fx: 0.92, fy: 0.5, scale: 0.8 },
  { fx: 0.14, fy: 0.72, scale: 0.65 },
  { fx: 0.76, fy: 0.78, scale: 0.95 },
]

// Overall "shrink to very small" factor applied on top of each slot's own
// scale variation. Tune this one number to make the whole swarm bigger/smaller.
const BASE_SCALE = 0.15

// How far a head can turn (radians). ~40deg — reads clearly as "looking that
// way" without ever turning far enough to see the back of the mask.
const MAX_YAW = 0.7

// Time constants (seconds). YAW_LAG: how quickly the turn approaches the
// cursor's direction (exponential smoothing, so "roughly three seconds" is the
// time constant, not a hard cutoff — matches the smoothing style already used
// for scroll in MaskField.tsx). IDLE_SECS: how long the cursor must sit still
// before every head eases back to neutral.
const YAW_LAG = 3.0
const IDLE_SECS = 10.0

const simPosition = /* glsl */ `
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(uCurrentPosition, uv).xyz;
    vec3 vel = texture2D(uCurrentVelocity, uv).xyz;
    pos += vel;
    gl_FragColor = vec4(pos, 1.0);
  }
`

// Spring-to-home + a little ambient drift only — no cursor repulsion (see file
// header for why).
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
  uniform vec3 uColor;
  uniform float uMinAlpha;
  uniform float uMaxAlpha;
  uniform float uFade;
  varying float vSpeed;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
    a *= uFade;
    gl_FragColor = vec4(uColor, a);
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
    material: THREE.ShaderMaterial
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

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
      geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uPositionTexture: { value: null },
          uVelocityTexture: { value: null },
          uParticleSize: { value: 1.1 },
          uColor: { value: new THREE.Color('#80fff0') },
          uMinAlpha: { value: 0.05 },
          uMaxAlpha: { value: 0.8 },
          uFade: { value: 0 },
        },
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      if (!cancelled) setSim({ gpu, posVar, velVar, geometry, material })
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
  const groupRefs = useRef<(THREE.Group | null)[]>([])

  // Global idle tracking: ANY mouse movement resets the idle clock, shared
  // across all ten (the spec is about the cursor going quiet, not per-mask).
  const lastMoveAt = useRef(0)
  useEffect(() => {
    const onMove = () => {
      lastMoveAt.current = performance.now() / 1000
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const fadeRef = useRef(0)

  useFrame((state, delta) => {
    if (!sim) return
    const { gpu, posVar, velVar, material } = sim

    // Fade in the first time this mounts (the section just scrolled into view).
    fadeRef.current = Math.min(1, fadeRef.current + delta / 1.2)
    material.uniforms.uFade.value = fadeRef.current

    velVar.material.uniforms.uTime.value += delta
    gpu.compute()
    const posTex = gpu.getCurrentRenderTarget(posVar).texture
    material.uniforms.uPositionTexture.value = posTex
    material.uniforms.uVelocityTexture.value = gpu.getCurrentRenderTarget(velVar).texture

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
    const mouse = state.pointer // NDC (-1..1); convert to px for the same space as rect
    const mousePx = { x: ((mouse.x + 1) / 2) * size.width, y: ((1 - mouse.y) / 2) * size.height }

    const lagT = 1 - Math.exp(-delta / YAW_LAG)

    SWARM_SLOTS.forEach((slot, i) => {
      const group = groupRefs.current[i]
      if (!group) return

      const px = rect.left + slot.fx * rect.width
      const py = rect.top + slot.fy * rect.height
      const w = toWorld(px, py)
      group.position.set(w.x, w.y, 0)
      group.scale.setScalar(BASE_SCALE * slot.scale)

      // Target yaw: idle → look straight (0); otherwise turn toward the cursor,
      // proportional to how far off-centre it is horizontally from THIS mask.
      const yaw = yaws[i]
      if (idle) {
        yaw.target = 0
      } else {
        const dx = mousePx.x - px
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
          <points geometry={sim.geometry} material={sim.material} frustumCulled={false} />
        </group>
      ))}
    </>
  )
}
