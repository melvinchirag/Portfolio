/**
 * FERRO: the engine behind the hero's liquid MELVIN (Melvin, 2026-11-20: "what
 * if the entire thing was just ferrofluid, and I could move over it and the
 * liquid separates and comes back").
 *
 * HOW IT WORKS (and why it is not a fluid sim): a first attempt simulated the
 * thickness and flow on the GPU (ping-pong textures, pressure, advection). On
 * collocated grids that went grainy (odd/even noise) wherever the pointer
 * shoved hard. So the liquid is now an exact, noise-free MAP instead:
 *
 *   Each pointer "dent" pushes the liquid out of a disc with the area-keeping
 *   radial map  r1^2 = r0^2 + a^2 * exp(-(r0/c)^2),  c = 1.6a.
 *   The centre (r0 = 0) lands on the hole's rim (r1 = a), so a disc of radius a
 *   is emptied, and the squeeze just outside (Jacobian 1 - (a/c)^2 * e < 1)
 *   piles the liquid into a thicker rim. The renderer inverts that map per
 *   pixel (5 fixed-point steps; it converges because (a/c)^2 < 1) and looks the
 *   resulting point up in the hi-res text mask, so the silhouette is the real
 *   font at rest and the deformed font in motion, always crisp.
 *
 *   A short trail of dents (newest at the pointer, older ones left behind)
 *   composes into a channel that follows the pointer. Each dent's strength s is
 *   a spring: it opens fast while the pointer is near and closes slowly (a
 *   little springy, like surface tension pulling the liquid back) after it
 *   leaves, so the word flows back together. The maps compose, so the liquid
 *   never tears or overlaps.
 *
 * SPIKES (Rosensweig instability, see spikes.ts for the reference notes): each dent
 * is also a magnet whose strength springs up with overshoot and sags back smoothly.
 * The summed field (texture alpha) decides which cells of a hex cone lattice exist
 * and how tall; a gradient pass gives the field-line direction so cones lean toward
 * the magnet. The cones are rendered as a height field seen through an oblique
 * camera (screen y = y + k z, ray-marched 16 steps, only where the field is on), so
 * tips rise above the letters and the silhouette really spikes, with true normals.
 *
 * DRAW: the warped coverage is rendered at a low-res (sim) size, blurred by two
 * 13-tap passes into a soft dome, and the surface normal comes from that dome
 * (taller where the liquid is squeezed) plus the cones. Shading is the site's: Blinn-Phong 36,
 * fresnel, one hue (deep, sand, light), see mercury.ts and slime.ts. Spikes also
 * push the silhouette outward at the rim so they poke out. Premultiplied alpha.
 *
 * Units: CSS pixels inside the canvas (y up in shaders), ems of the name's font
 * size for sizes, so the look does not depend on screen size.
 */

import { spikeSpring } from './spikes'

export const TUNING = {
  /** Radius of the hole under the pointer, in ems of the name's font size. */
  holeRadiusEm: 0.26,
  /** Distance the pointer travels before the current dent is left behind. */
  trailSpacingEm: 0.1,
  /** Opening spring (fast, stiff) while the pointer is near. */
  openStiffness: 120,
  openDamping: 20,
  /** Closing spring after the pointer leaves: lower = slower, thicker liquid.
   *  Damping a bit under critical (2*sqrt(k) = 8.9) gives a small settle. */
  closeStiffness: 20,
  closeDamping: 7.2,
  /** Radius of the spike zone around each dent, in ems. */
  spikeZoneEm: 0.85,
  /** Spike height as a fraction of the font size. */
  spikeHeightEm: 0.15,
  /** Hex spike spacing as a fraction of the font size. */
  spikePitchEm: 0.11,
  /** Oblique camera: how far a spike tip rises up the screen per unit of height. */
  spikeTilt: 0.6,
  /** Dome height of the letters as a fraction of the font size. */
  domeEm: 0.16,
  /** Sim (low-res field) width in cells: desktop, and coarse pointer (phone). */
  simWidth: 640,
  simWidthTouch: 440,
} as const

/** Max dents alive at once (the newest follows the pointer). Keep in sync with
 *  ND in the shaders. */
const ND = 12

