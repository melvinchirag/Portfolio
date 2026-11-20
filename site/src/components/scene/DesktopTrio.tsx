/* ============================================================================
 * DesktopTrio.tsx: the desktop hero's "break into three" (Melvin, 2026-11-20)
 * ----------------------------------------------------------------------------
 * Round 3 (calmer, whole screen, murmuration):
 *  "...it creates a square before the three masks form. That shouldn't happen.
 *   There should be a flow ... almost like starlings in the sky ... smoothly,
 *   from the hero page to the Past. As soon as you get to the Past, before it
 *   comes to the centre, the three masks should have formed and be dancing ...
 *   the dancing should occupy all sides of the screen ... I don't want it too
 *   messy."
 *
 * HOW IT IS BUILT
 *  - The three masks are the SAME particles as the hero mask: mask i draws
 *    particles [i*N, (i+1)*N) of the shared GPGPU sample (N = SIZE^2 * s^2, so
 *    density per screen area equals the hero mask), with the same shaders, eye
 *    and nose weights, blink, pupils and glyph layer. While the break runs, the
 *    vertex shader (PEEL_GLSL in MaskField.tsx) flies each particle through the
 *    explosion and a murmuration ribbon (three braided streams, one per mask) and
 *    spirals it into ITS OWN home point on its mask. So each mask condenses out
 *    of its stream; there is no block and no cross-fade.
 *  - The break clock (hooks/desktopBreak.ts) runs in time, not scroll. After it
 *    completes everything here is still clock-driven: ambient, forever; scroll
 *    speed and the pointer only add energy.
 *  - The masks ignore the fact snakes completely (MaskField turns them off for the
 *    whole break) and nothing here reads snakeField.
 *
 * THE DANCE: each mask follows a wide Lissajous path with its own periods across
 * the WHOLE viewport; every so often they gather and circle together, then split
 * towards three corners and rejoin. Depth in z, springs that overshoot a little,
 * a soft keep-out so they never overlap, and a gentle bounce at the screen edges.
 * Glyphs are few and slow: a burst that rides the flock, faint trails, a thin haze.
 *
 * Graphite and Sand only (the same sand tokens as MaskField); no new glow.
 * ========================================================================= */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { desktopBreak } from '../../hooks/desktopBreak'
import { SIZE, OFFSET, TEL_START, BIN_START, TELUGU, freeVertex, glyphFragment, trioQ } from './MaskField'

/* ---- tuning knobs ---------------------------------------------------------- */
/** Each trio mask's height as a fraction of the viewport height. */
export const TRIO_VH = 0.26
const FACE_H = 1.0 // local height of the face crop
const POOL = 1200 // live glyph bodies (about half of round 2)
const BURST_GLYPHS_PER_SEC = 700 // glyphs that ride the flock (first ~0.3 s)
const SPRING_K = 46 // underdamped: a little overshoot, softer than before
const SPRING_C = 8.5
const ROAM_X = 0.78 // fraction of the half-width the masks may roam
const ROAM_Y = 0.62 // fraction of the half-height
const KEEP_OUT = 0.5 // world units: masks are pushed apart below this distance
const DANCE_SPEED = 1.25 // overall choreography speed
const SHIMMER_DIST = 0.55
const SHIMMER_SECS = 1.3
const FORMED_AT = 0.88 // break clock at which pupils and face glyphs fade in

