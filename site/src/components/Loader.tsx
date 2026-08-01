/* ============================================================================
 * Loader.tsx — "Neural ignition": the opening sequence
 * ----------------------------------------------------------------------------
 * WHAT THIS FILE DOES
 * The first thing anyone sees. In black space, neuron cell bodies ignite in a
 * cascade, grow dendrites, and reach out to connect with each other — rendered
 * as science-fiction VFX. It then dissolves to reveal the hero.
 *
 * APPROVED 2026-07-25 — do not restyle without Melvin re-opening it.
 * Reference build: https://claude.ai/code/artifact/2152b364-4b6c-49c7-9e3b-a5afd8ba0916
 *
 * ART DIRECTION — and why it finally worked
 * The brief was "photorealistic neurons, but cinematic — Marvel / Nolan", and
 * explicitly NOT microscope-accurate: the read should be "there's a cell, it
 * looks like a neuron, and it just made a connection", styled as sci-fi.
 *
 * FOUR earlier attempts were rejected as looking like a microscope or CT scan.
 * All four were 2D canvas LINE DRAWINGS, and that was the root cause — flat
 * line art reads as a diagram no matter how it is graded. What makes VFX look
 * like VFX, and what this build does instead:
 *
 *   VOLUMETRIC   dendrites are thousands of overlapping soft glowing sprites
 *                that accumulate into tubes with real mass; cell bodies are
 *                dense spheres of points. Never wireframe.
 *   REAL BLOOM   bright-pass -> two blur scales -> composite. The single
 *                biggest reason CGI looks like CGI, and impossible in canvas 2D.
 *   REAL 3D      perspective projection with a camera pushing through the
 *                network, so cells parallax and sweep past.
 *   ATMOSPHERE   depth fog plus suspended dust motes, for scale and depth.
 *   FILMIC       ACES-style tone mapping (highlights roll off instead of
 *                clipping), chromatic aberration on the bloom, lifted cool
 *                black point, vignette, grain.
 *
 * Palette is a deliberate call: cool electric blue dendrites, WARM GOLD cell
 * bodies, near-white at the instant energy arrives. Straight blue-on-black is
 * the generic sci-fi cliché; the warm/cool split is what reads as art-directed.
 *
 * WHY CODE, NOT A GENERATED VIDEO: precise timing and a seamless dissolve into
 * the LIVE hero (a video can only hard-cut), a few KB instead of megabytes that
 * must download before they can cover the load, a different network every
 * visit, and it fills any screen crisply. See docs/CODEBASE.md §7c.
 *
 * Plays once per tab session, skippable (click / key / scroll), and skipped
 * entirely under reduced motion. All timing/look values live in CONFIG.
 * ========================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { markIntroReady } from '../hooks/heroIntro'

const SESSION_KEY = 'melvin:seen-intro'

const CONFIG = {
  totalMs: 5200, // full sequence length
  fadeMs: 900, // the dissolve at the end, revealing the hero
  unmountMs: 500, // extra time for the DOM fade before we tear down
  somaCount: 16,
  dustCount: 1400,
  bloomThreshold: 0.34,
  fov: 48,
}

/* ------------------------------------------------------------------ shaders */

