import { useFrame, useThree } from '@react-three/fiber'
import { useFBO, ScreenQuad } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'

// Basic full-screen vertex shader
const vertexShader = `
varying vec2 v_uv;
void main() {
  // From the position, NOT the uv attribute: the drei ScreenQuad has none, so
  // uv read as (0,0) everywhere and the glass was never drawn (found 2026-11-27).
  v_uv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// Multi-pass blur shaders (Gaussian)
const hBlurShader = `
uniform sampler2D tDiffuse;
uniform float h;
varying vec2 v_uv;
void main() {
  vec4 sum = vec4(0.0);
  sum += texture2D(tDiffuse, vec2(v_uv.x - 4.0 * h, v_uv.y)) * 0.051;
  sum += texture2D(tDiffuse, vec2(v_uv.x - 3.0 * h, v_uv.y)) * 0.0918;
  sum += texture2D(tDiffuse, vec2(v_uv.x - 2.0 * h, v_uv.y)) * 0.12245;
  sum += texture2D(tDiffuse, vec2(v_uv.x - 1.0 * h, v_uv.y)) * 0.1531;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y)) * 0.1633;
  sum += texture2D(tDiffuse, vec2(v_uv.x + 1.0 * h, v_uv.y)) * 0.1531;
  sum += texture2D(tDiffuse, vec2(v_uv.x + 2.0 * h, v_uv.y)) * 0.12245;
  sum += texture2D(tDiffuse, vec2(v_uv.x + 3.0 * h, v_uv.y)) * 0.0918;
  sum += texture2D(tDiffuse, vec2(v_uv.x + 4.0 * h, v_uv.y)) * 0.051;
  gl_FragColor = sum;
}
`

const vBlurShader = `
uniform sampler2D tDiffuse;
uniform float v;
varying vec2 v_uv;
void main() {
  vec4 sum = vec4(0.0);
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y - 4.0 * v)) * 0.051;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y - 3.0 * v)) * 0.0918;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y - 2.0 * v)) * 0.12245;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y - 1.0 * v)) * 0.1531;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y)) * 0.1633;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y + 1.0 * v)) * 0.1531;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y + 2.0 * v)) * 0.12245;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y + 3.0 * v)) * 0.0918;
  sum += texture2D(tDiffuse, vec2(v_uv.x, v_uv.y + 4.0 * v)) * 0.051;
  gl_FragColor = sum;
}
`

// LIQUID GLASS, rebuilt 2026-11-27. The earlier pane was mostly blur with a
// bright frame. What makes glass read as LIQUID is: a clear middle, a curved
// bezel that visibly bends the scene (Snell's law over a squircle profile, the
// method in kube.io's write-up), colour fringing on that bend, one thin crisp
// highlight, and a surface that moves.
const glassFragmentShader = `
uniform sampler2D u_blurredBg;
uniform sampler2D u_bg;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_glassOnly;
uniform float u_frost;
uniform int u_numRects;
uniform vec4 u_rects[10]; // x, y, width, height in px, bottom-left origin
uniform float u_radii[10];
uniform float u_squircle;
uniform vec4 u_tint;
uniform vec2 u_mouse;
uniform float u_mouseActive;
uniform float u_time;
uniform float u_jelly;  // spring driven by scroll speed, about -1..1
uniform float u_motion; // 0 under reduced motion

varying vec2 v_uv;

