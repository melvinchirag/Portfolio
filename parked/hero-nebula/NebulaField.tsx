/* ============================================================================
 * NebulaField.tsx — the Hero §1 background
 * ----------------------------------------------------------------------------
 * WHAT THIS FILE DOES
 * Renders a real deep-space photograph as the hero background, and makes it
 * feel alive and interactive: it drifts, it parallaxes against the pointer, and
 * the sun-cursor carves a glowing cavity into the gas as it moves.
 *
 * A DIFFERENT nebula is shown on each page load, cycling through five.
 *
 * -----------------------------------------------------------------------------
 * WHY A PHOTOGRAPH AND NOT A PROCEDURAL SHADER
 * Earlier versions generated the nebula procedurally from noise functions. They
 * were rejected repeatedly for looking "flat" and not "like a picture from a
 * NASA satellite" — and that verdict was correct and unfixable. A real nebula
 * image is genuine turbulent physics evolved over millions of years, captured
 * at enormous dynamic range and then processed by scientists. No amount of
 * fractal noise reproduces that; procedural code has a hard ceiling here.
 *
 * This is the SAME lesson the face-triptych taught (see docs/CODEBASE.md §7c):
 *   - representational / photoreal content  -> use real source material
 *   - abstract generative motion            -> code is the right tool
 * So the photograph supplies the realism, and the shader supplies everything a
 * still image cannot: depth, motion, and interaction.
 *
 * -----------------------------------------------------------------------------
 * IMAGE SOURCES AND LICENSING  (important — this ships publicly)
 *   carina, tarantula  — NASA / ESA / CSA JWST
 *   orion              — ESO / VISTA
 *   eagle, lagoon      — NASA / ESA Hubble
 * NASA imagery is public domain. ESA/ESO material is CC BY 4.0, which requires
 * attribution — the hero renders a small credit line for the active image.
 * Do not remove it.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { pointerState, usePointerTracker } from '../../hooks/usePointerTracker'

/** The rotation set. The credit is rendered on screen to satisfy CC BY.
 *  Not exported — keeping this module a single-component file preserves Vite's
 *  fast refresh, and nothing else needs the list. */
const NEBULAS = [
  { src: '/nebula/carina.jpg', name: 'Cosmic Cliffs, Carina', credit: 'NASA / ESA / CSA / STScI' },
  { src: '/nebula/orion.jpg', name: 'Orion Nebula', credit: 'ESO / VISTA' },
  { src: '/nebula/tarantula.jpg', name: 'Tarantula Nebula', credit: 'NASA / ESA / CSA / STScI' },
  { src: '/nebula/eagle.jpg', name: 'Pillars of Creation, Eagle', credit: 'NASA / ESA / Hubble' },
  { src: '/nebula/lagoon.jpg', name: 'Lagoon Nebula', credit: 'NASA / ESA / Hubble' },
]

const ROTATE_KEY = 'melvin:nebula-index'

/** Advance the rotation once per page load, so a reload shows the next nebula.
 *  localStorage (not session) so it persists across tabs and visits. */
function pickNebulaIndex(): number {
  try {
    const prev = parseInt(localStorage.getItem(ROTATE_KEY) ?? '-1', 10)
    const next = (Number.isFinite(prev) ? prev + 1 : 0) % NEBULAS.length
    localStorage.setItem(ROTATE_KEY, String(next))
    return next
  } catch {
    // Private mode / storage disabled — just pick at random.
    return Math.floor(Math.random() * NEBULAS.length)
  }
}

const VERT = `
  precision highp float;
  attribute vec2 aP;
  varying vec2 vUv;
  void main () { vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`

