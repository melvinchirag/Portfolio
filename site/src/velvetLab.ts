/**
 * LOOK LAB (velvet preview, 2026-11-20). Melvin asked to change the look live and
 * test it while he gets it right. Every number and colour the light sheet, the mask
 * and the bloom use lives in ONE plain object here, `lab`. The shaders read it every
 * frame, so the panel (velvetLabPanel.ts, shown with /?velvet=1&lab=1) only has to
 * change a value and the real site changes under it.
 *
 * Settings are kept in localStorage, so a reload or a page change keeps the look.
 * Nothing here runs unless the velvet preview is on.
 */
import * as THREE from 'three'
import { velvet } from './velvet'

/** MELVIN'S PICK (2026-11-21): the look he tuned in the panel and pasted back. */
export const LAB_DEFAULTS = {
  ground: '#060102',
  deep: '#68080e',
  red: '#c00812',
  core: '#ff8800',
  mask: '#eca33c',
  brightness: 1,
  core_strength: 0.79,
  core_thin: 68,
  glow: 1.06,
  glow_reach: 14,
  second: 0.54,
  curtain: 0.14,
  haze: 0.21,
  dust: 0.12,
  dust_bright: 0.46,
  dust_size: 0.5,
  glints: 0.34,
  twinkle: 0.32,
  height: 0.6,
  tilt: 0.07,
  wave: 0.96,
  speed: 2.38,
  vignette: 0,
  mask_bright: 0.98,
  mask_catch: 0.64,
  mask_wrap: 1.04,
  mask_halo: 0.5,
  mask_dim: 0.76,
  bloom: 1.61,
  bloom_threshold: 0.19,
}

/** The first starting look (deep crimson and cream), kept so the presets below still mean what they did. */
const FIRST_LOOK: typeof LAB_DEFAULTS = {
  // colours (as picked: sRGB hex)
  ground: '#060102',
  deep: '#4a0308',
  red: '#c00812',
  core: '#ffd9bf',
  mask: '#f1e4cc',
  // the light
  brightness: 1,
  core_strength: 0.35,
  core_thin: 80,
  glow: 1.2,
  glow_reach: 15,
  second: 0.3,
  curtain: 0.23,
  haze: 0.22,
  // particles
  dust: 1,
  dust_bright: 1.5,
  dust_size: 1,
  glints: 0.25,
  twinkle: 0.35,
  // shape and motion
  height: 0.64,
  tilt: 0.12,
  wave: 1,
  speed: 1,
  vignette: 0.7,
  // mask
  mask_bright: 1,
  mask_catch: 0.8,
  mask_wrap: 0.6,
  mask_halo: 0.5,
  mask_dim: 0.6,
  // bloom
  bloom: 0.7,
  bloom_threshold: 0.15,
}
export type Lab = typeof LAB_DEFAULTS
export type LabKey = keyof Lab

/** Starting points to compare. Each is a partial override of the defaults. */
export const LAB_PRESETS: Record<string, Partial<Lab>> = {
  'Your pick': {},
  'Deep crimson': { ...FIRST_LOOK },
  Oxblood: {
    ...FIRST_LOOK,
    ground: '#040001', deep: '#2e0206', red: '#8f0510', core: '#f2b59a',
    core_strength: 0.22, glow: 1.3, haze: 0.3, glints: 0.12, bloom: 0.55, mask: '#e8d6bc',
  },
  'Ruby glow': {
    ...FIRST_LOOK,
    ground: '#070102', deep: '#5a0209', red: '#e0061a', core: '#ffc7b0',
    core_strength: 0.3, glow: 1.5, haze: 0.3, dust_bright: 1.7, bloom: 0.85,
  },
  'White hot': {
    ...FIRST_LOOK,
    ground: '#070203', deep: '#941a2c', red: '#fa3f44', core: '#fbf5e9',
    core_strength: 1.05, glow: 1, haze: 0.05, glints: 0.7, mask: '#f3e9d2',
    mask_catch: 0, mask_wrap: 0, mask_halo: 0, mask_dim: 0,
  },
}

const KEY = 'velvetLab.v2'

function load(): Lab {
  const out = { ...LAB_DEFAULTS }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(out) as LabKey[]) {
        if (typeof saved[k] === typeof out[k]) (out as Record<string, unknown>)[k] = saved[k]
      }
    }
  } catch {
    /* no storage: defaults */
  }
  return out
}

/** The live settings. Mutated in place by the panel; read every frame by the scene. */
export const lab: Lab = velvet ? load() : { ...LAB_DEFAULTS }

export function saveLab() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lab))
  } catch {
    /* ignore */
  }
  applyGround()
}

export function setLab(values: Partial<Lab>) {
  Object.assign(lab, values)
  saveLab()
}

/** The page behind the canvas follows the ground colour too. */
export function applyGround() {
  if (!velvet || typeof document === 'undefined') return
  document.documentElement.style.setProperty('--velvet-void', lab.ground)
}
applyGround()

function readLabFlag(): boolean {
  if (!velvet || typeof window === 'undefined') return false
  try {
    const q = new URLSearchParams(window.location.search).get('lab')
    if (q !== null) {
      sessionStorage.setItem('velvetLabOn', q === '0' ? '0' : '1')
      return q !== '0'
    }
    return sessionStorage.getItem('velvetLabOn') === '1'
  } catch {
    return false
  }
}
/** Whether to show the panel (/?velvet=1&lab=1, remembered for the tab). */
export const labOn = readLabFlag()

/**
 * Where the big mask is on screen, written by MaskField every frame so the light
 * sheet can bend its particles round the face. x, y in 0..1 of the screen, r in
 * screen heights, a = how present the mask is, t = when this was last written.
 */
export const maskScreen = { x: 0.5, y: 0.5, r: 0, a: 0, t: 0 }

/**
 * Uniforms SHARED between the light sheet and the mask, so the mask's own dots can
 * be lit by the same crest. Vectors only: DesktopTrio copies the mask material's
 * uniforms and keeps vector values by reference, so these stay live there too.
 */
export const SHEET = {
  /** drawing buffer width, height, sheet time, how much the mask catches the light */
  uSheet: { value: new THREE.Vector4(1, 1, 24, 0) },
  /** crest height, tilt, wave size */
  uCrest: { value: new THREE.Vector4(0.64, 0.12, 1, 0) },
  uSheetHot: { value: new THREE.Vector3(1, 0.8, 0.7) },
  uSheetRed: { value: new THREE.Vector3(0.5, 0, 0) },
  /** mask colour (linear) times brightness; w = 1 when the lab drives the colour */
  uMaskCol: { value: new THREE.Vector4(1, 1, 1, 0) },
}

/** The crest of the light sheet. x in aspect units (0..aspect), result in 0..1 of the height. */
export const CREST_GLSL = /* glsl */ `
  uniform vec4 uCrest;
  float crest(float x, float t){
    return uCrest.x + uCrest.y * (x - 0.9)
      + uCrest.z * (0.13 * sin(x * 1.3 + t * 0.21) + 0.06 * sin(x * 2.9 - t * 0.17 + 1.7) + 0.022 * sin(x * 6.1 + t * 0.4));
  }
`

const scratch = new THREE.Color()
/** A picked sRGB hex as the linear values the shaders work in. */
export function hexToVec3(hex: string, out: THREE.Vector3 | THREE.Vector4, scale = 1) {
  scratch.set(hex)
  out.x = scratch.r * scale
  out.y = scratch.g * scale
  out.z = scratch.b * scale
  return out
}
