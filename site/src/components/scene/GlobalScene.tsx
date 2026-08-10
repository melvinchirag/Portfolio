import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useLocation } from 'react-router-dom'
import { MaskParticles } from './MaskField'
import { ContactMaskSwarm } from './ContactMaskSwarm'
import { LiquidGlassField } from './LiquidGlassField'
import { VideoPlane } from './VideoBackground'
import { useContactInView } from '../../hooks/contactVisibility'
import { useHeroFrame, BEAT_COUNT } from '../../hooks/heroScroll'

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
    const video = document.createElement('video')
    // preload BEFORE src, then an explicit load(): this element is detached from
    // the DOM and is never play()'d (scroll drives it), and in that state Chrome
    // will happily sit at readyState 0 forever unless something explicitly kicks
    // off the fetch. load() is that kick.
    video.preload = 'auto'
    // Versioned filename: this path has served three different files during
    // development (0-byte, a 209MB 4K cut, now the 720p encode). Bumping the name
    // on re-encode guarantees no browser is serving a stale cached copy.
    video.src = '/about-bg-720.mp4'
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.load()
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
  }, [])

  // Scroll-SCRUB the video while About is showing — BIDIRECTIONAL. Scroll down
  // runs it forward, scroll up rewinds it (currentTime tracks scroll position
  // both ways). The tail is trimmed; the head is not (see START_TRIM below).
  // The video is never play()'d — we drive currentTime from scroll. The
  // `!v.seeking` guard is load-bearing: it refuses a new seek until the previous
  // finished, so the decoder never thrashes to black (the original bug).
  //
  // NOTE on lag: seeking a large / sparse-keyframe mp4 is slow, so the video can
  // trail fast scrolls. The biggest lever (short of re-encoding with dense
  // keyframes) is page LENGTH — a taller About page means each scroll tick maps
  // to a smaller video-time jump = smaller, faster seeks. The easing is now heavy
  // (0.06, see below) so discrete scroll-wheel ticks blend into a smooth glide
  // instead of jumping — this trades a little responsiveness for smoothness.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !active) return
    v.pause()
    v.preload = 'auto'

    // Where in the clip the scroll starts and ends.
    // START_TRIM is 0 on purpose: this footage OPENS on its best frame (the wide
    // astronaut-and-Earth shot), so we show it from the very first pixel. The
    // earlier value of 3 was inherited from the previous clip (which had a
    // play-button intro frame to skip) and it happened to land exactly on a dark
    // moment at t≈3.0s, where a foreground asteroid wipes across the lens — that
    // is what made the page open black. Measured, not guessed: frame detail is
    // ~37KB/frame at t=0–2.6 and drops to ~9KB at t=3.0.
    const START_TRIM = 0
    const END_TRIM = 3 // still drop the tail
    let raf = 0
    let smooth = -1 // -1 until first sample
    let primed = false // has a frame been forced to decode at least once?

    const tick = () => {
      const dur = v.duration
      if (dur && !Number.isNaN(dur)) {
        const start = START_TRIM
        const end = Math.max(start + 0.1, dur - END_TRIM)
        const max = document.documentElement.scrollHeight - window.innerHeight
        const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
        if (smooth < 0) smooth = progress
        // Heavy smoothing (0.06) absorbs discrete scroll-wheel ticks, creating a buttery glide.
        smooth += (progress - smooth) * 0.06
        const target = start + smooth * (end - start)
        if (!v.seeking) {
          if (!primed) {
            // Force exactly one seek so a frame is guaranteed to be decoded and
            // uploaded to the texture. Needed because at the top of the page the
            // target is 0 and currentTime is already 0, so the delta check below
            // would never fire and the background would stay black.
            v.currentTime = Math.min(target + 0.001, end)
            primed = true
          } else if (Math.abs(v.currentTime - target) > 0.033) {
            v.currentTime = target
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, tex])

  return tex
}

/** Everything that lives inside the shared <Canvas>. */
function SceneContents({
  isHome,
  isAbout,
  aboutTex,
  showSwarm,
}: {
  isHome: boolean
  isAbout: boolean
  aboutTex: THREE.VideoTexture | null
  showSwarm: boolean
}) {
  // Force the video texture to re-upload the current frame each render so both
  // the background plane and the glass see live video.
  useFrame(() => {
    if (aboutTex) aboutTex.needsUpdate = true
  })

  return (
    <>
      {isAbout && aboutTex && <VideoPlane texture={aboutTex} />}

      {/* The hero's single mask stays mounted for the WHOLE home route, and
          fades itself out on scroll (see the leave-fade inside MaskField.tsx)
          rather than being mount-gated at all — that's what actually stopped
          it popping AND stopped it lingering into Contact, see that file.
          The swarm mounts across Future + Contact (`showSwarm` below) — round
          3 tried this and it looked like a collision with the big mask, so a
          later pass wrongly narrowed it to Contact-only. The REAL bug wasn't
          the wide mount, it was that ContactMaskSwarm used to fall back to a
          VIEWPORT-sized anchor rect while `!contactInView`, which force-
          repositioned the faces into the visible Future frame — that's what
          collided. Now it always anchors to `#contact`'s real rect, on-screen
          or not, so during Future the faces sit at their true (currently
          off-screen, below) position and stay invisible there, while their
          upward-drifting GLYPHS travel far enough to become visible anyway —
          which is the actual effect Melvin described wanting: faces only
          "fly in" once you're really at Contact, but the glyphs already in
          flight keep floating up into view if you scroll back to Future. */}
      {isHome && <MaskParticles />}
      {isHome && showSwarm && <ContactMaskSwarm />}

      {/* On About, hand the video texture straight to the glass (it refracts THAT
          rather than capturing the scene — see LiquidGlassField). Elsewhere it
          falls back to scene capture. The hero's story panels are plain CSS glass
          (.slide-glass) now, NOT this — over the near-black mask a refraction has
          nothing to blur — so there are no `.sync-glass-rect` elements there and
          this whole pipeline skips itself on the hero. */}
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
  const contactInView = useContactInView()
  // FUTURE is the last hero frame. useHeroFrame() only re-renders on a frame
  // CHANGE (see heroScroll.ts), so this is cheap.
  const heroFrame = useHeroFrame()
  const showSwarm = heroFrame === BEAT_COUNT - 1 || contactInView

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
        <SceneContents isHome={isHome} isAbout={isAbout} aboutTex={aboutTex} showSwarm={showSwarm} />
      </Canvas>
    </div>
  )
}