float roundedRectSDF(vec2 p, vec2 half_, float r) {
  vec2 d = abs(p) - half_ + vec2(r);
  vec2 m = max(d, 0.0) + 1e-4;
  float outside = pow(pow(m.x, u_squircle) + pow(m.y, u_squircle), 1.0 / u_squircle);
  return min(max(d.x, d.y), 0.0) + outside - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Distance to the nearest pane, plus that pane's smaller half-size and centre.
float field(vec2 p, out float halfMin, out vec2 centre) {
  float d = 1e20;
  halfMin = 40.0;
  centre = p;
  float px = u_dpr;
  for (int i = 0; i < 10; i++) {
    if (i >= u_numRects) break;
    vec4 rc = u_rects[i];
    vec2 c = rc.xy + rc.zw * 0.5;
    vec2 h = rc.zw * 0.5;
    // jelly: taller and a touch narrower while the page is moving
    h.y += u_jelly * min(7.0 * px, h.y * 0.06);
    h.x -= u_jelly * min(3.0 * px, h.x * 0.02);
    float di = roundedRectSDF(p - c, h, min(u_radii[i], min(h.x, h.y)));
    if (di < d) { d = di; halfMin = min(h.x, h.y); centre = c; }
  }
  // the outline breathes, like the skin of a drop
  float wave = sin(p.x / px * 0.021 + u_time * 1.5) + sin(p.y / px * 0.026 - u_time * 1.2) + sin((p.x + p.y) / px * 0.011 + u_time * 0.7);
  d += wave * (0.55 + 1.6 * abs(u_jelly)) * px * u_motion;
  // a droplet under the finger or pointer that merges into a pane it nears
  if (u_mouseActive > 0.001 && d < 140.0 * px) {
    float near = 1.0 - smoothstep(20.0 * px, 140.0 * px, d);
    float drop = length(p - u_mouse) - 30.0 * px * u_mouseActive * near;
    d = smin(d, drop, 46.0 * px);
  }
  return d;
}

vec3 grab(sampler2D tex, vec2 uv) { return texture2D(tex, clamp(uv, vec2(0.001), vec2(0.999))).rgb; }

void main() {
  if (u_numRects == 0) { gl_FragColor = vec4(0.0); return; }
  float px = u_dpr;
  vec2 p = v_uv * u_resolution;
  float halfMin; vec2 centre;
  float d = field(p, halfMin, centre);

  // soft shadow below the pane
  float hm; vec2 hc;
  float ds = d < 60.0 * px ? field(p + vec2(0.0, 10.0 * px), hm, hc) : 1e5;
  float shadow = 0.38 * exp(-max(ds, 0.0) / (16.0 * px)) * step(ds, 59.0 * px);
  if (d > 1.0 * px) { gl_FragColor = vec4(0.0, 0.0, 0.0, shadow); return; }

  float e = 1.0 * px; float a_; vec2 b_;
  vec2 n = vec2(
    field(p + vec2(e, 0.0), a_, b_) - field(p - vec2(e, 0.0), a_, b_),
    field(p + vec2(0.0, e), a_, b_) - field(p - vec2(0.0, e), a_, b_)
  );
  n = normalize(n + vec2(1e-5));

  // bezel: how far in from the edge, 0 at the rim and 1 where the face is flat
  // narrower on phones, where the words sit close to the edge
  float widest = u_resolution.x < 768.0 * px ? 26.0 : 50.0;
  float bezel = min(widest * px, halfMin * 0.72);
  float t = clamp(-d / bezel, 0.015, 1.0);
  float q = 1.0 - t;
  float height = pow(1.0 - q * q * q * q, 0.25);
  float slope = q * q * q * pow(max(1.0 - q * q * q * q, 1e-3), -0.75);
  float inAngle = atan(slope);
  float outAngle = asin(sin(inAngle) / 1.5);
  float bend = tan(inAngle - outAngle) * (height + 0.8) * bezel * 1.35;

  // convex glass bends the view inward; the whole face also magnifies a little
  vec2 shift = -n * bend + (centre - p) * 0.035;
  float rim = 1.0 - smoothstep(0.0, 1.0, t);
  float frost = u_frost * smoothstep(0.15, 1.0, t);

  // colour fringes: red bends a little more than blue, only in the bezel
  vec2 uvR = v_uv + shift * mix(1.0, 1.1, rim) / u_resolution;
  vec2 uvG = v_uv + shift / u_resolution;
  vec2 uvB = v_uv + shift * mix(1.0, 0.9, rim) / u_resolution;
  vec3 col = vec3(
    mix(grab(u_bg, uvR).r, grab(u_blurredBg, uvR).r, frost),
    mix(grab(u_bg, uvG).g, grab(u_blurredBg, uvG).g, frost),
    mix(grab(u_bg, uvB).b, grab(u_blurredBg, uvB).b, frost)
  );

  // richer colour through the glass
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = max(mix(vec3(luma), col, 1.35), 0.0);
  // the face is shaded for the words on it; the bezel stays bright
  float face = smoothstep(0.25, 1.0, t);
  col *= mix(1.28, 1.0 / (1.0 + luma * 4.2), face);
  col = mix(col, u_tint.rgb, u_tint.a * face);
  col += vec3(0.0045, 0.0022, 0.0018);

  // one thin highlight, strongest where the edge faces the light, and again opposite
  vec2 light = normalize(vec2(-0.45, 0.9));
  if (u_mouseActive > 0.001) light = normalize(mix(light, normalize(u_mouse - p + vec2(1e-4)), 0.6 * u_mouseActive));
  float facing = dot(n, light);
  float line = 1.0 - smoothstep(0.0, 1.7 * px, -d);
  float spec = line * (0.05 + 0.62 * pow(max(facing, 0.0), 2.5) + 0.34 * pow(max(-facing, 0.0), 2.5));
  float sheen = pow(q, 4.0) * pow(abs(facing), 3.0) * 0.085;
  col += vec3(1.0, 0.86, 0.68) * (spec + sheen);

  float cover = 1.0 - smoothstep(-1.0 * px, 1.0 * px, d);
  gl_FragColor = vec4(col * cover, mix(shadow, 1.0, cover));
  gl_FragColor.rgb /= max(gl_FragColor.a, 1e-4);
}
`

/**
 * @param bgTexture When provided (e.g. the About video), the glass refracts THIS
 *   texture directly instead of capturing the 3D scene. The scene-capture path
 *   cannot reliably sample a VideoTexture, so on video pages we hand the texture
 *   straight to the shader and let the quad draw ONLY the glass shapes
 *   (transparent elsewhere), over the real background plane.
 */
export function LiquidGlassField({
  bgTexture,
  frost = 0,
}: {
  bgTexture?: THREE.Texture
  /** 0 = liquid lens; toward 1 = uniform frost (used on the hero). */
  frost?: number
}) {
  const { size } = useThree()

  // Phones capture at no more than 1.25x: the pane is frosted, so extra pixels
  // are invisible and cost frames on a screen that reports 3x.
  const dpr = size.width < 768 ? Math.min(1.25, window.devicePixelRatio) : window.devicePixelRatio
  const w = Math.max(1, size.width * dpr)
  const h = Math.max(1, size.height * dpr)

  // Render targets. The scene capture is full resolution (the glass samples it
  // sharply through the clear centre), but the BLUR targets are half res: the
  // blurred copy is only ever seen heavily defocused, so half the pixels is
  // invisible in the result and a quarter of the work. That matters now that
  // the hero runs this pipeline on top of a million-particle GPU simulation —
  // it keeps the added cost of the glass off the frame budget.
  const sceneFBO = useFBO(w, h)
  const halfW = Math.max(1, Math.round(w / 2))
  const halfH = Math.max(1, Math.round(h / 2))
  const vBlurFBO = useFBO(halfW, halfH)
  const hBlurFBO = useFBO(halfW, halfH)

  // Materials
  /* BLUR STRENGTH. The taps below are spaced BLUR_STEP css-pixels apart, and the
   * H/V pair is run BLUR_ITERATIONS times (ping-ponging between two targets), so
   * the effective radius is roughly BLUR_STEP * 4 * iterations.
   *
   * This used to be a 1px spacing with a single pass — about a 4px blur, which
   * is not frost, it is a slightly soft edge. That weak blur is a big part of
   * why the glass never read as glass: real frosted glass diffuses the backdrop
   * heavily. ~24px effective is in the range Apple's material sits at. */
  const BLUR_STEP = 1.8
  const BLUR_ITERATIONS = 2

  const vBlurMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, v: { value: BLUR_STEP / size.height } },
    vertexShader, fragmentShader: vBlurShader,
    depthWrite: false, depthTest: false
  }), [size.height])

  const hBlurMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, h: { value: BLUR_STEP / size.width } },
    vertexShader, fragmentShader: hBlurShader,
    depthWrite: false, depthTest: false
  }), [size.width])

  const glassMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      u_bg: { value: null },
      u_blurredBg: { value: null },
      u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
      u_dpr: { value: window.devicePixelRatio },
      // Glass properties. Retuned 2026-08-12 to iyinchao/liquid-glass-studio's
      // own DEFAULT preset (read straight off its Leva panel), because our old
      // values had the glare (the bright glassy rim) turned right down, so over
      // this site's near-black scenes the glass read as a flat dark panel. The
      // big change is Glare Intensity 30.6 -> 90 and angle -18 -> -45, which is
      // what actually makes the edge read as glass when there is little behind it
      // to refract. Tune further by dialling the studio demo and exporting a
      // preset; these are just the grounded baseline.
      /* RETUNED FOR OUR SHAPE SIZES (2026-08-12), verified by rendering this
       * exact shader math over a mock hero background in the browser.
       *
       * THE BUG THIS FIXES: the reference's defaults are tuned for a ~200px
       * demo circle. Both the glare and the fresnel terms produce a highlight
       * band whose THICKNESS IN PIXELS is roughly
       *     hardness * range^2 * 0.006
       * so the shipped hardness of 20 at range 30 gave a **108px** band. On a
       * 200px circle that is a rim; on our 1060px-wide panels it is a giant
       * white slab across the top and bottom, and it blew out to pure white.
       * Solving that expression for a thin rim gives the values below:
       *   glare hardness 1.48 -> an 8px rim, fresnel hardness 0.93 -> 5px.
       * Refraction likewise: thickness 20 x scale 4 bent the backdrop by up to
       * 78px inside a 20px edge, which smeared into visible wedges. A wider,
       * gentler lens (58 x 1.15) reads as glass instead of as a defect. */
      u_refThickness: { value: 58.0 },
      u_refFactor: { value: 1.4 },
      u_refScale: { value: 1.15 },
      u_refDispersion: { value: 8.0 },
      u_refFresnelRange: { value: 30.0 },
      u_refFresnelHardness: { value: 0.93 },
      u_refFresnelFactor: { value: 9.0 },
      u_refDispersionVal: { value: 8.0 },
      u_glareRange: { value: 30.0 },
      u_glareHardness: { value: 1.48 },
      u_glareFactor: { value: 17.0 },
      u_glareConvergence: { value: 9.0 },
      u_glareOppositeFactor: { value: 6.0 },
      u_glareAngle: { value: -45.0 * (Math.PI / 180.0) },
      u_shadowExpand: { value: 25.0 },
      u_shadowFactor: { value: 15.0 },
      u_shadowPosition: { value: new THREE.Vector2(0, -10) },
      // A dark wine tint so cream text stays readable over the bright light
      // sheet (2026-11-27). Linear values, so they look lighter than they read.
      u_tint: { value: new THREE.Vector4(0.006, 0.0012, 0.001, 0.3) },
      u_glassOnly: { value: 0.0 },
      u_frost: { value: 0.0 },
      // Squircle corners (2 = plain rounded rect). 4.2 is close to Apple's
      // continuous-curvature corner without looking like a lozenge.
      u_squircle: { value: 3.0 },
      // The "material" over a near-black scene — see glassLift() in the shader.
      u_brightness: { value: 1.08 },
      u_saturation: { value: 1.28 },
      u_whiteFill: { value: 0.006 },
      // Pointer-as-light.
      u_mouse: { value: new THREE.Vector2(-9999, -9999) },
      u_mouseActive: { value: 0.0 },
      u_specular: { value: 0.55 },
      u_time: { value: 0.0 },
      u_jelly: { value: 0.0 },
      u_motion: { value: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.0 : 1.0 },
      // DOM rects tracking
      u_numRects: { value: 0 },
      u_rects: { value: Array(10).fill(new THREE.Vector4()) },
      u_radii: { value: Array(10).fill(0.0) }
    },
    vertexShader, fragmentShader: glassFragmentShader,
    depthWrite: false, depthTest: false,
    transparent: true
  }), [size])

  // Update sizes on resize
  useEffect(() => {
    vBlurMat.uniforms.v.value = BLUR_STEP / Math.max(1, size.height)
    hBlurMat.uniforms.h.value = BLUR_STEP / Math.max(1, size.width)
    glassMat.uniforms.u_resolution.value.set(
      Math.max(1, size.width * window.devicePixelRatio),
      Math.max(1, size.height * window.devicePixelRatio)
    )
    glassMat.uniforms.u_dpr.value = window.devicePixelRatio
  }, [size, vBlurMat, hBlurMat, glassMat])

  // Push the frost amount to the shader whenever the page (prop) changes.
  useEffect(() => {
    glassMat.uniforms.u_frost.value = frost
  }, [frost, glassMat])

  /* POINTER AS A LIGHT SOURCE. Tracked on the window (not the canvas) so it
   * still works while the cursor is over DOM content sitting above the scene,
   * which is most of the page. Stored in PHYSICAL pixels with a bottom-left
   * origin, because that is the space the shader's rects and SDF work in.
   * Touch devices never set it active, so they simply get the static glass. */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = window.devicePixelRatio
      pointer.current.x = e.clientX * d
      pointer.current.y = (window.innerHeight - e.clientY) * d
      if (pointer.current.on === 0) glassMat.uniforms.u_mouse.value.set(pointer.current.x, pointer.current.y)
      pointer.current.on = 1
    }
    const onLeave = () => {
      pointer.current.on = 0
    }
    // A finger counts too: the droplet follows it while it touches the screen.
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onLeave, { passive: true })
    window.addEventListener('pointercancel', onLeave, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onLeave)
      window.removeEventListener('pointercancel', onLeave)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [glassMat])

  // Setup offscreen scenes for blur passes
  const blurCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])
  const vBlurScene = useMemo(() => {
    const s = new THREE.Scene()
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), vBlurMat))
    return s
  }, [vBlurMat])
  const hBlurScene = useMemo(() => {
    const s = new THREE.Scene()
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hBlurMat))
    return s
  }, [hBlurMat])

  const meshRef = useRef<THREE.Mesh>(null)

  const pointer = useRef({ x: -9999, y: -9999, on: 0 })
  const spring = useRef({ pos: 0, vel: 0, lastY: 0 })

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Jelly: scroll speed pushes a damped spring, which overshoots and settles.
    const dt = Math.min(delta, 1 / 30)
    const sp = spring.current
    const y = window.scrollY
    const target = Math.max(-1, Math.min(1, (y - sp.lastY) / Math.max(dt, 1e-3) / 1800))
    sp.lastY = y
    sp.vel += ((target - sp.pos) * 140 - sp.vel * 11) * dt
    sp.pos += sp.vel * dt
    glassMat.uniforms.u_jelly.value = glassMat.uniforms.u_motion.value * Math.max(-1.2, Math.min(1.2, sp.pos))
    const ease = 1 - Math.exp(-dt * 12)
    const m = glassMat.uniforms.u_mouse.value
    m.x += (pointer.current.x - m.x) * ease
    m.y += (pointer.current.y - m.y) * ease
    glassMat.uniforms.u_mouseActive.value += (pointer.current.on - glassMat.uniforms.u_mouseActive.value) * (1 - Math.exp(-dt * 7))

    glassMat.uniforms.u_time.value = state.clock.elapsedTime

    /* Run the separable Gaussian BLUR_ITERATIONS times, ping-ponging between the
     * two blur targets. Each round widens the kernel, which is how we get a real
     * frost out of a cheap 9-tap shader instead of one narrow pass. Returns the
     * texture holding the final blurred image. */
    const runBlur = (source: THREE.Texture): THREE.Texture => {
      let src = source
      for (let i = 0; i < BLUR_ITERATIONS; i++) {
        vBlurMat.uniforms.tDiffuse.value = src
        state.gl.setRenderTarget(vBlurFBO)
        state.gl.render(vBlurScene, blurCamera)

        hBlurMat.uniforms.tDiffuse.value = vBlurFBO.texture
        state.gl.setRenderTarget(hBlurFBO)
        state.gl.render(hBlurScene, blurCamera)

        src = hBlurFBO.texture
      }
      return src
    }

    // Sync DOM elements to uniforms
    // Only in the glass style; the frost and clay styles are plain CSS.
    const els: Element[] =
      document.documentElement.dataset.box === 'glass'
        ? Array.from(document.querySelectorAll('.sync-glass-rect, .text-box'))
        : []

    // No glass shapes on screen (e.g. the info tabs were removed) → skip the
    // ENTIRE render pipeline (scene capture + 2 blur passes). Otherwise we'd
    // burn 3 full-screen renders every frame for nothing. Hide the quad so it
    // doesn't draw a stale frame, then bail.
    if (els.length === 0) {
      meshRef.current.visible = false
      glassMat.uniforms.u_numRects.value = 0
      return
    }
    meshRef.current.visible = true
    const rects: THREE.Vector4[] = []
    const radii: number[] = []
    const dpr = window.devicePixelRatio
    const vh = window.innerHeight

    // The shader holds at most 10 shapes. A long page can have many more
    // `.sync-glass-rect` cards than that, so only feed the shader the ones that
    // are actually ON SCREEN (or just off it) — otherwise the first 10 in DOM
    // order eat all the slots and visible cards lower down get no glass.
    els.forEach((el) => {
      if (rects.length >= 10) return
      // A box inside a closed Work section still has a size; do not draw it.
      if (el.closest('[class*="grid-rows-[0fr]"]')) return
      const rect = el.getBoundingClientRect()
      if (rect.bottom < -50 || rect.top > vh + 50) return // off-screen vertically
      // Also skip boxes panned off-screen HORIZONTALLY (the hero frames slide
      // sideways). Without this the glass pipeline runs every frame on the hero
      // even when no box is visible.
      if (rect.right < -50 || rect.left > window.innerWidth + 50) return
      const style = window.getComputedStyle(el)
      const radius = parseFloat(style.borderRadius) || 0

      // Multiply everything by DPR so the shader works in physical pixels
      rects.push(new THREE.Vector4(
        rect.left * dpr,
        (vh - rect.bottom) * dpr, // flip Y using window height
        rect.width * dpr,
        rect.height * dpr
      ))
      radii.push(radius * dpr)
    })

    // Everything scrolled off-screen → nothing to draw this frame.
    if (rects.length === 0) {
      meshRef.current.visible = false
      glassMat.uniforms.u_numRects.value = 0
      return
    }

    glassMat.uniforms.u_numRects.value = rects.length
    for (let i = 0; i < rects.length; i++) {
      glassMat.uniforms.u_rects.value[i] = rects[i]
      glassMat.uniforms.u_radii.value[i] = radii[i]
    }

    if (bgTexture) {
      // DIRECT-TEXTURE MODE (video pages). Refract the supplied texture straight
      // — no scene capture (which can't grab a VideoTexture). The quad draws only
      // the glass shapes; everything outside is transparent so the real dimmed
      // background plane shows through. The blur is run on the source texture.
      glassMat.uniforms.u_glassOnly.value = 1.0

      const blurred = runBlur(bgTexture)

      state.gl.setRenderTarget(null)
      glassMat.uniforms.u_bg.value = bgTexture
      glassMat.uniforms.u_blurredBg.value = blurred
      return
    }

    // SCENE-CAPTURE MODE (generic). The quad draws ONLY the glass shapes and is
    // transparent everywhere else.
    //
    // This used to run opaque, reproducing the whole captured scene across the
    // full screen. That was safe while the hero had no glass shapes (the quad
    // stayed hidden), but now that Home has them, a full-screen opaque quad
    // would paint over the particle mask with a one-frame-stale copy of it —
    // and blank the hero outright on any frame where the capture hasn't run.
    // Drawing only the shapes leaves the real scene to render itself.
    glassMat.uniforms.u_glassOnly.value = 1.0

    // Hide glass to capture background
    meshRef.current.visible = false

    // 1. Capture main scene
    state.gl.setRenderTarget(sceneFBO)
    state.gl.render(state.scene, state.camera)

    // 2. Blur it (multi-pass — see runBlur)
    const blurredScene = runBlur(sceneFBO.texture)

    // Restore render target and bind textures to glass
    state.gl.setRenderTarget(null)
    meshRef.current.visible = true
    glassMat.uniforms.u_bg.value = sceneFBO.texture
    glassMat.uniforms.u_blurredBg.value = blurredScene
  })

  // Render a full-screen quad over the camera
  return (
    <ScreenQuad ref={meshRef} material={glassMat} renderOrder={999} />
  )
}
