/* ============================================================================
 * DesktopTrio.tsx: the desktop hero's "break into three" (Melvin, 2026-11-20)
 * ----------------------------------------------------------------------------
 * "Once I start scrolling, it breaks ... from the bottom it dissipates and breaks
 *  into 3 different masks ... they come together in the same style as the phone
 *  and start dancing ... on desktop make it at least 2x more magical."
 *
 * HOW IT IS BUILT
 *  - NOT a second pipeline. The three masks are three more draws of the SAME
 *    GPGPU sim, geometry, shaders, atlas and pupils the big hero mask uses
 *    (MaskField.tsx, which renders this component and shares its sim). So the
 *    particles, the eye/nose brightening, the blink and the glyph layer are
 *    identical; only the size differs. Each mask draws the first N particles of
 *    the (randomly ordered) sample, N = SIZE^2 * s^2, which keeps the particle
 *    density per screen area the same as the hero mask.
 *  - The break itself is the `uBreak` front in MaskField's shaders (bottom to
 *    top, ragged edge, particles peel up and out). Its state lives in
 *    hooks/desktopBreak.ts and runs in TIME, not scroll (an event, not a scrub).
 *  - Everything here after the trigger is driven by the clock. Scroll speed and
 *    the pointer only add energy.
 *
 * THE MAGIC (what was picked)
 *   1. emergence: three ghost masks condense out of the dissolving big mask and
 *      fly to their orbit slots on underdamped springs (they overshoot, settle);
 *   2. circle together, then dance: orbit + Lissajous roaming, hops, breathing,
 *      depth (z) so they pass in front of and behind each other;
 *   3. each mask turns to look at the pointer and drifts with parallax;
 *   4. a ribbon of changing glyphs trails behind each dancer;
 *   5. a slow orbiting glyph ring/helix around the trio;
 *   6. shimmer pulses climb a mask when two pass close (or the pointer brushes);
 *   7. glyph rain/lift-off from the break line, and a faint glyph haze after.
 * Glyphs are CPU bodies in WORLD space, so when the visitor scrolls back up and
 * the masks merge, glyphs already released keep flying until they fade.
 *
 * Graphite and Sand only (the same sand tokens as MaskField); no new glow.
 * ========================================================================= */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { desktopBreak } from '../../hooks/desktopBreak'
import { SIZE, OFFSET, TEL_START, BIN_START, TELUGU, freeVertex, glyphFragment } from './MaskField'

/* ---- tuning knobs ---------------------------------------------------------- */
/** Each trio mask's height as a fraction of the viewport height (30 to 38 asked). */
export const TRIO_VH = 0.3
/** Local height of the face crop (chin to forehead), model units. */
const FACE_H = 1.0
const POOL = 2400 // live glyph bodies (break rain, trails, haze)
const RING_N = 140 // glyphs in the orbiting ring/helix
const CAP = POOL + RING_N
const BREAK_GLYPHS_PER_SEC = 240
const SPRING_K = 58 // underdamped, like the phone swarm (K62 C9.5), a touch softer
const SPRING_C = 9
const CIRCLE_UNTIL = 3.5 // seconds settled before the dance starts blending in
const DANCE_FULL = 8.0 // seconds settled when the dance is fully blended in
const BASE_OMEGA = 0.55 // orbit speed, rad/s, before energy
const EMERGE_AT = [0.28, 0.38, 0.48] // break amount at which each mask starts to emerge
const EMERGE_SPAN = 0.45
const SHIMMER_DIST = 0.5 // world units: masks closer than this pulse
const SHIMMER_SECS = 1.3

/** Shared with MaskParticles: its sim textures and clocks, written every frame. */
export const trioShared = {
  posTex: null as THREE.Texture | null,
  velTex: null as THREE.Texture | null,
  time: 0,
  glow: 0, // scroll activity 0..1 (also the "energy" here)
  fade: 0, // intro fade * contact-handoff fade
}

