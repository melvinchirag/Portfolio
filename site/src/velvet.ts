/**
 * VELVET PREVIEW (2026-11-20). A try-on of Melvin's "royal velvet red and cream"
 * idea on the REAL site, switched by the address bar so the live look is untouched:
 *
 *   /?velvet=1  rich red   /?velvet=2  ember (towards orange)
 *   /?velvet=3  rose       /?velvet=4  ruby (cooler)
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
/** Light sheet colours: ground, far curtain, near curtain and glow, white-hot core. */
const RAMPS: Record<number, [V3, V3, V3, V3]> = {
  1: [[0.012, 0.002, 0.004], [0.3, 0.01, 0.025], [0.95, 0.05, 0.06], [0.96, 0.91, 0.82]], // rich red
  2: [[0.012, 0.003, 0.002], [0.35, 0.03, 0.01], [1.0, 0.16, 0.04], [1.0, 0.9, 0.7]], // ember, towards orange
  3: [[0.014, 0.004, 0.005], [0.3, 0.06, 0.06], [0.9, 0.3, 0.25], [1.0, 0.93, 0.84]], // rose
  4: [[0.01, 0.001, 0.004], [0.26, 0.005, 0.04], [0.85, 0.02, 0.09], [0.96, 0.91, 0.82]], // ruby, cooler
}
const VOIDS: Record<number, string> = { 1: '#070203', 2: '#070302', 3: '#080303', 4: '#060203' }

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
