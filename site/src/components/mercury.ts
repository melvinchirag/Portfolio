/**
 * MERCURY: a tiny raymarched liquid for the menu (Melvin, 2026-11-09: "the
 * liquid will be good"). Raw WebGL on a small canvas, independent of the R3F
 * mask scene so the two never fight.
 *
 * The scene is two ellipsoids blended with a polynomial smooth-min: `b` leads
 * toward the target, `a` lags behind it, so while the drop travels the two
 * stretch into a bridge and when it settles they coincide into one pill. An
 * optional third "body" ellipsoid is the island's bar. Orthographic rays along
 * +z, 40 steps, central-difference normals, sand-only shading (compressed
 * Lambert, Blinn-Phong 36, fresnel rim), anti-aliased edge from the smallest
 * distance seen along the ray, premultiplied output.
 *
 * Units: the canvas is -1..1 vertically and -asp..asp horizontally. One unit is
 * half the canvas height in CSS pixels. Callers measure DOM labels into these
 * units each frame.
 *
 * Study notes: Otto `.claude/skills/creative-ui-techniques/techniques/03-raymarching-sdf-liquid.md`.
 */

export type MercuryFrame = {
  time: number
  /** Lagging drop centre and leading drop centre, in canvas units. */
  a: [number, number]
  b: [number, number]
  /** Ellipsoid radii (x, y, z) for a and b. */
  ra: [number, number, number]
  rb: [number, number, number]
  /** Smooth-min width. ~0.5 for a pill, ~0.45 for a stack. */
  k: number
  /** Island bar: centre x, centre y, half-width, half-height. */
  body: [number, number, number, number]
  bodyOn: boolean
  /** 0: drops travel horizontally (wobble on y). 1: vertically (wobble on x). */
  axis: 0 | 1
  /** Reduced motion: no surface wobble. */
  still: boolean
}

export type Mercury = {
  frame: (f: MercuryFrame) => void
  resize: (cssWidth: number, cssHeight: number) => void
  dispose: () => void
}

const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'

const FS = /* glsl */ `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_a; uniform vec2 u_b; uniform vec3 u_ra; uniform vec3 u_rb; uniform float u_k;
uniform vec4 u_body; uniform float u_bodyOn; uniform float u_axis; uniform float u_still;

float sdEll(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

float map(vec3 p){
  float t = u_time; float live = 1.0 - u_still;
  float along = mix(p.x, p.y, u_axis);
  float wob = (sin(along * 1.9 + t * 1.5) * 0.026 + sin(along * 3.7 - t * 1.1) * 0.013) * live;
  vec3 off = mix(vec3(0.0, wob, 0.0), vec3(wob, 0.0, 0.0), u_axis);
  vec3 pa = p - vec3(u_a, 0.0) - off; vec3 pb = p - vec3(u_b, 0.0) + off;
  float d = smin(sdEll(pa, u_ra), sdEll(pb, u_rb), u_k);
  if (u_bodyOn > 0.5) { float db = sdEll(p - vec3(u_body.xy, 0.0) + off * 0.5, vec3(u_body.z, u_body.w, u_rb.z)); d = smin(d, db, u_k); }
  return d;
}
vec3 nrm(vec3 p){ vec2 h = vec2(0.003, 0.0); return normalize(vec3(map(p + h.xyy) - map(p - h.xyy), map(p + h.yxy) - map(p - h.yxy), map(p + h.yyx) - map(p - h.yyx))); }

void main(){
  float asp = u_res.x / u_res.y;
  vec2 uv = (gl_FragCoord.xy / u_res - 0.5) * 2.0 * vec2(asp, 1.0);
  vec3 ro = vec3(uv, -2.5); vec3 rd = vec3(0.0, 0.0, 1.0);
  float t = 0.0; float minD = 10.0; bool hit = false; vec3 p = ro;
  for (int i = 0; i < 40; i++) {
    p = ro + rd * t; float d = map(p); minD = min(minD, d);
    if (d < 0.002) { hit = true; break; }
    t += d * 0.9; if (t > 5.0) break;
  }
  float px = 2.0 / u_res.y;
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, px * 1.6, minD);
  if (alpha <= 0.001) { gl_FragColor = vec4(0.0); return; }
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(0.35, 0.75, -0.6)); vec3 V = vec3(0.0, 0.0, -1.0); vec3 H = normalize(L + V);
  float dif = max(dot(n, L), 0.0) * 0.6 + 0.4;
  float spec = pow(max(dot(n, H), 0.0), 36.0) * 0.4;
  float fre = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.45;
  // Sand #cdb78a, its deep shade and its lit shade. One hue; depth from shading only.
  vec3 deep = vec3(0.40, 0.35, 0.25); vec3 sand = vec3(0.804, 0.718, 0.541); vec3 light = vec3(0.90, 0.83, 0.66);
  vec3 col = min(mix(deep, sand, dif) + light * spec + light * fre, vec3(0.93, 0.86, 0.70));
  gl_FragColor = vec4(col * alpha, alpha);
}
`

const UNIFORMS = ['u_res', 'u_time', 'u_a', 'u_b', 'u_ra', 'u_rb', 'u_k', 'u_body', 'u_bodyOn', 'u_axis', 'u_still'] as const

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[mercury]', gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

/** Returns null when WebGL is unavailable; the caller shows a CSS fallback. */
export function createMercury(canvas: HTMLCanvasElement): Mercury | null {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, VS)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[mercury]', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const U = {} as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>
  for (const n of UNIFORMS) U[n] = gl.getUniformLocation(prog, n)
  gl.clearColor(0, 0, 0, 0)

  let lost = false
  const onLost = (e: Event) => { e.preventDefault(); lost = true }
  const onRestored = () => { lost = false }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  return {
    resize(cssWidth, cssHeight) {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(cssWidth * dpr))
      const h = Math.max(1, Math.round(cssHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    },
    frame(f) {
      if (lost) return
      gl.uniform2f(U.u_res, canvas.width, canvas.height)
      gl.uniform1f(U.u_time, f.time)
      gl.uniform2f(U.u_a, f.a[0], f.a[1])
      gl.uniform2f(U.u_b, f.b[0], f.b[1])
      gl.uniform3f(U.u_ra, f.ra[0], f.ra[1], f.ra[2])
      gl.uniform3f(U.u_rb, f.rb[0], f.rb[1], f.rb[2])
      gl.uniform1f(U.u_k, f.k)
      gl.uniform4f(U.u_body, f.body[0], f.body[1], f.body[2], f.body[3])
      gl.uniform1f(U.u_bodyOn, f.bodyOn ? 1 : 0)
      gl.uniform1f(U.u_axis, f.axis)
      gl.uniform1f(U.u_still, f.still ? 1 : 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    dispose() {
      // Do NOT loseContext() here: React StrictMode mounts, unmounts and
      // remounts the effect on the same <canvas>, and a lost context stays
      // lost for the remount (every compile then fails with a null log).
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    },
  }
}
