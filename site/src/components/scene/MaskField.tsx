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

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { LiquidGlassField } from './LiquidGlassField'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
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

// The mask sits fixed on the LEFT (name goes centre). World-space offset applied
// to both the rendered points and the raycast mesh so cursor interaction lines up.
const OFFSET = new THREE.Vector3(-0.62, 0, 0)

// Keep only front-facing samples (normal.z above this) → drops the back of the
// head and the helmet "crown", leaving the face/mask shell.
const FRONT_FACING = 0.12

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
 * A mix that encodes Melvin: binary + hexadecimal (the CS signal) and TELUGU
 * letters (his heritage — Kuwait → India → Michigan). They re-shuffle on a ~5s
 * wave so the face keeps "speaking" in code and mother tongue. */
// Three categories, kept as contiguous ranges in the atlas so the shader can
// cycle a particle binary → Telugu → hex by picking within the current range.
const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const HEX = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
const GLYPH_CHARS = [...BINARY, ...TELUGU, ...HEX]
const BIN_START = 0
const TEL_START = BINARY.length
const HEX_START = BINARY.length + TELUGU.length
const GLYPH_COUNT = 6000 // pool spread over the whole face; only patches show at once
const N_HOTSPOTS = 3 // roving zones where glyphs are currently visible

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
  uniform sampler2D uHomeTexture;     // rest positions (stable, for localization)
  uniform float uGlyphSize;
  uniform float uTime;
  uniform vec3  uHots[3];   // roving hotspot centres (rest space)
  uniform float uHotRadius;
  uniform float uBinStart;
  uniform float uTelStart;
  uniform float uHexStart;
  attribute vec2 aRef;
  attribute float aSeed;
  varying float vGlyph;
  varying float vFade;

  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  void main() {
    vec3 home = texture2D(uHomeTexture, aRef).xyz;
    vec3 pos  = texture2D(uPositionTexture, aRef).xyz;

    // localization: only particles near a hotspot show a glyph
    float md = distance(home, uHots[0]);
    md = min(md, distance(home, uHots[1]));
    md = min(md, distance(home, uHots[2]));
    float vis = 1.0 - smoothstep(uHotRadius * 0.55, uHotRadius, md);

    // type cycle per particle: binary → Telugu → hex (staggered by seed)
    float phase = mod(uTime * 0.5 + aSeed * 9.0, 3.0);
    float cat = floor(phase);
    float start = cat < 0.5 ? uBinStart : (cat < 1.5 ? uTelStart : uHexStart);
    float cnt   = cat < 0.5 ? 2.0       : (cat < 1.5 ? 16.0      : 16.0);
    // which character within the category (changes ~once/sec)
    float r = hash(aSeed * 7.0 + cat * 5.0 + floor(uTime * 1.1));
    vGlyph = start + floor(r * cnt);
    vFade = vis;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.03, vis); // size 0 → hidden
    gl_Position = projectionMatrix * mv;
  }
`

const glyphFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform vec3 uColor;
  varying float vGlyph;
  varying float vFade;
  void main() {
    if (vFade < 0.03) discard;
    float idx = floor(vGlyph + 0.5);
    float cx = mod(idx, uCols);
    float cy = floor(idx / uCols);
    vec2 uv = (vec2(cx, cy) + gl_PointCoord) / uCols;
    vec4 g = texture2D(uAtlas, uv);
    if (g.a < 0.15) discard;
    gl_FragColor = vec4(uColor, g.a * vFade);
  }
`