export type FerroPointer = {
  /** Pointer position in CSS px inside the canvas, y DOWN. */
  x: number
  y: number
  active: boolean
}

export type Ferro = {
  /** (Re)build the field from a text mask drawn at device resolution. */
  setShape: (mask: HTMLCanvasElement, cssW: number, cssH: number, em: number, simW: number) => boolean
  /** Advance the dents by `dt` seconds and draw. */
  frame: (dt: number, time: number, pointer: FerroPointer) => void
  /** Draw the resting word once (reduced motion, or a refresh). */
  draw: (time: number) => void
  dispose: () => void
  /** True while any dent is still open (the word is not at rest). */
  readonly busy: boolean
  /** True after the context was lost and before it is rebuilt. */
  readonly lost: boolean
}

const VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`

const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
out vec4 o;
`

/** Shared GLSL: the inverse of the dent maps. */
const WARP = `
const int ND = ${ND};
uniform vec4 uD[ND]; // x, y (css px, y up), a (hole radius px), s (strength)
// Where did the liquid at q come from? gain = how much it was squeezed (thickness).
vec2 invWarp(vec2 q, out float gain, out float hole){
  gain = 1.0; hole = 0.0;
  for (int i = ND - 1; i >= 0; i--) {
    float a = uD[i].z; if (a < 0.4) continue;
    vec2 dv = q - uD[i].xy; float r1 = length(dv);
    if (r1 <= a) { hole = 1.0; gain = 1.0; return q; }
    float c2 = 2.56 * a * a; float r0 = r1;
    for (int k = 0; k < 5; k++) { r0 = sqrt(max(r1 * r1 - a * a * exp(-(r0 * r0) / c2), 1e-3)); }
    float e = exp(-(r0 * r0) / c2);
    gain *= 1.0 / max(1.0 - a * a * e / c2, 0.4);
    q = uD[i].xy + dv / r1 * r0;
  }
  gain = min(gain, 1.8);
  return q;
}
`

const FS_WARP = `${HEAD}
uniform sampler2D uT; uniform vec2 uRes; uniform vec2 uCss; uniform float uZone; ${WARP}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 q = uv * uCss;
  float gain; float hole; vec2 q0 = invWarp(q, gain, hole);
  float c = hole > 0.5 ? 0.0 : texture(uT, q0 / uCss).r;
  float A = 0.0;
  for (int i = 0; i < ND; i++) {
    if (uD[i].w < 0.005) continue;
    vec2 d = q - uD[i].xy;
    A += uD[i].w * exp(-dot(d, d) / (uZone * uZone) * 1.1);
  }
  o = vec4(c, gain, 0.0, min(A, 1.0));
}`

const FS_BLUR = `${HEAD}
uniform sampler2D uSrc; uniform vec2 uStep;
void main(){
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(uSrc, 0));
  float acc = 0.0; float ws = 0.0;
  for (int i = -6; i <= 6; i++) {
    float w = exp(-float(i * i) / 12.5);
    acc += w * texture(uSrc, uv + uStep * float(i)).r; ws += w;
  }
  o = vec4(acc / ws, 0.0, 0.0, 1.0);
}`

const FS_GRAD = `${HEAD}
uniform sampler2D uSrc;
void main(){
  vec2 px = 1.0 / vec2(textureSize(uSrc, 0)); vec2 uv = gl_FragCoord.xy * px;
  float l = texture(uSrc, uv - vec2(px.x * 3.0, 0.0)).a; float r = texture(uSrc, uv + vec2(px.x * 3.0, 0.0)).a;
  float d = texture(uSrc, uv - vec2(0.0, px.y * 3.0)).a; float t = texture(uSrc, uv + vec2(0.0, px.y * 3.0)).a;
  o = vec4((r - l) / 6.0, (t - d) / 6.0, 0.0, 1.0);
}`

