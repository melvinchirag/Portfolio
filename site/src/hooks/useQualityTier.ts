import { useState } from 'react'

export type QualityTier = 'high' | 'mid' | 'low'

export type Quality = {
  tier: QualityTier
  /** Particle count. Fill rate, not vertex cost, is the limit here. */
  particleCount: number
  /** Clamped device pixel ratio for the canvas. */
  dpr: [number, number]
  /** Post-processing is the first thing to go on weak hardware. */
  postProcessing: boolean
}

// Counts pulled down hard from the first pass: a dense field fills every pixel
// and reads as a flat bright wall. Fewer particles leave real black voids
// between the bright filaments, which is where the depth and contrast come from.
const TIERS: Record<QualityTier, Omit<Quality, 'tier'>> = {
  high: { particleCount: 62_000, dpr: [1, 1.75], postProcessing: true },
  mid: { particleCount: 38_000, dpr: [1, 1.5], postProcessing: true },
  low: { particleCount: 18_000, dpr: [1, 1.25], postProcessing: false },
}

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'mid'

  // Touch-primary devices get the low tier — but still a real scene, never a
  // blank div or a substitute image.
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (coarse || window.innerWidth < 768) return 'low'

  // `deviceMemory` is Chromium-only; absence is not evidence of a weak machine.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency

  if ((memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4)) {
    return 'mid'
  }

  return 'high'
}

/**
 * Resolved once at startup rather than per-frame — a tier that flickers is
 * worse than a tier that is slightly wrong.
 */
export function useQualityTier(): Quality {
  const [quality] = useState<Quality>(() => {
    const tier = detectTier()
    return { tier, ...TIERS[tier] }
  })
  return quality
}
