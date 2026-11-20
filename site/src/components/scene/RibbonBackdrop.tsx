/**
 * LIGHT SHEET BACKDROP (velvet preview, 2026-11-20). Rebuilt from the actual frames
 * of Melvin's reel 4 after the twisting ribbons missed it: ONE bright crest of light
 * crossing the screen, a white-hot line inside a coloured glow, with a curtain of
 * fine twinkling particles falling away below it into black and a little spray above.
 * Drawn as one full-screen triangle behind everything else in the shared canvas.
 * `gain` lowers the whole thing on reading pages.
 */
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { velvetRamp } from '../../velvet'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const vertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const fragment = /* glsl */ `
  precision highp float;
  uniform vec2 uRes; uniform float uT; uniform float uGain; uniform float uDpr;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD;
  float hash(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
  float vn(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  // One layer of motes: a jittered soft disc per cell, each with its own size,
  // brightness (a few bright, most faint) and a slow smooth twinkle.
  float motesWarm = 0.0;
  float motes(vec2 q, float dens, float seed){
    vec2 id = floor(q); vec2 f = fract(q);
    float h = hash(id + seed);
    vec2 c = 0.3 + 0.4 * vec2(hash(id + seed + 3.1), hash(id + seed + 7.7));
    float r = mix(0.13, 0.3, hash(id + seed + 11.3));
    float on = smoothstep(1.0 - dens - 0.06, 1.0 - dens + 0.06, h);
    float b = 0.3 + 0.7 * pow(hash(id + seed + 5.3), 2.2);
    float tw = 0.65 + 0.35 * sin(uT * (0.6 + 1.8 * hash(id + seed + 9.9)) + h * 40.0);
    float v = on * b * tw * smoothstep(r, r * 0.3, length(f - c));
    motesWarm += v * step(0.9, hash(id + seed + 2.2));
    return v;
  }
  // THE LIGHT SHEET (after Melvin's reel 4): one bright crest crossing the screen,
  // and a curtain of fine particles falling away below it into black.
  float crest(float x, float t){
    return 0.64 + 0.12 * (x - 0.9) + 0.13 * sin(x * 1.3 + t * 0.21) + 0.06 * sin(x * 2.9 - t * 0.17 + 1.7) + 0.022 * sin(x * 6.1 + t * 0.4);
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
    float x = uv.x * asp;
    float c = crest(x, uT);
    float slope = (crest(x + 0.01, uT) - c) / 0.01;
    float d = (uv.y - c) / sqrt(1.0 + slope * slope);   // + above the crest, - below
    float below = max(-d, 0.0); float above = max(d, 0.0);
    float under = step(d, 0.0);

    // The curtain: dense at the crest, thinning with distance, with slow soft folds.
    float folds = 0.5 + 0.5 * vn(vec2(x * 2.6 + uT * 0.05, below * 5.0 - uT * 0.1));
    float lanes = 0.72 + 0.28 * vn(vec2(x * 9.0 - uT * 0.08, below * 1.5));
    float sheet = under * exp(-below * 4.4) * (0.3 + 0.7 * folds) * lanes;
    float spray = (1.0 - under) * exp(-above * 30.0) * 0.55;
    float dens = sheet + spray;

    // PARTICLES. Three depths of soft round motes living in the SHEET's own space
    // (along the crest, distance from it), so they ride the wave and drift away from
    // the crest instead of blinking on a fixed screen grid.
    float px = uRes.y / uDpr;                       // screen height in CSS pixels
    vec2 sp = vec2(x, d);
    float fine = motes(vec2(sp.x + uT * 0.004, sp.y + uT * 0.010) * px / 2.6, dens * 0.95, 0.0);
    float fine2 = motes(vec2(sp.x - uT * 0.003, sp.y + uT * 0.013) * px / 3.7 + 19.5, dens * 0.7, 71.0);
    float mid = motes(vec2(sp.x - uT * 0.006, sp.y + uT * 0.016) * px / 6.5, dens * 0.34, 17.0);
    float far = motes(vec2(sp.x + uT * 0.009, sp.y + uT * 0.024) * px / 15.0, dens * 0.16, 41.0);
    float dotOn = fine * 1.15 + fine2 + mid * 1.25 + far * 0.55;
    float warm = motesWarm;
    float dotB = 1.0;

    // A slow pulse of brightness travels along the crest, and its width breathes.
    float travel = 0.62 + 0.38 * sin(x * 2.2 - uT * 0.5);
    float wide = 62.0 + 26.0 * sin(x * 1.7 + uT * 0.2);
    float core = exp(-abs(d) * wide) * travel;
    float glow = exp(-abs(d) * 15.0) * 0.42 + under * exp(-below * 9.0) * 0.1;
    float d2 = d + 0.055 + 0.02 * sin(x * 2.1 + uT * 0.3);
    float second = exp(-abs(d2) * 70.0) * 0.35;

    vec3 hot = uC + vec3(0.08, 0.06, 0.0) * sin(x * 1.5 + uT * 0.1);
    vec3 sheetCol = mix(hot, uB, smoothstep(0.0, 0.45, below));
    vec3 col = uA;
    col += sheetCol * dotOn * dotB * 1.5;
    col += uD * warm * 0.7;   // one mote in ten glints cream
    col += sheetCol * sheet * 0.05;
    col += hot * (glow + second);
    col += uD * core * 1.05;
    col *= uGain;
    float v = dot(uv - 0.5, uv - 0.5);
    col *= 1.0 - 0.7 * v;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

export function RibbonBackdrop({ gain }: { gain: number }) {
  const reduced = usePrefersReducedMotion()
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    const [a, b, c, d] = velvetRamp
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(1, 1) },
        uT: { value: 24 },
        uGain: { value: gain },
        uDpr: { value: 1 },
        uA: { value: new THREE.Vector3(...a) },
        uB: { value: new THREE.Vector3(...b) },
        uC: { value: new THREE.Vector3(...c) },
        uD: { value: new THREE.Vector3(...d) },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    return { geo, mat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state, dt) => {
    const u = mat.uniforms
    const s = state.gl.getDrawingBufferSize(u.uRes.value as THREE.Vector2)
    void s
    u.uDpr.value = state.gl.getPixelRatio()
    if (!reduced) u.uT.value += Math.min(dt, 0.05)
    // Ease the brightness when the page changes (hero vs reading pages).
    u.uGain.value += (gain - u.uGain.value) * (1 - Math.exp(-dt * 3))
  })

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1000} />
}
