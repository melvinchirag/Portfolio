/**
 * RIBBON BACKDROP (velvet preview, 2026-11-20). Seven flat ribbons of light that
 * twist edge-on and face-on as they drift, drawn as one full-screen triangle behind
 * everything else in the shared canvas. Melvin picked "twisting ribbons" from the
 * Work board and asked to see it in the hero with velvet red and cream.
 *
 * Detail layers: a thin chromatic (red/blue) edge on the ribbons, sparse dust,
 * film grain and a vignette. `dim` lowers the whole thing on reading pages.
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
  uniform vec2 uRes; uniform float uT; uniform float uGain;
  uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 ramp(float l){
    l = clamp(l, 0.0, 1.0);
    if (l < 0.35) return mix(uA, uB, l / 0.35);
    if (l < 0.75) return mix(uB, uC, (l - 0.35) / 0.4);
    return mix(uC, uC * 1.3 + 0.02, (l - 0.75) / 0.25);
  }
  // One layer of four ribbons. Returns (shade, satin sheen, coverage).
  vec3 layer(vec2 uv, float asp, float t, float seed, float sc){
    float L = 0.0; float S = 0.0; float K = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i); float x = uv.x * asp * 0.5 * sc + seed * 3.1;
      float c = 0.5 + 0.27 * sin(x * 1.7 + t * 0.14 + fi * 1.3 + seed) + 0.1 * sin(x * 4.1 + fi * 2.1 - t * 0.09);
      float a = x * 2.6 + t * 0.22 + fi * 1.37 + seed * 2.0;
      float hw = (0.1 * abs(cos(a)) + 0.0025) / sc;
      float d = abs(uv.y - c);
      float body = smoothstep(hw, hw - 0.003, d);
      float across = clamp(d / hw, 0.0, 1.0);
      float side = (uv.y - c) / hw;
      float face = 0.5 + 0.5 * sin(a + 0.8);
      float shade = (0.16 + 0.84 * face) * (1.0 - 0.6 * across * across);
      float sheen = pow(face, 5.0) * exp(-pow((side - 0.3) / 0.16, 2.0));
      float rim = smoothstep(0.86, 1.0, across) * 0.22;
      float glow = exp(-d * 40.0) * 0.05 * (0.3 + face);
      L = mix(L, shade + rim, body) + glow * (1.0 - body);
      S = mix(S, sheen, body);
      K = max(K, body);
    }
    return vec3(L, S, K);
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;
    float k = 0.0025;
    vec3 back = layer(uv, asp, uT * 0.7, 3.7, 1.7);
    vec3 f = layer(uv, asp, uT, 0.0, 1.0);
    float fr = layer(uv + vec2(k, 0.0), asp, uT, 0.0, 1.0).x;
    float fb = layer(uv - vec2(k, 0.0), asp, uT, 0.0, 1.0).x;
    float L = mix(back.x * 0.38, f.x, f.z) + 0.03 + 0.04 * uv.y;
    float S = mix(back.y * 0.2, f.y, f.z);
    vec3 col = ramp(L * uGain) + uD * S * 0.4 * uGain + vec3(fr - f.x, 0.0, fb - f.x) * 0.3 * uGain;
    vec2 g = floor(gl_FragCoord.xy / 3.0);
    float dust = step(0.997, hash(g + floor(uT * 0.5))) * (0.35 + 0.65 * hash(g.yx + 3.0));
    col += uD * dust * 0.3 * (1.0 - L);
    float gr = hash(gl_FragCoord.xy + floor(uT * 24.0) * 17.0) - 0.5;
    col += gr * 0.035;
    float v = dot(uv - 0.5, uv - 0.5);
    col *= 1.0 - 1.1 * v;
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
    if (!reduced) u.uT.value += Math.min(dt, 0.05)
    // Ease the brightness when the page changes (hero vs reading pages).
    u.uGain.value += (gain - u.uGain.value) * (1 - Math.exp(-dt * 3))
  })

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1000} />
}