const FRAG = `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform vec2  uRes;        // canvas size in px
  uniform vec2  uTexSize;    // source image size in px
  uniform float uTime;
  uniform vec2  uMouse;      // pointer in UV space (0..1), smoothed
  uniform float uSun;        // 0..1 master strength of the sun's influence
  uniform float uFade;       // fade-in once the image has decoded

  // Small hash for grain.
  float hash21 (vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main () {
    // ---- COVER-FIT ----------------------------------------------------------
    // Scale the image to cover the viewport without distorting it (the CSS
    // background-size:cover equivalent, done in UV space).
    float canvasAspect = uRes.x / uRes.y;
    float imgAspect    = uTexSize.x / uTexSize.y;
    vec2 uv = vUv;
    if (canvasAspect > imgAspect) {
      // Viewport is wider than the image -> crop top and bottom.
      float s = imgAspect / canvasAspect;
      uv.y = (uv.y - 0.5) * s + 0.5;
    } else {
      float s = canvasAspect / imgAspect;
      uv.x = (uv.x - 0.5) * s + 0.5;
    }

    // ---- SLOW DRIFT + PARALLAX ----------------------------------------------
    // A very slow zoom-and-pan keeps the frame from ever being static, and the
    // pointer parallax makes a flat photograph feel like it has depth.
    float breathe = 1.0 - 0.045 * (0.5 + 0.5 * sin(uTime * 0.045));
    uv = (uv - 0.5) * breathe + 0.5;
    uv += vec2(sin(uTime * 0.017) * 0.006, cos(uTime * 0.013) * 0.006);
    uv += (uMouse - 0.5) * -0.022;

    // =========================================================================
    // THE SUN'S INFLUENCE
    // Physically motivated: hot young stars blow cavities into the nebulae that
    // birthed them, via radiation pressure and stellar wind. So the cursor does
    // three things at once, all falling off with distance:
    //   1. PUSHES the gas radially outward (carving the cavity)
    //   2. SWIRLS it slightly (turbulence at the cavity wall)
    //   3. CLEARS it — the gas thins where the sun has swept it away
    // and separately it LIGHTS the gas that remains.
    // =========================================================================
    // Work in aspect-corrected space so the cavity is round, not an ellipse.
    vec2 aspect = vec2(canvasAspect, 1.0);
    vec2 dSun = (vUv - uMouse) * aspect;
    float dist = length(dSun);
    vec2 dir = dSun / max(dist, 0.0001);

    // Influence falls off exponentially — a tight, well-defined region.
    float infl = exp(-dist * 5.2) * uSun;

    // 1. Radial push: sample from further in, so gas appears shoved outward.
    uv -= dir * infl * 0.075 / aspect;

    // 2. Swirl: rotate the sample around the sun. Strongest at the cavity wall
    //    rather than dead centre, which is where real turbulence lives.
    float swirl = infl * 1.15 * smoothstep(0.0, 0.10, dist);
    float cs = cos(swirl), sn = sin(swirl);
    vec2 rel = (uv - uMouse) * aspect;
    rel = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs);
    uv = uMouse + rel / aspect;

    vec3 col = texture2D(uTex, uv).rgb;

    // 3. Clear the gas: dim strongly right at the sun, feathering outward.
    float cleared = 1.0 - exp(-dist * 7.0) * uSun;
    col *= mix(0.18, 1.0, clamp(cleared, 0.0, 1.0));

    // ---- THE SUN LIGHTS THE SURROUNDING GAS ---------------------------------
    // Warm light scattering through whatever gas survives near the cavity.
    // Multiplying by luminance means only actual gas catches the light — empty
    // sky stays dark, which is what sells it as illumination rather than a
    // pasted-on glow.
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 sunTint = vec3(1.0, 0.72, 0.38);
    col += sunTint * exp(-dist * 3.4) * uSun * (0.25 + lum * 1.7);
    // A tight core glow, independent of gas, so the sun reads as a light source.
    col += sunTint * exp(-dist * 15.0) * uSun * 0.45;

    // ---- GRADE --------------------------------------------------------------
    // Gentle contrast lift, then a vignette so the centre stays readable behind
    // the name. Deliberately restrained — the photo is already graded by the
    // people who took it, and fighting that is how it starts looking fake.
    col = clamp((col - 0.5) * 1.06 + 0.5, 0.0, 1.0);
    vec2 vg = vUv - 0.5;
    col *= smoothstep(1.15, 0.28, length(vg) * 1.18);
    // Hold the very centre back a little further so text always has contrast.
    col *= mix(0.62, 1.0, smoothstep(0.0, 0.42, length(vg * aspect)));

    // Fine grain stops large smooth regions from banding on cheap panels.
    col += (hash21(vUv * uRes + uTime) - 0.5) * 0.014;

    gl_FragColor = vec4(max(col, 0.0) * uFade, 1.0);
  }`

