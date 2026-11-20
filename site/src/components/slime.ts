/**
 * SLIME: a ferrofluid body that flows to whichever hero button you hover
 * (Melvin, 2026-11-19: "I need it to be like ferrofluid, it needs to move like
 * a slime to the button I'm hovering over").
 *
 * One body per GROUP of buttons, not one fill per button. Same mechanics as the
 * menu (mercury.ts): two ellipsoids blended with a smooth-min, the leader `b`
 * runs to the target, the lagger `a` trails behind, so while it travels the two
 * stretch into a bridge and when it arrives they coincide into one pill. New
 * here: while it is moving, the head sprouts ferrofluid spikes (a hex lattice of
 * cone bumps that inflates the surface near the head and relaxes as it settles).
 *
 * Groups:
 *   cta    the two big buttons. The slime RESTS on See the work (home) and
 *          flows to Contact on hover, then returns when you leave.
 *   links  GitHub, LinkedIn, Résumé: a thin slime underline that spawns at the
 *          cursor and travels between the words, retracting on leave.
 *   dots   the frame dots: the slime rests on the active dot and is pulled to
 *          the one you hover.
 *   arrow  each round rail arrow: a drop spawns at the cursor and swells to fill
 *          it. (A group of one.)
 *   line   a lone text link (Read the full story): same underline.
 *
 * Markup contract: items carry `data-slime`; the item the slime rests on carries
 * `data-slime-home` or `aria-current="true"`. A group of one is the item itself.
 *
 * Cost: groups with a home keep one tiny canvas (and one WebGL context) alive;
 * the others create it on first touch and release it once retracted. Fallbacks:
 * no WebGL leaves the original CSS untouched (the `slime-on` class that restyles
 * the items is only added after the shader compiled). Reduced motion snaps to
 * the end state with no wobble and no spikes.
 */

import { SPIKE_GLSL, SPIKE_UNIFORMS, spikeSpring } from './spikes'
import { FLUID } from '../velvet'

type Shape = 'pill' | 'round' | 'dot' | 'line'
type Cfg = { shape: Shape; spikes: boolean; pad: number; spS: number; spH: number; spR: number; hov: number }

const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }'

const FS = /* glsl */ `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_a; uniform vec2 u_b; uniform vec3 u_ra; uniform vec3 u_rb; uniform float u_k;
uniform float u_still;
float sdEll(vec3 p, vec3 r){ if (r.x < 0.003 || r.y < 0.003) return 10.0; float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0-1.0)/k1; }
float smin(float a, float b, float k){ float h = max(k-abs(a-b),0.0)/k; return min(a,b) - h*h*k*0.25; }
float ellZ(vec2 q, vec2 c, vec3 r){ vec2 w = (q - c) / max(r.xy, vec2(0.001)); return r.z * sqrt(max(0.0, 1.0 - dot(w, w))); }
float bodyZ(vec2 q){ return max(ellZ(q, u_a, u_ra), ellZ(q, u_b, u_rb)); }
${SPIKE_GLSL}
float body(vec3 p, vec3 off){
  return smin(sdEll(p - vec3(u_a,0.0) - off, u_ra), sdEll(p - vec3(u_b,0.0) + off, u_rb), u_k);
}
float map(vec3 p){
  float t = u_time; float live = 1.0 - u_still;
  float wob = (sin(p.x*1.9 + t*1.5)*0.022 + sin(p.x*3.7 - t*1.1)*0.011) * live;
  vec3 off = vec3(0.0, wob, 0.0);
  float d = body(p, off);
  if (u_spk > 0.005) d = spikes(p, d, body(vec3(p.xy, 0.0), off));
  return d;
}
vec3 nrm(vec3 p){
  vec2 k = vec2(1.0, -1.0); float h = 0.0025;
  return normalize(k.xyy*map(p + k.xyy*h) + k.yyx*map(p + k.yyx*h) + k.yxy*map(p + k.yxy*h) + k.xxx*map(p + k.xxx*h));
}
void main(){
  float asp = u_res.x/u_res.y;
  vec2 uv = (gl_FragCoord.xy/u_res - 0.5)*2.0*vec2(asp,1.0);
  vec3 ro = vec3(uv,-1.6); vec3 rd = vec3(0.0,0.0,1.0);
  float t = 0.0; float minD = 10.0; bool hit = false; vec3 p = ro;
  for (int i=0;i<48;i++){ p = ro + rd*t; float d = map(p); minD = min(minD,d); if (d<0.002){hit=true;break;} t += d*0.75; if (t>3.4) break; }
  float px = 2.0/u_res.y;
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, px*1.6, minD);
  if (alpha <= 0.001){ gl_FragColor = vec4(0.0); return; }
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(0.35,0.75,-0.6)); vec3 V = vec3(0.0,0.0,-1.0); vec3 H = normalize(L+V);
  float dif = max(dot(n,L),0.0)*0.6 + 0.4;
  float spec = pow(max(dot(n,H),0.0), 36.0)*0.4 + pow(max(dot(n,H),0.0), 160.0)*0.5;
  float fre = pow(1.0 - max(dot(n,V),0.0), 3.0)*0.45;
  vec3 deep = ${FLUID.deep}; vec3 sand = ${FLUID.body}; vec3 light = ${FLUID.light};
  vec3 col = min(mix(deep,sand,dif) + light*spec + light*fre, ${FLUID.cap});
  gl_FragColor = vec4(col*alpha, alpha);
}
`

