/* ============================================================================
 * PhoneSwarm.tsx: the phone hero. Glyphs in the air on the first screen; on the
 * way to The Past they gather into THREE masks, and the three dance a set piece
 * through The Past, The Present and The Future, then rest beside the form.
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-25: "remove the masks from the phone version ... we just keep
 * the glyphs, and when I start scrolling, the three masks should form in the past
 * slide, and then they should keep dancing as you go to the present, the future.
 * Dance needs to be better."
 *
 * WHAT HAPPENS
 *  1. First screen: no masks. A sparse field of binary digits and Telugu letters
 *     drifts up and twinkles behind the name.
 *  2. Forming is an EVENT, not a scrub. Once the first frame starts to slide away
 *     (FORM_POS) some of those same glyphs fly in along arcs and condense into
 *     three masks over FORM_SECS, whatever the finger does next. Scrolling back to
 *     the first screen (LOOSEN_POS) loosens them into glyphs again. The gap between
 *     the two thresholds stops any flicker.
 *  3. The dance is three composed moves on one shared clock, one per frame:
 *       The Past     THE CHASE     all three follow each other round one tall
 *                                  figure-eight (the three-body orbit), heads
 *                                  turned into the direction of travel, banking.
 *       The Present  THE TRIANGLE  they hold a triangle round the text, breathe
 *                                  together facing inward, then step a sixth of a
 *                                  turn so the triangle flips. Hold, step, hold.
 *       The Future   THE ASCENT    one after another they spiral up from the
 *                                  bottom, widening, looking up and outward, then
 *                                  slip back down the side margin to go again.
 *     Moving between frames cross-fades the moves over about a second; a spring
 *     carries each mask, so nothing teleports and nothing snaps when the scroll
 *     direction flips. Scroll speed raises the tempo and sways them, then it settles.
 *  4. Reading comes first. The paths rest in the free lanes (above the title, the
 *     side margins, below the text) and cross the text at their fastest; a mask
 *     over the text is dimmer and smaller. The text block is MEASURED from the
 *     frame on screen ([data-pan]), with safe defaults if it is not found.
 *  5. A tap on a mask bursts it into glyphs and it re-forms; all three turn to
 *     look at the finger.
 *  6. Contact: they peek in from the screen edges beside the form, clear of the
 *     fields, with a slow bob.
 *  Reduced motion: no flight and no dance. The glyphs stand still and the masks
 *  fade in at their resting places by the edges.
 *
 * Cost: one 84x84 sim, three draws of 7,056 dots (about 21,000, down from about
 * 85,000), three small roving-glyph draws and ONE draw for every glyph in the
 * air (326). Seven draw calls, no allocation in the frame loop.
 *
 * The masks are the same pipeline as ContactMaskSwarm / MaskField (same crop,
 * eye and nose weights, blink, speed-driven alpha, additive points, roving
 * glyphs); those files stay untouched. Colours come from maskColor().
 *
 * Debug: add ?dancedebug to the address and window.__dance holds the three
 * mask centres, form amounts and dimming (tools/phone-check/dance.mjs reads it).
 * ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { heroScroll } from '../../hooks/heroScroll'
import { maskColor } from '../../velvetLab'
import { contactHandoff } from '../../hooks/contactVisibility'
import { heroIntro } from '../../hooks/heroIntro'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const SIZE = 84 // 84 x 84 = 7,056 dots per face, the same as the desktop swarm
const MASKS = 3

// Face crop and features (same values as ContactMaskSwarm / MaskField).
const FRONT_FACING = 0.12
const BACK_CLIP = -0.11
const FACE_X_HALF = 0.32
const FACE_Y_BOTTOM = -0.64
const FACE_TOP_PEAK = 0.36
const FACE_TOP_CURVE = 2.2
const EYE_Y = -0.14
const EYE_X = 0.16
const EYE_HW = 0.09
const EYE_OPEN = 0.035
const EYE_LINE_BW = 0.01
const EYE_IRIS_R = 0.028
const NOSE_X_HALF = 0.055
const NOSE_Y = 0.06
const NOSE_Y_HALF = 0.17
const NOSE_TOP = 0.14

function eyeWeight(x: number, y: number): number {
  const edx = Math.abs(x) - EYE_X
  const edy = y - EYE_Y
  const enx = edx / EYE_HW
  if (Math.abs(enx) >= 1) return 0
  const et = 1 - enx * enx
  const dLid = Math.min(Math.abs(edy - EYE_OPEN * et), Math.abs(edy + EYE_OPEN * et))
  const lid = Math.max(0, 1 - dLid / EYE_LINE_BW) * Math.min(1, (1 - Math.abs(enx)) / 0.18)
  const iris = Math.max(0, 1 - Math.hypot(edx, edy) / EYE_IRIS_R)
  return Math.max(lid, iris)
}
function noseWeight(x: number, y: number): number {
  if (y > NOSE_TOP) return 0
  const noseDist = Math.hypot(x / NOSE_X_HALF, (y - NOSE_Y) / NOSE_Y_HALF)
  return Math.max(0, 1 - noseDist) * 0.85
}

/* ---------------------------------------------------------------------------
 * KNOBS
 * ------------------------------------------------------------------------- */
const FACE_LOCAL_W = 0.64
const FACE_MID_Y = -0.14 // the face's visual middle, in its own units (it hangs below its origin)
/** On-screen width of a mask in CSS px: a share of the screen width, inside limits. */
const FACE_SHARE = 0.148
const FACE_MIN = 50
const FACE_MAX = 62

/* THE EVENT, in frame units (hero progress x 3: 0 = first screen, 1 = The Past).
 * The first frame holds still until 0.3, so the masks never form over it. */
const FORM_POS = 0.33
const LOOSEN_POS = 0.29
const FORM_SECS = 1.15
const LOOSEN_SECS = 0.9
const FORM_STAGGER = 0.1 // seconds between the three

/* THE DANCE. Seconds for one figure-eight, one hold-and-step, one ascent. */
const T_CHASE = 10.5
const T_STEP = 4.4
const T_ASCENT = 12
const CHASE_WARP = 0.3 // slower at the tips of the eight, faster through the text
const STEP_HOLD = 0.55 // share of T_STEP the triangle stands still and breathes
const ASCENT_RISE = 0.7 // share of T_ASCENT spent rising; the rest is the way back down
const SPRING_K = 60
const SPRING_C = 13 // a little under critical: one soft overshoot, no bounce
const TEMPO_GAIN = 1.4 // extra tempo at full scroll speed
const SWAY_PX = 34 // how far a fast scroll carries the masks sideways

/* READING. A mask over the text loses this share of brightness and size. */
const DIM_FADE = 0.58
const DIM_SHRINK = 0.2

