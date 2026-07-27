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
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

// Teach BufferGeometry/Mesh the fast BVH raycast (one-time global patch).
;(THREE.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree
;(THREE.BufferGeometry.prototype as unknown as { disposeBoundsTree: typeof disposeBoundsTree }).disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

// √particle-count. 512 → 262k particles (first pass; bump toward 1024 later).
const SIZE = 512

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

function MaskParticles() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)

  // Load the CC-BY cyborg mask (draco-compressed → 2nd arg enables the decoder).
  const gltf = useGLTF('/models/cyborg.glb', true)

  // Pull the first mesh's geometry out of the loaded model.
  const maskGeometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null
    gltf.scene.traverse((o) => {
      if (!geo && (o as THREE.Mesh).isMesh) geo = (o as THREE.Mesh).geometry
    })
    return geo
  }, [gltf])

  // Build everything once we have geometry + renderer.
  const sim = useMemo(() => {
    if (!maskGeometry) return null
    const mesh = new THREE.Mesh(maskGeometry)
    const sampler = new MeshSurfaceSampler(mesh).build()

    const count = SIZE * SIZE
    const homeData = new Float32Array(count * 4)
    const refs = new Float32Array(count * 2)
    const p = new THREE.Vector3()

    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const idx = i * SIZE + j
        sampler.sample(p)
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

    // a hidden mesh (with BVH) purely for cursor→surface raycasting
    ;(maskGeometry as unknown as { computeBoundsTree: () => void }).computeBoundsTree()
    const rayMesh = new THREE.Mesh(maskGeometry)
    rayMesh.updateMatrixWorld()

    return { gpu, posVar, velVar, geometry, material, rayMesh }
  }, [maskGeometry, gl])

  const raycaster = useRef(new THREE.Raycaster())
  const mouseSpeed = useRef(0)

  useFrame((_, delta) => {
    if (!sim) return
    const { gpu, posVar, velVar, material, rayMesh } = sim

    // cursor → 3D point on the mask
    raycaster.current.setFromCamera(pointer as THREE.Vector2, camera)
    const hit = raycaster.current.intersectObject(rayMesh)
    if (hit.length > 0) {
      velVar.material.uniforms.uMouse.value.copy(hit[0].point)
      mouseSpeed.current = 1
    }
    mouseSpeed.current *= 0.9
    velVar.material.uniforms.uMouseSpeed.value = mouseSpeed.current
    velVar.material.uniforms.uTime.value += delta

    gpu.compute()
    material.uniforms.uPositionTexture.value = gpu.getCurrentRenderTarget(posVar).texture
    material.uniforms.uVelocityTexture.value = gpu.getCurrentRenderTarget(velVar).texture
  })

  if (!sim) return null
  return <points geometry={sim.geometry} material={sim.material} frustumCulled={false} />
}

export function MaskField() {
  return (
    <div className="fixed inset-0 z-0 bg-[#050609]">
      <Canvas
        camera={{ position: [0, 0, 1.5], fov: 50, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#050609']} />
        <MaskParticles />
        <OrbitControls enableZoom={false} enablePan={false} enableDamping />
        <EffectComposer>
          <Bloom intensity={1.2} luminanceThreshold={0.06} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/cyborg.glb', true)