const POINT_VS = `
  precision highp float;
  attribute vec3 aPos;
  attribute float aSize;   // base radius
  attribute float aBirth;  // seconds when this point appears
  attribute float aBright; // base brightness
  attribute float aAlong;  // 0..1 along its branch, drives travelling pulses
  attribute float aSeed;
  attribute float aType;   // 0 dendrite, 1 soma, 2 synapse, 3 dust

  uniform mat4 uView, uProj;
  uniform float uTime, uFocal, uFade;

  varying vec3  vCol;
  varying float vAlpha;
  varying float vHot;

  void main () {
    // Appear with a fast ease, then a bright FLASH that decays — energy
    // arriving, rather than a shape fading in.
    float age = uTime - aBirth;
    float appear = clamp(age / 0.28, 0.0, 1.0);
    appear = appear * appear * (3.0 - 2.0 * appear);
    float flash = exp(-max(age, 0.0) * 4.5);

    vec4 viewPos = uView * vec4(aPos, 1.0);
    float dist = -viewPos.z;

    // Travelling signal: a sharp pulse racing along each branch.
    float wave = sin((aAlong * 2.4 - uTime * 1.15 + aSeed * 6.283) * 3.14159);
    float pulse = pow(max(wave, 0.0), 26.0);

    // Cell bodies breathe slowly so the frame is never static.
    float breathe = aType > 0.5 && aType < 1.5 ? (1.0 + sin(uTime * 2.0 + aSeed * 6.283) * 0.16) : 1.0;

    // Atmospheric depth: distant structure sinks into haze.
    float fog = clamp(1.0 - (dist - 18.0) / 78.0, 0.0, 1.0);
    fog = pow(fog, 1.5);

    gl_Position = uProj * viewPos;
    float size = aSize * appear * breathe * (1.0 + flash * 1.6 + pulse * 1.1);
    gl_PointSize = clamp(size * uFocal / max(dist, 0.6), 0.0, 240.0);
    if (dist <= 0.4 || age < 0.0) gl_PointSize = 0.0;

    vec3 dendrite = vec3(0.30, 0.58, 1.00);
    vec3 soma     = vec3(1.00, 0.78, 0.44);
    vec3 synapse  = vec3(0.55, 0.85, 1.00);
    vec3 dust     = vec3(0.55, 0.68, 0.90);
    vec3 base = dendrite;
    if (aType > 0.5 && aType < 1.5) base = soma;
    else if (aType > 1.5 && aType < 2.5) base = synapse;
    else if (aType > 2.5) base = dust;

    float hot = clamp(flash * 1.3 + pulse * 0.9, 0.0, 1.0);
    vCol = mix(base, vec3(1.0, 0.97, 0.92), hot);
    vHot = hot;
    vAlpha = aBright * appear * fog * uFade * (0.55 + hot * 0.9);
  }`

const POINT_FS = `
  precision highp float;
  varying vec3 vCol;
  varying float vAlpha;
  varying float vHot;
  void main () {
    // Soft volumetric falloff — a gaussian-ish core, so overlapping sprites
    // accumulate into MASS instead of reading as discrete dots.
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float f = exp(-r2 * 11.0) - exp(-2.75);
    f = max(f, 0.0) * 1.12;
    // A tighter inner core keeps bright points from looking like fuzzy blobs.
    float core = exp(-r2 * 46.0) * (0.35 + vHot * 0.9);
    gl_FragColor = vec4(vCol * (f + core) * vAlpha, 1.0);
  }`

const QUAD_VS = `
  precision highp float;
  attribute vec2 aP;
  varying vec2 vUv;
  void main () { vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`