type Sim = {
  geometry: THREE.BufferGeometry
  material: THREE.ShaderMaterial
  glyphGeo: THREE.BufferGeometry
  glyphMat: THREE.ShaderMaterial
  pupilGeo: THREE.BufferGeometry
  pupilMat: THREE.ShaderMaterial
  freeMat: THREE.ShaderMaterial
  spawnPts: Float32Array
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const rnd = Math.random

// Copies a uniform set so each instance owns its numbers but shares textures.
function cloneUniforms(u: Record<string, { value: any }>) {
  const out: Record<string, { value: any }> = {}
  for (const k of Object.keys(u)) {
    const v = u[k].value
    out[k] = { value: v && v.isColor ? v.clone() : v }
  }
  return out
}

type Mask = {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  yaw: number; pitch: number; roll: number
  blinkNext: number; blinkStart: number
  shimPhase: number; shimRun: boolean; shimCool: number
  e: number
}

export function DesktopTrio({ sim }: { sim: Sim }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  // Three groups of three draws each (dots, face glyphs, pupils), plus one
  // glyph Points for the ring + pool. All geometry shares the sim's buffers.
  const rig = useMemo(() => {
    const masks = [0, 1, 2].map(() => {
      const dotGeo = new THREE.BufferGeometry()
      for (const k of Object.keys(sim.geometry.attributes)) dotGeo.setAttribute(k, sim.geometry.attributes[k])
      const glyphGeo = new THREE.BufferGeometry()
      for (const k of Object.keys(sim.glyphGeo.attributes)) glyphGeo.setAttribute(k, sim.glyphGeo.attributes[k])
      const dotMat = new THREE.ShaderMaterial({
        uniforms: cloneUniforms(sim.material.uniforms),
        vertexShader: sim.material.vertexShader,
        fragmentShader: sim.material.fragmentShader,
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      })
      const glyphMat = new THREE.ShaderMaterial({
        uniforms: cloneUniforms(sim.glyphMat.uniforms),
        vertexShader: sim.glyphMat.vertexShader,
        fragmentShader: sim.glyphMat.fragmentShader,
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      })
      const pupilMat = new THREE.ShaderMaterial({
        uniforms: cloneUniforms(sim.pupilMat.uniforms),
        vertexShader: sim.pupilMat.vertexShader,
        fragmentShader: sim.pupilMat.fragmentShader,
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      })
      const group = new THREE.Group()
      const pts = [
        new THREE.Points(dotGeo, dotMat),
        new THREE.Points(glyphGeo, glyphMat),
        new THREE.Points(sim.pupilGeo, pupilMat),
      ]
      pts.forEach((p) => { p.frustumCulled = false; group.add(p) })
      group.visible = false
      return { group, dotGeo, glyphGeo, dotMat, glyphMat, pupilMat }
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3))
    geo.setAttribute('aGlyph', new THREE.BufferAttribute(new Float32Array(CAP), 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(CAP), 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(CAP), 1))
    geo.setDrawRange(0, 0)
    const mat = new THREE.ShaderMaterial({
      uniforms: cloneUniforms(sim.freeMat.uniforms),
      vertexShader: freeVertex,
      fragmentShader: glyphFragment,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    const glyphPts = new THREE.Points(geo, mat)
    glyphPts.frustumCulled = false
    return { masks, geo, mat, glyphPts }
  }, [sim])

  useEffect(() => () => {
    rig.masks.forEach((m) => { m.dotGeo.dispose(); m.glyphGeo.dispose(); m.dotMat.dispose(); m.glyphMat.dispose(); m.pupilMat.dispose() })
    rig.geo.dispose()
    rig.mat.dispose()
  }, [rig])

  // Simulation state (refs, never React state).
  const st = useRef({
    clock: 0, orb: 0, dance: 0, ring: 0, cx: 0, cy: 0, spd: 0,
    breakAcc: 0, trailAcc: [0, 0, 0], hazeAcc: 0, scrollY: -1,
    masks: [0, 1, 2].map((i): Mask => ({
      x: OFFSET.x, y: -0.3, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, roll: 0,
      blinkNext: 2 + i * 1.7, blinkStart: -1, shimPhase: 0, shimRun: false, shimCool: 0, e: 0,
    })),
    // glyph pool (structure of arrays)
    n: 0,
    px: new Float32Array(POOL), py: new Float32Array(POOL), pz: new Float32Array(POOL),
    vx: new Float32Array(POOL), vy: new Float32Array(POOL), vz: new Float32Array(POOL),
    age: new Float32Array(POOL), life: new Float32Array(POOL), seed: new Float32Array(POOL),
    gl: new Float32Array(POOL), gt: new Float32Array(POOL), sz: new Float32Array(POOL), amp: new Float32Array(POOL),
    ringGlyph: new Float32Array(RING_N),
    pointer: { x: 0, y: 0, moved: false, speed: 0, lx: 0, ly: 0 },
  })

  useEffect(() => {
    const p = st.current.pointer
    const move = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -(e.clientY / window.innerHeight) * 2 + 1
      if (p.moved) p.speed = Math.min(2.5, p.speed + Math.hypot(nx - p.lx, ny - p.ly) * 6)
      p.x = nx; p.y = ny; p.lx = nx; p.ly = ny; p.moved = true
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useEffect(() => {
    const S = st.current
    for (let k = 0; k < RING_N; k++) S.ringGlyph[k] = randGlyph()
  }, [])

  useFrame((_, delta) => {
    const S = st.current
    const ts = trioShared
    const B = desktopBreak
    const dt = Math.min(delta, 1 / 30)
    const posTex = ts.posTex
    if (!posTex) return

    const cam = camera as THREE.PerspectiveCamera
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * cam.position.z
    const aspect = size.width / size.height
    const halfW = halfH * aspect
    const sBase = (TRIO_VH * 2 * halfH) / FACE_H // mask scale for 30% of the viewport height

    S.clock += dt
    S.pointer.speed *= Math.exp(-dt * 3)
    const energy = Math.min(1.6, ts.glow + S.pointer.speed * 0.35)

    // scroll speed (extra energy, plus it is what ts.glow already carries)
    S.spd = Math.min(1, S.spd * Math.exp(-dt * 2))

    // ---- phases (all clock-driven) ----
    const c = 1 - smooth(CIRCLE_UNTIL, DANCE_FULL, B.settle) // 1 = circling together, 0 = dancing
    const omega = (BASE_OMEGA + 0.4 * (1 - c)) * (1 + 1.3 * energy)
    S.orb += dt * omega
    S.dance += dt * (0.75 + 0.9 * energy)
    S.ring += dt * 0.24 * (1 + energy)
    const t = S.clock
    const d = S.dance

    // centre of the trio: left and centre-left, where the big mask lived
    const roam = 0.65 + 0.35 * (1 - c)
    S.cx = -0.5 * halfW + roam * (0.2 * halfW * Math.sin(0.21 * t + 0.7) + 0.08 * halfW * Math.sin(0.53 * t))
    S.cy = 0.02 * halfH + roam * (0.1 * halfH * Math.sin(0.17 * t + 1.3) + 0.05 * halfH * Math.sin(0.41 * t))
    const R = (0.3 + 0.16 * (1 - c) + 0.04 * Math.sin(0.9 * t)) * halfH * 1.05

    const pw = S.pointer.moved ? S.pointer.x * halfW : S.cx
    const ph = S.pointer.moved ? S.pointer.y * halfH : S.cy

    const N = Math.min(SIZE * SIZE, Math.round(SIZE * SIZE * Math.min(1, sBase * 1.1) ** 2))
    const stride = 8 // glyph pool stride in MaskField (count / (count * GLYPH_POOL_FRACTION))
    let presence = 0

    for (let i = 0; i < 3; i++) {
      const M = S.masks[i]
      const rg = rig.masks[i]
      const e = smooth(EMERGE_AT[i], EMERGE_AT[i] + EMERGE_SPAN, B.amt)
      M.e = e
      presence += e / 3
      rg.group.visible = e > 0.002 && ts.fade > 0.002

      // where it should be: from the break zone out to its orbit / dance slot
      const th = S.orb + (i * Math.PI * 2) / 3
      const rr = R * (0.7 + 0.3 * c + 0.0)
      let tx = S.cx + rr * 1.25 * Math.cos(th)
      let ty = S.cy + rr * 0.85 * Math.sin(th)
      const ax = 0.2 * halfW, ay = 0.2 * halfH, dw = (1 - c) * 0.85
      tx += dw * (ax * Math.sin(0.9 * d + i * 2.1) + 0.4 * ax * Math.sin(2.1 * d + i * 1.3))
      ty += dw * (ay * Math.sin(1.2 * d + i * 1.7) + 0.35 * ay * Math.sin(2.7 * d + i)) + (1 - c) * 0.05 * Math.abs(Math.sin(2.2 * d + i))
      const tz = 0.26 * Math.sin(th + 0.6) * (0.6 + 0.4 * (1 - c)) + 0.1 * Math.sin(0.8 * d + i)
      // pointer parallax: deeper masks drift opposite the pointer, nearer ones with it
      const par = S.pointer.moved ? 0.05 : 0
      tx += S.pointer.x * par * (0.5 + tz * 2)
      ty += S.pointer.y * par * (0.5 + tz * 2) * 0.7
      const spX = OFFSET.x + (i - 1) * 0.2
      const spY = -0.3 + 0.1 * (1 - Math.abs(i - 1))
      const ee = 1 - Math.pow(1 - e, 3)
      const gx = spX + (tx - spX) * ee
      const gy = spY + (Math.max(-0.6 * halfH, Math.min(0.6 * halfH, ty)) - spY) * ee
      const gz = tz * ee

      // pointer kick: brush a mask and it is shoved away (more with speed)
      const dxp = M.x - pw, dyp = M.y - ph
      const dp = Math.hypot(dxp, dyp)
      if (S.pointer.moved && dp < 0.32 && dp > 1e-4) {
        const k = (1 - dp / 0.32) * S.pointer.speed * 5.5 * dt
        M.vx += (dxp / dp) * k
        M.vy += (dyp / dp) * k
        if (M.shimCool <= 0 && S.pointer.speed > 0.5) { M.shimRun = true; M.shimPhase = 0; M.shimCool = 2.5 }
      }

      // underdamped spring (overshoots and settles, which is what reads as alive)
      M.vx += (SPRING_K * (gx - M.x) - SPRING_C * M.vx) * dt
      M.vy += (SPRING_K * (gy - M.y) - SPRING_C * M.vy) * dt
      M.vz += (SPRING_K * (gz - M.z) - SPRING_C * M.vz) * dt
      M.x += M.vx * dt; M.y += M.vy * dt; M.z += M.vz * dt
      const spd = Math.hypot(M.vx, M.vy)

      // look at the pointer (or turn with the orbit when it is idle)
      const lookYaw = S.pointer.moved ? Math.max(-0.75, Math.min(0.75, (pw - M.x) * 0.9)) : 0
      const lookPitch = S.pointer.moved ? Math.max(-0.4, Math.min(0.4, -(ph - M.y) * 0.6)) : 0
      const yawT = lookYaw + 0.35 * Math.sin(th) + 0.12 * Math.sin(0.7 * d + i)
      const pitchT = lookPitch + 0.08 * Math.sin(0.9 * d + i * 2)
      const rollT = Math.max(-0.25, Math.min(0.25, M.vx * 0.12)) + 0.06 * Math.sin(1.1 * d + i)
      const rk = 1 - Math.exp(-dt * 6)
      M.yaw += (yawT - M.yaw) * rk
      M.pitch += (pitchT - M.pitch) * rk
      M.roll += (rollT - M.roll) * rk

      // blink (own timer per mask so they do not blink in unison)
      let eyeOpen = 1
      if (e > 0.9) {
        if (M.blinkStart < 0 && S.clock >= M.blinkNext) M.blinkStart = S.clock
        if (M.blinkStart >= 0) {
          const bt = (S.clock - M.blinkStart) / 0.16
          if (bt >= 1) { M.blinkStart = -1; M.blinkNext = S.clock + 3.2 + rnd() * 3.8 } else eyeOpen = 1 - Math.sin(bt * Math.PI)
        }
      }

      // transform: perspective does the depth scaling; breathing on top
      const sc = sBase * (0.3 + 0.7 * ee) * (1 + 0.035 * Math.sin(1.6 * d + i * 2.4))
      rg.group.position.set(M.x, M.y, M.z)
      rg.group.scale.setScalar(sc)
      rg.group.rotation.set(M.pitch, M.yaw, M.roll)

      // shimmer: a pulse climbs the face when two masks pass close
      M.shimCool -= dt
      for (let j = i + 1; j < 3; j++) {
        const o = S.masks[j]
        if (e > 0.8 && o.e > 0.8 && M.shimCool <= 0 && Math.hypot(M.x - o.x, M.y - o.y) < SHIMMER_DIST * (1 + 0.5 * (M.z + o.z))) {
          M.shimRun = true; M.shimPhase = 0; M.shimCool = 2.5
          o.shimRun = true; o.shimPhase = 0; o.shimCool = 2.5
        }
      }
      if (M.shimRun) {
        M.shimPhase += dt / SHIMMER_SECS
        if (M.shimPhase >= 1) { M.shimRun = false; M.shimPhase = 1 }
      }
      const shim = M.shimRun ? Math.sin(Math.min(1, M.shimPhase) * Math.PI) : 0

      // uniforms
      const depthDim = 0.78 + 0.22 * Math.min(1, Math.max(0, (M.z + 0.3) / 0.6)) // far = a little dimmer
      const f = Math.pow(e, 1.3) * ts.fade * depthDim
      const du = rg.dotMat.uniforms
      du.uPositionTexture.value = posTex
      du.uVelocityTexture.value = ts.velTex
      du.uFade.value = f
      du.uEyeOpen.value = eyeOpen
      du.uGlow.value = Math.min(1, ts.glow + shim * 0.6)
      du.uTime.value = ts.time
      du.uShimmer.value = shim
      du.uShimmerPhase.value = M.shimPhase
      du.uExtraSpeed.value = Math.min(0.0035, spd * 0.0025)
      const gu = rg.glyphMat.uniforms
      gu.uPositionTexture.value = posTex
      gu.uFade.value = f
      gu.uGlow.value = Math.min(1, ts.glow + shim * 0.6)
      gu.uBurst.value = ts.glow
      gu.uTime.value = ts.time
      gu.uGlyphSize.value = 14
      const pu = rg.pupilMat.uniforms
      pu.uFade.value = f
      pu.uEyeOpen.value = eyeOpen
      pu.uGlow.value = Math.min(1, ts.glow + shim * 0.6)
      pu.uScale.value = sc
      // same density per area as the hero mask: first N of the random-order sample
      rg.dotGeo.setDrawRange(0, N)
      rg.glyphGeo.setDrawRange(0, Math.floor(N / stride))
    }

    // ---- glyphs (CPU bodies in world space) ----
    const alive = ts.fade > 0.03
    const tNow = S.clock

    // 1) lift-off from the break line, bottom to top
    if (B.broken && B.amt < 1 && alive) {
      S.breakAcc += BREAK_GLYPHS_PER_SEC * dt
      const front = -0.2 + 1.7 * B.amt // in face-height units (0 = chin)
      while (S.breakAcc >= 1) {
        S.breakAcc -= 1
        if (S.n >= POOL) break
        let k = 0
        for (let tries = 0; tries < 10; tries++) {
          k = (rnd() * (sim.spawnPts.length / 3)) | 0
          const hh = sim.spawnPts[k * 3 + 1] + 0.64
          if (hh <= front + 0.05 && hh >= front - 0.35) break
        }
        emit(S, OFFSET.x + sim.spawnPts[k * 3], OFFSET.y + sim.spawnPts[k * 3 + 1], sim.spawnPts[k * 3 + 2],
          (rnd() - 0.5) * 0.1, 0.09 + rnd() * 0.18, 0.03 + rnd() * 0.12, 4.5 + rnd() * 4, 0.9 + rnd() * 0.5, 0.8)
      }
    } else S.breakAcc = 0

    // 2) ribbons trailing behind each dancer, and 3) the faint haze
    if (alive) {
      for (let i = 0; i < 3; i++) {
        const M = S.masks[i]
        if (M.e < 0.25) continue
        const sp = Math.min(1, Math.hypot(M.vx, M.vy))
        S.trailAcc[i] += (16 + 60 * sp) * dt
        while (S.trailAcc[i] >= 1 && S.n < POOL) {
          S.trailAcc[i] -= 1
          emit(S, M.x + (rnd() - 0.5) * 0.14, M.y + (rnd() - 0.5) * 0.2, M.z - 0.02,
            -M.vx * 0.15 + (rnd() - 0.5) * 0.03, -M.vy * 0.15 + (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.02,
            1.5 + rnd() * 1.1, 0.6 + rnd() * 0.35, 0.6 * M.e)
        }
        S.trailAcc[i] = Math.min(S.trailAcc[i], 3)
      }
      if (presence > 0.5) {
        S.hazeAcc += 5 * dt
        while (S.hazeAcc >= 1 && S.n < POOL) {
          S.hazeAcc -= 1
          emit(S, (rnd() * 1.45 - 0.95) * halfW, (rnd() * 1.6 - 1.0) * halfH, (rnd() - 0.5) * 0.5,
            (rnd() - 0.5) * 0.02, 0.03 + rnd() * 0.05, 0, 6 + rnd() * 4, 0.8 + rnd() * 0.5, 0.4)
        }
      }
    }

    // 4) integrate the pool: wander, a faint swirl round the trio, pointer shove
    const damp = Math.exp(-dt * 0.9)
    for (let i = S.n - 1; i >= 0; i--) {
      S.age[i] += dt
      if (S.age[i] >= S.life[i]) { remove(S, i); continue }
      const sd = S.seed[i]
      S.vx[i] += Math.sin(tNow * 0.7 + sd) * 0.05 * dt
      S.vy[i] += (0.012 + Math.cos(tNow * 0.55 + sd * 1.3) * 0.03) * dt
      S.vz[i] += Math.sin(tNow * 0.4 + sd * 0.7) * 0.02 * dt
      const rx = S.px[i] - S.cx, ry = S.py[i] - S.cy
      const rl = Math.hypot(rx, ry) + 0.25
      S.vx[i] += (-ry / rl) * 0.05 * dt * presence
      S.vy[i] += (rx / rl) * 0.05 * dt * presence
      if (S.pointer.moved) {
        const qx = S.px[i] - pw, qy = S.py[i] - ph
        const qd = Math.hypot(qx, qy)
        if (qd < 0.3 && qd > 1e-4) {
          const k = (1 - qd / 0.3) * (0.05 + S.pointer.speed * 0.3) * dt * 8
          S.vx[i] += (qx / qd) * k
          S.vy[i] += (qy / qd) * k
        }
      }
      S.vx[i] *= damp; S.vy[i] *= damp; S.vz[i] *= damp
      S.px[i] += S.vx[i] * dt
      S.py[i] += S.vy[i] * dt
      S.pz[i] = Math.min(0.9, S.pz[i] + S.vz[i] * dt)
      S.gt[i] -= dt
      if (S.gt[i] <= 0) { S.gl[i] = randGlyph(); S.gt[i] = 0.35 + rnd() * 0.9 } // keep changing
      if (Math.abs(S.px[i]) > halfW * 1.4 || Math.abs(S.py[i]) > halfH * 1.4) remove(S, i)
    }

    // 5) write buffers: ring/helix first, then the pool
    const pos = rig.geo.attributes.position.array as Float32Array
    const gla = rig.geo.attributes.aGlyph.array as Float32Array
    const ala = rig.geo.attributes.aAlpha.array as Float32Array
    const sza = rig.geo.attributes.aSize.array as Float32Array
    let w = 0
    const ringPresence = presence * presence
    if (ringPresence > 0.01) {
      let mx = 0, my = 0
      for (const M of S.masks) { mx += M.x / 3; my += M.y / 3 }
      const rk2 = 1 - Math.exp(-dt * 3)
      const ringCx = (S as any).rcx === undefined ? mx : (S as any).rcx + (mx - (S as any).rcx) * rk2
      const ringCy = (S as any).rcy === undefined ? my : (S as any).rcy + (my - (S as any).rcy) * rk2
      ;(S as any).rcx = ringCx; (S as any).rcy = ringCy
      const Rr = (R + 0.3) * 1.05
      const reroll = (rnd() * RING_N) | 0
      S.ringGlyph[reroll] = randGlyph()
      for (let k = 0; k < RING_N; k++) {
        const u = k / RING_N
        const second = k & 1
        const a = u * Math.PI * 2 * 2 + S.ring * (second ? -1.3 : 1) + second * 1.1
        const rad = Rr * (second ? 0.78 : 1) * (1 + 0.06 * Math.sin(0.7 * t + u * 9))
        const sa = Math.sin(a)
        pos[w * 3] = ringCx + Math.cos(a) * rad * 1.35
        pos[w * 3 + 1] = ringCy + sa * rad * 0.4 + 0.06 * Math.sin(5 * a + t) + (second ? 0.05 : -0.05)
        pos[w * 3 + 2] = sa * rad * 0.7
        gla[w] = S.ringGlyph[k]
        ala[w] = ringPresence * ts.fade * (0.22 + 0.3 * (sa * 0.5 + 0.5)) * (0.7 + 0.3 * Math.sin(t * 2.1 + k))
        sza[w] = 0.55 + 0.35 * (sa * 0.5 + 0.5)
        w++
      }
    } else {
      delete (S as any).rcx
      delete (S as any).rcy
    }
    for (let i = 0; i < S.n; i++) {
      pos[w * 3] = S.px[i]; pos[w * 3 + 1] = S.py[i]; pos[w * 3 + 2] = S.pz[i]
      gla[w] = S.gl[i]
      const ai = Math.min(1, S.age[i] / 0.6)
      const ao = Math.min(1, (S.life[i] - S.age[i]) / (S.life[i] * 0.45))
      ala[w] = ai * ai * (3 - 2 * ai) * ao * ao * (3 - 2 * ao) * S.amp[i] * 0.85
      sza[w] = S.sz[i]
      w++
    }
    rig.geo.attributes.position.needsUpdate = true
    rig.geo.attributes.aGlyph.needsUpdate = true
    rig.geo.attributes.aAlpha.needsUpdate = true
    rig.geo.attributes.aSize.needsUpdate = true
    rig.geo.setDrawRange(0, w)
    const mu = rig.mat.uniforms
    mu.uFade.value = ts.fade
    mu.uGlow.value = ts.glow
    // nothing to see and nothing in flight: skip the draw entirely
    rig.glyphPts.visible = w > 0
  })

  return (
    <>
      {rig.masks.map((m, i) => (
        <primitive key={i} object={m.group} />
      ))}
      <primitive object={rig.glyphPts} />
    </>
  )
}

function randGlyph(): number {
  return rnd() < 0.5 ? TEL_START + ((rnd() * TELUGU.length) | 0) : BIN_START + ((rnd() * 2) | 0)
}

function emit(S: any, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, amp: number) {
  const i = S.n++
  S.px[i] = x; S.py[i] = y; S.pz[i] = z
  S.vx[i] = vx; S.vy[i] = vy; S.vz[i] = vz
  S.age[i] = 0; S.life[i] = life; S.seed[i] = rnd() * 1000
  S.gl[i] = randGlyph(); S.gt[i] = rnd() * 0.8
  S.sz[i] = size; S.amp[i] = amp
}

function remove(S: any, i: number) {
  const l = --S.n
  if (i === l) return
  for (const k of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'age', 'life', 'seed', 'gl', 'gt', 'sz', 'amp']) S[k][i] = S[k][l]
}
