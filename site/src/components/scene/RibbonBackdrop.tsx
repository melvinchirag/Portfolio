/**
 * LIGHT SHEET BACKDROP (velvet preview, 2026-11-20). Rebuilt from the actual frames
 * of Melvin's reel 4 after the twisting ribbons missed it: ONE bright crest of light
 * crossing the screen, a hot line inside a coloured glow, with a curtain of fine
 * twinkling particles falling away below it into black and a little spray above.
 * Drawn as one full-screen triangle behind everything else in the shared canvas.
 * `gain` lowers the whole thing on reading pages.
 *
 * Every colour and amount comes from the look lab (velvetLab.ts) each frame, so the
 * panel changes it live. The sheet also knows where the big mask is: its particles
 * bend round the face, gather at its edge and thin out behind it.
 * `lite` (phones) draws two particle depths instead of four to spare the GPU.
 */
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CREST_GLSL, SHEET, hexToVec3, lab, maskScreen } from '../../velvetLab'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { heroScroll } from '../../hooks/heroScroll'

const vertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const fragment = (lite: boolean) => /* glsl */ `
  precision highp float;
  uniform vec4 uSheet;   // buffer width, height, time, (mask catch: unused here)
  uniform float uGain; uniform float uDpr;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD;
  uniform vec4 uCore;    // core strength, core thinness, glow strength, glow reach
  uniform vec4 uDust;    // amount, brightness, size, cream glints
  uniform vec4 uMisc;    // curtain falloff, haze, second streak, vignette
  uniform vec4 uMask;    // mask centre (x in aspect units, y), radius, presence
  uniform vec3 uMaskFx;  // wrap, halo, dim
  uniform float uTwinkle;
  ${CREST_GLSL}
  float hash(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
  float vn(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  // One layer of motes: a jittered soft disc per cell, each with its own size,
  // brightness (a few bright, most faint) and a slow smooth twinkle.
  float motesWarm = 0.0;
  float motes(vec2 q, float dens, float seed){
    float uT = uSheet.z;
    vec2 id = floor(q); vec2 f = fract(q);
    float h = hash(id + seed);
    vec2 c = 0.3 + 0.4 * vec2(hash(id + seed + 3.1), hash(id + seed + 7.7));
    float r = mix(0.13, 0.3, hash(id + seed + 11.3));
    float on = smoothstep(1.0 - dens - 0.06, 1.0 - dens + 0.06, h);
    float b = 0.3 + 0.7 * pow(hash(id + seed + 5.3), 2.2);
    float tw = 1.0 - uTwinkle + uTwinkle * sin(uT * (0.6 + 1.8 * hash(id + seed + 9.9)) + h * 40.0);
    float v = on * b * tw * smoothstep(r, r * 0.3, length(f - c));
    motesWarm += v * step(0.9, hash(id + seed + 2.2));
    return v;
  }
  void main(){
    vec2 uRes = uSheet.xy; float uT = uSheet.z;
    vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
    float x = uv.x * asp;
    float c = crest(x, uT);
    float slope = (crest(x + 0.01, uT) - c) / 0.01;
    float d = (uv.y - c) / sqrt(1.0 + slope * slope);   // + above the crest, - below
    float below = max(-d, 0.0); float above = max(d, 0.0);
    float under = step(d, 0.0);

    // THE MASK. mr is 1 at the face's outline. Inside it the light thins out so the
    // face's own particles read; at the outline the dust gathers; and the dust's
    // coordinates are pushed outward so the motes drift round the head, not through it.
    vec2 mp = vec2(x, uv.y) - uMask.xy; mp.x /= 0.68;
    float mr = length(mp) / max(uMask.z, 0.001);
    float inside = (1.0 - smoothstep(0.7, 1.05, mr)) * uMask.w;
    float rim = exp(-pow((mr - 1.0) * 4.0, 2.0)) * uMask.w;
    vec2 push = normalize(mp + vec2(1e-5)) * uMask.z * 0.45 * uMaskFx.x * exp(-mr * mr * 0.8) * uMask.w;
    float veil = 1.0 - uMaskFx.z * inside;
    float veilLight = 1.0 - 0.85 * uMaskFx.z * inside;

    // The curtain: dense at the crest, thinning with distance, with slow soft folds.
    float folds = 0.5 + 0.5 * vn(vec2(x * 2.6 + uT * 0.05, below * 5.0 - uT * 0.1));
    float lanes = 0.72 + 0.28 * vn(vec2(x * 9.0 - uT * 0.08, below * 1.5));
    float sheet = under * exp(-below * uMisc.x) * (0.3 + 0.7 * folds) * lanes;
    float spray = (1.0 - under) * exp(-above * 30.0) * 0.55;
    float dens = (sheet + spray) * uDust.x * veil + rim * uMaskFx.y * (0.1 + 0.9 * (sheet + spray));

    // PARTICLES. Four depths of soft round motes living in the SHEET's own space
    // (along the crest, distance from it), so they ride the wave and drift away from
    // the crest instead of blinking on a fixed screen grid.
    float px = uRes.y / uDpr / uDust.z;             // screen height in CSS pixels
    vec2 sp = vec2(x, d) - push;
    float fine = motes(vec2(sp.x + uT * 0.004, sp.y + uT * 0.010) * px / 2.6, dens * 0.95, 0.0);
    ${lite ? 'float fine2 = 0.0;' : 'float fine2 = motes(vec2(sp.x - uT * 0.003, sp.y + uT * 0.013) * px / 3.7 + 19.5, dens * 0.7, 71.0);'}
    float mid = motes(vec2(sp.x - uT * 0.006, sp.y + uT * 0.016) * px / 6.5, dens * 0.34, 17.0);
    ${lite ? 'float far = 0.0;' : 'float far = motes(vec2(sp.x + uT * 0.009, sp.y + uT * 0.024) * px / 15.0, dens * 0.16, 41.0);'}
    float dotOn = fine * 1.15 + fine2 + mid * 1.25 + far * 0.55;
    float warm = motesWarm;

    // A slow pulse of brightness travels along the crest, and its width breathes.
    float travel = 0.62 + 0.38 * sin(x * 2.2 - uT * 0.5);
    float wide = uCore.y * (1.0 + 0.3 * sin(x * 1.7 + uT * 0.2));
    float core = exp(-abs(d) * wide) * travel * veilLight;
    float glow = (exp(-abs(d) * uCore.w) * 0.42 + under * exp(-below * uCore.w * 0.6) * 0.1) * uCore.z;
    float d2 = d + 0.055 + 0.02 * sin(x * 2.1 + uT * 0.3);
    float second = exp(-abs(d2) * 70.0) * uMisc.z;

    vec3 hot = uC * (1.0 + 0.1 * sin(x * 1.5 + uT * 0.1));
    vec3 sheetCol = mix(hot, uB, smoothstep(0.0, 0.45, below));
    vec3 col = uA;
    col += sheetCol * dotOn * uDust.y;
    col += uD * warm * uDust.w;            // one mote in ten glints in the core colour
    col += sheetCol * sheet * uMisc.y * veil;   // the smooth body of colour under the crest
    col += hot * (glow + second) * veilLight;
    col += uD * core * uCore.x;
    col *= uGain;
    float v = dot(uv - 0.5, uv - 0.5);
    col *= 1.0 - uMisc.w * v;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

const bg = new THREE.Color()
const buf = new THREE.Vector2()

/**
 * `scrollDim` (0..1, default 1 = off): on the Home page, the brightness the light
 * falls to once the hero has scrolled past its first frame. Used on phones, where
 * the frames' text spans the whole screen and the crest ran straight through it.
 */
export function RibbonBackdrop({ gain, lite = false, scrollDim = 1 }: { gain: number; lite?: boolean; scrollDim?: number }) {
  const reduced = usePrefersReducedMotion()
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSheet: SHEET.uSheet,
        uCrest: SHEET.uCrest,
        uGain: { value: gain },
        uDpr: { value: 1 },
        uA: { value: new THREE.Vector3() },
        uB: { value: new THREE.Vector3() },
        uC: SHEET.uSheetRed,
        uD: SHEET.uSheetHot,
        uCore: { value: new THREE.Vector4() },
        uDust: { value: new THREE.Vector4() },
        uMisc: { value: new THREE.Vector4() },
        uMask: { value: new THREE.Vector4(0, 0, 0, 0) },
        uMaskFx: { value: new THREE.Vector3() },
        uTwinkle: { value: 0.35 },
      },
      vertexShader: vertex,
      fragmentShader: fragment(lite),
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    return { geo, mat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite])

  useFrame((state, dt) => {
    const u = mat.uniforms
    const sheet = SHEET.uSheet.value
    state.gl.getDrawingBufferSize(buf)
    sheet.x = buf.x
    sheet.y = buf.y
    if (!reduced) sheet.z += Math.min(dt, 0.05) * lab.speed
    sheet.w = lab.mask_catch
    u.uDpr.value = state.gl.getPixelRatio()

    // The look lab's values, every frame, so the panel is live.
    hexToVec3(lab.ground, u.uA.value)
    hexToVec3(lab.deep, u.uB.value)
    hexToVec3(lab.red, SHEET.uSheetRed.value)
    hexToVec3(lab.core, SHEET.uSheetHot.value)
    hexToVec3(lab.mask, SHEET.uMaskCol.value, lab.mask_bright)
    SHEET.uMaskCol.value.w = 1
    SHEET.uCrest.value.set(lab.height, lab.tilt, lab.wave, 0)
    u.uCore.value.set(lab.core_strength, lab.core_thin, lab.glow, lab.glow_reach)
    u.uDust.value.set(lab.dust, lab.dust_bright, lab.dust_size, lab.glints)
    u.uMisc.value.set(1 / Math.max(lab.curtain, 0.02), lab.haze, lab.second, lab.vignette)
    u.uTwinkle.value = lab.twinkle
    u.uMaskFx.value.set(lab.mask_wrap, lab.mask_halo, lab.mask_dim)
    if (state.scene.background instanceof THREE.Color) state.scene.background.copy(bg.set(lab.ground))

    // Where the mask is. It stops reporting when it leaves the page, so fade it out.
    const fresh = performance.now() - maskScreen.t < 250
    const m = u.uMask.value as THREE.Vector4
    const target = fresh ? maskScreen.a : 0
    m.w += (target - m.w) * (1 - Math.exp(-dt * 6))
    if (fresh) {
      m.x = maskScreen.x * (buf.x / buf.y)
      m.y = maskScreen.y
      m.z = maskScreen.r
    }

    // Ease the brightness when the page changes (hero vs reading pages).
    let quiet = 1
    if (scrollDim < 1) {
      const t = Math.min(1, Math.max(0, (heroScroll.progress - 0.03) / 0.09))
      quiet = 1 - (1 - scrollDim) * t * t * (3 - 2 * t)
    }
    const g = gain * lab.brightness * quiet
    u.uGain.value += (g - u.uGain.value) * (1 - Math.exp(-dt * 3))
  })

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1000} />
}