/** Shared with MaskParticles: its sim textures and clocks, written every frame. */
export const trioShared = {
  posTex: null as THREE.Texture | null,
  velTex: null as THREE.Texture | null,
  time: 0,
  glow: 0, // scroll activity 0..1 (also the "energy" here)
  fade: 0, // intro fade * contact-handoff fade
  n3: 0, // 3N: the first particles belong to the trio while it is broken
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

function cloneUniforms(u: Record<string, { value: any }>) {
  const out: Record<string, { value: any }> = {}
  for (const k of Object.keys(u)) {
    const v = u[k].value
    out[k] = { value: v && v.isColor ? v.clone() : v && v.isMatrix4 ? v.clone() : v }
  }
  return out
}

type Mask = {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  yaw: number; pitch: number; roll: number
  blinkNext: number; blinkStart: number
  shimPhase: number; shimRun: boolean; shimCool: number
}

const OMX = [0.37, 0.29, 0.43]
const OMY = [0.33, 0.47, 0.23]
const PHX = [0, 2.1, 4.2]
const PHY = [1, 3, 5.2]

export function DesktopTrio({ sim }: { sim: Sim }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const rig = useMemo(() => {
    const masks = [0, 1, 2].map((i) => {
      const dotGeo = new THREE.BufferGeometry()
      for (const k of Object.keys(sim.geometry.attributes)) dotGeo.setAttribute(k, sim.geometry.attributes[k])
      const glyphGeo = new THREE.BufferGeometry()
      for (const k of Object.keys(sim.glyphGeo.attributes)) glyphGeo.setAttribute(k, sim.glyphGeo.attributes[k])
      const mk = (src: THREE.ShaderMaterial) =>
        new THREE.ShaderMaterial({
          uniforms: cloneUniforms(src.uniforms),
          vertexShader: src.vertexShader,
          fragmentShader: src.fragmentShader,
          transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
        })
      const dotMat = mk(sim.material)
      dotMat.uniforms.uMode.value = 1
      dotMat.uniforms.uMaskIdx.value = i
      const glyphMat = mk(sim.glyphMat)
      const pupilMat = mk(sim.pupilMat)
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
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POOL * 3), 3))
    geo.setAttribute('aGlyph', new THREE.BufferAttribute(new Float32Array(POOL), 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(POOL), 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(POOL), 1))
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

  const st = useRef({
    clock: 0, dance: 0, wasBroken: false,
    breakAcc: 0, trailAcc: [0, 0, 0], hazeAcc: 0,
    masks: [0, 1, 2].map((i): Mask => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, roll: 0,
      blinkNext: 2 + i * 1.7, blinkStart: -1, shimPhase: 0, shimRun: false, shimCool: 0,
    })),
    n: 0,
    px: new Float32Array(POOL), py: new Float32Array(POOL), pz: new Float32Array(POOL),
    vx: new Float32Array(POOL), vy: new Float32Array(POOL), vz: new Float32Array(POOL),
    age: new Float32Array(POOL), life: new Float32Array(POOL), seed: new Float32Array(POOL),
    gl: new Float32Array(POOL), gt: new Float32Array(POOL), sz: new Float32Array(POOL), amp: new Float32Array(POOL), kind: new Float32Array(POOL),
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

  useFrame((_, delta) => {
    const S = st.current
    const ts = trioShared
    const B = desktopBreak
    const dt = Math.min(delta, 1 / 30)
    const posTex = ts.posTex
    if (!posTex) return

    const cam = camera as THREE.PerspectiveCamera
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * cam.position.z
    const halfW = halfH * (size.width / size.height)
    const sBase = (TRIO_VH * 2 * halfH) / FACE_H
    const N = Math.min(Math.floor((SIZE * SIZE) / 3), Math.round(SIZE * SIZE * Math.min(1, sBase) ** 2)) & ~7
    ts.n3 = 3 * N
    const stride = 8 // glyph pool stride in MaskField

    S.clock += dt
    S.pointer.speed *= Math.exp(-dt * 3)
    const energy = Math.min(1.6, ts.glow + S.pointer.speed * 0.35)
    S.dance += dt * DANCE_SPEED * (1 + 1.1 * energy)
    const d = S.dance
    const visible = B.amt > 0.0001 && ts.fade > 0.002
    const formed = smooth(FORMED_AT, 1, B.amt)

    // ---- choreography: the whole screen ----
    const g = smooth(0.35, 0.7, 0.5 + 0.5 * Math.sin(0.3 * d + 0.8)) // gather and circle together
    const g2 = smooth(0.55, 0.9, 0.5 + 0.5 * Math.sin(0.19 * d + 3)) // split to three corners
    const cX = 0.5 * halfW * Math.sin(0.17 * d), cY = 0.38 * halfH * Math.sin(0.23 * d + 1)
    const corners: [number, number][] = [[-0.74 * halfW, 0.55 * halfH], [0.74 * halfW, 0.45 * halfH], [0.05 * halfW, -0.6 * halfH]]
    const pw = S.pointer.moved ? S.pointer.x * halfW : 0
    const ph = S.pointer.moved ? S.pointer.y * halfH : 0
    const tg: { x: number; y: number; z: number }[] = []
    for (let i = 0; i < 3; i++) {
      const th = 0.7 * d + (i * Math.PI * 2) / 3
      const gx = cX + 0.38 * Math.cos(th), gy = cY + 0.31 * Math.sin(th)
      const lx = ROAM_X * halfW * Math.sin(OMX[i] * d + PHX[i]), ly = ROAM_Y * halfH * Math.sin(OMY[i] * d + PHY[i])
      let tx = lx + (gx - lx) * g
      let ty = ly + (gy - ly) * g
      tx += (corners[i][0] - tx) * g2 * 0.75
      ty += (corners[i][1] - ty) * g2 * 0.75
      const tz = 0.27 * Math.sin(0.5 * d + i * 2.1) + 0.08 * Math.sin(1.1 * d + i)
      tx = Math.max(-halfW + 0.22, Math.min(halfW - 0.22, tx))
      ty = Math.max(-halfH + 0.28, Math.min(halfH - 0.28, ty))
      tg.push({ x: tx + S.pointer.x * 0.04 * (0.5 + tz * 2) * (S.pointer.moved ? 1 : 0), y: ty, z: tz })
    }

    if (visible && !S.wasBroken) {
      // the break just began: the masks start at their slots (invisible until the flock arrives)
      for (let i = 0; i < 3; i++) { const M = S.masks[i]; M.x = tg[i].x; M.y = tg[i].y; M.z = tg[i].z; M.vx = M.vy = M.vz = 0 }
    }
    S.wasBroken = visible

    let presence = 0
    for (let i = 0; i < 3; i++) {
      const M = S.masks[i]
      const rg = rig.masks[i]
      presence += formed / 3
      rg.group.visible = visible

      // pointer kick: brush a mask and it is shoved away
      const dxp = M.x - pw, dyp = M.y - ph
      const dp = Math.hypot(dxp, dyp)
      if (S.pointer.moved && dp < 0.32 && dp > 1e-4) {
        const k = (1 - dp / 0.32) * S.pointer.speed * 4 * dt
        M.vx += (dxp / dp) * k
        M.vy += (dyp / dp) * k
        if (M.shimCool <= 0 && S.pointer.speed > 0.5 && formed > 0.9) { M.shimRun = true; M.shimPhase = 0; M.shimCool = 2.5 }
      }
      // soft keep-out between masks: they never overlap
      for (let j = 0; j < 3; j++) {
        if (j === i) continue
        const o = S.masks[j]
        const ex = M.x - o.x, ey = M.y - o.y
        const ed = Math.hypot(ex, ey)
        if (ed < KEEP_OUT && ed > 1e-4) {
          const k = (KEEP_OUT - ed) * 60 * dt
          M.vx += (ex / ed) * k
          M.vy += (ey / ed) * k
        }
      }
      // underdamped spring toward its place in the choreography
      M.vx += (SPRING_K * (tg[i].x - M.x) - SPRING_C * M.vx) * dt
      M.vy += (SPRING_K * (tg[i].y - M.y) - SPRING_C * M.vy) * dt
      M.vz += (SPRING_K * (tg[i].z - M.z) - SPRING_C * M.vz) * dt
      M.x += M.vx * dt; M.y += M.vy * dt; M.z += M.vz * dt
      // gentle bounce at the screen edges
      const bx = halfW - 0.2, by = halfH - 0.26
      if (M.x > bx) { M.x = bx; M.vx = -Math.abs(M.vx) * 0.6 } else if (M.x < -bx) { M.x = -bx; M.vx = Math.abs(M.vx) * 0.6 }
      if (M.y > by) { M.y = by; M.vy = -Math.abs(M.vy) * 0.6 } else if (M.y < -by) { M.y = -by; M.vy = Math.abs(M.vy) * 0.6 }
      const spd = Math.hypot(M.vx, M.vy)
      trioQ[i].set(M.x, M.y, M.z)

      // look at the pointer (or drift) and breathe
      const lookYaw = S.pointer.moved ? Math.max(-0.75, Math.min(0.75, (pw - M.x) * 0.9)) : 0
      const lookPitch = S.pointer.moved ? Math.max(-0.4, Math.min(0.4, -(ph - M.y) * 0.6)) : 0
      const yawT = lookYaw + 0.3 * Math.sin(0.6 * d + i * 2) + Math.max(-0.3, Math.min(0.3, -M.vx * 0.25))
      const pitchT = lookPitch + 0.08 * Math.sin(0.9 * d + i * 2)
      const rollT = Math.max(-0.25, Math.min(0.25, M.vx * 0.12)) + 0.06 * Math.sin(1.1 * d + i)
      const rk = 1 - Math.exp(-dt * 6)
      M.yaw += (yawT - M.yaw) * rk
      M.pitch += (pitchT - M.pitch) * rk
      M.roll += (rollT - M.roll) * rk

      let eyeOpen = 1
      if (formed > 0.95) {
        if (M.blinkStart < 0 && S.clock >= M.blinkNext) M.blinkStart = S.clock
        if (M.blinkStart >= 0) {
          const bt = (S.clock - M.blinkStart) / 0.16
          if (bt >= 1) { M.blinkStart = -1; M.blinkNext = S.clock + 3.2 + rnd() * 3.8 } else eyeOpen = 1 - Math.sin(bt * Math.PI)
        }
      }

      const sc = sBase * (1 + 0.03 * Math.sin(1.6 * d + i * 2.4))
      rg.group.position.set(M.x, M.y, M.z)
      rg.group.scale.setScalar(sc)
      rg.group.rotation.set(M.pitch, M.yaw, M.roll)
      rg.group.updateMatrix()
      rg.dotMat.uniforms.uInvModel.value.copy(rg.group.matrix).invert()

      // shimmer: a pulse climbs the face when two masks pass close
      M.shimCool -= dt
      for (let j = i + 1; j < 3; j++) {
        const o = S.masks[j]
        if (formed > 0.9 && M.shimCool <= 0 && Math.hypot(M.x - o.x, M.y - o.y) < SHIMMER_DIST) {
          M.shimRun = true; M.shimPhase = 0; M.shimCool = 3
          o.shimRun = true; o.shimPhase = 0; o.shimCool = 3
        }
      }
      if (M.shimRun) {
        M.shimPhase += dt / SHIMMER_SECS
        if (M.shimPhase >= 1) { M.shimRun = false; M.shimPhase = 1 }
      }
      const shim = M.shimRun ? Math.sin(Math.min(1, M.shimPhase) * Math.PI) : 0

      const depthDim = 0.78 + 0.22 * Math.min(1, Math.max(0, (M.z + 0.3) / 0.6))
      const f = ts.fade * depthDim
      const glow = Math.min(1, ts.glow + shim * 0.6)
      const du = rg.dotMat.uniforms
      du.uPositionTexture.value = posTex
      du.uVelocityTexture.value = ts.velTex
      du.uFade.value = f
      du.uBreak.value = B.amt
      du.uEyeOpen.value = eyeOpen
      du.uGlow.value = glow
      du.uTime.value = ts.time
      du.uShimmer.value = shim
      du.uShimmerPhase.value = M.shimPhase
      du.uExtraSpeed.value = Math.min(0.0035, spd * 0.0025)
      const gu = rg.glyphMat.uniforms
      gu.uPositionTexture.value = posTex
      gu.uFade.value = f * formed
      gu.uGlow.value = glow
      gu.uBurst.value = ts.glow
      gu.uTime.value = ts.time
      gu.uGlyphSize.value = 14
      const pu = rg.pupilMat.uniforms
      pu.uFade.value = f * formed
      pu.uEyeOpen.value = eyeOpen
      pu.uGlow.value = glow
      pu.uScale.value = sc
      // same density per area as the hero mask: particles [i*N, (i+1)*N)
      rg.dotGeo.setDrawRange(i * N, N)
      rg.glyphGeo.setDrawRange((i * N) / stride, N / stride)
    }

    // ---- glyphs (CPU bodies in world space): few, slow, long-lived ----
    const alive = ts.fade > 0.03
    const tNow = S.clock

    // 1) a burst that rides the flock
    if (B.broken && B.amt < 0.2 && alive) {
      S.breakAcc += BURST_GLYPHS_PER_SEC * dt
      while (S.breakAcc >= 1) {
        S.breakAcc -= 1
        if (S.n >= POOL) break
        const k = (rnd() * (sim.spawnPts.length / 3)) | 0
        const a = rnd() * Math.PI * 2
        const sp = 0.4 + rnd() * 0.9
        emit(S, OFFSET.x + sim.spawnPts[k * 3], OFFSET.y + sim.spawnPts[k * 3 + 1], sim.spawnPts[k * 3 + 2],
          Math.cos(a) * sp, Math.sin(a) * sp, 0.2 + rnd() * 0.4, 4 + rnd() * 3, 0.9 + rnd() * 0.4, 0.8, 1)
      }
    } else S.breakAcc = 0

    // 2) faint trails behind each dancer, and 3) a thin haze
    if (alive && formed > 0.5) {
      for (let i = 0; i < 3; i++) {
        const M = S.masks[i]
        const sp = Math.min(1, Math.hypot(M.vx, M.vy))
        S.trailAcc[i] += (5 + 20 * sp) * dt
        while (S.trailAcc[i] >= 1 && S.n < POOL) {
          S.trailAcc[i] -= 1
          emit(S, M.x + (rnd() - 0.5) * 0.14, M.y + (rnd() - 0.5) * 0.2, M.z - 0.02,
            -M.vx * 0.12 + (rnd() - 0.5) * 0.02, -M.vy * 0.12 + (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.02,
            2 + rnd() * 1.2, 0.6 + rnd() * 0.25, 0.4)
        }
        S.trailAcc[i] = Math.min(S.trailAcc[i], 2)
      }
      S.hazeAcc += 2.5 * dt
      while (S.hazeAcc >= 1 && S.n < POOL) {
        S.hazeAcc -= 1
        emit(S, (rnd() * 2 - 1) * halfW, (rnd() * 2 - 1) * halfH, (rnd() - 0.5) * 0.5,
          (rnd() - 0.5) * 0.02, 0.02 + rnd() * 0.04, 0, 8 + rnd() * 5, 0.8 + rnd() * 0.4, 0.35)
      }
    }

    // 4) integrate: gentle wander; flock glyphs are drawn to their mask
    const damp = Math.exp(-dt * 0.9)
    for (let i = S.n - 1; i >= 0; i--) {
      S.age[i] += dt
      if (S.age[i] >= S.life[i]) { remove(S, i); continue }
      const sd = S.seed[i]
      S.vx[i] += Math.sin(tNow * 0.5 + sd) * 0.03 * dt
      S.vy[i] += (0.008 + Math.cos(tNow * 0.4 + sd * 1.3) * 0.02) * dt
      S.vz[i] += Math.sin(tNow * 0.3 + sd * 0.7) * 0.015 * dt
      if (S.kind[i] === 1 && S.age[i] < 1.4) {
        const M = S.masks[((sd * 7) | 0) % 3]
        S.vx[i] += (M.x + Math.sin(sd * 3.1) * 0.25 - S.px[i]) * 8 * dt
        S.vy[i] += ((M.y + Math.cos(sd * 1.7) * 0.3 - S.py[i]) * 8 + Math.sin(S.px[i] * 6 + tNow * 12) * 3) * dt
        S.vx[i] *= Math.exp(-dt * 1.6)
        S.vy[i] *= Math.exp(-dt * 1.6)
      }
      S.vx[i] *= damp; S.vy[i] *= damp; S.vz[i] *= damp
      S.px[i] += S.vx[i] * dt
      S.py[i] += S.vy[i] * dt
      S.pz[i] = Math.min(0.9, S.pz[i] + S.vz[i] * dt)
      S.gt[i] -= dt
      if (S.gt[i] <= 0) { S.gl[i] = randGlyph(); S.gt[i] = 0.6 + rnd() * 1.2 }
      if (Math.abs(S.px[i]) > halfW * 1.4 || Math.abs(S.py[i]) > halfH * 1.4) remove(S, i)
    }

    // 5) write buffers
    const pos = rig.geo.attributes.position.array as Float32Array
    const gla = rig.geo.attributes.aGlyph.array as Float32Array
    const ala = rig.geo.attributes.aAlpha.array as Float32Array
    const sza = rig.geo.attributes.aSize.array as Float32Array
    for (let i = 0; i < S.n; i++) {
      pos[i * 3] = S.px[i]; pos[i * 3 + 1] = S.py[i]; pos[i * 3 + 2] = S.pz[i]
      gla[i] = S.gl[i]
      const ai = Math.min(1, S.age[i] / 0.8)
      const ao = Math.min(1, (S.life[i] - S.age[i]) / (S.life[i] * 0.45))
      ala[i] = ai * ai * (3 - 2 * ai) * ao * ao * (3 - 2 * ao) * S.amp[i] * 0.85
      sza[i] = S.sz[i]
    }
    rig.geo.attributes.position.needsUpdate = true
    rig.geo.attributes.aGlyph.needsUpdate = true
    rig.geo.attributes.aAlpha.needsUpdate = true
    rig.geo.attributes.aSize.needsUpdate = true
    rig.geo.setDrawRange(0, S.n)
    rig.mat.uniforms.uFade.value = ts.fade
    rig.mat.uniforms.uGlow.value = ts.glow
    rig.glyphPts.visible = S.n > 0 && presence >= 0
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

function emit(S: any, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, amp: number, kind = 0) {
  const i = S.n++
  S.px[i] = x; S.py[i] = y; S.pz[i] = z
  S.vx[i] = vx; S.vy[i] = vy; S.vz[i] = vz
  S.age[i] = 0; S.life[i] = life; S.seed[i] = rnd() * 1000
  S.gl[i] = randGlyph(); S.gt[i] = rnd() * 0.8
  S.sz[i] = size; S.amp[i] = amp; S.kind[i] = kind
}

function remove(S: any, i: number) {
  const l = --S.n
  if (i === l) return
  for (const k of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'age', 'life', 'seed', 'gl', 'gt', 'sz', 'amp', 'kind']) S[k][i] = S[k][l]
}