const FS_DRAW = `${HEAD}
uniform sampler2D uS; uniform sampler2D uB; uniform sampler2D uThi; uniform sampler2D uL;
uniform vec2 uCss; uniform float uTime; uniform float uStill;
uniform float uDome; uniform float uSpH; uniform float uPitch; uniform float uK;
${WARP}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Height (css px) of the hex cone array at x. Lattice fixed to the canvas, so spikes
// stay put while the pointer moves; the field (texture A) decides which cones exist.
float coneH(vec2 x){
  float P = uPitch;
  float b = x.y / (P * 0.8660254); float a = x.x / P - 0.5 * b;
  vec2 base = floor(vec2(a, b));
  float best = 0.0; float rb = 0.32 * P;
  for (int i = 0; i < 4; i++) {
    vec2 cell = base + vec2(mod(float(i), 2.0), floor(float(i) / 2.0));
    vec2 c = vec2(cell.x + 0.5 * cell.y, cell.y * 0.8660254) * P;
    vec2 cuv = c / uCss;
    float s = texture(uS, cuv).a;
    float th = smoothstep(0.16, 0.62, s) * smoothstep(0.35, 0.6, texture(uB, cuv).r);
    if (th < 0.01) continue;
    float H = uSpH * th * (0.86 + 0.14 * hash(cell));
    vec2 g = texture(uL, cuv).rg; float gl = length(g);
    vec2 lean = g / max(gl, 1e-5) * smoothstep(0.0003, 0.003, gl);   // field lines bend toward the magnet
    float t0 = max(0.0, 1.0 - length(x - c) / rb);
    float r = length(x - c - lean * H * 0.16 * t0);
    best = max(best, H * max(0.0, 1.0 - r / rb));
  }
  return best;
}
float domeH(vec2 uv){
  vec4 st = texture(uS, uv);
  float b = texture(uB, uv).r;
  vec2 q = uv * uCss;
  float dome = pow(clamp(b, 0.0, 1.0), 0.8) * uDome * st.g;
  float rip = (1.0 - uStill) * 1.1 * sin(q.x * 0.05 + uTime * 1.2) * sin(q.y * 0.07 - uTime * 0.9) * b;
  return dome + rip;
}
float totalH(vec2 q, float spikesOn){ return domeH(q / uCss) + spikesOn * coneH(q); }
vec3 shade(vec3 n, vec3 V){
  vec3 L = normalize(vec3(0.35, 0.75, 0.6)); vec3 H = normalize(L + V);
  float dif = max(dot(n, L), 0.0) * 0.6 + 0.4;
  float nh = max(dot(n, H), 0.0);
  float spec = pow(nh, 36.0) * 0.4 + pow(nh, 160.0) * 0.5;
  float fre = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.45;
  vec3 deep = vec3(0.40, 0.35, 0.25); vec3 sand = vec3(0.804, 0.718, 0.541); vec3 light = vec3(0.90, 0.83, 0.66);
  return min(mix(deep, sand, dif) + light * spec + light * fre, vec3(0.93, 0.86, 0.70));
}
void main(){
  // gl_FragCoord is in device px; the hi-res mask has the canvas's own size.
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(uThi, 0));
  vec2 q = uv * uCss;
  float gain; float hole; vec2 q0 = invWarp(q, gain, hole);
  float F = hole > 0.5 ? 0.0 : texture(uThi, q0 / uCss).r;
  float fw = max(fwidth(F), 0.05);
  float alF = clamp((F - 0.5) / fw + 0.5, 0.0, 1.0);

  // Spike layer: oblique camera (screen y = y + k z). March down from the top of the
  // tallest possible spike until the pixel's ray meets a cone.
  float zHit = 0.0; vec2 pHit = q; bool hit = false;
  float on = 1.0 - uStill;
  float aMax = max(texture(uS, uv).a, texture(uS, uv - vec2(0.0, uK * uSpH / uCss.y)).a);
  aMax = max(aMax, texture(uS, uv - vec2(0.0, 0.5 * uK * uSpH / uCss.y)).a);
  if (on > 0.5 && aMax > 0.12) {
    const int N = 16;
    float prevZ = uSpH; float prevD = -1.0;
    for (int i = 0; i < N; i++) {
      float z = uSpH * (1.0 - float(i) / float(N));
      vec2 p = vec2(q.x, q.y - uK * z);
      float d = coneH(p) - z;
      if (d >= 0.0) {
        float w = (i == 0) ? 1.0 : clamp(-prevD / max(d - prevD, 1e-4), 0.0, 1.0);
        zHit = mix(prevZ, z, w);
        pHit = vec2(q.x, q.y - uK * zHit);
        hit = true;
        break;
      }
      prevZ = z; prevD = d;
    }
  }

  vec3 colF = vec3(0.0);
  if (alF > 0.001) {
    float e = 1.4; vec2 dx = vec2(e, 0.0); vec2 dy = vec2(0.0, e);
    float gx = (totalH(q + dx, 0.0) - totalH(q - dx, 0.0)) / (2.0 * e);
    float gy = (totalH(q + dy, 0.0) - totalH(q - dy, 0.0)) / (2.0 * e);
    colF = shade(normalize(vec3(-gx, -gy, 1.0)), vec3(0.0, 0.0, 1.0));
  }
  float al = alF; vec3 col = colF;
  if (hit) {
    float e = 0.6; vec2 dx = vec2(e, 0.0); vec2 dy = vec2(0.0, e);
    float gx = (totalH(pHit + dx, 1.0) - totalH(pHit - dx, 1.0)) / (2.0 * e);
    float gy = (totalH(pHit + dy, 1.0) - totalH(pHit - dy, 1.0)) / (2.0 * e);
    vec3 colC = shade(normalize(vec3(-gx, -gy, 1.0)), normalize(vec3(0.0, -uK, 1.0)));
    float w = smoothstep(0.15, 1.2, zHit);
    col = alF > 0.001 ? mix(colF, colC, w) : colC;
    al = max(alF, w);
  }
  if (al <= 0.001) { o = vec4(0.0); return; }
  o = vec4(col * al, al);
}`