const UN = ['u_res', 'u_time', 'u_a', 'u_b', 'u_ra', 'u_rb', 'u_k', 'u_still', ...SPIKE_UNIFORMS] as const
type UName = (typeof UN)[number]
type GL = { gl: WebGLRenderingContext; U: Record<UName, WebGLUniformLocation | null>; free: () => void }

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[slime]', gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

function makeGL(canvas: HTMLCanvasElement): GL | null {
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
    console.error('[slime]', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const U = {} as Record<UName, WebGLUniformLocation | null>
  for (const n of UN) U[n] = gl.getUniformLocation(prog, n)
  gl.clearColor(0, 0, 0, 0)
  return {
    gl,
    U,
    // Each engagement makes a fresh canvas, so releasing the context is safe here
    // (the menu's single canvas must NOT do this: StrictMode remounts reuse it).
    free() {
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
type V2 = [number, number]
type V3 = [number, number, number]
const cp = (v: V3): V3 => [v[0], v[1], v[2]]

function spring(s: { x: number; v: number }, tgt: number, dt: number, K: number, C: number) {
  const steps = Math.max(1, Math.ceil(dt / 0.008))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    s.v += (K * (tgt - s.x) - C * s.v) * h
    s.x += s.v * h
  }
}

class Slime {
  private canvas: HTMLCanvasElement | null = null
  private g: GL | null = null
  private raf = 0
  private last = 0
  private broken = false
  private styled = false
  private prevPos = ''

  private hovered: HTMLElement | null = null
  private a: V2 = [0, 0]
  private b: V2 = [0, 0]
  private ra: V3 = [0, 0, 0.3]
  private rb: V3 = [0, 0, 0.3]
  private press = { x: 0, v: 0 }
  private pressT = 0
  private spk = { x: 0, v: 0 }
  private pulse = 0
  private fresh = true
  private ccx = 0
  private ccy = 0
  private unit = 1
  private el: HTMLElement
  private cfg: Cfg

  constructor(el: HTMLElement, cfg: Cfg) {
    this.el = el
    this.cfg = cfg
    el.addEventListener('pointerover', this.onOver)
    el.addEventListener('pointerout', this.onOut)
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
    el.addEventListener('focusin', this.onFocus)
    el.addEventListener('focusout', this.onBlur)
    window.addEventListener('resize', this.kick)
    // A group that has a home keeps its slime alive from the first frame.
    if (this.home()) this.kick()
  }

  dispose() {
    const el = this.el
    el.removeEventListener('pointerover', this.onOver)
    el.removeEventListener('pointerout', this.onOut)
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointercancel', this.onUp)
    el.removeEventListener('focusin', this.onFocus)
    el.removeEventListener('focusout', this.onBlur)
    window.removeEventListener('resize', this.kick)
    this.teardown()
  }

  /* -------------------------------------------------------------- items */
  private items(): HTMLElement[] {
    if (this.el.hasAttribute('data-slime')) return [this.el]
    return Array.from(this.el.querySelectorAll<HTMLElement>('[data-slime]'))
  }
  private home(): HTMLElement | null {
    if (this.el.hasAttribute('data-slime')) return null
    return this.el.querySelector<HTMLElement>('[data-slime-home], [aria-current="true"]')
  }
  private itemAt(t: EventTarget | null): HTMLElement | null {
    if (!(t instanceof Element)) return null
    const it = t.closest<HTMLElement>('[data-slime]')
    return it && this.el.contains(it) ? it : null
  }

  /* ------------------------------------------------------------- events */
  private onOver = (ev: PointerEvent) => {
    const it = this.itemAt(ev.target)
    if (!it || this.broken) return
    this.hovered = it
    if (!this.canvas) this.spawnAt = ev
    this.kick()
  }
  private spawnAt: PointerEvent | null = null
  private onOut = (ev: PointerEvent) => {
    const to = this.itemAt(ev.relatedTarget)
    const from = this.itemAt(ev.target)
    if (from && from === this.hovered && to !== from) this.hovered = to
    this.kick()
  }
  private onDown = (ev: PointerEvent) => {
    if (!this.itemAt(ev.target)) return
    this.pressT = 1
    this.pulse = 1
    this.kick()
  }
  private onUp = () => {
    this.pressT = 0
    this.kick()
  }
  private onFocus = (ev: FocusEvent) => {
    const it = this.itemAt(ev.target)
    if (it && it.matches(':focus-visible')) {
      this.hovered = it
      this.kick()
    }
  }
  private onBlur = (ev: FocusEvent) => {
    if (this.itemAt(ev.target) === this.hovered) this.hovered = null
    this.kick()
  }

  /* ---------------------------------------------------------- lifecycle */
  private kick = () => {
    if (!this.raf && !this.broken) this.raf = requestAnimationFrame(this.tick)
  }

  private engage(): boolean {
    if (this.canvas) return true
    if (this.broken) return false
    const cr = this.el.getBoundingClientRect()
    if (cr.width < 2 || cr.height < 2) return false
    const cs = getComputedStyle(this.el)
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.cssText = 'position:absolute;z-index:-1;pointer-events:none;display:block'
    const g = makeGL(canvas)
    if (!g) {
      this.broken = true
      return false
    }
    this.g = g
    this.canvas = canvas
    this.prevPos = this.el.style.position
    if (cs.position === 'static') this.el.style.position = 'relative'
    this.el.style.isolation = 'isolate'
    this.el.appendChild(canvas)
    for (const it of this.items()) it.classList.add('slime-on')
    this.styled = true
    this.fresh = true
    this.last = performance.now()
    return true
  }

  private teardown() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    if (this.styled) {
      for (const it of this.items()) it.classList.remove('slime-on', 'is-under')
      this.styled = false
    }
    this.canvas?.remove()
    this.canvas = null
    this.g?.free()
    this.g = null
    if (this.el.style.isolation) this.el.style.isolation = ''
    if (this.prevPos === '' && this.el.style.position === 'relative') this.el.style.position = ''
  }

  /** Radii for the slime to wear when it sits on `it`, in canvas units. */
  private shapeFor(it: HTMLElement, hov: boolean): { c: V2; rb: V3; ra: V3 } {
    const r = it.getBoundingClientRect()
    const u = this.unit
    const hw = r.width / 2 / u
    const hh = r.height / 2 / u
    const cx = (r.left + r.width / 2 - this.ccx) / u
    let cy = -(r.top + r.height / 2 - this.ccy) / u
    const sq = this.press.x
    switch (this.cfg.shape) {
      case 'round':
        return { c: [cx, cy], rb: [hw * 0.96, hh * 0.96 * (1 - 0.1 * sq), 0.34], ra: [hw * 0.82, hh * 0.82, 0.3] }
      case 'dot': {
        const R = (hov ? 7.5 : 5.2) / u
        return { c: [cx, cy], rb: [R, R, 0.3], ra: [R * 0.85, R * 0.85, 0.26] }
      }
      case 'line': {
        cy = -(r.bottom + 2.5 - this.ccy) / u
        const t = 1.7 / u
        return { c: [cx, cy], rb: [hw, t, 0.09], ra: [hw * 0.82, t * 0.85, 0.07] }
      }
      default:
        return {
          c: [cx, cy],
          rb: [hw * 0.94 * (1 + 0.03 * sq), hh * 0.95 * (1 - 0.12 * sq), 0.36],
          ra: [hw * 0.8, hh * 0.85, 0.32],
        }
    }
  }

  private tick = (now: number) => {
    this.raf = 0
    const items = this.items()
    const home = this.home()
    const hov = this.hovered && items.includes(this.hovered) ? this.hovered : null
    const target = hov ?? home
    if (!this.canvas && !target) return
    if (!this.canvas && !this.engage()) {
      if (target) this.raf = requestAnimationFrame(this.tick)
      return
    }
    const canvas = this.canvas!
    const g = this.g!
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const rm = reduced()

    // Canvas covers the container plus padding.
    const cr = this.el.getBoundingClientRect()
    const pad = this.cfg.pad
    const W = Math.round(cr.width + pad * 2)
    const H = Math.round(cr.height + pad * 2)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (canvas.dataset.w !== String(W) || canvas.dataset.h !== String(H)) {
      canvas.dataset.w = String(W)
      canvas.dataset.h = String(H)
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      canvas.style.left = -pad + 'px'
      canvas.style.top = -pad + 'px'
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      g.gl.viewport(0, 0, canvas.width, canvas.height)
    }
    this.unit = H / 2
    this.ccx = cr.left + cr.width / 2
    this.ccy = cr.top + cr.height / 2

    const zero: V3 = [0, 0, 0.3]
    let tc: V2 = this.b
    let trb: V3 = zero
    let tra: V3 = zero
    if (target) {
      const s = this.shapeFor(target, target === hov)
      tc = s.c
      trb = s.rb
      tra = s.ra
    }

    if (this.fresh) {
      // First frame: appear where the cursor came in, or sit on the home item.
      let sp: V2 = tc
      if (this.spawnAt && !home) {
        const r = canvas.getBoundingClientRect()
        const hh = r.height / 2
        sp = [(this.spawnAt.clientX - r.left - r.width / 2) / hh, -(this.spawnAt.clientY - r.top - r.height / 2) / hh]
        if (this.cfg.shape === 'line') sp = [sp[0], tc[1]]
      }
      this.a = [sp[0], sp[1]]
      this.b = [sp[0], sp[1]]
      if (home) {
        this.ra = cp(tra)
        this.rb = cp(trb)
      } else {
        this.ra = [0, 0, trb[2]]
        this.rb = [0, 0, trb[2]]
      }
      this.fresh = false
    }
    this.spawnAt = null

    if (rm) {
      this.a = [tc[0], tc[1]]
      this.b = [tc[0], tc[1]]
      this.ra = cp(tra)
      this.rb = cp(trb)
      this.spk.x = 0
      this.spk.v = 0
      this.press.x = this.pressT
    } else {
      const kb = 1 - Math.exp(-10.5 * dt)
      const ka = 1 - Math.exp(-5.2 * dt)
      const kr = 1 - Math.exp(-8 * dt)
      if (target) {
        this.b[0] += (tc[0] - this.b[0]) * kb
        this.b[1] += (tc[1] - this.b[1]) * kb
      }
      this.a[0] += (this.b[0] - this.a[0]) * ka
      this.a[1] += (this.b[1] - this.a[1]) * ka
      for (let i = 0; i < 3; i++) {
        this.rb[i] += (trb[i] - this.rb[i]) * kr
        this.ra[i] += (tra[i] - this.ra[i]) * kr
      }
      spring(this.press, this.pressT, dt, 420, 26)
      this.pulse = Math.max(0, this.pulse - dt * 2.2)
      // Ferrofluid spikes: strongest while the head is pulling away from the tail.
      const sep = Math.hypot(this.b[0] - this.a[0], this.b[1] - this.a[1])
      const want = this.cfg.spikes ? Math.min(1, sep * 4.5) + this.pulse * 0.6 + (hov ? this.cfg.hov : 0) : 0
      spikeSpring(this.spk, Math.min(1.2, want), dt)
    }

    // Which labels sit under the slime (they turn graphite).
    for (const it of items) {
      const s = this.shapeFor(it, false)
      const under = this.cfg.shape !== 'line' && this.cfg.shape !== 'dot' && Math.hypot(s.c[0] - this.b[0], s.c[1] - this.b[1]) < Math.max(0.4, s.rb[0] * 0.55) && this.rb[0] > 0.05
      it.classList.toggle('is-under', under)
    }

    const px = this.cfg.spS
    const { gl, U } = g
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(U.u_res, canvas.width, canvas.height)
    gl.uniform1f(U.u_time, rm ? 0 : now / 1000)
    gl.uniform2f(U.u_a, this.a[0], this.a[1])
    gl.uniform2f(U.u_b, this.b[0], this.b[1])
    gl.uniform3f(U.u_ra, this.ra[0], this.ra[1], this.ra[2])
    gl.uniform3f(U.u_rb, this.rb[0], this.rb[1], this.rb[2])
    gl.uniform1f(U.u_k, this.cfg.shape === 'line' ? 0.16 : this.cfg.shape === 'dot' ? 0.3 : 0.5)
    // Ferrofluid spikes (spikes.ts): the head is the magnet, the lagging drop a weaker second pole.
    gl.uniform2f(U.u_sp, this.b[0], this.b[1])
    gl.uniform2f(U.u_sp2, this.a[0], this.a[1])
    gl.uniform1f(U.u_spk, Math.min(1.4, this.spk.x))
    gl.uniform1f(U.u_spA, 0.6)
    gl.uniform1f(U.u_spS, px / this.unit)
    gl.uniform1f(U.u_spH, this.cfg.spH / this.unit)
    gl.uniform1f(U.u_spR, this.cfg.spR / this.unit)
    gl.uniform1f(U.u_spW, Math.min(1.2 * px / this.unit, 0.6 * Math.min(this.rb[0], this.rb[1])))
    gl.uniform1f(U.u_px, 2 / canvas.height)
    gl.uniform1f(U.u_still, rm ? 1 : 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    const retracted = !target && this.rb[0] < 0.01 && this.ra[0] < 0.01
    if (retracted) {
      this.teardown()
      return
    }
    // A resting slime keeps its surface alive; reduced motion stops once snapped.
    if (!rm || this.hovered || this.pressT) this.raf = requestAnimationFrame(this.tick)
  }
}

function group(cfg: Cfg) {
  return (el: HTMLElement | null) => {
    if (!el) return
    const s = new Slime(el, cfg)
    return () => s.dispose()
  }
}

export const slime = {
  // Everything is ferrofluid now (Melvin, 2026-11-20): spikes on every group, tuned to the size of the thing.
  cta: group({ shape: 'pill', spikes: true, pad: 34, spS: 9, spH: 15, spR: 46, hov: 0.3 }),
  links: group({ shape: 'line', spikes: true, pad: 16, spS: 4, spH: 7.5, spR: 20, hov: 0.7 }),
  line: group({ shape: 'line', spikes: true, pad: 16, spS: 4, spH: 7.5, spR: 20, hov: 0.7 }),
  dots: group({ shape: 'dot', spikes: true, pad: 14, spS: 3.2, spH: 5.5, spR: 12, hov: 0.7 }),
  arrow: group({ shape: 'round', spikes: true, pad: 14, spS: 5.5, spH: 10, spR: 22, hov: 0.55 }),
}
