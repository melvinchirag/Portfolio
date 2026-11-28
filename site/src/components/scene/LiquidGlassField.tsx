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

// TINTED LIQUID GLASS, 2026-11-27. Melvin: a dark fill reads as black paint,
// "the glass itself should be tainted". So nothing here paints over the scene.
// The pane is a dyed solid:
//   * light passing through is multiplied by the dye (Beer-Lambert), more along
//     the longer path at the curved edge, so the colour deepens there;
//   * the dye picks up the surrounding light, so the pane has a colour of its own
//     even over black;
//   * the surface reflects: two soft lamps glint on the bevel, and light that
//     crosses the glass pools along the far edge.
// u_clear = 1 is undyed crystal (the social buttons).
const glassFragmentShader = `
uniform sampler2D u_blurredBg;
uniform sampler2D u_bg;
uniform sampler2D u_ambient;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_frost;
uniform int u_numRects;
uniform vec4 u_rects[10]; // x, y, width, height in px, bottom-left origin
uniform float u_radii[10];
uniform float u_fluid[10]; // 1 = moves like liquid, 0 = still glass
uniform float u_glow[10];  // slow bloom of a pane that asks to be pressed
uniform float u_clear[10]; // 1 = crystal without dye
uniform float u_squircle;
uniform vec3 u_dye;        // share of light that crosses the face, per channel (linear)
uniform vec2 u_mouse;
uniform float u_mouseActive;
uniform float u_time;
uniform float u_jelly;  // spring driven by scroll speed, about -1..1
uniform float u_motion; // 0 under reduced motion

varying vec2 v_uv;

struct Pane { vec2 centre; vec2 size; float clear; };

float roundedRectSDF(vec2 p, vec2 half_, float r) {
  // a fully round pane is a true circle, not a squircle
  float n = r >= min(half_.x, half_.y) - 0.5 ? 2.0 : u_squircle;
  vec2 d = abs(p) - half_ + vec2(r);
  vec2 m = max(d, 0.0) + 1e-4;
  float outside = pow(pow(m.x, n) + pow(m.y, n), 1.0 / n);
  return min(max(d.x, d.y), 0.0) + outside - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Distance to the nearest pane, plus what that pane is.
float field(vec2 p, out Pane pane) {
  float fluid = 0.0;
  float d = 1e20;
  pane = Pane(p, vec2(40.0), 0.0);
  float px = u_dpr;
  for (int i = 0; i < 10; i++) {
    if (i >= u_numRects) break;
    vec4 rc = u_rects[i];
    vec2 c = rc.xy + rc.zw * 0.5;
    vec2 h = rc.zw * 0.5;
    // jelly: taller and a touch narrower while the page is moving
    h.y += u_jelly * u_fluid[i] * min(3.5 * px, h.y * 0.03);
    h.x -= u_jelly * u_fluid[i] * min(1.5 * px, h.x * 0.01);
    float di = roundedRectSDF(p - c, h, min(u_radii[i], min(h.x, h.y)));
    if (di < d) { d = di; pane = Pane(c, h, u_clear[i]); fluid = u_fluid[i]; }
  }
  // the outline breathes, like the skin of a drop
  float wave = sin(p.x / px * 0.012 + u_time * 0.9) + sin(p.y / px * 0.015 - u_time * 0.75) + sin((p.x + p.y) / px * 0.007 + u_time * 0.5);
  d += wave * (0.16 + 0.55 * abs(u_jelly)) * px * u_motion * fluid;
  // a droplet under the finger or pointer that merges into a pane it nears
  if (u_mouseActive * fluid > 0.001 && d < 120.0 * px) {
    float near = 1.0 - smoothstep(15.0 * px, 110.0 * px, d);
    float drop = length(p - u_mouse) - 19.0 * px * u_mouseActive * near;
    d = smin(d, drop, 30.0 * px);
  }
  return d;
}

// Light spilling from the panes that are blooming: a soft ring, and how strong
// the bloom is for the pane under this pixel.
vec2 bloomAt(vec2 p) {
  float halo = 0.0;
  float inside = 0.0;
  for (int i = 0; i < 10; i++) {
    if (i >= u_numRects) break;
    if (u_glow[i] <= 0.0) continue;
    vec4 rc = u_rects[i];
    float r = min(rc.z, rc.w) * 0.5;
    float di = length(p - (rc.xy + rc.zw * 0.5)) - r;
    float reach = (7.0 + 9.0 * u_glow[i]) * u_dpr;
    halo = max(halo, u_glow[i] * exp(-pow(max(di, 0.0) / reach, 1.35)));
    if (di < 1.0 * u_dpr) inside = u_glow[i];
  }
  return vec2(halo, inside);
}

vec3 grab(sampler2D tex, vec2 uv) { return texture2D(tex, clamp(uv, vec2(0.001), vec2(0.999))).rgb; }

// One colour of the spectrum, seen through the glass.
vec3 seen(vec2 shift, float frost) {
  vec2 uv = v_uv + shift / u_resolution;
  return mix(grab(u_bg, uv), grab(u_blurredBg, uv), frost);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  if (u_numRects == 0) { gl_FragColor = vec4(0.0); return; }
  float px = u_dpr;
  vec2 p = v_uv * u_resolution;
  Pane pane;
  float d = field(p, pane);

  // the shadow of dyed glass: soft, and not very dark
  Pane below;
  float ds = d < 60.0 * px ? field(p + vec2(0.0, 11.0 * px), below) : 1e5;
  float shadow = mix(0.3, 0.16, below.clear) * exp(-max(ds, 0.0) / (17.0 * px)) * step(ds, 59.0 * px);
  vec2 bloom = bloomAt(p);
  vec3 bloomColour = vec3(0.95, 0.2, 0.035);
  if (d > 1.0 * px) {
    float light = bloom.x * 0.36;
    float a = light + shadow * (1.0 - light);
    gl_FragColor = vec4(bloomColour * (light / max(a, 1e-4)), a);
    return;
  }

  float e = 1.0 * px; Pane skip;
  vec2 n = vec2(
    field(p + vec2(e, 0.0), skip) - field(p - vec2(e, 0.0), skip),
    field(p + vec2(0.0, e), skip) - field(p - vec2(0.0, e), skip)
  );
  n = normalize(n + vec2(1e-5));

  float clear = pane.clear;
  float halfMin = min(pane.size.x, pane.size.y);
  // bezel: how far in from the edge, 0 at the rim and 1 where the face is flat
  // narrower on phones, where the words sit close to the edge
  float widest = u_resolution.x < 768.0 * px ? 22.0 : 36.0;
  float bezel = min(widest * px, halfMin * mix(0.72, 0.9, clear));
  float t = clamp(-d / bezel, 0.015, 1.0);
  float q = 1.0 - t;
  float height = pow(1.0 - q * q * q * q, 0.25);
  float slope = q * q * q * pow(max(1.0 - q * q * q * q, 1e-3), -0.75);
  float inAngle = atan(slope);
  float outAngle = asin(sin(inAngle) / 1.5);
  float bend = tan(inAngle - outAngle) * (height + 0.7) * bezel * 1.05;

  // convex glass bends the view inward; the whole face also magnifies a little
  vec2 shift = -n * bend + (pane.centre - p) * mix(0.018, 0.16, clear);
  float rim = 1.0 - smoothstep(0.0, 1.0, t);
  float frost = u_frost * smoothstep(0.15, 1.0, t) * (1.0 - clear);

  // dispersion: five slices of the spectrum, each bent by its own amount
  float spread = rim * mix(0.11, 0.17, clear);
  vec3 s0 = seen(shift * (1.0 + spread), frost);
  vec3 s1 = seen(shift * (1.0 + spread * 0.5), frost);
  vec3 s2 = seen(shift, frost);
  vec3 s3 = seen(shift * (1.0 - spread * 0.5), frost);
  vec3 s4 = seen(shift * (1.0 - spread), frost);
  vec3 col = vec3(
    s0.r * 0.5 + s1.r * 0.35 + s2.r * 0.15,
    s1.g * 0.25 + s2.g * 0.5 + s3.g * 0.25,
    s2.b * 0.15 + s3.b * 0.35 + s4.b * 0.5
  );
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = max(mix(vec3(luma), col, 1.18), 0.0);

  // THE DYE. The path through the glass is longest where the surface curves.
  float path = 1.0 + 0.85 * q * q;
  vec3 dye = mix(u_dye, vec3(0.97, 0.9, 0.84), clear);
  col *= pow(dye, vec3(path));
  // very bright light is rolled off, keeping its colour, so words stay readable
  col /= 1.0 + max(col.r, max(col.g, col.b)) * 0.9 * (1.0 - clear) * smoothstep(0.1, 0.9, t);

  // the dye catches the light around it, so the pane has a body even over black
  vec3 amb = grab(u_ambient, v_uv + shift * 0.4 / u_resolution);
  float ambL = dot(amb, vec3(0.299, 0.587, 0.114));
  vec2 local = (p - pane.centre) / pane.size; // -1..1 across the pane
  float sky = smoothstep(-1.0, 1.0, local.y);
  vec3 body = vec3(0.0095, 0.0016, 0.0018) * (0.55 + 0.9 * sky) + vec3(0.115, 0.02, 0.014) * ambL + amb * 0.035;
  col += body * (1.0 - clear);

  // surface reflection
  vec3 N = normalize(vec3(n * min(slope, 5.0), 1.0));
  vec2 lamp = normalize(vec2(-0.5, 0.87));
  if (u_mouseActive > 0.001) lamp = normalize(mix(lamp, normalize(u_mouse - p + vec2(1e-4)), 0.55 * u_mouseActive));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H1 = normalize(normalize(vec3(lamp, 0.55)) + V);
  vec3 H2 = normalize(normalize(vec3(-lamp, 0.4)) + V);
  float glint = pow(max(dot(N, H1), 0.0), 38.0);
  float glint2 = pow(max(dot(N, H2), 0.0), 26.0);
  float fres = pow(1.0 - N.z, 2.2);
  // what the bevel mirrors: whatever glows just outside it
  vec3 around = grab(u_blurredBg, v_uv + n * 38.0 * px / u_resolution);
  vec3 warm = min(vec3(1.0, 0.5, 0.25) * 0.55 + around * 1.1, vec3(1.1, 0.62, 0.34));
  float curved = smoothstep(0.0, 0.5, q);
  col += warm * glint * curved * mix(0.34, 0.62, clear);
  col += vec3(1.0, 0.16, 0.07) * glint2 * curved * mix(0.2, 0.34, clear);
  col += (around * 0.55 + vec3(0.03, 0.008, 0.005)) * fres * 0.7;

  // the hairline where light leaves the edge, and the fainter one where the
  // bevel meets the face: the two together show the glass has thickness
  float line = 1.0 - smoothstep(0.0, 1.5 * px, -d);
  float facing = dot(n, lamp);
  col += warm * line * (0.07 + 0.75 * pow(abs(facing), 3.0));
  float inner = exp(-pow((-d - bezel * 0.62) / (1.3 * px), 2.0));
  col += warm * inner * pow(max(-facing, 0.0), 2.0) * 0.07;
  // light that crossed the pane pools against the far side, in the dye's colour
  float pool = pow(max(-facing, 0.0), 2.0) * smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.25, 1.0, t));
  col += mix(vec3(0.5, 0.075, 0.03), vec3(0.7, 0.3, 0.14), clear) * pool * (0.07 + ambL * 0.9);

  // a long, faint reflection lying across the face
  float band = exp(-pow((local.y - 0.55 - 0.22 * local.x) / 0.34, 2.0)) * smoothstep(0.35, 1.0, t);
  col += vec3(0.011, 0.0042, 0.0028) * band * mix(1.0, 2.6, clear);

  // the same bloom warms the rim and the heart of the bead that owns it
  col += bloomColour * bloom.y * (0.22 * pow(q, 2.0) + 0.022) + vec3(1.0, 0.45, 0.14) * bloom.y * line * 0.3;

  // dither, so the deep reds shade smoothly instead of stepping
  col = max(col + (hash(p) - 0.5) * (0.0011 + 0.006 * col), 0.0);

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

  /* A third, much wider blur at an eighth of the size: the light AROUND each
   * pixel, which is what gives dyed glass its own colour. */
  const eighthW = Math.max(1, Math.round(w / 8))
  const eighthH = Math.max(1, Math.round(h / 8))
  const ambVFBO = useFBO(eighthW, eighthH)
  const ambHFBO = useFBO(eighthW, eighthH)

  const glassMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      u_bg: { value: null },
      u_blurredBg: { value: null },
      u_ambient: { value: null },
      u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
      u_dpr: { value: window.devicePixelRatio },
      // Garnet smoke. Linear light, so it looks lighter than the numbers read.
      u_dye: { value: new THREE.Vector3(0.46, 0.19, 0.15) },
      u_frost: { value: 0.0 },
      // Squircle corners (2 = plain rounded rect).
      u_squircle: { value: 3.0 },
      // Pointer-as-light.
      u_mouse: { value: new THREE.Vector2(-9999, -9999) },
      u_mouseActive: { value: 0.0 },
      u_time: { value: 0.0 },
      u_jelly: { value: 0.0 },
      u_motion: { value: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.0 : 1.0 },
      // DOM rects tracking
      u_numRects: { value: 0 },
      u_rects: { value: Array(10).fill(new THREE.Vector4()) },
      u_radii: { value: Array(10).fill(0.0) },
      u_fluid: { value: Array(10).fill(1.0) },
      u_glow: { value: Array(10).fill(0.0) },
      u_clear: { value: Array(10).fill(0.0) }
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

    // The wide blur: the same two shaders with the taps far apart.
    const runAmbient = (source: THREE.Texture): THREE.Texture => {
      const near = [vBlurMat.uniforms.v.value, hBlurMat.uniforms.h.value]
      let src = source
      for (const spread of [6, 10]) {
        vBlurMat.uniforms.v.value = spread / Math.max(1, size.height)
        hBlurMat.uniforms.h.value = spread / Math.max(1, size.width)
        vBlurMat.uniforms.tDiffuse.value = src
        state.gl.setRenderTarget(ambVFBO)
        state.gl.render(vBlurScene, blurCamera)
        hBlurMat.uniforms.tDiffuse.value = ambVFBO.texture
        state.gl.setRenderTarget(ambHFBO)
        state.gl.render(hBlurScene, blurCamera)
        src = ambHFBO.texture
      }
      vBlurMat.uniforms.v.value = near[0]
      hBlurMat.uniforms.h.value = near[1]
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
    const fluid: number[] = []
    const glow: number[] = []
    const clear: number[] = []
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
      // The contact area is glass that holds still: forms should not wobble.
      fluid.push(el.closest('#contact, [role="tabpanel"]') ? 0 : 1)
      // Buttons bloom slowly, one after the next round the ring (six seconds a
      // breath), and light fully under the pointer.
      if (el.classList.contains('social-glass')) {
        const i = Number((el.parentElement as HTMLElement | null)?.style.getPropertyValue('--i') || 0)
        const breath = Math.pow(0.5 + 0.5 * Math.sin((state.clock.elapsedTime * Math.PI * 2) / 6 - (i * Math.PI) / 3), 2)
        glow.push(el.matches(':hover, :focus-visible') ? 1 : glassMat.uniforms.u_motion.value ? 0.12 + 0.6 * breath : 0.4)
      } else glow.push(0)
      clear.push(el.classList.contains('social-glass') ? 1 : 0)
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
      glassMat.uniforms.u_fluid.value[i] = fluid[i]
      glassMat.uniforms.u_glow.value[i] = glow[i]
      glassMat.uniforms.u_clear.value[i] = clear[i]
    }

    if (bgTexture) {
      // DIRECT-TEXTURE MODE (video pages). Refract the supplied texture straight
      // — no scene capture (which can't grab a VideoTexture). The quad draws only
      // the glass shapes; everything outside is transparent so the real dimmed
      // background plane shows through. The blur is run on the source texture.
      const blurred = runBlur(bgTexture)
      glassMat.uniforms.u_ambient.value = runAmbient(blurred)

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
    // Hide glass to capture background
    meshRef.current.visible = false

    // 1. Capture main scene
    state.gl.setRenderTarget(sceneFBO)
    state.gl.render(state.scene, state.camera)

    // 2. Blur it (multi-pass — see runBlur)
    const blurredScene = runBlur(sceneFBO.texture)
    const ambient = runAmbient(blurredScene)

    // Restore render target and bind textures to glass
    state.gl.setRenderTarget(null)
    meshRef.current.visible = true
    glassMat.uniforms.u_bg.value = sceneFBO.texture
    glassMat.uniforms.u_blurredBg.value = blurredScene
    glassMat.uniforms.u_ambient.value = ambient
  })

  // Render a full-screen quad over the camera
  return (
    <ScreenQuad ref={meshRef} material={glassMat} renderOrder={999} />
  )
}
