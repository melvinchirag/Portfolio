import { useFrame, useThree } from '@react-three/fiber'
import { useFBO, ScreenQuad } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'

// Basic full-screen vertex shader
const vertexShader = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position, 1.0);
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

// SDF and Glass physics shader (Ported from iyinchao)
const glassFragmentShader = `
uniform sampler2D u_blurredBg;
uniform sampler2D u_bg;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_refThickness;
uniform float u_refFactor;
uniform float u_refScale;
uniform float u_refDispersion;
uniform float u_refFresnelRange;
uniform float u_refFresnelHardness;
uniform float u_refFresnelFactor;
uniform float u_glareRange;
uniform float u_glareHardness;
uniform float u_glareFactor;
uniform float u_glareConvergence;
uniform float u_glareOppositeFactor;
uniform float u_glareAngle;
uniform float u_shadowExpand;
uniform float u_shadowFactor;
uniform vec2 u_shadowPosition;
uniform vec4 u_tint;
// When 1.0, everything OUTSIDE the glass shapes is output fully transparent so the
// real background plane (e.g. the About video) shows through untouched, and the
// quad only contributes refraction inside the shapes. When 0.0 (scene-capture
// mode) the quad is opaque and reproduces the whole captured scene.
uniform float u_glassOnly;

uniform int u_numRects;
uniform vec4 u_rects[10]; // x, y, width, height (in CSS pixels, from center of screen)
uniform float u_radii[10]; // corner radii

varying vec2 v_uv;

const float PI = 3.14159265359;
uniform float u_refDispersionVal;
#define N_R (1.0 - u_refDispersionVal * 0.01)
#define N_G 1.0
#define N_B (1.0 + u_refDispersionVal * 0.01)

// SDF functions
float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius) {
  p -= center;
  vec2 d = abs(p) - vec2(width, height) * 0.5 + vec2(cornerRadius);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - cornerRadius;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Evaluate SDF for all DOM rectangles
float mainSDF(vec2 p) {
  float d = 1e20;
  // Convert from pixel space to UV space? No, work in screen pixels for accurate SDF
  vec2 pixelPos = p * u_resolution; // (0 to width, 0 to height)
  
  for(int i = 0; i < 10; i++) {
    if (i >= u_numRects) break;
    // u_rects are in screen pixel coordinates (bottom-left origin for GL)
    // Actually, bounding client rect is top-left origin.
    // We'll pass them in bottom-left origin to match GL.
    vec2 center = vec2(u_rects[i].x + u_rects[i].z * 0.5, u_rects[i].y + u_rects[i].w * 0.5);
    // Radii is also passed in physical pixels now
    float rectD = roundedRectSDF(pixelPos, center, u_rects[i].z, u_rects[i].w, u_radii[i]);
    // Merge smoothly (metaball effect)
    if (i == 0) {
      d = rectD;
    } else {
      d = smin(d, rectD, 12.0 * u_dpr); // smooth merge radius
    }
  }
  return d;
}

vec2 getNormal(vec2 p) {
  float eps = 1.0; // 1 pixel
  vec2 e = vec2(eps / u_resolution.x, 0.0);
  vec2 ey = vec2(0.0, eps / u_resolution.y);
  float dx = mainSDF(p + e) - mainSDF(p - e);
  float dy = mainSDF(p + ey) - mainSDF(p - ey);
  return normalize(vec2(dx, dy));
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float vec2ToAngle(vec2 v) {
  float angle = atan(v.y, v.x);
  if (angle < 0.0) angle += 2.0 * PI;
  return angle;
}

float safeAsin(float x) {
  return asin(clamp(x, -1.0, 1.0));
}

vec4 getTextureDispersion(sampler2D tex1, sampler2D tex2, float mixRate, vec2 offset, float factor) {
  vec4 pixel = vec4(1.0);
  float bgR = texture2D(tex1, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  float bgG = texture2D(tex1, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  float bgB = texture2D(tex1, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;

  float blurR = texture2D(tex2, v_uv + offset * (1.0 - (N_R - 1.0) * factor)).r;
  float blurG = texture2D(tex2, v_uv + offset * (1.0 - (N_G - 1.0) * factor)).g;
  float blurB = texture2D(tex2, v_uv + offset * (1.0 - (N_B - 1.0) * factor)).b;

  pixel.r = mix(bgR, blurR, mixRate);
  pixel.g = mix(bgG, blurG, mixRate);
  pixel.b = mix(bgB, blurB, mixRate);
  return pixel;
}

void main() {
  if (u_numRects == 0) {
    gl_FragColor = texture2D(u_bg, v_uv);
    return;
  }

  float merged = mainSDF(v_uv); // SDF distance in pixels
  vec4 outColor = vec4(0.0);
  float outA = 1.0; // final alpha (dropped to 0 outside the glass in glass-only mode)

  if (merged < 0.0) {
    // ---- Inside the glass: refract the background like a liquid lens ----
    vec2 normal = getNormal(v_uv);
    float nmerged = -merged; // positive depth inside the shape

    // Snell's-law bend: strong near the thin rim, ~0 across the flat centre —
    // this is what makes the centre read as CLEAR glass and the edges as a lens.
    float x_R_ratio = clamp(1.0 - nmerged / u_refThickness, 0.0, 1.0);
    float thetaI = safeAsin(pow(x_R_ratio, 2.0));
    float thetaT = safeAsin((1.0 / u_refFactor) * sin(thetaI));
    float edgeFactor = -tan(thetaT - thetaI);
    if (nmerged >= u_refThickness) edgeFactor = 0.0;

    // Displace the sample point along the surface normal so the background
    // visibly bends/magnifies through the glass (the "liquid" read). Scaled in
    // pixels then converted to UV, so it is resolution-independent. u_refScale is
    // the single tuning knob for how hard the lens bends.
    vec2 offset = (normal * edgeFactor * u_refThickness * u_refScale) / u_resolution;

    // blurEdge (JSON): the centre samples the SHARP background (clear), and only
    // the refracting rim blends toward the blurred copy — a frosted rim, clear
    // core. Chromatic dispersion splits R/G/B along the same offset.
    float edgeBlur = clamp(edgeFactor * 5.0, 0.0, 1.0);
    outColor = getTextureDispersion(u_bg, u_blurredBg, edgeBlur, offset, u_refDispersion);

    // Optional glass tint (alpha is 0 in the JSON → this is a no-op, kept for spec parity).
    outColor = mix(outColor, vec4(u_tint.rgb, 1.0), u_tint.a);

    // Fresnel rim — a bright hairline where the glass turns away at the edge.
    float fresnelFactor = clamp(
      pow(1.0 + merged / 1500.0 * pow(500.0 / u_refFresnelRange, 2.0) + u_refFresnelHardness, 5.0),
      0.0, 1.0
    );
    outColor.rgb += vec3(fresnelFactor * (u_refFresnelFactor * 0.01));

    // Directional glare highlight (angle straight from the JSON).
    float glareGeoFactor = clamp(
      pow(1.0 + merged / 1500.0 * pow(500.0 / u_glareRange, 2.0) + u_glareHardness, 5.0),
      0.0, 1.0
    );
    float glareAngle = (vec2ToAngle(normal) - PI / 4.0 + u_glareAngle) * 2.0;
    float glareFarside = 0.0;
    if ((glareAngle > PI * 1.5 && glareAngle < PI * 3.5) || glareAngle < -PI * 0.5) {
      glareFarside = 1.0;
    }
    glareAngle = clamp(cos(glareAngle), 0.0, 1.0);
    float glareIntensity = pow(glareAngle, u_glareConvergence);
    float finalGlare = glareGeoFactor * glareIntensity * mix(u_glareFactor * 0.01, u_glareOppositeFactor * 0.01, glareFarside);
    outColor.rgb += vec3(clamp(finalGlare, 0.0, 1.0));
  } else {
    // Outside the glass - drop shadow
    outColor = texture2D(u_bg, v_uv);
    
    vec2 shadowUv = v_uv - u_shadowPosition / u_resolution;
    float shadowMerged = mainSDF(shadowUv);
    
    if (shadowMerged > 0.0 && shadowMerged < u_shadowExpand) {
      float shadowIntensity = 1.0 - shadowMerged / u_shadowExpand;
      float dShadow = shadowIntensity * (u_shadowFactor * 0.01);
      outColor.rgb -= dShadow;
    }
    // In glass-only mode the surrounding area is not ours to draw — let the real
    // background plane show. (Keep a faint drop shadow contribution via alpha.)
    if (u_glassOnly > 0.5) {
      outA = 0.0;
    }
  }

  gl_FragColor = vec4(outColor.rgb, outA);
}
`

