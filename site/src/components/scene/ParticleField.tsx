/* ============================================================================
 * ParticleField.tsx — the ambient drifting dust behind the hero
 * ----------------------------------------------------------------------------
 * WHAT THIS FILE DOES
 * Builds a cloud of glowing particles once at startup, then drifts them every
 * frame. It is pure ATMOSPHERE — the portrait is rendered separately as image
 * layers (see PortraitTriptych). An earlier version tried to assemble the face
 * from these particles; that read as a blob and was retired.
 *
 * Two jobs:
 *   1. ONCE AT STARTUP — scatter particles against an fBm density field so the
 *      cloud has structure (clumps and voids), not an even fog.
 *   2. EVERY FRAME — advance the clock and the smoothed pointer the shader reads.
 *
 * The drawing is done by the shaders in particles.glsl.ts.
 * ========================================================================= */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { pointerState, usePointerTracker } from '../../hooks/usePointerTracker'
import { fbm } from './noise'
import { particleFragmentShader, particleVertexShader } from './particles.glsl'

/** The volume the field occupies. Deliberately deeper than it is wide — depth
 *  is what Melvin picked out of his references. */
const BOUNDS = { x: 15, y: 9.5, zNear: 3, zFar: -20 }

type Attributes = {
  positions: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  temps: Float32Array
}

/**
 * Rejection-samples positions against an fBm density field so the field has
 * clusters and voids. Uniformly random points look like dots; this looks like
 * structure. Runs once, during the loading sequence.
 */
function buildAttributes(count: number): Attributes {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)
  const temps = new Float32Array(count)

  const depth = BOUNDS.zNear - BOUNDS.zFar
  let placed = 0
  let guard = 0
  // Generous budget so the selective sampler can still place the full count into
  // the dense filaments before giving up.
  const maxAttempts = count * 120

  const write = (i: number, x: number, y: number, z: number) => {
    const i3 = i * 3
    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z
    seeds[i] = Math.random()
    // Most particles fine, a few large — an even size reads as noise.
    sizes[i] = 0.35 + Math.pow(Math.random(), 3.4) * 2.6
    // Temperature skewed cool: the warm accent shows in only a few percent of
    // the field, the "one accent, used rarely" rule applied to the scene.
    temps[i] = Math.pow(Math.random(), 6.0)
  }

  while (placed < count && guard < maxAttempts) {
    guard++
    const x = (Math.random() * 2 - 1) * BOUNDS.x
    const y = (Math.random() * 2 - 1) * BOUNDS.y
    const z = BOUNDS.zFar + Math.random() * depth

    // Two frequencies: a broad one carving large voids, a finer one breaking
    // the remaining mass into filaments.
    const broad = fbm(x * 0.11, y * 0.11, z * 0.09)
    const fine = fbm(x * 0.31 + 40, y * 0.31 + 40, z * 0.26 + 40)
    const density = broad * 0.72 + fine * 0.28

    // Steeper acceptance (exp 3.0, was 2.1) concentrates particles hard into the
    // dense filaments and leaves large empty voids — that dark-to-bright range is
    // the contrast that was missing when the field filled every pixel.
    if (Math.random() > Math.pow(density, 3.0) * 2.0) continue

    write(placed, x, y, z)
    placed++
  }

  // If the sampler ran short, ship FEWER particles rather than filling the voids
  // uniformly — a uniform fill is exactly the flat wall we are trying to avoid.
  // Trim the buffers to what was actually placed (no origin clump of zeros).
  if (placed < count) {
    return {
      positions: positions.subarray(0, placed * 3),
      seeds: seeds.subarray(0, placed),
      sizes: sizes.subarray(0, placed),
      temps: temps.subarray(0, placed),
    }
  }

  return { positions, seeds, sizes, temps }
}

type ParticleFieldProps = {
  count: number
  reducedMotion: boolean
  pixelRatio: number
}

export function ParticleField({ count, reducedMotion, pixelRatio }: ParticleFieldProps) {
  // A ref holds a value that survives re-renders without triggering one. We
  // mutate the material every frame, and doing that through React state would
  // re-render 60 times a second.
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const pointer = useRef(new THREE.Vector3())
  const pointerTarget = useRef(new THREE.Vector3())

  // Global pointer tracking on `window`, so the field reacts everywhere on the
  // page, not just when the mouse is over the canvas.
  usePointerTracker(!reducedMotion)

  // useMemo caches the expensive build so it runs only when `count` changes.
  const attrs = useMemo(() => buildAttributes(count), [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector3(0, 0, 0) },
      uPointerStrength: { value: reducedMotion ? 0 : 1 },
      uSizeScale: { value: 1 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0 },
      // Thins the field behind the hero text so it stays readable, without a
      // flat dark overlay (forbidden by CLAUDE.md).
      uClearing: { value: 0.9 },
      // Deep bronze — the dim, cool end of the warm-film palette.
      uColorCool: { value: new THREE.Color('#8a4a1c') },
      // Hot gold — the bright end, carried by only a few percent of particles.
      uColorWarm: { value: new THREE.Color('#ffc46b') },
    }),
    // Built once; mutated in useFrame rather than recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useFrame((_state, delta) => {
    const mat = materialRef.current
    if (!mat) return

    // Fade in once the geometry is live, so the field arrives rather than pops.
    mat.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      mat.uniforms.uOpacity.value,
      1,
      Math.min(1, delta * 1.1),
    )

    if (reducedMotion) return

    mat.uniforms.uTime.value += delta

    // Smooth the pointer toward the real mouse position. The 1 - exp(-k·delta)
    // form is framerate-corrected: a fixed proportion per SECOND, not per frame.
    pointerTarget.current.set(pointerState.x * BOUNDS.x, pointerState.y * BOUNDS.y, 0)
    pointer.current.lerp(pointerTarget.current, 1 - Math.exp(-9 * delta))
    mat.uniforms.uPointer.value.copy(pointer.current)
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attrs.positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[attrs.seeds, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[attrs.sizes, 1]} />
        <bufferAttribute attach="attributes-aTemp" args={[attrs.temps, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