const BRIGHT_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uThreshold;
  void main () {
    vec3 c = texture2D(uTex, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = max(l - uThreshold, 0.0) / max(l, 0.0001);
    gl_FragColor = vec4(c * k, 1.0);
  }`

const BLUR_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uDir;
  void main () {
    // 9-tap gaussian.
    vec3 s = texture2D(uTex, vUv).rgb * 0.2270270270;
    s += texture2D(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    s += texture2D(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(s, 1.0);
  }`

const COMPOSITE_FS = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene, uBloom1, uBloom2;
  uniform float uTime, uFade;
  void main () {
    // Chromatic aberration on the bloom only — lens character without
    // smearing the sharp structure.
    vec2 d = vUv - 0.5;
    float ca = 0.0032;
    vec3 b1;
    b1.r = texture2D(uBloom1, vUv + d * ca).r;
    b1.g = texture2D(uBloom1, vUv).g;
    b1.b = texture2D(uBloom1, vUv - d * ca).b;
    vec3 b2 = texture2D(uBloom2, vUv).rgb;

    vec3 scene = texture2D(uScene, vUv).rgb;
    vec3 col = scene + b1 * 1.15 + b2 * 0.85;

    // ACES-ish filmic tone map: highlights roll off instead of clipping flat.
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

    // Lifted, slightly cool black point — pure #000 reads digital.
    col += vec3(0.008, 0.011, 0.017);

    col *= smoothstep(1.02, 0.30, length(d) * 1.32);

    float n = fract(sin(dot(vUv * 1024.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.016;

    gl_FragColor = vec4(max(col, 0.0) * uFade, 1.0);
  }`

/* -------------------------------------------------------------- math utils */

const R = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}

function lookAt(e: number[], c: number[], up: number[]) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]
  let l = Math.hypot(zx, zy, zz) || 1
  zx /= l; zy /= l; zz /= l
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx
  l = Math.hypot(xx, xy, xz) || 1
  xx /= l; xy /= l; xz /= l
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
  return new Float32Array([
    xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
    -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1,
  ])
}

/* ------------------------------------------------- the neural network model */

type Soma = { p: number[]; r: number; d: number; birth: number }
type Branch = { pts: number[][]; birth: number; dur: number; w0: number; w1: number; type: number }

const norm = (v: number[]) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** Builds the network structure. Cells are well separated so each one reads as
 *  a distinct neuron — legibility is the whole brief. */
function buildNetwork() {
  const somas: Soma[] = []
  let guard = 0
  while (somas.length < CONFIG.somaCount && guard < 3000) {
    guard++
    const p = [R(-30, 30), R(-19, 19), R(-52, 6)]
    if (somas.some((s) => Math.hypot(s.p[0] - p[0], s.p[1] - p[1], s.p[2] - p[2]) < 15)) continue
    somas.push({ p, r: R(1.5, 2.6), d: 0, birth: 0 })
  }

  // Cascade the ignition outward from the first cell, so the network reads as
  // spreading rather than appearing all at once.
  const first = somas[0].p
  somas.forEach((s) => {
    s.d = Math.hypot(s.p[0] - first[0], s.p[1] - first[1], s.p[2] - first[2])
  })
  somas.sort((a, b) => a.d - b.d)
  somas.forEach((s, i) => {
    s.birth = i * 0.19 + R(0, 0.1)
  })

  const branches: Branch[] = []

  function grow(origin: number[], dir: number[], birth: number, len: number, width: number, gen: number) {
    const pts = [origin.slice()]
    let p = origin.slice()
    let d = dir.slice()
    const steps = Math.round(len)
    for (let i = 0; i < steps; i++) {
      d = norm([d[0] + R(-0.34, 0.34), d[1] + R(-0.34, 0.34), d[2] + R(-0.3, 0.3)])
      p = [p[0] + d[0] * 1.5, p[1] + d[1] * 1.5, p[2] + d[2] * 1.5]
      pts.push(p.slice())
      if (gen < 2 && i > 3 && Math.random() < 0.14) {
        grow(p.slice(), norm([d[0] + R(-0.9, 0.9), d[1] + R(-0.9, 0.9), d[2] + R(-0.6, 0.6)]),
          birth + (i / steps) * 0.55, len * 0.55, width * 0.6, gen + 1)
      }
    }
    branches.push({ pts, birth, dur: 0.75, w0: width, w1: width * 0.28, type: 0 })
  }

  for (const s of somas) {
    const n = 5 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(0, 0.9)
      const b = R(-0.7, 0.7)
      grow(s.p.slice(), norm([Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)]),
        s.birth + 0.06, R(7, 13), R(0.5, 0.78), 0)
    }
  }

  // Synapses: a clean arc reaching from one cell body to a neighbour. This is
  // the "…and it makes another connection" beat the brief asked for.
  for (let i = 0; i < somas.length; i++) {
    for (let j = i + 1; j < somas.length; j++) {
      const A = somas[i].p
      const B = somas[j].p
      const dist = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2])
      if (dist > 30 || Math.random() > 0.34) continue
      const mid = [(A[0] + B[0]) / 2 + R(-6, 6), (A[1] + B[1]) / 2 + R(-6, 6), (A[2] + B[2]) / 2 + R(-6, 6)]
      const pts: number[][] = []
      const S = 26
      for (let k = 0; k <= S; k++) {
        const t = k / S
        const it = 1 - t
        pts.push([
          it * it * A[0] + 2 * it * t * mid[0] + t * t * B[0],
          it * it * A[1] + 2 * it * t * mid[1] + t * t * B[1],
          it * it * A[2] + 2 * it * t * mid[2] + t * t * B[2],
        ])
      }
      branches.push({
        pts,
        birth: Math.max(somas[i].birth, somas[j].birth) + R(0.5, 1.4),
        dur: 0.5, w0: 0.34, w1: 0.34, type: 2,
      })
    }
  }
  return { somas, branches }
}

/** Samples the network into the volumetric point cloud that actually renders. */
function buildPoints(net: { somas: Soma[]; branches: Branch[] }) {
  const P: number[] = []
  const push = (x: number, y: number, z: number, size: number, birth: number,
                bright: number, along: number, seed: number, type: number) =>
    P.push(x, y, z, size, birth, bright, along, seed, type)

  // Cell bodies: a dense sphere of points — glowing MASS, not a flat dot.
  for (const s of net.somas) {
    for (let i = 0; i < 340; i++) {
      const u = Math.random()
      const v = Math.random()
      const th = u * Math.PI * 2
      const ph = Math.acos(2 * v - 1)
      const rr = s.r * Math.pow(Math.random(), 0.42)
      push(
        s.p[0] + Math.sin(ph) * Math.cos(th) * rr,
        s.p[1] + Math.sin(ph) * Math.sin(th) * rr,
        s.p[2] + Math.cos(ph) * rr,
        R(0.6, 1.5) * (1.0 - (rr / s.r) * 0.45),
        s.birth, R(0.5, 1.0), Math.random(), Math.random(), 1,
      )
    }
  }

  // Dendrites and synapses: dense points along each polyline, jittered
  // perpendicular so they read as tubes with volume rather than a hairline.
  for (const b of net.branches) {
    const total = b.pts.length - 1
    for (let i = 0; i < total; i++) {
      const a = b.pts[i]
      const c = b.pts[i + 1]
      const seg = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2])
      const count = Math.max(2, Math.round(seg / 0.28))
      for (let k = 0; k < count; k++) {
        const t = (i + k / count) / total
        const f = k / count
        const w = b.w0 + (b.w1 - b.w0) * t
        push(
          a[0] + (c[0] - a[0]) * f + R(-w, w) * 0.6,
          a[1] + (c[1] - a[1]) * f + R(-w, w) * 0.6,
          a[2] + (c[2] - a[2]) * f + R(-w, w) * 0.6,
          R(0.28, 0.62) * (0.5 + w),
          b.birth + t * b.dur,
          R(0.35, 0.8), t, Math.random(), b.type,
        )
      }
    }
  }

  // Suspended dust: gives the void scale and catches the bloom.
  for (let i = 0; i < CONFIG.dustCount; i++) {
    push(R(-60, 60), R(-40, 40), R(-70, 15), R(0.1, 0.34), R(0, 0.5), R(0.1, 0.4), Math.random(), Math.random(), 3)
  }
  return new Float32Array(P)
}

/* ================================================================ component */

export function Loader() {
  const reducedMotion = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const skipRef = useRef(false)
  const unmountTimer = useRef<number | undefined>(undefined)

  const [phase, setPhase] = useState<'running' | 'leaving' | 'gone'>(() => {
    if (typeof window === 'undefined') return 'gone'
    return sessionStorage.getItem(SESSION_KEY) === '1' ? 'gone' : 'running'
  })

  const finish = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setPhase((p) => (p === 'running' ? 'leaving' : p))
  }, [])

  useEffect(() => {
    if (phase !== 'running') return

    // Reduced motion: no sequence at all — straight to the hero.
    if (reducedMotion) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setPhase('gone')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const gl = (canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, premultipliedAlpha: false,
    }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null

    // No WebGL: skip the intro rather than showing a blank screen.
    if (!gl) {
      finish()
      return
    }

    /* ---- shader plumbing ---- */
    const shaders: WebGLShader[] = []
    const programs: WebGLProgram[] = []
    const textures: WebGLTexture[] = []
    const fbos: WebGLFramebuffer[] = []
    const buffers: WebGLBuffer[] = []

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
      shaders.push(s)
      return s
    }
    const prog = (vs: string, fs: string, attribs: string[]) => {
      const p = gl.createProgram()!
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
      attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a))
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p))
      programs.push(p)
      const u: Record<string, WebGLUniformLocation | null> = {}
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < n; i++) {
        const nm = gl.getActiveUniform(p, i)!.name
        u[nm] = gl.getUniformLocation(p, nm)
      }
      return { p, u }
    }

    const pPoints = prog(POINT_VS, POINT_FS, ['aPos', 'aSize', 'aBirth', 'aBright', 'aAlong', 'aSeed', 'aType'])
    const pBright = prog(QUAD_VS, BRIGHT_FS, ['aP'])
    const pBlur = prog(QUAD_VS, BLUR_FS, ['aP'])
    const pComp = prog(QUAD_VS, COMPOSITE_FS, ['aP'])

    /* ---- geometry ---- */
    const pointData = buildPoints(buildNetwork())
    const pointCount = pointData.length / 9
    const STRIDE = 9 * 4

    const pointBuf = gl.createBuffer()!
    buffers.push(pointBuf)
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf)
    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STATIC_DRAW)

    const quadBuf = gl.createBuffer()!
    buffers.push(quadBuf)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

    const drawQuad = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const bindPointAttribs = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf)
      const set = (loc: number, size: number, off: number) => {
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, off * 4)
      }
      set(0, 3, 0); set(1, 1, 3); set(2, 1, 4); set(3, 1, 5)
      set(4, 1, 6); set(5, 1, 7); set(6, 1, 8)
    }

    /* ---- framebuffers ---- */
    type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }
    const makeFBO = (w: number, h: number): FBO => {
      const tex = gl.createTexture()!
      textures.push(tex)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const fbo = gl.createFramebuffer()!
      fbos.push(fbo)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      return { tex, fbo, w, h }
    }

    let W = 0, H = 0
    let scene: FBO, b1a: FBO, b1b: FBO, b2a: FBO, b2b: FBO
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.max(2, Math.floor(window.innerWidth * dpr))
      H = Math.max(2, Math.floor(window.innerHeight * dpr))
      canvas.width = W
      canvas.height = H
      scene = makeFBO(W, H)
      b1a = makeFBO(Math.max(2, W >> 1), Math.max(2, H >> 1))
      b1b = makeFBO(Math.max(2, W >> 1), Math.max(2, H >> 1))
      b2a = makeFBO(Math.max(2, W >> 3), Math.max(2, H >> 3))
      b2b = makeFBO(Math.max(2, W >> 3), Math.max(2, H >> 3))
    }
    resize()
    window.addEventListener('resize', resize)

    const blurPass = (src: FBO, dstA: FBO, dstB: FBO, radius: number) => {
      gl.useProgram(pBlur.p)
      gl.bindFramebuffer(gl.FRAMEBUFFER, dstA.fbo)
      gl.viewport(0, 0, dstA.w, dstA.h)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, src.tex)
      gl.uniform1i(pBlur.u.uTex, 0)
      gl.uniform2f(pBlur.u.uDir, radius / dstA.w, 0)
      drawQuad()

      gl.bindFramebuffer(gl.FRAMEBUFFER, dstB.fbo)
      gl.viewport(0, 0, dstB.w, dstB.h)
      gl.bindTexture(gl.TEXTURE_2D, dstA.tex)
      gl.uniform2f(pBlur.u.uDir, 0, radius / dstB.h)
      drawQuad()
    }

    /* ---- loop ---- */
    const start = performance.now()
    const fovRad = (CONFIG.fov * Math.PI) / 180

    const frame = (now: number) => {
      const ms = now - start
      const t = ms / 1000

      // Fade in from black, then dissolve out to reveal the hero.
      const fadeOutStart = CONFIG.totalMs - CONFIG.fadeMs
      const fade = Math.min(1, t / 0.35) * clamp((CONFIG.totalMs - ms) / CONFIG.fadeMs, 0, 1)

      // Camera: a push through the network with a gentle orbital drift.
      const k = clamp(ms / CONFIG.totalMs, 0, 1)
      const dist = 78 - k * 46
      const ang = 0.35 + k * 0.5
      const eye = [Math.sin(ang) * dist * 0.34, 7 + Math.sin(t * 0.32) * 4.5, Math.cos(ang) * dist]
      const view = lookAt(eye, [0, 0, -18], [0, 1, 0])
      const proj = perspective(fovRad, W / H, 0.5, 400)
      const focal = H / (2 * Math.tan(fovRad / 2))

      // --- scene: additive, so overlapping glow accumulates into mass ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo)
      gl.viewport(0, 0, W, H)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.useProgram(pPoints.p)
      gl.uniformMatrix4fv(pPoints.u.uView, false, view)
      gl.uniformMatrix4fv(pPoints.u.uProj, false, proj)
      gl.uniform1f(pPoints.u.uTime, t)
      gl.uniform1f(pPoints.u.uFocal, focal)
      gl.uniform1f(pPoints.u.uFade, 1.0)
      bindPointAttribs()
      gl.drawArrays(gl.POINTS, 0, pointCount)
      gl.disable(gl.BLEND)

      // --- bloom: bright-pass, then two blur scales for a wide soft falloff ---
      gl.useProgram(pBright.p)
      gl.bindFramebuffer(gl.FRAMEBUFFER, b1a.fbo)
      gl.viewport(0, 0, b1a.w, b1a.h)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, scene.tex)
      gl.uniform1i(pBright.u.uTex, 0)
      gl.uniform1f(pBright.u.uThreshold, CONFIG.bloomThreshold)
      drawQuad()

      blurPass(b1a, b1b, b1a, 1.4)
      blurPass(b1a, b1b, b1a, 2.6)

      gl.useProgram(pBlur.p)
      gl.bindFramebuffer(gl.FRAMEBUFFER, b2a.fbo)
      gl.viewport(0, 0, b2a.w, b2a.h)
      gl.bindTexture(gl.TEXTURE_2D, b1a.tex)
      gl.uniform1i(pBlur.u.uTex, 0)
      gl.uniform2f(pBlur.u.uDir, 1.6 / b2a.w, 0)
      drawQuad()
      blurPass(b2a, b2b, b2a, 2.2)

      // --- composite ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, W, H)
      gl.useProgram(pComp.p)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.tex); gl.uniform1i(pComp.u.uScene, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b1a.tex); gl.uniform1i(pComp.u.uBloom1, 1)
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, b2a.tex); gl.uniform1i(pComp.u.uBloom2, 2)
      gl.uniform1f(pComp.u.uTime, t)
      gl.uniform1f(pComp.u.uFade, fade)
      drawQuad()

      // Skipping jumps straight to the dissolve rather than cutting hard.
      if (skipRef.current && ms < fadeOutStart) {
        finish()
        return
      }
      if (ms >= CONFIG.totalMs) {
        finish()
        return
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    const skip = () => {
      skipRef.current = true
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    window.addEventListener('wheel', skip, { passive: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('wheel', skip)
      // Free the GPU resources. The hero runs its own WebGL scene and browsers
      // cap simultaneous contexts, so we don't want to leak buffers/textures.
      buffers.forEach((b) => gl.deleteBuffer(b))
      textures.forEach((t) => gl.deleteTexture(t))
      fbos.forEach((f) => gl.deleteFramebuffer(f))
      programs.forEach((p) => gl.deleteProgram(p))
      shaders.forEach((s) => gl.deleteShader(s))
      // NOTE: deliberately NOT calling WEBGL_lose_context.loseContext() here.
      // React StrictMode runs effects twice in dev (mount → cleanup → mount),
      // and losing the context is PERMANENT for that canvas — the second run
      // would get the dead context back and every draw would silently no-op,
      // showing a black screen for the whole sequence. The context is released
      // anyway when the canvas leaves the DOM as the loader unmounts.
    }
  }, [phase, reducedMotion, finish])

  // Unmount only after the DOM fade has actually played.
  useEffect(() => {
    if (phase !== 'leaving') return
    unmountTimer.current = window.setTimeout(() => setPhase('gone'), CONFIG.unmountMs)
    return () => window.clearTimeout(unmountTimer.current)
  }, [phase])

  // Release the mask's entrance ONLY when the loader is completely gone, so the
  // neurons finish first and the mask flies in after (not underneath). Fires for
  // every path to 'gone': normal finish, skip, reduced motion, and the
  // already-seen-this-session case (initial phase is 'gone' → this runs on mount).
  useEffect(() => {
    if (phase === 'gone') markIntroReady()
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] bg-black transition-opacity ${
        phase === 'leaving' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{
        transitionDuration: `${CONFIG.unmountMs}ms`,
        transitionTimingFunction: 'var(--ease-out-expo)',
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