type Tex = { t: WebGLTexture; w: number; h: number }
type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }
type Dent = { x: number; y: number; s: number; v: number; m: number; mv: number; open: boolean }

/** Returns null when WebGL2 or float render targets are unavailable. */
export function createFerro(canvas: HTMLCanvasElement): Ferro | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  })
  if (!gl) return null
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null

  let lost = false
  let progs: { warp: Prog; blur: Prog; grad: Prog; draw: Prog } | null = null
  let vao: WebGLVertexArrayObject | null = null
  let fbo: WebGLFramebuffer | null = null
  let field: Tex | null = null
  let blurTmp: Tex | null = null
  let blurOut: Tex | null = null
  let lean: Tex | null = null
  let tSim: Tex | null = null
  let tHi: Tex | null = null
  let simW = 0
  let simH = 0
  let cssW = 1
  let cssH = 1
  let em = 100
  // Dents, oldest first. The last one follows the pointer while it is near.
  let dents: Dent[] = []
  let spawnX = 0
  let spawnY = 0
  const uD = new Float32Array(ND * 4)

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[ferro]', gl.getShaderInfoLog(s))
      gl.deleteShader(s)
      return null
    }
    return s
  }
  const program = (fsSrc: string, names: string[]): Prog | null => {
    const vs = compile(gl.VERTEX_SHADER, VS)
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[ferro]', gl.getProgramInfoLog(p))
      return null
    }
    const u: Prog['u'] = {}
    for (const n of names) u[n] = gl.getUniformLocation(p, n)
    return { p, u }
  }

  const makeFloatTex = (w: number, h: number): Tex | null => {
    const t = gl.createTexture()
    if (!t) return null
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return { t, w, h }
  }
  const makeImageTex = (src: HTMLCanvasElement): Tex | null => {
    const t = gl.createTexture()
    if (!t) return null
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return { t, w: src.width, h: src.height }
  }
  const free = (t: Tex | null) => {
    if (t) gl.deleteTexture(t.t)
  }
  const bind = (unit: number, t: Tex) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t.t)
  }
  const target = (t: Tex | null) => {
    if (!t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      return
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.t, 0)
    gl.viewport(0, 0, t.w, t.h)
  }
  const tri = () => gl.drawArrays(gl.TRIANGLES, 0, 3)

  const buildPrograms = () => {
    const warp = program(FS_WARP, ['uT', 'uRes', 'uCss', 'uZone', 'uD'])
    const blur = program(FS_BLUR, ['uSrc', 'uStep'])
    const grad = program(FS_GRAD, ['uSrc'])
    const draw = program(FS_DRAW, ['uS', 'uB', 'uThi', 'uL', 'uCss', 'uTime', 'uStill', 'uDome', 'uSpH', 'uPitch', 'uK', 'uD'])
    if (!warp || !blur || !grad || !draw) return false
    progs = { warp, blur, grad, draw }
    vao = gl.createVertexArray()
    fbo = gl.createFramebuffer()
    return true
  }

  const releaseTextures = () => {
    free(field)
    free(blurTmp)
    free(blurOut)
    free(lean)
    free(tSim)
    free(tHi)
    field = blurTmp = blurOut = lean = tSim = tHi = null
  }

  let lastMask: HTMLCanvasElement | null = null
  let lastArgs: [number, number, number, number] | null = null

  const setShape: Ferro['setShape'] = (mask, w, h, emPx, sw) => {
    if (lost || !progs) return false
    lastMask = mask
    // The span can be zero-sized (hidden, mid-pan, fonts not in yet): nothing to rasterise.
    if (!(mask.width > 0 && mask.height > 0 && w > 0 && h > 0)) return false
    lastArgs = [w, h, emPx, sw]
    releaseTextures()
    cssW = w
    cssH = h
    em = emPx
    simW = Math.max(16, Math.round(sw))
    simH = Math.max(16, Math.round((sw * h) / w))
    dents = []
    // Sim-resolution copy of the mask (browser downsampling is good quality).
    const small = document.createElement('canvas')
    small.width = simW
    small.height = simH
    const sctx = small.getContext('2d')
    if (!sctx) return false
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(mask, 0, 0, simW, simH)
    tSim = makeImageTex(small)
    tHi = makeImageTex(mask)
    field = makeFloatTex(simW, simH)
    blurTmp = makeFloatTex(simW, simH)
    blurOut = makeFloatTex(simW, simH)
    lean = makeFloatTex(simW, simH)
    if (!tSim || !tHi || !field || !blurTmp || !blurOut || !lean) return false
    gl.bindVertexArray(vao)
    buildField()
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('[ferro] float render target incomplete')
      return false
    }
    return true
  }

  const uploadDents = (loc: WebGLUniformLocation | null) => {
    uD.fill(0)
    const aMax = TUNING.holeRadiusEm * em
    const n = Math.min(ND, dents.length)
    for (let i = 0; i < n; i++) {
      const d = dents[dents.length - n + i]
      // shader y is up
      uD[i * 4] = d.x
      uD[i * 4 + 1] = cssH - d.y
      uD[i * 4 + 2] = d.s > 0.003 ? aMax * Math.min(1, d.s) : 0
      uD[i * 4 + 3] = Math.min(1.4, d.m)
    }
    gl.uniform4fv(loc, uD)
  }

  /** Warp pass at sim res, then two blur passes. */
  const buildField = () => {
    if (!progs || !field || !blurTmp || !blurOut || !lean || !tSim) return
    const W = progs.warp
    gl.useProgram(W.p)
    target(field)
    bind(0, tSim)
    gl.uniform1i(W.u.uT, 0)
    gl.uniform2f(W.u.uRes, simW, simH)
    gl.uniform2f(W.u.uCss, cssW, cssH)
    gl.uniform1f(W.u.uZone, TUNING.spikeZoneEm * em)
    uploadDents(W.u.uD)
    tri()
    const G = progs.grad
    gl.useProgram(G.p)
    target(lean)
    bind(0, field)
    gl.uniform1i(G.u.uSrc, 0)
    tri()
    const B = progs.blur
    gl.useProgram(B.p)
    gl.uniform1i(B.u.uSrc, 0)
    // Spacing 2 cells, so the 13 taps reach about +-12 cells (sigma ~ 5).
    target(blurTmp)
    bind(0, field)
    gl.uniform2f(B.u.uStep, 2 / simW, 0)
    tri()
    target(blurOut)
    bind(0, blurTmp)
    gl.uniform2f(B.u.uStep, 0, 2 / simH)
    tri()
  }

  const drawToScreen = (time: number, still: boolean) => {
    if (!progs || !field || !blurOut || !lean || !tHi) return
    const P = progs.draw
    gl.bindVertexArray(vao)
    gl.useProgram(P.p)
    target(null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    bind(0, field)
    bind(1, blurOut)
    bind(2, tHi)
    bind(3, lean)
    gl.uniform1i(P.u.uL, 3)
    gl.uniform1i(P.u.uS, 0)
    gl.uniform1i(P.u.uB, 1)
    gl.uniform1i(P.u.uThi, 2)
    gl.uniform2f(P.u.uCss, cssW, cssH)
    gl.uniform1f(P.u.uTime, time)
    gl.uniform1f(P.u.uStill, still ? 1 : 0)
    gl.uniform1f(P.u.uDome, TUNING.domeEm * em)
    gl.uniform1f(P.u.uSpH, TUNING.spikeHeightEm * em)
    gl.uniform1f(P.u.uPitch, TUNING.spikePitchEm * em)
    gl.uniform1f(P.u.uK, TUNING.spikeTilt)
    uploadDents(P.u.uD)
    tri()
  }

  const rebuild = () => {
    releaseTextures()
    progs = null
    if (!buildPrograms()) return
    if (lastMask && lastArgs) setShape(lastMask, ...lastArgs)
  }

  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
  }
  const onRestored = () => {
    lost = false
    rebuild()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  if (!buildPrograms()) {
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    return null
  }

  /** Springs: open fast while the pointer is near, close slowly after. */
  const stepDents = (dt: number, p: FerroPointer) => {
    const sub = Math.max(1, Math.ceil(dt / 0.008))
    const h = dt / sub
    // Head dent: follows the pointer while it is near the word.
    const head = dents[dents.length - 1]
    if (p.active) {
      if (!head || !head.open) {
        dents.push({ x: p.x, y: p.y, s: 0, v: 0, m: 0, mv: 0, open: true })
        spawnX = p.x
        spawnY = p.y
      } else {
        head.x = p.x
        head.y = p.y
        // Leave a dent behind once the pointer has travelled far enough.
        const dx = p.x - spawnX
        const dy = p.y - spawnY
        if (Math.hypot(dx, dy) > TUNING.trailSpacingEm * em) {
          head.open = false
          dents.push({ x: p.x, y: p.y, s: head.s, v: head.v * 0.4, m: head.m, mv: head.mv, open: true })
          spawnX = p.x
          spawnY = p.y
        }
      }
    } else if (head?.open) {
      head.open = false
    }
    for (const d of dents) {
      const k = d.open ? TUNING.openStiffness : TUNING.closeStiffness
      const c = d.open ? TUNING.openDamping : TUNING.closeDamping
      const tgt = d.open ? 1 : 0
      for (let i = 0; i < sub; i++) {
        d.v += ((tgt - d.s) * k - d.v * c) * h
        d.s += d.v * h
        if (d.s < 0) {
          d.s = 0
          d.v = 0
        }
      }
    }
    for (const d of dents) {
      const ms = { x: d.m, v: d.mv }
      spikeSpring(ms, d.open ? 1.15 : 0, dt)
      d.m = ms.x
      d.mv = ms.v
    }
    // Drop the dead, and the oldest if there are too many.
    dents = dents.filter((d) => d.open || d.s > 0.004 || d.v > 0.01 || d.m > 0.01)
    if (dents.length > ND) dents.splice(0, dents.length - ND)
  }

  return {
    setShape,
    frame(dt, time, pointer) {
      if (lost || !progs) return
      gl.bindVertexArray(vao)
      stepDents(Math.min(0.1, dt), pointer)
      buildField()
      drawToScreen(time, false)
    },
    draw(time) {
      if (lost || !progs) return
      dents = []
      gl.bindVertexArray(vao)
      buildField()
      drawToScreen(time, true)
    },
    dispose() {
      // Do NOT loseContext() here: React StrictMode mounts, unmounts and
      // remounts the effect on the same <canvas>, and a lost context stays
      // lost for the remount (every compile then fails).
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      releaseTextures()
      if (progs) for (const p of Object.values(progs)) gl.deleteProgram(p.p)
      progs = null
      if (vao) gl.deleteVertexArray(vao)
      if (fbo) gl.deleteFramebuffer(fbo)
    },
    get busy() {
      return dents.length > 0
    },
    get lost() {
      return lost
    },
  }
}
