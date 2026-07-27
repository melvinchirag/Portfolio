/* ============================================================================
 * SunCursor.tsx — the pointer, rendered as a small star
 * ----------------------------------------------------------------------------
 * WHAT THIS FILE DOES
 * Replaces the system cursor with a small, physically-plausible star drawn in
 * WebGL. It grows and brightens over anything interactive, and it drives the
 * cavity the sun carves into the nebula behind it (see NebulaField).
 *
 * -----------------------------------------------------------------------------
 * ART DIRECTION — what the previous version got wrong
 * The first attempt was rejected as looking "like Cartoon Network": too large,
 * too saturated, and with far too much flaring plasma. The corrections, all of
 * which are the difference between a cartoon star and a real one:
 *
 *   SMALLER      the disc is a fraction of its old size. A real star at this
 *                scale is a point of light, not an object.
 *   RESTRAINED   the animated flares are gone. Real stars don't visibly writhe;
 *                what reads as "sun" is the LIGHT FALLOFF, not the wiggling.
 *   LAYERED GLOW three exponential falloffs at different rates instead of one.
 *                Real light decays over a huge dynamic range, and a single
 *                halo always looks like a sticker.
 *   LIMB DARKEN  the disc is brighter at the centre than at its edge, because
 *                you see deeper into a hotter layer at the middle. This one
 *                detail does more for believability than any amount of flare.
 *   SUBTLE SPIKE a faint 4-point diffraction cross — the eye reads that as
 *                "star" instantly, and it is static rather than animated.
 *
 * The canvas is small (150px) and moved with a CSS transform, so it costs
 * almost nothing and can sit above every other element.
 * ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const SIZE = 150 // CSS px of the sprite canvas

const VERT = `
  precision highp float;
  attribute vec2 aP;
  varying vec2 vUv;
  void main () { vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uHover;   // 0 idle -> 1 over something interactive

  void main () {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);

    // The photosphere. Small on purpose — at this scale a star is a point of
    // light, and size is what made the previous version read as a cartoon.
    float R = 0.085 + uHover * 0.028;

    // ---- LIMB DARKENING -----------------------------------------------------
    // Looking at the centre of a star you see deeper into hotter gas, so the
    // middle is brighter and the edge cooler. This single cue does more for
    // believability than any animated effect.
    float rn = clamp(r / R, 0.0, 1.0);
    float limb = sqrt(max(1.0 - rn * rn, 0.0));      // classic limb profile
    float disc = smoothstep(R, R * 0.90, r);          // crisp but not aliased

    vec3 core = vec3(1.00, 0.99, 0.96);
    vec3 edge = vec3(1.00, 0.80, 0.44);
    vec3 col = mix(edge, core, limb) * disc * (0.92 + limb * 0.55);

    // ---- LAYERED GLOW -------------------------------------------------------
    // Three exponential falloffs. Real light decays across a huge range, and a
    // single halo always reads as a flat sticker pasted on the page.
    float d = max(r - R, 0.0);
    float g1 = exp(-d * 26.0);                        // tight, hot
    float g2 = exp(-d * 9.0);                         // mid corona
    float g3 = exp(-d * 3.2);                         // wide, very faint
    col += vec3(1.00, 0.86, 0.62) * g1 * (0.55 + uHover * 0.30);
    col += vec3(1.00, 0.68, 0.34) * g2 * (0.22 + uHover * 0.24);
    col += vec3(1.00, 0.56, 0.26) * g3 * (0.07 + uHover * 0.13);

    // ---- DIFFRACTION SPIKE --------------------------------------------------
    // A faint static 4-point cross. The eye reads this as "star" instantly.
    // Static, not animated — animation is what made the old one look cartoonish.
    float sx = exp(-abs(p.y) * 120.0) * exp(-abs(p.x) * 7.0);
    float sy = exp(-abs(p.x) * 120.0) * exp(-abs(p.y) * 7.0);
    col += vec3(1.0, 0.90, 0.72) * (sx + sy) * (0.16 + uHover * 0.26);

    // Filmic roll-off so the core goes to white smoothly instead of clipping.
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

    // Everything outside the glow must be fully transparent — this canvas
    // floats over the page.
    float alpha = clamp(disc + g1 * 0.75 + g2 * 0.30 + g3 * 0.12
                      + (sx + sy) * 0.30, 0.0, 1.0);

    gl_FragColor = vec4(col, alpha);
  }`

export function SunCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  // Only on devices with a real pointer — a trailing cursor is meaningless on
  // touch, and there is no cursor to replace.
  const [enabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
  )

  useEffect(() => {
    if (!enabled || reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
    if (!gl) return

    // Only hide the system cursor once we know ours is actually rendering —
    // otherwise a failure here leaves the visitor with no cursor at all.
    document.documentElement.classList.add('has-sun-cursor')

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

    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uHover = gl.getUniformLocation(prog, 'uHover')

    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pos = { ...target }
    let hoverTarget = 0
    let hover = 0
    let visible = false

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!visible) {
        // Jump on first sight so it doesn't swoop in from the middle.
        pos.x = e.clientX
        pos.y = e.clientY
        visible = true
        canvas.style.opacity = '1'
      }
      const el = e.target instanceof Element ? e.target.closest('a, button, [role="button"], [data-glow]') : null
      hoverTarget = el ? 1 : 0
    }
    const onLeave = () => {
      canvas.style.opacity = '0'
      visible = false
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    const start = performance.now()
    let last = start
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      // Frame-rate-independent easing. Fast enough to feel attached to the
      // pointer, slow enough to carry a little weight.
      const k = 1 - Math.exp(-26.0 * dt)
      pos.x += (target.x - pos.x) * k
      pos.y += (target.y - pos.y) * k
      hover += (hoverTarget - hover) * (1 - Math.exp(-10.0 * dt))

      // Moving the canvas with a transform is handled by the compositor and
      // costs essentially nothing, unlike redrawing at a new position.
      canvas.style.transform = `translate3d(${pos.x - SIZE / 2}px, ${pos.y - SIZE / 2}px, 0)`

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.uniform1f(uTime, (now - start) / 1000)
      gl.uniform1f(uHover, hover)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-sun-cursor')
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    }
  }, [enabled, reducedMotion])

  if (!enabled || reducedMotion) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[200] opacity-0 transition-opacity duration-300"
      style={{ width: SIZE, height: SIZE }}
    />
  )
}
