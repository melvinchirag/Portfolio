import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { pointerState } from '../hooks/usePointerTracker'
import { useQualityTier } from '../hooks/useQualityTier'
import { ParticleField } from './scene/ParticleField'

/**
 * Camera parallax. The camera drifts toward the pointer rather than the field
 * moving — parallax against real depth is what sells the volume, and it is
 * cheaper than displacing 120k particles.
 */
function CameraRig({ enabled }: { enabled: boolean }) {
  // useThree gives components inside <Canvas> access to the scene, camera, and
  // renderer that React Three Fiber set up for us.
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0, 8))

  useFrame((_state, delta) => {
    if (!enabled) return
    // Read from the shared window-level tracker rather than R3F's own pointer,
    // which only updates when the mouse is directly over the canvas.
    target.current.set(pointerState.x * 0.9, pointerState.y * 0.55, 8)
    // Framerate-corrected easing, so the camera drifts at the same speed
    // regardless of how fast the machine is rendering.
    camera.position.lerp(target.current, 1 - Math.exp(-3 * delta))
    // Keep the camera aimed at the centre of the field as it moves, which is
    // what turns a slide into a parallax rotation.
    camera.lookAt(0, 0, 0)
  })

  return null
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

/**
 * No-WebGL fallback. The rule is that the site degrades to a rendered version
 * of the *same* scene, never a blank div. Until the pre-rendered frame exists,
 * this is a CSS approximation of the field's colour and depth — a placeholder
 * for a real still, not the final answer.
 */
function StaticFieldFallback() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[1]"
      style={{
        background:
          'radial-gradient(ellipse 62% 48% at 50% 45%, rgba(138,74,28,0.22) 0%, rgba(138,74,28,0.07) 42%, transparent 74%),' +
          'radial-gradient(ellipse 28% 20% at 60% 38%, rgba(255,196,107,0.12) 0%, transparent 70%),' +
          '#080604',
      }}
    />
  )
}

export function SceneCanvas() {
  const quality = useQualityTier()
  const reducedMotion = usePrefersReducedMotion()
  const [hasWebGL] = useState(detectWebGL)

  if (!hasWebGL) return <StaticFieldFallback />

  // Post-processing is where the glow comes from, but it is also the first
  // thing to drop on weak hardware or when motion is unwelcome.
  const postProcessing = quality.postProcessing && !reducedMotion

  return (
    <div className="fixed inset-0 z-[1]">
      <Canvas
        dpr={quality.dpr}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 100 }}
        onCreated={({ gl }) => gl.setClearColor('#080604', 1)}
      >
        <ParticleField
          count={quality.particleCount}
          reducedMotion={reducedMotion}
          pixelRatio={quality.dpr[1]}
        />
        <CameraRig enabled={!reducedMotion} />

        {/* Post-processing runs after the scene is drawn, applying effects to
            the finished image. This is where the glow comes from. */}
        {postProcessing && (
          <EffectComposer>
            {/* Bloom makes bright areas bleed light into their surroundings.
                These numbers were tuned down hard after Melvin's screenshots
                showed the field blowing out to white: intensity was 1.15 and
                the threshold 0.12, which meant almost every particle counted
                as "bright" and got bloomed. Raising the threshold to 0.55
                restricts the glow to genuinely hot cores. */}
            <Bloom
              intensity={0.4}
              luminanceThreshold={0.62}
              luminanceSmoothing={0.25}
              mipmapBlur
            />
            {/* Darkens the frame edges, drawing the eye to the centre and
                deepening the black around the field for more contrast. */}
            <Vignette offset={0.16} darkness={0.92} eskil={false} />
            {/* A faint grain overlay. Breaks up the smooth gradients that
                betray computer rendering, and suits the film palette. */}
            <Noise opacity={0.024} blendFunction={BlendFunction.SCREEN} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
