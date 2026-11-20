/**
 * SPIKES: the shared ferrofluid spike model for every raymarched liquid on the
 * site (the menu drop in mercury.ts, the hero slime groups in slime.ts).
 *
 * Reference notes (Rosensweig normal-field instability, from the physics and
 * from photographs and videos of ferrofluid over a magnet):
 *  - Above a critical field the flat pool breaks into a regular HEXAGONAL array
 *    of sharp CONES. Pitch is fixed by the liquid (capillary length), not by the
 *    magnet; height grows with field strength: low field = wide shallow bumps,
 *    high field = tall slim cones (height about 1 to 1.5 times the pitch).
 *  - Spikes lean along the curving field lines: they tilt toward the magnet,
 *    more so the further out they stand.
 *  - At the edge of the field the cones shrink and merge into a smooth skirt;
 *    between cones the surface forms a concave fillet.
 *  - Switch the field on: the cones shoot up and overshoot a little; switch it
 *    off: they sag smoothly back into the rounded blob.
 *  - Liquid-metal look: razor highlights running up each flank, dark between.
 *
 * What this chunk does: a hex lattice anchored on the magnet (so the pattern is
 * symmetric under it). For a ray sample it finds the 4 lattice cells around the
 * point (the nearest three are always among them), builds one cone SDF per cell
 * (base radius 0.47 pitch, tip height from the local field through a threshold
 * so weak edge cells shrink to nothing), leans each cone toward the magnet, and
 * blends the nearest cone into the body with a smooth-min (that is the fillet).
 * Cones only grow where the plane they stand on is inside the body, so they
 * vanish at the rim like the skirt. A second magnet (the lagging drop) adds a
 * weaker field so spikes also bridge between two poles.
 *
 * Needs `smin` and the caller's body distance, passed in as `d` and `dPlane`
 * (the body distance at the point moved onto the mid plane z = 0, i.e. how deep
 * inside the outline it is; spikes fade in over u_spW of depth). The caller must
 * define `float bodyZ(vec2)` (height of the body's top surface at that xy)
 * BEFORE including this chunk; cones stand on that surface.
 */

export const SPIKE_UNIFORMS = ['u_sp', 'u_sp2', 'u_spk', 'u_spA', 'u_spS', 'u_spH', 'u_spR', 'u_spW', 'u_px'] as const

export const SPIKE_GLSL = /* glsl */ `
uniform vec2 u_sp; uniform vec2 u_sp2; uniform float u_spk; uniform float u_spA;
uniform float u_spS; uniform float u_spH; uniform float u_spR; uniform float u_spW; uniform float u_px;
float spHash(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
float spField(vec2 c){
  vec2 a = c - u_sp; float g = exp(-dot(a, a) / (u_spR * u_spR) * 1.4);
  vec2 b = c - u_sp2; g = max(g, u_spA * exp(-dot(b, b) / (u_spR * u_spR) * 1.4));
  return u_spk * g;
}
// One cone: tip toward the viewer (-z), standing on the plane z = u_spZ.
float spCone(vec3 p, vec2 c, vec2 id, float pres, float zb){
  float s = spField(c);
  float th = smoothstep(0.16, 0.62, s);
  if (th < 0.01) return 1e3;
  float P = u_spS;
  float H = u_spH * th * pres * (0.86 + 0.14 * spHash(id));
  float rb = 0.32 * P;
  vec2 toM = u_sp - c; float lm = length(toM) + 1e-4;
  vec2 o = toM / lm * H * 0.3 * smoothstep(0.0, u_spR, lm);   // lean toward the magnet
  o += vec2(0.0, 0.6 * H);                                    // oblique camera: tips rise up the screen
  float y = zb - p.z;                                          // height above the surface under the cone
  float yc = clamp(y / H, 0.0, 1.0);
  vec2 q = vec2(length(p.xy - c - o * yc), y);
  vec2 e = vec2(rb, 0.0); vec2 ab = vec2(-rb, H);
  float t = clamp(dot(q - e, ab) / dot(ab, ab), 0.0, 1.0);
  float d = length(q - (e + ab * t));
  float dl = dot(q - e, normalize(vec2(H, rb)));
  d = dl > 0.0 ? d : dl;
  d = max(d, -y - 0.3 * H);                                    // no cone below the plane
  return d - u_px * 0.45;                                      // razor tip, not sub-pixel
}
float spikes(vec3 p, float d, float dPlane){
  if (u_spk < 0.005) return d;
  float pres = smoothstep(0.5 * u_spW, 1.5 * u_spW, -dPlane);
  if (pres < 0.01) return d;
  float zb = -bodyZ(p.xy) * 0.97;                                // the body's surface depth under this point
  vec2 rr = p.xy - u_sp;
  float b = rr.y / (u_spS * 0.8660254); float a = rr.x / u_spS - 0.5 * b;
  vec2 base = floor(vec2(a, b));
  float ds = 1e3;
  for (int i = 0; i < 4; i++) {
    vec2 cell = base + vec2(mod(float(i), 2.0), floor(float(i) / 2.0));
    vec2 c = u_sp + vec2(cell.x + 0.5 * cell.y, cell.y * 0.8660254) * u_spS;
    ds = min(ds, spCone(p, c, cell, pres, zb));
  }
  return smin(d, ds, 0.2 * u_spS);
}
`

/** Underdamped on the way up (a little overshoot, like the cones shooting up),
 *  critically damped on the way down (a smooth collapse). */
export function spikeSpring(s: { x: number; v: number }, target: number, dt: number) {
  const up = target > s.x
  const K = up ? 95 : 30
  const C = up ? 8.5 : 11
  const n = Math.max(1, Math.ceil(dt / 0.008))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (K * (target - s.x) - C * s.v) * h
    s.x += s.v * h
  }
  if (s.x < 0) {
    s.x = 0
    s.v = 0
  }
}
