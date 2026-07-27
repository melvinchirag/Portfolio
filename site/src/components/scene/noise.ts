/**
 * CPU-side value noise, used once at startup to sculpt the particle
 * distribution. This does not need to match the GLSL simplex noise that drives
 * drift at runtime — they do different jobs.
 *
 * Why this exists at all: uniformly random particle positions are the tell of a
 * cheap scene. Sampling against an fBm field produces clusters and voids, which
 * is what makes the field read as nebular structure rather than as dots.
 */

function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

const smooth = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = smooth(x - xi)
  const yf = smooth(y - yi)
  const zf = smooth(z - zi)

  const c000 = hash(xi, yi, zi)
  const c100 = hash(xi + 1, yi, zi)
  const c010 = hash(xi, yi + 1, zi)
  const c110 = hash(xi + 1, yi + 1, zi)
  const c001 = hash(xi, yi, zi + 1)
  const c101 = hash(xi + 1, yi, zi + 1)
  const c011 = hash(xi, yi + 1, zi + 1)
  const c111 = hash(xi + 1, yi + 1, zi + 1)

  const x00 = lerp(c000, c100, xf)
  const x10 = lerp(c010, c110, xf)
  const x01 = lerp(c001, c101, xf)
  const x11 = lerp(c011, c111, xf)

  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf)
}

/** Three octaves — enough structure to read as filamentary, cheap enough to run
 *  120k+ times during the loading sequence without a stall. */
export function fbm(x: number, y: number, z: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  let total = 0

  for (let i = 0; i < 3; i++) {
    value += amplitude * valueNoise(x * frequency, y * frequency, z * frequency)
    total += amplitude
    amplitude *= 0.5
    frequency *= 2.03
  }

  return value / total
}