export function NebulaField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  // Chosen once per mount, so a reload advances to the next nebula.
  const [index] = useState(pickNebulaIndex)
  const nebula = NEBULAS[index]

  // Feed the shared window-level pointer tracker (also used by the sun cursor).
  usePointerTracker(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
    if (!gl) return

    /* ---- program ---- */
    const sh = (t: number, src: string) => {
      const s = gl.createShader(t)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.bindAttribLocation(prog, 0, 'aP')
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const u = {
      tex: gl.getUniformLocation(prog, 'uTex'),
      res: gl.getUniformLocation(prog, 'uRes'),
      texSize: gl.getUniformLocation(prog, 'uTexSize'),
      time: gl.getUniformLocation(prog, 'uTime'),
      mouse: gl.getUniformLocation(prog, 'uMouse'),
      sun: gl.getUniformLocation(prog, 'uSun'),
      fade: gl.getUniformLocation(prog, 'uFade'),
    }

    // One oversized triangle covering the screen — cheaper than a two-triangle
    // quad and has no diagonal seam.
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    /* ---- texture ---- */
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // 1x1 placeholder so the first frames have something valid to sample.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    // CLAMP is essential: the shader samples outside 0..1 when the sun pushes
    // the gas, and REPEAT would wrap the far edge of the image into frame.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    let texW = 1
    let texH = 1
    let loaded = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      texW = img.naturalWidth
      texH = img.naturalHeight
      loaded = true
    }
    img.src = nebula.src

    /* ---- sizing ---- */
    let W = 0
    let H = 0
    const resize = () => {
      // Cap DPR at 1.5: this is a photograph stretched over the viewport, so
      // the extra pixels of a 2x buffer buy almost nothing and cost real
      // fill-rate on a layer that runs continuously.
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      W = Math.max(2, Math.floor(window.innerWidth * dpr))
      H = Math.max(2, Math.floor(window.innerHeight * dpr))
      canvas.width = W
      canvas.height = H
      gl.viewport(0, 0, W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    /* ---- loop ---- */
    const start = performance.now()
    let last = start
    let raf = 0
    const mouse = { x: 0.5, y: 0.5 }
    let fade = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      // pointerState is -1..1; the shader wants 0..1 UV. Y is flipped because
      // the texture is uploaded flipped.
      const tx = pointerState.x * 0.5 + 0.5
      const ty = pointerState.y * 0.5 + 0.5
      // Frame-rate-independent easing: a fixed fraction per SECOND, so the
      // motion feels identical at 60Hz and 144Hz.
      const k = 1 - Math.exp(-6.5 * dt)
      mouse.x += (tx - mouse.x) * k
      mouse.y += (ty - mouse.y) * k

      if (loaded) fade += (1 - fade) * (1 - Math.exp(-2.2 * dt))

      gl.useProgram(prog)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(u.tex, 0)
      gl.uniform2f(u.res, W, H)
      gl.uniform2f(u.texSize, texW, texH)
      gl.uniform1f(u.time, (now - start) / 1000)
      gl.uniform2f(u.mouse, mouse.x, mouse.y)
      // Reduced motion: keep the photo, drop the interaction.
      gl.uniform1f(u.sun, reducedMotion ? 0 : 1)
      gl.uniform1f(u.fade, fade)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      img.onload = null
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      // NOTE: deliberately not calling loseContext() — React StrictMode runs
      // effects twice in dev, and losing the context is permanent for that
      // canvas, so the second run would render nothing. See Loader.tsx.
    }
  }, [nebula.src, reducedMotion])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 -z-10 h-full w-full" aria-hidden />
      {/* CC BY attribution for the ESA/ESO images. Required — do not remove. */}
      <p className="pointer-events-none fixed right-4 bottom-3 z-10 text-[9px] tracking-[0.14em] text-white/25 uppercase">
        {nebula.name} · {nebula.credit}
      </p>
    </>
  )
}