function MaskParticles() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)

  // Load the CC-BY cyborg mask ourselves (draco-compressed). Manual loader (no
  // Suspense) so failures surface as console errors instead of a silent hang.
  const [maskGeometry, setMaskGeometry] = useState<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
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
    return () => draco.dispose()
  }, [])

  // Build everything once we have geometry + renderer.
  const sim = useMemo(() => {
    if (!maskGeometry) return null
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
    homeTex.image.data.set(homeData)
    const velTex = gpu.createTexture() // starts at 0

    const posVar = gpu.addVariable('uCurrentPosition', simPosition, homeTex)
    const velVar = gpu.addVariable('uCurrentVelocity', simVelocity, velTex)
    gpu.setVariableDependencies(posVar, [posVar, velVar])
    gpu.setVariableDependencies(velVar, [posVar, velVar])

    // clone the home texture so it's a stable "original" reference
    const homeRef = gpu.createTexture()
    homeRef.image.data.set(homeData)
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

    // ---- glyph layer: a strided subset carries a seed; hotspots decide which
    // are visible (localized patches), the shader cycles binary→Telugu→hex ----
    const atlas = makeGlyphAtlas()
    const stride = Math.max(1, Math.floor(count / GLYPH_COUNT))
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

    // face bounding box (from the accepted samples) → hotspot radius + a pool of
    // candidate positions the hotspots hop between (chin, eyes, cheek, …)
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
    const candidates: THREE.Vector3[] = []
    for (let k = 0; k < count; k++) {
      const x = homeData[k * 4], y = homeData[k * 4 + 1], z = homeData[k * 4 + 2]
      if (x < minx) minx = x
      if (x > maxx) maxx = x
      if (y < miny) miny = y
      if (y > maxy) maxy = y
      if (k % 700 === 0) candidates.push(new THREE.Vector3(x, y, z))
    }
    const hotRadius = Math.max(maxx - minx, maxy - miny) * 0.18
    const hotspots = Array.from({ length: N_HOTSPOTS }, () =>
      candidates[(Math.random() * candidates.length) | 0].clone(),
    )

    const glyphMat = new THREE.ShaderMaterial({
      uniforms: {
        uPositionTexture: { value: null },
        uHomeTexture: { value: homeRef },
        uGlyphSize: { value: 26 },
        uTime: { value: 0 },
        uHots: { value: hotspots },
        uHotRadius: { value: hotRadius },
        uBinStart: { value: BIN_START },
        uTelStart: { value: TEL_START },
        uHexStart: { value: HEX_START },
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

    return { gpu, posVar, velVar, geometry, material, rayMesh, glyphGeo, glyphMat, hotspots, candidates }
  }, [maskGeometry, gl])

  const raycaster = useRef(new THREE.Raycaster())
  const mouseSpeed = useRef(0)
  const glyphTimer = useRef(0)
  const hotIndex = useRef(0)
  const groupRef = useRef<THREE.Group>(null)
  const rot = useRef({ x: 0, y: 0 })

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
    const { gpu, posVar, velVar, material, glyphMat, rayMesh, hotspots, candidates } = sim

    // apply drag rotation to the visible group AND the raycast mesh so cursor
    // interaction still lines up after you spin the mask
    if (groupRef.current) groupRef.current.rotation.set(rot.current.x, rot.current.y, 0)
    rayMesh.rotation.set(rot.current.x, rot.current.y, 0)
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

    // rove one hotspot to a new random face location every ~2.2s
    glyphTimer.current += delta
    if (glyphTimer.current > 2.2) {
      glyphTimer.current = 0
      hotspots[hotIndex.current % hotspots.length].copy(
        candidates[(Math.random() * candidates.length) | 0],
      )
      hotIndex.current++
    }
  })

  if (!sim) return null
  return (
    <group ref={groupRef} position={[OFFSET.x, OFFSET.y, OFFSET.z]}>
      <points geometry={sim.geometry} material={sim.material} frustumCulled={false} />
      <points geometry={sim.glyphGeo} material={sim.glyphMat} frustumCulled={false} />
    </group>
  )
}

export function MaskField() {
  return (
    /* `absolute`, not `fixed`: this now lives inside Home's sticky hero
       viewport, which does the pinning. `fixed` would escape that container and
       keep the mask on screen past the hero. */
    <div className="absolute inset-0 z-0 bg-[#050609]">
      <Canvas
        camera={{ position: [0, 0, 1.5], fov: 50, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#050609']} />
        <MaskParticles />
        {/* No OrbitControls — the mask is FIXED, front-facing, on the left. The
            cursor still disturbs the particles (handled in the sim), but the
            visitor can't rotate/move the mask itself. */}
        {/* The new WebGL liquid glass that refracts the mask */}
        <LiquidGlassField />
        
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
