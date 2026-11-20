/**
 * VELVET PREVIEW (2026-11-20). A try-on of Melvin's "royal velvet red and cream"
 * idea on the REAL site, switched by the address bar so the live look is untouched:
 *
 *   /?velvet=1  royal velvet        /?velvet=2  oxblood and cream
 *   /?velvet=3  burgundy, rose gold /?velvet=4  black velvet (darkest)
 *   /?velvet=0  back to graphite and sand
 *
 * The choice is remembered for the tab (sessionStorage) so moving between pages
 * keeps it. Nothing here runs when the value is 0.
 */
function read(): number {
  try {
    const q = new URLSearchParams(window.location.search).get('velvet')
    if (q !== null) {
      const n = Math.max(0, Math.min(4, parseInt(q, 10) || 0))
      sessionStorage.setItem('velvet', String(n))
      return n
    }
    return parseInt(sessionStorage.getItem('velvet') || '0', 10) || 0
  } catch {
    return 0
  }
}

export const velvet = typeof window === 'undefined' ? 0 : read()

type V3 = [number, number, number]
/** Ribbon colours: ground, shadowed cloth, lit cloth, and the satin sheen. */
const RAMPS: Record<number, [V3, V3, V3, V3]> = {
  // Darkened 2026-11-20 (Melvin: "can the royal velvet be darker"). 4 is darker still.
  // Rich true red, not wine (Melvin, 2026-11-20): almost no blue in the cloth.
  1: [[0.022, 0.003, 0.005], [0.16, 0.006, 0.012], [0.6, 0.018, 0.03], [0.96, 0.91, 0.82]],
  4: [[0.008, 0.001, 0.002], [0.09, 0.003, 0.007], [0.5, 0.014, 0.024], [0.96, 0.91, 0.82]],
  2: [[0.03, 0.006, 0.012], [0.11, 0.01, 0.028], [0.28, 0.022, 0.05], [1.0, 0.97, 0.9]],
  3: [[0.055, 0.014, 0.022], [0.2, 0.03, 0.055], [0.44, 0.07, 0.1], [0.95, 0.72, 0.55]],
}
const VOIDS: Record<number, string> = { 1: '#0b0304', 2: '#0b0305', 3: '#16070a', 4: '#060202' }

export const velvetRamp = RAMPS[velvet] ?? RAMPS[1]
/** The ground colour: graphite normally, deep wine in velvet. */
export const groundHex = velvet ? VOIDS[velvet] : '#0f1012'

/** A particle or glyph colour: sand normally, cream in velvet. */
export function lightHex(sandHex: string): string {
  return velvet ? '#f3e9d2' : sandHex
}

/** The light as an "r, g, b" triple for canvas rgba(). */
export const lightRgb = velvet ? '243, 233, 210' : '205, 183, 138'

/** The liquid (menu, buttons, MELVIN title) colours, as GLSL. */
export const FLUID = velvet
  ? {
      deep: 'vec3(0.52, 0.36, 0.33)',
      body: 'vec3(0.953, 0.914, 0.824)',
      light: 'vec3(1.0, 0.97, 0.90)',
      cap: 'vec3(1.0, 0.98, 0.93)',
    }
  : {
      deep: 'vec3(0.40, 0.35, 0.25)',
      body: 'vec3(0.804, 0.718, 0.541)',
      light: 'vec3(0.90, 0.83, 0.66)',
      cap: 'vec3(0.93, 0.86, 0.70)',
    }

if (velvet && typeof document !== 'undefined') {
  document.documentElement.dataset.velvet = String(velvet)
  document.documentElement.style.setProperty('--velvet-void', groundHex)
}