/* TOUCH. */
const TAP_RADIUS = 70 // px from a mask's middle that still counts as tapping it
const BURST_OUT = 0.4
const BURST_HOLD = 0.25
const BURST_BACK = 0.95
const LOOK_SECS = 2.6

/* THE AIR: glyphs that gather into the masks, plus glyphs that only ever float. */
const GATHER = 72 // per mask
const FREE = 110
const AIR_COUNT = GATHER * MASKS + FREE
/** Where the name, sentence and buttons sit on the first screen, as shares of its height. */
const FIRST_WORDS_TOP = 0.44
const FIRST_WORDS_BOTTOM = 0.9
const AIR_GLYPH_PX = 12 // CSS px at depth 1; each glyph is 0.55x to 1.45x of this

// Roving glyphs on the faces (same mechanism and numbers as the desktop swarm).
const BINARY = ['0', '1']
const TELUGU = ['అ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'ద', 'న', 'మ', 'ర', 'ల', 'వ', 'స', 'హ']
const GLYPH_CHARS = [...BINARY, ...TELUGU]
const GLYPH_POOL_FRACTION = 0.07
const GLYPH_ON_FRAC = 0.06
const GLYPH_ROVE_SPEED = 0.0024
const GLYPH_RISE_EXP = 1.6
const GLYPH_SIZE = 10

const DEBUG = typeof location !== 'undefined' && location.search.includes('dancedebug')

function makeGlyphAtlas() {
  const cols = Math.ceil(Math.sqrt(GLYPH_CHARS.length))
  const cell = 64
  const px = cols * cell
  const cvs = document.createElement('canvas')
  cvs.width = px
  cvs.height = px
  const ctx = cvs.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '42px "Nirmala UI", "Gautami", "Noto Sans Telugu", monospace'
  GLYPH_CHARS.forEach((ch, i) => {
    ctx.fillText(ch, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2)
  })
  const tex = new THREE.CanvasTexture(cvs)
  tex.flipY = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return { texture: tex, cols }
}

const simPosition = /* glsl */ `
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(uCurrentPosition, uv).xyz;
    vec3 vel = texture2D(uCurrentVelocity, uv).xyz;
    pos += vel;
    gl_FragColor = vec4(pos, 1.0);
  }
`
const simVelocity = /* glsl */ `
  uniform sampler2D uHome;
  uniform float uTime;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos  = texture2D(uCurrentPosition, uv).xyz;
    vec3 home = texture2D(uHome, uv).xyz;
    vec3 vel  = texture2D(uCurrentVelocity, uv).xyz;
    vel *= 0.72;
    vec3 toHome = home - pos;
    float d = length(toHome);
    if (d > 0.0001) vel += normalize(toHome) * d * 0.02;
    float n = sin(uTime * 0.7 + uv.x * 40.0) * cos(uTime * 0.5 + uv.y * 40.0);
    vel += vec3(n, -n, n * 0.4) * 0.00006;
    gl_FragColor = vec4(vel, 1.0);
  }
`

// The face dots: the desktop swarm's shader, plus `uForm`. As a face forms, its dots
// appear in a per-dot random order and each one arrives from a wider, turned cloud,
// so the face CONDENSES into place; falling `uForm` plays the same thing backwards.
const renderVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uParticleSize;
  uniform float uForm;
  uniform float uStill;
  attribute vec2 aRef;
  attribute float aGlyphSeed;
  attribute float aEye;
  attribute float aNose;
  attribute float aRand;
  uniform float uTime;
  uniform float uRoveSpeed;
  uniform float uOnFrac;
  uniform float uEyeOpen;
  varying float vSpeed;
  varying float vGlyphFade;
  varying float vFeature;
  varying float vAlive;

  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    vSpeed = length(texture2D(uVelocityTexture, aRef).xyz);
    vFeature = max(aNose, aEye * uEyeOpen);
    vGlyphFade = 0.0;
    if (aGlyphSeed >= 0.0) {
      float life = fract(aGlyphSeed * 31.7 + uTime * uRoveSpeed);
      float edge = min(0.06, uOnFrac * 0.5);
      vGlyphFade = clamp(smoothstep(0.0, edge, life) - smoothstep(uOnFrac - edge, uOnFrac, life), 0.0, 1.0);
    }
    float th = 0.3 + aRand * 0.4;
    vAlive = smoothstep(th, th + 0.3, uForm);
    float loose = (1.0 - vAlive) * (1.0 - uStill);
    vec3 mid = vec3(0.0, ${FACE_MID_Y.toFixed(2)}, 0.0);
    vec3 q = pos - mid;
    float turn = loose * 1.3;
    float ca = cos(turn);
    float sa = sin(turn);
    q.xy = mat2(ca, sa, -sa, ca) * q.xy * (1.0 + loose * (0.8 + 1.6 * fract(aRand * 7.31)));
    pos = q + mid;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uParticleSize / -mv.z) * step(0.002, vAlive);
    gl_Position = projectionMatrix * mv;
  }
`
const renderFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uMinAlpha;
  uniform float uMaxAlpha;
  uniform float uFade;
  uniform float uFeatureFloor;
  varying float vSpeed;
  varying float vGlyphFade;
  varying float vFeature;
  varying float vAlive;
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float a = clamp(vSpeed * 100.0, uMinAlpha, uMaxAlpha);
    a = max(a, vFeature * uFeatureFloor);
    a *= (1.0 - vGlyphFade);
    a *= uFade * vAlive;
    gl_FragColor = vec4(uColor, a);
  }
`

// The ever-present roving glyphs on a face (same as the desktop swarm).
const roveVertex = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform float uGlyphSize;
  uniform float uTime;
  uniform float uBinStart;
  uniform float uTelStart;
  uniform float uOnFrac;
  uniform float uRoveSpeed;
  uniform float uDriftUp;
  uniform float uDriftOut;
  uniform float uDriftSide;
  uniform float uRiseExp;
  attribute vec2 aRef;
  attribute float aSeed;
  varying float vGlyph;
  varying float vAlpha;
  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  void main() {
    vec3 pos = texture2D(uPositionTexture, aRef).xyz;
    float life = fract(aSeed * 31.7 + uTime * uRoveSpeed);
    float edge = min(0.06, uOnFrac * 0.5);
    float fade = smoothstep(0.0, edge, life) - smoothstep(uOnFrac - edge, uOnFrac, life);
    vAlpha = clamp(fade, 0.0, 1.0);
    float lp = clamp(life / uOnFrac, 0.0, 1.0);
    float rise = pow(lp, uRiseExp);
    pos.y += uDriftUp * rise;
    pos.z += uDriftOut * rise;
    pos.x += (hash(aSeed * 17.0) - 0.5) * uDriftSide * rise;
    float relight = floor(aSeed * 31.7 + uTime * uRoveSpeed);
    float cat = step(0.5, hash(aSeed * 3.1 + relight));
    float start = cat < 0.5 ? uBinStart : uTelStart;
    float cnt = cat < 0.5 ? 2.0 : 16.0;
    float r = hash(aSeed * 7.0 + cat * 5.0 + relight);
    vGlyph = start + floor(r * cnt);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (uGlyphSize / -mv.z) * step(0.002, vAlpha);
    gl_Position = projectionMatrix * mv;
  }
