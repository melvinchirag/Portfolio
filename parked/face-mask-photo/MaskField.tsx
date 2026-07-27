/* ============================================================================
 * MaskField.tsx — the particle-mask hero centerpiece
 * ----------------------------------------------------------------------------
 * Renders Melvin's face as a field of ~80k glowing teal particles on black,
 * in the "dreamy particles" register (ref: Codrops dreamy-particles Cyborg
 * mask). We can't use a 3D head model (we only have a 2D photo), so this is a
 * FRONT-FACING 2.5D build: particles are sampled from the photo's pixels, given
 * a little depth from luminance, and made to drift, react to the cursor, and
 * occasionally flare ("supernova" twinkles). Bloom does the glow.
 *
 * How the pieces fit:
 *  - useFaceParticles(): loads /mask/face.png, samples it on an offscreen
 *    canvas, and produces per-particle arrays (position, luminance, seed).
 *  - <Particles>: a THREE.Points with a custom shader that drifts + flares them.
 *  - <MaskField>: the R3F <Canvas> host + Bloom post-processing.
 *
 * Heavily commented because Melvin reads and tunes this himself.
 * ========================================================================= */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

/* World height the face is scaled to. Positions come out of the sampler in
 * a normalized [-0.5, 0.5] box; we multiply by this so the face is ~SCALE
 * world-units tall, then frame it with the camera distance below. */
const SCALE = 6

type FaceData = {
  positions: Float32Array
  lums: Float32Array
  seeds: Float32Array
  count: number
}

/* Load the photo and turn its opaque pixels into particles. Runs once. */
function useFaceParticles(url: string): FaceData | null {
  const [data, setData] = useState<FaceData | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => {
      // Downsample width — controls particle density. 320 → ~80k particles.
      const cw = 320
      const ch = Math.round((img.height / img.width) * cw)
      const cvs = document.createElement('canvas')
      cvs.width = cw
      cvs.height = ch
      const ctx = cvs.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, cw, ch)
      const px = ctx.getImageData(0, 0, cw, ch).data

      const aspect = cw / ch // width/height of the photo (<1, it's a portrait)
      const pos: number[] = []
      const lums: number[] = []
      const seeds: number[] = []

      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4
          if (px[i + 3] < 40) continue // skip transparent (the removed background)
          const r = px[i], g = px[i + 1], b = px[i + 2]
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
          // Center the photo; flip Y (image space is top-down, world is Y-up).
          // Multiply X by aspect so the face isn't stretched horizontally.
          const nx = (x / cw - 0.5) * aspect
          const ny = -(y / ch - 0.5)
          pos.push(nx * SCALE, ny * SCALE, (lum - 0.5) * 0.6) // subtle depth from light
          lums.push(lum)
          seeds.push(Math.random())
        }
      }
      setData({
        positions: new Float32Array(pos),
        lums: new Float32Array(lums),
        seeds: new Float32Array(seeds),
        count: lums.length,
      })
    }
    return () => { img.onload = null }
  }, [url])

  return data
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uPointer;   // cursor in world-xy
  attribute float aLum;
  attribute float aSeed;
  varying float vLum;
  varying float vFlare;

  void main() {
    vLum = aLum;
    vec3 pos = position;

    // --- gentle "dreamy" drift so the mask breathes but stays readable ---
    float n = aSeed * 6.2831;
    pos.x += sin(uTime * 0.45 + n) * 0.05;
    pos.y += cos(uTime * 0.38 + n * 1.3) * 0.05;
    pos.z += sin(uTime * 0.6 + n * 2.1) * 0.12;

    // --- cursor repulsion: particles near the pointer get GENTLY nudged ---
    // (kept subtle so it never carves a hole in the face)
    vec2 d = pos.xy - uPointer;
    float dist = length(d);
    float push = smoothstep(0.55, 0.0, dist) * 0.22;
    pos.xy += normalize(d + 1e-4) * push;

    // --- supernova twinkle: rare, sharp per-particle flares ---
    float tw = fract(sin(aSeed * 91.7) * 43758.5453);
    float flare = pow(max(sin(uTime * 0.7 + tw * 6.2831), 0.0), 40.0);
    vFlare = flare;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // brighter/lit pixels get slightly bigger points; flares balloon briefly
    float size = uSize * (0.5 + aLum) * (1.0 + flare * 7.0);
    gl_PointSize = size * uPixelRatio * (1.0 / -mv.z);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;   // base teal
  uniform vec3 uHot;     // bright cyan for lit areas
  varying float vLum;
  varying float vFlare;

  void main() {
    // round, soft point sprite
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);
    if (alpha < 0.01) discard;

    vec3 col = mix(uColor, uHot, clamp(vLum * 1.2 + vFlare, 0.0, 1.0));
    col += vFlare * vec3(0.8, 1.0, 1.0); // supernova whitens
    // pow() on luminance keeps shadows (eye sockets, nose, jaw) dark so the
    // facial STRUCTURE reads, instead of additive glow flooding everything.
    gl_FragColor = vec4(col, alpha * pow(vLum, 1.35) * 0.9);
  }
`

function Particles({ url }: { url: string }) {
  const face = useFaceParticles(url)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport } = useThree()

  // cursor in normalized device coords (-1..1). Start far off-screen so there's
  // no repulsion "hole" in the face before the user has moved the mouse.
  const pointer = useRef(new THREE.Vector2(50, 50))
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      )
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const geometry = useMemo(() => {
    if (!face) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(face.positions, 3))
    g.setAttribute('aLum', new THREE.BufferAttribute(face.lums, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(face.seeds, 1))
    return g
  }, [face])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.4 },
      uPixelRatio: { value: Math.min(2, window.devicePixelRatio) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uColor: { value: new THREE.Color(0.10, 0.55, 0.52) },
      uHot: { value: new THREE.Color(0.75, 1.0, 0.95) },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (!matRef.current) return
    uniforms.uTime.value += delta
    // convert cursor NDC → world xy on the z=0 plane (approx via viewport size)
    uniforms.uPointer.value.set(
      pointer.current.x * (viewport.width / 2),
      pointer.current.y * (viewport.height / 2),
    )
  })

  if (!geometry) return null

  return (
    <points>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function MaskField() {
  return (
    <div className="fixed inset-0 z-0 bg-[#050609]">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#050609']} />
        <Particles url="/mask/face.png" />
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
