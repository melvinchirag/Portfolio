/* ============================================================================
 * SpaceBackdrop.tsx — the hero's "the mask is in space" background
 * ----------------------------------------------------------------------------
 * WHY A REAL PHOTOGRAPH, NOT A PROCEDURAL SHADER
 * This project already learned this lesson twice (see parked/hero-nebula/
 * README.md and docs/CODEBASE.md): procedural noise cannot fake a nebula
 * photograph — it was tried, rejected repeatedly for looking "flat", and the
 * verdict was correct and unfixable. A real photo is turbulent physics evolved
 * over millions of years, captured at huge dynamic range. So this reuses the
 * same 5 real NASA/ESA/ESO images that were parked in parked/hero-nebula/ —
 * copied here, not moved, so the parked originals stay intact as history.
 *
 * WHY THIS IS RENDERED INSIDE THE SAME <Canvas> AS THE MASK (important)
 * LiquidGlassField (the glass shader) captures ITS BACKGROUND by rendering the
 * Three.js scene to a texture — it can only "see" things that are actually IN
 * that scene. A CSS/DOM background behind the canvas would be invisible to it.
 * So this has to be real WebGL geometry in the same scene graph, drawn BEFORE
 * the mask particles so it sits behind them.
 *
 * WHY THIS IS DIFFERENT FROM THE OLD (PARKED) NEBULA HERO
 * That version WAS the hero's identity — full-brightness, the visual subject,
 * mouse-interactive. It was cut for reading as "astronomy person." This one is
 * the opposite: heavily dimmed atmosphere behind an already-strong CS identity
 * (the mask + its code/Telugu glyphs). "He happens to be in space" vs "he is a
 * space person" — keep it faded. Never let it compete with the mask.
 *
 * THE MOTION (this is the actual ask — "true scrollytelling" per Melvin)
 * Two motions layer together:
 *   1. A slow constant drift (a "Ken Burns" pan/zoom) so it never looks static.
 *   2. A scroll-linked drift driven by `heroScroll.progress` (the same
 *      read-only contract everything else in the hero uses) — scrolling through
 *      the beats should feel like drifting further into the nebula. This is
 *      what makes the background itself part of the scrollytelling motion,
 *      not just a static backdrop behind content that fades.
 *
 * LICENSING — this ships publicly, do not remove the credit line.
 *   carina, tarantula — NASA/ESA/CSA JWST — public domain
 *   orion             — ESO/VISTA — CC BY 4.0, attribution required
 *   eagle, lagoon     — NASA/ESA Hubble — CC BY 4.0, attribution required
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heroScroll } from '../../hooks/heroScroll'

const IMAGES = [
  { src: '/space/carina.jpg', name: 'Cosmic Cliffs, Carina', credit: 'NASA / ESA / CSA / STScI' },
  { src: '/space/orion.jpg', name: 'Orion Nebula', credit: 'ESO / VISTA' },
  { src: '/space/tarantula.jpg', name: 'Tarantula Nebula', credit: 'NASA / ESA / CSA / STScI' },
  { src: '/space/eagle.jpg', name: 'Pillars of Creation, Eagle', credit: 'NASA / ESA / Hubble' },
  { src: '/space/lagoon.jpg', name: 'Lagoon Nebula', credit: 'NASA / ESA / Hubble' },
]

const ROTATE_KEY = 'melvin:space-index'

/** Advance the rotation once per page load — a reload shows the next nebula. */
function pickIndex(): number {
  try {
    const prev = parseInt(localStorage.getItem(ROTATE_KEY) ?? '-1', 10)
    const next = (Number.isFinite(prev) ? prev + 1 : 0) % IMAGES.length
    localStorage.setItem(ROTATE_KEY, String(next))
    return next
  } catch {
    return 0
  }
}

/** How dim the nebula sits behind the mask. Lower = further back / less
 *  competing for attention. Tune this before anything else if it fights the
 *  mask visually — see the "never compete with the mask" rule above.
 *  0.28 was tried first and was WAY too bright (the nebula filled the whole
 *  screen at near-full strength, fighting the mask hard) — ACES tonemapping +
 *  the Bloom pass both push midtones up further than the raw multiply suggests,
 *  so this needs to be much lower than intuition says. */
const DIM = 0.06

export function SpaceBackdrop({ onCredit }: { onCredit: (text: string) => void }) {
  const [index] = useState(pickIndex)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const image = IMAGES[index]

  useEffect(() => {
    onCredit(`${image.name} — ${image.credit}`)
  }, [image, onCredit])

  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(
      image.src,
      (tex) => {
        if (cancelled) return
        tex.colorSpace = THREE.SRGBColorSpace
        setTexture(tex)
      },
      undefined,
      (err) => console.error('[SpaceBackdrop] failed to load', image.src, err),
    )
    return () => {
      cancelled = true
    }
  }, [image])

  // Oversized so slow pan/zoom never reveals an edge — see the Ken Burns note above.
  const geometry = useMemo(() => new THREE.PlaneGeometry(70, 70), [])
  const dimColor = useMemo(() => new THREE.Color(DIM, DIM, DIM * 1.05), [])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = state.clock.elapsedTime

    // 1. constant ambient drift — a slow, gentle Ken Burns pan/zoom
    const ambientX = Math.sin(t * 0.02) * 1.2
    const ambientY = Math.cos(t * 0.015) * 0.8
    const ambientScale = 1.08 + Math.sin(t * 0.01) * 0.02

    // 2. scroll-linked drift — reads the shared, read-only scroll contract.
    // Scrolling through the beats slowly zooms/pans further into the image,
    // so the background itself carries scroll motion, not just content fades.
    const p = heroScroll.progress // 0 -> 1 across the whole hero
    const scrollScale = 1 + p * 0.35
    const scrollX = p * -2.2
    const scrollY = p * 1.1

    mesh.position.x = ambientX + scrollX
    mesh.position.y = ambientY + scrollY
    mesh.scale.setScalar(ambientScale * scrollScale)
  })

  if (!texture) return null

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, -18]}>
      <meshBasicMaterial ref={materialRef} map={texture} color={dimColor} toneMapped={true} />
    </mesh>
  )
}