`

// THE AIR: every floating glyph, in one draw. Each drifts slowly upward round its own
// place and twinkles. A glyph that belongs to a mask (aFace 0..2) also has a seat on
// that mask (aRef, one of its dots): as the mask's uForm rises the glyph leaves the
// air, flies to its seat along an arc and goes out as the dots come on. Falling uForm
// sends it back. uNear moves its "air" place to a ring round the mask, which is what
// a tap uses: the mask bursts into a small cloud of glyphs and takes them back.
const airVertex = /* glsl */ `
  attribute vec2 aTarget;
  attribute float aSeed;
  attribute float aFace;
  attribute vec2 aRef;
  attribute float aRand;
  uniform sampler2D uPositionTexture;
  uniform mat4 uFaceM[${MASKS}];
  uniform float uForm[${MASKS}];
  uniform float uNear[${MASKS}];
  uniform float uTime;
  uniform float uAir;
  uniform float uCalm;
  uniform vec2 uQuiet;
  uniform float uStill;
  uniform float uRing;
  uniform float uGlyphPx;
  uniform vec2 uWorld;
  varying float vGlyph;
  varying float vAlpha;
  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  void main() {
    float s = aSeed * 6.2831;
    float t = uTime * (1.0 - uStill);
    vec2 f = aTarget;
    f.y = fract(f.y - t * (0.004 + 0.008 * hash(aSeed * 3.3)));
    float edge = smoothstep(0.0, 0.07, f.y) * (1.0 - smoothstep(0.93, 1.0, f.y));
    f.x += 0.03 * sin(t * 0.21 + s) + 0.012 * sin(t * 0.63 + s * 2.3);
    f.y += 0.012 * cos(t * 0.47 + s * 1.7);
    vec3 pos = vec3((f.x - 0.5) * uWorld.x, -(f.y - 0.5) * uWorld.y, 0.0);
    float depth = 0.55 + 0.9 * hash(aSeed * 11.0);
    float tw = 0.5 + 0.5 * sin(t * (0.5 + 0.8 * hash(aSeed * 5.0)) + s * 2.0);
    // quieter where the words are: uQuiet is the top and bottom of the text, as screen fractions
    float words = smoothstep(uQuiet.x - 0.05, uQuiet.x + 0.03, f.y) * (1.0 - smoothstep(uQuiet.y - 0.03, uQuiet.y + 0.05, f.y));
    float alpha = edge * (0.2 + 0.62 * tw * tw) * (0.5 + 0.4 * depth) * mix(1.0, 0.75, uCalm) * (1.0 - 0.62 * words);
    float size = depth;
    if (aFace > -0.5) {
      int fi = int(aFace + 0.5);
      float form = uForm[fi];
      float nr = uNear[fi];
      vec3 home = (uFaceM[fi] * vec4(texture2D(uPositionTexture, aRef).xyz, 1.0)).xyz;
      vec3 ctr = (uFaceM[fi] * vec4(0.0, ${FACE_MID_Y.toFixed(2)}, 0.0, 1.0)).xyz;
      float ang = hash(aSeed * 23.0) * 6.2831;
      vec3 ring = ctr + vec3(cos(ang), sin(ang), 0.0) * uRing * (0.55 + 0.9 * hash(aSeed * 29.0));
      vec3 air = mix(pos, ring, nr);
      float g = clamp(form * 1.6 - aRand * 0.6, 0.0, 1.0);
      float e = g * g * g * (g * (g * 6.0 - 15.0) + 10.0);
      vec3 p = mix(air, home, e);
      vec2 d = home.xy - air.xy;
      p.xy += vec2(-d.y, d.x) * 0.3 * sin(e * 3.14159) * (hash(aSeed * 41.0) - 0.5) * 2.0;
      float bright = max(smoothstep(0.0, 0.2, g), nr);
      float flying = mix(alpha, 0.9, bright) * (1.0 - smoothstep(0.78, 1.0, g));
      // reduced motion: nothing flies; the glyph just fades where it is as the mask fades in
      pos = mix(p, pos, uStill);
      alpha = mix(flying, alpha * (1.0 - form), uStill);
      size = mix(mix(depth, 1.0, bright), depth, uStill);
    }
    vAlpha = alpha * uAir;
    vGlyph = floor(hash(aSeed * 7.3 + floor(t * 0.45 + aSeed * 9.0)) * ${GLYPH_CHARS.length}.0);
    gl_PointSize = uGlyphPx * size * step(0.004, vAlpha);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`
const glyphFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform vec3 uColor;
  uniform float uFade;
  varying float vGlyph;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.01) discard;
    float idx = floor(vGlyph + 0.5);
    vec2 uv = (vec2(mod(idx, uCols), floor(idx / uCols)) + gl_PointCoord) / uCols;
    vec4 g = texture2D(uAtlas, uv);
    if (g.a < 0.15) discard;
    gl_FragColor = vec4(uColor, g.a * vAlpha * uFade);
  }
`

/* ---------------------------------------------------------------------------
 * Small maths, no allocation.
 * ------------------------------------------------------------------------- */
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const TAU = Math.PI * 2

/** The text block of a frame, in screen px. Measured live; these are the fall-backs. */
type Zone = { l: number; r: number; t: number; b: number; ok: boolean }
/** The free lanes round a text block: where a mask may rest. */
const LANE = { xl: 0, xr: 0, yt: 0, yb: 0 }
function lanes(z: Zone, W: number, H: number) {
  LANE.xl = clamp(z.l * 0.5, 20, 46)
  LANE.xr = W - clamp((W - z.r) * 0.5, 20, 46)
  LANE.yt = clamp(z.t * 0.5 + 8, 38, 70)
  LANE.yb = clamp((z.b + H) * 0.5, H - 130, H - 46)
}
/** What a move asks of one dancer this frame. */
const STEP = { x: 0, y: 0, yaw: 0, pitch: 0, size: 1, fade: 1, travel: 0 }

/** THE CHASE: one tall figure-eight, three bodies a third of a lap apart. */
function chase(k: number, song: number, W: number, swell: number) {
  const s = (song / T_CHASE) * TAU + (k * TAU) / 3 - Math.PI / 2
  const u = s + CHASE_WARP * Math.sin(2 * s)
  const ax = ((LANE.xr - LANE.xl) / 2) * swell
  const ay = (LANE.yb - LANE.yt) / 2
  STEP.x = W / 2 + ax * Math.sin(2 * u)
  STEP.y = (LANE.yt + LANE.yb) / 2 + ay * Math.sin(u)
  STEP.yaw = 0
  STEP.pitch = 0
  STEP.size = 1
  STEP.fade = 1
  STEP.travel = 1 // heads follow the direction of travel
}

/** THE TRIANGLE: hold a triangle round the text and breathe, then step a sixth of a turn. */
function triangle(k: number, song: number, W: number, swell: number) {
  const tau = song / T_STEP
  const n = Math.floor(tau)
  const frac = tau - n
  const move = smooth(STEP_HOLD, 1, frac)
  const phi = -Math.PI / 2 + (Math.PI / 3) * (n + move) + (k * TAU) / 3
  // breathe in during the hold: draw together a little and grow, then let go before the step
  const hold = clamp(frac / STEP_HOLD, 0, 1)
  const breath = Math.sin(Math.PI * hold) ** 2
  const a = ((LANE.xr - LANE.xl) / 2) * swell * (1 - 0.07 * breath)
  const b = ((LANE.yb - LANE.yt) / 2) * (1 - 0.05 * breath)
  // an ellipse squared off a little, so the resting places sit out in the lanes
  const Q = 0.04
  const cx = (Math.cos(phi) - Q * Math.cos(3 * phi)) / (1 - Q)
  const sy = (Math.sin(phi) + Q * Math.sin(3 * phi)) / (1 - Q)
  STEP.x = W / 2 + a * cx
  STEP.y = (LANE.yt + LANE.yb) / 2 + b * sy
  // face the middle of the formation, which is each other
  STEP.yaw = -cx * 0.62
  STEP.pitch = -sy * 0.26
  STEP.size = 1 + 0.07 * breath
  STEP.fade = 1
  STEP.travel = Math.sin(Math.PI * move) * 0.75 // look where you step, then back to the middle
}

/** THE ASCENT: spiral up from the bottom, widening; slip back down the side margin. */
function ascent(k: number, song: number, W: number, swell: number) {
  const c = song / T_ASCENT + k / 3
  const n = Math.floor(c)
  const q = c - n
  // Every lap ends in the LEFT margin and comes down it (the right top corner belongs to the
  // menu button). Keeping one side for all three is what stops the dancer on the way down
  // from meeting the next one swinging out: that one is always in the other margin.
  const side = -1
  const a = ((LANE.xr - LANE.xl) / 2) * swell
  const yTop = Math.max(LANE.yt + 40, 104)
  const yBot = LANE.yb
  if (q < ASCENT_RISE) {
    const r = q / ASCENT_RISE
    const h = r - Math.sin(TAU * r) / TAU // eases out of the bottom and into the top
    const a0 = 2.5 * Math.PI * r // one and a quarter turns round the text,
    const alpha = a0 + 0.3 * Math.sin(2 * a0) // lingering out in the margins, quick across the words
    const reach = a * smooth(0.02, 0.4, h)
    const sn = Math.sin(alpha)
    STEP.x = W / 2 + side * reach * sn
    STEP.y = yBot + (yTop - yBot) * h
    STEP.yaw = side * sn * 0.6 * smooth(0.05, 0.4, h) // outward
    STEP.pitch = -0.34 * smooth(0, 0.25, h) // and up
    STEP.size = 1 + 0.1 * Math.cos(alpha) * smooth(0, 0.15, r) // nearer at the front of the turn, further at the back
    STEP.fade = 1
  } else {
    const r = (q - ASCENT_RISE) / (1 - ASCENT_RISE)
    const inward = smooth(0.5, 1, r)
    STEP.x = W / 2 + side * a * (1 - inward)
    STEP.y = yTop + (yBot - yTop) * smooth(0, 0.8, r)
    // the walk back to the start is quieter: smaller, softer, eyes already on the middle
    const quiet = Math.sin(Math.PI * clamp(r / 0.9, 0, 1))
    STEP.yaw = side * 0.6 * (1 - inward) * (1 - quiet) - side * 0.35 * quiet
    STEP.pitch = -0.34 * (1 - smooth(0, 0.3, r)) + 0.18 * quiet
    STEP.size = 1 - 0.16 * quiet
    STEP.fade = 1 - 0.28 * quiet
  }
  STEP.travel = 0
}

type Dancer = {
  x: number; y: number; vx: number; vy: number; ax: number
  yaw: number; pitch: number; roll: number
  dim: number
  form: number; formT: number; delay: number
  burst: number; burstT: number; near: number
}
type Blink = { clock: number; next: number; start: number }
type DanceDebug = { x: number[]; y: number[]; form: number[]; dim: number[]; move: number; song: number }

export function PhoneSwarm() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const reduced = usePrefersReducedMotion()

  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    const draco = new DRACOLoader()
    draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.load(
      '/models/cyborg.glb',
      (gltf) => {
        let g: THREE.BufferGeometry | null = null
        gltf.scene.traverse((o) => {
          if (!g && (o as THREE.Mesh).isMesh) g = (o as THREE.Mesh).geometry
        })
        setGeo(g)
      },
      undefined,
      (err) => console.error('[PhoneSwarm] model load error:', err),
    )
    return () => {
      draco.dispose()
    }
  }, [])

  const [sim, setSim] = useState<{
    gpu: GPUComputationRenderer
    posVar: any
    velVar: any
    geometry: THREE.BufferGeometry
    roveGeo: THREE.BufferGeometry
    airGeo: THREE.BufferGeometry
    airMat: THREE.ShaderMaterial
    atlas: THREE.Texture
    faceMats: THREE.ShaderMaterial[]
    roveMats: THREE.ShaderMaterial[]
  } | null>(null)

  useEffect(() => {
    if (!geo) return
    let cancelled = false

    const build = async () => {
      if (!geo.attributes.normal) geo.computeVertexNormals()
      const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()
      const count = SIZE * SIZE
      const homeData = new Float32Array(count * 4)
      const refs = new Float32Array(count * 2)
      const eyeData = new Float32Array(count)
      const noseData = new Float32Array(count)
      const randData = new Float32Array(count)
      const p = new THREE.Vector3()
      const n = new THREE.Vector3()
      const inFace = (v: THREE.Vector3, nz: number) =>
        nz >= FRONT_FACING &&
        v.z >= BACK_CLIP &&
        Math.abs(v.x) <= FACE_X_HALF &&
        v.y >= FACE_Y_BOTTOM &&
        v.y <= FACE_TOP_PEAK - FACE_TOP_CURVE * v.x * v.x
      const last = new THREE.Vector3(0, -0.08, 0.2)
      for (let i = 0; i < SIZE; i++) {
        if (i % 8 === 0) await new Promise((r) => setTimeout(r, 0))
        if (cancelled) return
        for (let j = 0; j < SIZE; j++) {
          const idx = i * SIZE + j
          let tries = 0
          do {
            sampler.sample(p, n)
            tries++
          } while (!inFace(p, n.z) && tries < 40)
          if (!inFace(p, n.z)) p.copy(last)
          else last.copy(p)
          p.x = Math.abs(p.x) * (Math.random() < 0.5 ? 1 : -1)
          homeData[idx * 4] = p.x
          homeData[idx * 4 + 1] = p.y
          homeData[idx * 4 + 2] = p.z
          homeData[idx * 4 + 3] = 1
          eyeData[idx] = eyeWeight(p.x, p.y)
          noseData[idx] = noseWeight(p.x, p.y)
          randData[idx] = Math.random()
          refs[idx * 2] = (j + 0.5) / SIZE
          refs[idx * 2 + 1] = (i + 0.5) / SIZE
        }
      }

      const gpu = new GPUComputationRenderer(SIZE, SIZE, gl)
      const homeTex = gpu.createTexture()
      homeTex.image.data!.set(homeData)
      const velTex = gpu.createTexture()
      const posVar = gpu.addVariable('uCurrentPosition', simPosition, homeTex)
      const velVar = gpu.addVariable('uCurrentVelocity', simVelocity, velTex)
      gpu.setVariableDependencies(posVar, [posVar, velVar])
      gpu.setVariableDependencies(velVar, [posVar, velVar])
      const homeRef = gpu.createTexture()
      homeRef.image.data!.set(homeData)
      velVar.material.uniforms.uHome = { value: homeRef }
      velVar.material.uniforms.uTime = { value: 0 }
      const err = gpu.init()
      if (err) console.error('[PhoneSwarm] GPGPU init error:', err)

      // Roving-glyph candidates on a face (strided, as in the desktop swarm).
      const glyphPool = Math.max(1, Math.floor(count * GLYPH_POOL_FRACTION))
      const stride = Math.max(1, Math.floor(count / glyphPool))
      const gRefs: number[] = []
      const gSeeds: number[] = []
      const baseGlyphSeed = new Float32Array(count).fill(-1)
      for (let k = 0; k < count; k += stride) {
        const seed = Math.random()
        gRefs.push(refs[k * 2], refs[k * 2 + 1])
        gSeeds.push(seed)
        baseGlyphSeed[k] = seed
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
      geometry.setAttribute('aRef', new THREE.BufferAttribute(refs, 2))
      geometry.setAttribute('aGlyphSeed', new THREE.BufferAttribute(baseGlyphSeed, 1))
      geometry.setAttribute('aEye', new THREE.BufferAttribute(eyeData, 1))
      geometry.setAttribute('aNose', new THREE.BufferAttribute(noseData, 1))
      geometry.setAttribute('aRand', new THREE.BufferAttribute(randData, 1))

      const roveGeo = new THREE.BufferGeometry()
      roveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((gRefs.length / 2) * 3), 3))
      roveGeo.setAttribute('aRef', new THREE.BufferAttribute(new Float32Array(gRefs), 2))
      roveGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(gSeeds), 1))

      // The air. The first GATHER x 3 glyphs each have a seat on a mask; the rest only float.
      const aTarget = new Float32Array(AIR_COUNT * 2)
      const aSeed = new Float32Array(AIR_COUNT)
      const aFace = new Float32Array(AIR_COUNT)
      const aRef = new Float32Array(AIR_COUNT * 2)
      const aRand = new Float32Array(AIR_COUNT)
      for (let k = 0; k < AIR_COUNT; k++) {
        aTarget[k * 2] = 0.03 + Math.random() * 0.94
        aTarget[k * 2 + 1] = Math.random()
        aSeed[k] = Math.random()
        aFace[k] = k < GATHER * MASKS ? k % MASKS : -1
        const seat = Math.floor(Math.random() * count)
        aRef[k * 2] = refs[seat * 2]
        aRef[k * 2 + 1] = refs[seat * 2 + 1]
        aRand[k] = Math.random()
      }
      const airGeo = new THREE.BufferGeometry()
      airGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(AIR_COUNT * 3), 3))
      airGeo.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 2))
      airGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1))
      airGeo.setAttribute('aFace', new THREE.BufferAttribute(aFace, 1))
      airGeo.setAttribute('aRef', new THREE.BufferAttribute(aRef, 2))
      airGeo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1))

      const atlas = makeGlyphAtlas()
      const mk = (vs: string, fs: string, uniforms: Record<string, { value: unknown }>) =>
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader: vs,
          fragmentShader: fs,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      const three = [0, 1, 2]
      const faceMats = three.map(() =>
        mk(renderVertex, renderFragment, {
          uPositionTexture: { value: null },
          uVelocityTexture: { value: null },
          uParticleSize: { value: 0.95 },
          uColor: { value: maskColor('#d9bb7c') },
          uMinAlpha: { value: 0.17 },
          uMaxAlpha: { value: 1.0 },
          uFeatureFloor: { value: 0.8 },
          uEyeOpen: { value: 1 },
          uFade: { value: 0 },
          uForm: { value: 0 },
          uStill: { value: 0 },
          uTime: { value: 0 },
          uRoveSpeed: { value: GLYPH_ROVE_SPEED },
          uOnFrac: { value: GLYPH_ON_FRAC },
        }),
      )
      const roveMats = three.map(() =>
        mk(roveVertex, glyphFragment, {
          uPositionTexture: { value: null },
          uGlyphSize: { value: GLYPH_SIZE },
          uTime: { value: 0 },
          uBinStart: { value: 0 },
          uTelStart: { value: BINARY.length },
          uOnFrac: { value: GLYPH_ON_FRAC },
          uRoveSpeed: { value: GLYPH_ROVE_SPEED },
          uDriftUp: { value: 32 },
          uDriftOut: { value: 1.5 },
          uDriftSide: { value: 3 },
          uRiseExp: { value: GLYPH_RISE_EXP },
          uAtlas: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uFade: { value: 0 },
          uColor: { value: maskColor('#e6d2a4', 1.7) },
        }),
      )
      const airMat = mk(airVertex, glyphFragment, {
        uPositionTexture: { value: null },
        uFaceM: { value: three.map(() => new THREE.Matrix4()) },
        uForm: { value: [0, 0, 0] },
        uNear: { value: [0, 0, 0] },
        uTime: { value: 0 },
        uAir: { value: 0 },
        uCalm: { value: 0 },
        uQuiet: { value: new THREE.Vector2(0.44, 0.86) },
        uStill: { value: 0 },
        uRing: { value: 0.1 },
        uGlyphPx: { value: AIR_GLYPH_PX },
        uWorld: { value: new THREE.Vector2(1, 1) },
        uAtlas: { value: atlas.texture },
        uCols: { value: atlas.cols },
        uFade: { value: 1 },
        uColor: { value: maskColor('#ecd9ab', 1.15) },
      })
      if (!cancelled) setSim({ gpu, posVar, velVar, geometry, roveGeo, airGeo, airMat, atlas: atlas.texture, faceMats, roveMats })
    }
    build()
    return () => {
      cancelled = true
    }
  }, [geo, gl])

  // Everything below lives outside React state: it is read and written every frame.
  const groups = useRef<(THREE.Group | null)[]>([])
  const dancers = useMemo<Dancer[]>(
    () =>
      [0, 1, 2].map(() => ({
        x: -1, y: -1, vx: 0, vy: 0, ax: 0,
        yaw: 0, pitch: 0, roll: 0,
        dim: 0,
        form: 0, formT: 0, delay: 0,
        burst: 0, burstT: 0, near: 0,
      })),
    [],
  )
  const blinks = useMemo<Blink[]>(() => [0, 1, 2].map((i) => ({ clock: 0, next: 1.4 + i * 0.9, start: -1 })), [])
  // The text block of frames 1..3 (index 0 unused), measured from the page; and the live blend.
  const zones = useMemo<Zone[]>(() => [0, 1, 2, 3].map(() => ({ l: 46, r: 344, t: 96, b: 554, ok: false })), [])
  const zoneNow = useMemo<Zone>(() => ({ l: 46, r: 344, t: 96, b: 554, ok: false }), [])
  const panes = useRef<(HTMLElement | null)[]>([null, null, null, null])
  const clock = useRef({
    t: 0,
    song: 0, // the choreography clock; runs faster while the page is being scrolled
    lastP: -1,
    energy: 0, // 0..1, how hard the page is being scrolled
    vel: 0, // signed, smoothed scroll speed: the sway
    formed: false,
    go: 0, // 0 while forming (the dance barely moves), 1 at full tempo
    air: 0,
    move: 1, // which frame's move leads: 1 Past, 2 Present, 3 Future
    w: [0, 1, 0, 0], // the moves' weights, eased twice so a handover starts and ends softly
    wa: [0, 1, 0, 0],
    kick: 0,
    lookW: 0, // 1 just after a tap: everyone looks at the finger
    lookAt: -99,
    measureAt: 0,
    focusAt: 0,
    focused: false,
  })
  const pointer = useRef({ x: 0, y: 0, downX: 0, downY: 0, downAt: 0, tapX: 0, tapY: 0, tapped: false })
  const debug = useMemo<DanceDebug | null>(() => (DEBUG ? { x: [0, 0, 0], y: [0, 0, 0], form: [0, 0, 0], dim: [0, 0, 0], move: 1, song: 0 } : null), [])
  useEffect(() => {
    if (!debug) return
    ;(window as unknown as { __dance?: DanceDebug }).__dance = debug
    return () => {
      delete (window as unknown as { __dance?: DanceDebug }).__dance
    }
  }, [debug])

  // Touch. A TAP is a finger that goes down and comes up in place; a scroll drag ends in
  // pointercancel and is ignored here, so scrolling never sets the masks off by accident.
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const pt = pointer.current
      pt.downX = e.clientX
      pt.downY = e.clientY
      pt.downAt = performance.now()
    }
    const up = (e: PointerEvent) => {
      const pt = pointer.current
      if (performance.now() - pt.downAt > 450) return
      if (Math.hypot(e.clientX - pt.downX, e.clientY - pt.downY) > 14) return
      pt.tapX = e.clientX
      pt.tapY = e.clientY
      pt.tapped = true // handled in the frame loop, where the masks' places are known
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
      clock.current.lookAt = performance.now() / 1000
    }
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  useFrame((_s, rawDt) => {
    if (!sim) return
    const dt = Math.min(0.05, rawDt)
    const c = clock.current
    c.t += dt
    const now = performance.now() / 1000

    // The shared sim.
    sim.velVar.material.uniforms.uTime.value += dt
    sim.gpu.compute()
    const posTex = sim.gpu.getCurrentRenderTarget(sim.posVar).texture
    const velTex = sim.gpu.getCurrentRenderTarget(sim.velVar).texture
    const tSim = sim.velVar.material.uniforms.uTime.value

    const W = size.width
    const H = size.height
    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const worldH = 2 * Math.tan(fovRad / 2) * camera.position.z
    const worldW = worldH * (W / H)
    const pxPerWorld = H / worldH
    const dpr = gl.getPixelRatio()
    const facePx = clamp(W * FACE_SHARE, FACE_MIN, FACE_MAX)
    const baseScale = facePx / (FACE_LOCAL_W * pxPerWorld)

    const p = heroScroll.progress
    const pos = p * 3
    const contactAmt = 1 - contactHandoff.t

    // Scroll energy (tempo) and signed speed (sway). Both are smoothed, so a change of
    // direction swings through zero instead of snapping.
    if (c.lastP < 0) c.lastP = p
    const dp = (p - c.lastP) / Math.max(dt, 0.001)
    c.lastP = p
    c.energy += (Math.min(1, Math.abs(dp) * 5) - c.energy) * (1 - Math.exp(-dt * 4.5))
    c.vel += (clamp(dp * 2.2, -1, 1) - c.vel) * (1 - Math.exp(-dt * 5))

    // A focused form field parks the masks and stops the clock (checked a few times a second).
    if (now > c.focusAt) {
      c.focusAt = now + 0.3
      const tag = document.activeElement?.tagName
      c.focused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }

    // THE EVENT. Cross the threshold once and the forming plays out on its own clock.
    const introReady = heroIntro.ready && (heroIntro.nameDone || !heroIntro.nameExpected)
    if (introReady) {
      c.air = Math.min(1, c.air + dt / 2.4)
      if (!c.formed && pos > FORM_POS) {
        c.formed = true
        // start the piece from its opening picture when the stage is empty
        if (dancers[0].form + dancers[1].form + dancers[2].form < 0.05) {
          c.song = 0
          c.go = 0
          for (let k = 0; k < MASKS; k++) dancers[k].x = -1 // appear on their marks, not on the way to them
        }
        for (let k = 0; k < MASKS; k++) {
          dancers[k].formT = 1
          dancers[k].delay = k * FORM_STAGGER
        }
      } else if (c.formed && pos < LOOSEN_POS) {
        c.formed = false
        for (let k = 0; k < MASKS; k++) {
          dancers[k].formT = 0
          dancers[k].delay = (MASKS - 1 - k) * 0.07
          dancers[k].burst = 0
        }
      }
    }

    // Which move leads. The change-over points sit either side of half way, so a page
    // resting between two frames cannot flip the move back and forth.
    if (Math.abs(pos - c.move) > 0.56) c.move = clamp(Math.round(pos), 1, 3)
    const kw = 1 - Math.exp(-dt * 3.4)
    for (let m = 1; m <= 3; m++) {
      c.wa[m] += ((c.move === m ? 1 : 0) - c.wa[m]) * kw
      c.w[m] += (c.wa[m] - c.w[m]) * kw
    }

    // The song. It crawls while the masks are still forming, then runs; scrolling drives it on.
    const minForm = Math.min(dancers[0].form, dancers[1].form, dancers[2].form)
    c.go = clamp(c.go + (minForm > 0.8 ? dt / 1.5 : -dt / 0.9), 0, 1)
    const goS = c.go * c.go * (3 - 2 * c.go)
    if (!reduced && !c.focused) c.song += dt * (0.22 + 0.78 * goS) * (1 + TEMPO_GAIN * c.energy)
    c.kick = Math.max(0, c.kick - dt * 2.2)
    const swell = 1 + 0.07 * c.energy

    // Measure the text block of the frame on screen, twice a second, only while it sits centred.
    const fNear = clamp(Math.round(pos), 1, 3)
    if (now > c.measureAt) {
      c.measureAt = now + 0.5
      let el = panes.current[fNear]
      if (!el || !el.isConnected) {
        el = document.querySelector<HTMLElement>('[data-pan="' + fNear + '"]')
        panes.current[fNear] = el
      }
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 60 && r.height > 60 && Math.abs((r.left + r.right) / 2 - W / 2) < 6) {
          const s = r.width / Math.max(1, el.offsetWidth)
          const z = zones[fNear]
          z.l = r.left + 24 * s
          z.r = r.right - 24 * s
          z.t = r.top + 16 * s
          z.b = r.bottom - 16 * s
          z.ok = true
        }
      }
    }
    for (let m = 1; m <= 3; m++) {
      const z = zones[m]
      if (!z.ok) {
        // fall-back before the first measurement: the band the frames are fitted into
        z.l = 46
        z.r = W - 46
        z.t = 84
        z.b = H - 74
      }
    }
    zoneNow.l = zones[1].l * c.w[1] + zones[2].l * c.w[2] + zones[3].l * c.w[3]
    zoneNow.r = zones[1].r * c.w[1] + zones[2].r * c.w[2] + zones[3].r * c.w[3]
    zoneNow.t = zones[1].t * c.w[1] + zones[2].t * c.w[2] + zones[3].t * c.w[3]
    zoneNow.b = zones[1].b * c.w[1] + zones[2].b * c.w[2] + zones[3].b * c.w[3]

    const parkW = reduced || c.focused ? 1 : smooth(0.1, 0.62, contactAmt)

    // A tap: the nearest mask within reach bursts; all three look at the finger.
    const pt = pointer.current
    if (pt.tapped) {
      pt.tapped = false
      if (!reduced && c.formed) {
        pt.x = pt.tapX
        pt.y = pt.tapY
        c.lookAt = now
        c.kick = 1
        let best = -1
        let bestD = TAP_RADIUS
        for (let k = 0; k < MASKS; k++) {
          const dd = Math.hypot(dancers[k].x - pt.tapX, dancers[k].y - pt.tapY)
          if (dd < bestD && dancers[k].form > 0.995 && dancers[k].burst === 0) {
            bestD = dd
            best = k
          }
        }
        if (best >= 0) dancers[best].burst = 1
      }
    }
    const lookT = !reduced && now - c.lookAt < LOOK_SECS ? 1 : 0
    c.lookW += (lookT - c.lookW) * (1 - Math.exp(-dt * 4))

    const am = sim.airMat.uniforms
    let formSum = 0

    for (let k = 0; k < MASKS; k++) {
      const g = groups.current[k]
      const fm = sim.faceMats[k]
      const rm = sim.roveMats[k]
      const d = dancers[k]
      if (!g) continue

      fm.uniforms.uPositionTexture.value = posTex
      fm.uniforms.uVelocityTexture.value = velTex
      fm.uniforms.uTime.value = tSim
      rm.uniforms.uPositionTexture.value = posTex
      rm.uniforms.uTime.value = tSim

      // Blink.
      const bk = blinks[k]
      bk.clock += dt
      let eyeOpen = 1
      if (bk.start < 0 && bk.clock >= bk.next) bk.start = bk.clock
      if (bk.start >= 0) {
        const bt = (bk.clock - bk.start) / 0.16
        if (bt >= 1) {
          bk.start = -1
          bk.next = bk.clock + 3.2 + Math.random() * 3.8
        } else eyeOpen = 1 - Math.sin(bt * Math.PI)
      }
      fm.uniforms.uEyeOpen.value = eyeOpen

      // This mask's own form: a straight ramp in time; the shaders ease each dot and glyph.
      if (d.delay > 0) d.delay -= dt
      else {
        let target = d.formT
        let rate = reduced ? 1 / 0.45 : target > d.form ? 1 / FORM_SECS : 1 / LOOSEN_SECS
        if (d.burst === 1) {
          target = 0
          rate = 1 / BURST_OUT
          if (d.form <= 0.001) {
            d.burst = 2
            d.burstT = BURST_HOLD
          }
        } else if (d.burst === 2) {
          target = 0
          d.burstT -= dt
          if (d.burstT <= 0) d.burst = 3
        } else if (d.burst === 3) {
          rate = 1 / BURST_BACK
          if (d.form >= 0.999 || d.formT === 0) d.burst = 0
        }
        d.form += clamp(target - d.form, -rate * dt, rate * dt)
      }
      // While bursting, this mask's glyphs gather in a ring round it instead of out in the air.
      if (d.burst > 0) d.near = 1
      else if (d.form >= 0.999) d.near = 0
      else d.near = Math.max(0, d.near - dt * 1.6)
      formSum += d.form

      // WHERE THE CHOREOGRAPHY WANTS THIS DANCER: the three moves, mixed by their weights.
      let tx = 0
      let ty = 0
      let yawM = 0
      let pitchM = 0
      let sizeM = 0
      let fadeM = 0
      let travel = 0
      for (let m = 1; m <= 3; m++) {
        const w = c.w[m]
        if (w < 0.0005) continue
        lanes(zones[m], W, H)
        if (m === 1) chase(k, c.song, W, swell)
        else if (m === 2) triangle(k, c.song, W, swell)
        else ascent(k, c.song, W, swell)
        tx += STEP.x * w
        ty += STEP.y * w
        yawM += STEP.yaw * w
        pitchM += STEP.pitch * w
        sizeM += STEP.size * w
        fadeM += STEP.fade * w
        travel += STEP.travel * w
      }
      const wSum = Math.max(0.001, (c.w[1] >= 0.0005 ? c.w[1] : 0) + (c.w[2] >= 0.0005 ? c.w[2] : 0) + (c.w[3] >= 0.0005 ? c.w[3] : 0))
      tx /= wSum
      ty /= wSum
      yawM /= wSum
      pitchM /= wSum
      sizeM /= wSum
      fadeM /= wSum
      travel /= wSum
      // a fast scroll carries them with the page for a moment
      tx -= c.vel * SWAY_PX

      // CONTACT: peek in from the screen edges beside the form, clear of the fields.
      const parkSide = k === 1 ? -1 : 1
      const parkX = parkSide > 0 ? W - 3 : 3
      const parkY = H * (0.25 + 0.245 * k) + (reduced ? 0 : Math.sin(c.t * 0.7 + k * 2.1) * 4)
      tx += (parkX - tx) * parkW
      ty += (parkY - ty) * parkW

      if (d.x < 0 || reduced) {
        d.x = tx
        d.y = ty
        d.vx = 0
        d.vy = 0
        d.ax = 0
      } else {
        const steps = Math.max(1, Math.ceil(dt / 0.008))
        const h = dt / steps
        let ax = 0
        for (let s = 0; s < steps; s++) {
          ax = SPRING_K * (tx - d.x) - SPRING_C * d.vx
          d.vx += ax * h
          d.vy += (SPRING_K * (ty - d.y) - SPRING_C * d.vy) * h
          d.x += d.vx * h
          d.y += d.vy * h
        }
        d.ax += (ax - d.ax) * (1 - Math.exp(-dt * 6))
      }

      // READING: how much of this mask is over the text block right now.
      const half = facePx * 0.5
      const overX = smooth(zoneNow.l - half, zoneNow.l + 8, d.x) * (1 - smooth(zoneNow.r - 8, zoneNow.r + half, d.x))
      const overY = smooth(zoneNow.t - half * 1.4, zoneNow.t + 6, d.y) * (1 - smooth(zoneNow.b - 6, zoneNow.b + half * 1.4, d.y))
      const over = overX * overY * (1 - parkW)
      d.dim += (over - d.dim) * (1 - Math.exp(-dt * 5))

      // HEAD. Into the direction of travel, or as the move asks; a tap turns it to the finger.
      const parkYaw = -parkSide * 0.5 + (reduced ? 0 : Math.sin(c.t * 0.45 + k * 1.9) * 0.08)
      let yawT = yawM + (clamp(d.vx / 230, -0.8, 0.8) - yawM) * travel
      let pitchT = pitchM + (clamp(d.vy / 330, -0.38, 0.38) - pitchM) * travel
      yawT += (parkYaw - yawT) * parkW
      pitchT += (0.04 - pitchT) * parkW
      if (c.lookW > 0.001) {
        const fy = clamp(((pt.x - d.x) / (W * 0.5)) * 0.9, -0.8, 0.8)
        const fp = clamp(((pt.y - d.y) / (H * 0.5)) * 0.5, -0.4, 0.4)
        yawT += (fy - yawT) * c.lookW
        pitchT += (fp - pitchT) * c.lookW
      }
      // bank into the curve: lean the top of the head toward the inside of the turn
      const rollT = reduced ? 0 : clamp(-d.ax / 1500, -0.34, 0.34) * (1 - parkW)
      const lag = reduced ? 1 : 1 - Math.exp(-dt / 0.22)
      d.yaw += (yawT - d.yaw) * lag
      d.pitch += (pitchT - d.pitch) * lag
      d.roll += (rollT - d.roll) * lag

      const sc =
        baseScale *
        sizeM *
        (0.9 + 0.1 * d.form) *
        (1 - DIM_SHRINK * d.dim) *
        (1 - 0.22 * parkW) *
        (1 + 0.1 * c.kick)
      const fade = fadeM * (1 - DIM_FADE * d.dim)
      fm.uniforms.uForm.value = d.form
      fm.uniforms.uStill.value = reduced ? 1 : 0
      fm.uniforms.uFade.value = fade
      rm.uniforms.uFade.value = fade * d.form
      rm.uniforms.uGlyphSize.value = GLYPH_SIZE * Math.max(1, dpr * 0.8)

      // Place the group so the face's visual middle sits on (d.x, d.y).
      g.position.set((d.x / W - 0.5) * worldW, -(d.y / H - 0.5) * worldH - FACE_MID_Y * sc, 0)
      g.scale.setScalar(sc)
      g.rotation.set(d.pitch, d.yaw, d.roll)
      g.visible = d.form > 0.001
      g.updateMatrixWorld()
      ;(am.uFaceM.value as THREE.Matrix4[])[k].copy(g.matrixWorld)
      ;(am.uForm.value as number[])[k] = d.form
      ;(am.uNear.value as number[])[k] = d.near

      if (debug) {
        debug.x[k] = d.x
        debug.y[k] = d.y
        debug.form[k] = d.form
        debug.dim[k] = d.dim
      }
    }
    if (debug) {
      debug.move = c.move
      debug.song = c.song
    }

    am.uPositionTexture.value = posTex
    am.uTime.value = c.t
    am.uAir.value = c.air
    const calm = formSum / MASKS
    am.uCalm.value = calm
    // first screen: the name and the sentence; after that: the frame's measured text block
    // and in the Contact section the whole screen, so nothing bright drifts over the form
    const park = reduced || c.focused ? 1 : smooth(0.1, 0.62, contactAmt)
    const qTop = FIRST_WORDS_TOP + (zoneNow.t / H - FIRST_WORDS_TOP) * calm
    const qBot = FIRST_WORDS_BOTTOM + (zoneNow.b / H - FIRST_WORDS_BOTTOM) * calm
    ;(am.uQuiet.value as THREE.Vector2).set(qTop + (-0.2 - qTop) * park, qBot + (1.2 - qBot) * park)
    am.uStill.value = reduced ? 1 : 0
    am.uRing.value = (facePx * 1.25) / pxPerWorld
    am.uGlyphPx.value = AIR_GLYPH_PX * dpr
    ;(am.uWorld.value as THREE.Vector2).set(worldW, worldH)
  })

  useEffect(() => {
    return () => {
      if (!sim) return
      sim.geometry.dispose()
      sim.roveGeo.dispose()
      sim.airGeo.dispose()
      sim.airMat.dispose()
      sim.atlas.dispose()
      sim.faceMats.forEach((m) => m.dispose())
      sim.roveMats.forEach((m) => m.dispose())
    }
  }, [sim])

  if (!sim) return null
  return (
    <>
      <points geometry={sim.airGeo} material={sim.airMat} frustumCulled={false} />
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { groups.current[i] = el }} visible={false}>
          <points geometry={sim.geometry} material={sim.faceMats[i]} frustumCulled={false} />
          <points geometry={sim.roveGeo} material={sim.roveMats[i]} frustumCulled={false} />
        </group>
      ))}
    </>
  )
}