/**
 * @param bgTexture When provided (e.g. the About video), the glass refracts THIS
 *   texture directly instead of capturing the 3D scene. The scene-capture path
 *   cannot reliably sample a VideoTexture, so on video pages we hand the texture
 *   straight to the shader and let the quad draw ONLY the glass shapes
 *   (transparent elsewhere), over the real background plane.
 */
export function LiquidGlassField({ bgTexture }: { bgTexture?: THREE.Texture }) {
  const { size } = useThree()

  // Render targets
  const sceneFBO = useFBO(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio)
  const vBlurFBO = useFBO(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio)
  const hBlurFBO = useFBO(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio)

  // Materials
  const vBlurMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, v: { value: 1.0 / size.height } },
    vertexShader, fragmentShader: vBlurShader,
    depthWrite: false, depthTest: false
  }), [size.height])

  const hBlurMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, h: { value: 1.0 / size.width } },
    vertexShader, fragmentShader: hBlurShader,
    depthWrite: false, depthTest: false
  }), [size.width])

  const glassMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      u_bg: { value: null },
      u_blurredBg: { value: null },
      u_resolution: { value: new THREE.Vector2(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio) },
      u_dpr: { value: window.devicePixelRatio },
      // Glass properties based on provided JSON
      u_refThickness: { value: 50.66 },
      u_refFactor: { value: 1.83 },
      u_refScale: { value: 4.0 },
      u_refDispersion: { value: 5.49 },
      u_refFresnelRange: { value: 34.79 },
      u_refFresnelHardness: { value: 21.48 },
      u_refFresnelFactor: { value: 20.0 },
      u_refDispersionVal: { value: 5.49 },
      u_glareRange: { value: 24.0 },
      u_glareHardness: { value: 15.48 },
      u_glareFactor: { value: 30.6 },
      u_glareConvergence: { value: 50.0 },
      u_glareOppositeFactor: { value: 56.0 },
      u_glareAngle: { value: -18.0 * (Math.PI / 180.0) },
      u_shadowExpand: { value: 15.3 },
      u_shadowFactor: { value: 15.0 },
      u_shadowPosition: { value: new THREE.Vector2(0, -10) },
      u_tint: { value: new THREE.Vector4(8 / 255, 102 / 255, 165 / 255, 0.0) },
      u_glassOnly: { value: 0.0 },
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
    vBlurMat.uniforms.v.value = 1.0 / size.height
    hBlurMat.uniforms.h.value = 1.0 / size.width
    glassMat.uniforms.u_resolution.value.set(size.width * window.devicePixelRatio, size.height * window.devicePixelRatio)
    glassMat.uniforms.u_dpr.value = window.devicePixelRatio
  }, [size, vBlurMat, hBlurMat, glassMat])

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

  useFrame((state) => {
    if (!meshRef.current) return

    // Sync DOM elements to uniforms
    const els = document.querySelectorAll('.sync-glass-rect')

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
      const rect = el.getBoundingClientRect()
      if (rect.bottom < -50 || rect.top > vh + 50) return // fully off-screen → skip
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

      vBlurMat.uniforms.tDiffuse.value = bgTexture
      state.gl.setRenderTarget(vBlurFBO)
      state.gl.render(vBlurScene, blurCamera)

      hBlurMat.uniforms.tDiffuse.value = vBlurFBO.texture
      state.gl.setRenderTarget(hBlurFBO)
      state.gl.render(hBlurScene, blurCamera)

      state.gl.setRenderTarget(null)
      glassMat.uniforms.u_bg.value = bgTexture
      glassMat.uniforms.u_blurredBg.value = hBlurFBO.texture
      return
    }

    // SCENE-CAPTURE MODE (generic). Opaque quad reproduces the whole scene.
    glassMat.uniforms.u_glassOnly.value = 0.0

    // Hide glass to capture background
    meshRef.current.visible = false

    // 1. Capture main scene
    state.gl.setRenderTarget(sceneFBO)
    state.gl.render(state.scene, state.camera)

    // 2. Vertical Blur
    vBlurMat.uniforms.tDiffuse.value = sceneFBO.texture
    state.gl.setRenderTarget(vBlurFBO)
    state.gl.render(vBlurScene, blurCamera)

    // 3. Horizontal Blur
    hBlurMat.uniforms.tDiffuse.value = vBlurFBO.texture
    state.gl.setRenderTarget(hBlurFBO)
    state.gl.render(hBlurScene, blurCamera)

    // Restore render target and bind textures to glass
    state.gl.setRenderTarget(null)
    meshRef.current.visible = true
    glassMat.uniforms.u_bg.value = sceneFBO.texture
    glassMat.uniforms.u_blurredBg.value = hBlurFBO.texture
  })

  // Render a full-screen quad over the camera
  return (
    <ScreenQuad ref={meshRef} material={glassMat} />
  )
}
