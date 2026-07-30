import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useLocation } from 'react-router-dom'
import { MaskParticles } from './MaskField'
import { LiquidGlassField } from './LiquidGlassField'
import { VideoPlane } from './VideoBackground'

/**
 * Creates the looping VideoTexture for the About background. Lives OUTSIDE the
 * <Canvas> (a VideoTexture is a plain THREE object, not a hook) so the same
 * texture can be handed to BOTH the background plane and the liquid glass. The
 * per-frame GPU re-upload runs inside the canvas (SceneContents).
 */
function useAboutVideoTexture(active: boolean) {
  const [tex, setTex] = useState<THREE.VideoTexture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!active) return

    const video = document.createElement('video')
    video.src = '/about-bg-720.mp4'
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    // Claude's fix: Video now just PLAYS. This forces Chrome to load the video
    // even though it's detached from the DOM, and avoids decoder thrash.
    video.play().catch(() => {
      // Autoplay might be blocked until interaction, but muted usually succeeds.
    })
    videoRef.current = video

    const t = new THREE.VideoTexture(video)
    t.colorSpace = THREE.SRGBColorSpace
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    setTex(t)

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      t.dispose()
      videoRef.current = null
    }
  }, [active])

  return tex
}

/** Everything that lives inside the shared <Canvas>. */
function SceneContents({
  isHome,
  isAbout,
  aboutTex,
}: {
  isHome: boolean
  isAbout: boolean
  aboutTex: THREE.VideoTexture | null
}) {
  // Force the video texture to re-upload the current frame each render so both
  // the background plane and the glass see live video.
  useFrame(() => {
    if (aboutTex) aboutTex.needsUpdate = true
  })

  return (
    <>
      {isAbout && aboutTex && <VideoPlane texture={aboutTex} />}

      {isHome && <MaskParticles />}

      {/* On About, hand the video texture straight to the glass (it refracts THAT
          rather than capturing the scene — see LiquidGlassField). Elsewhere it
          falls back to scene capture. */}
      <LiquidGlassField bgTexture={isAbout ? aboutTex ?? undefined : undefined} />

      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
      </EffectComposer>
    </>
  )
}

export function GlobalScene() {
  const loc = useLocation()
  const isHome = loc.pathname === '/'
  const isAbout = loc.pathname === '/about'
  const aboutTex = useAboutVideoTexture(isAbout)

  return (
    <div className="fixed inset-0 z-0 bg-[#050609]">
      <Canvas
        camera={{ position: [0, 0, 1.5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
        }}
      >
        <color attach="background" args={['#050609']} />
        <SceneContents isHome={isHome} isAbout={isAbout} aboutTex={aboutTex} />
      </Canvas>
    </div>
  )
}
