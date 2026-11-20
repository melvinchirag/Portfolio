/**
 * LOOK LAB PANEL (velvet preview, 2026-11-20). The sliders and colour pickers for
 * velvetLab.ts, shown only with /?velvet=1&lab=1. Plain DOM on purpose: it is a
 * tuning tool for Melvin, not part of the site, and it must not touch React state
 * (a slider drag would otherwise re-render the page sixty times a second).
 *
 * "Copy settings" puts the whole look on the clipboard as one line of text, which
 * is what gets pasted back so the values can be made the real defaults.
 */
import { LAB_DEFAULTS, LAB_PRESETS, lab, saveLab, type Lab, type LabKey } from './velvetLab'

type Row = { key: LabKey; label: string; min?: number; max?: number; step?: number }
const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Colours',
    rows: [
      { key: 'red', label: 'Red (the light)' },
      { key: 'deep', label: 'Deep red (far curtain)' },
      { key: 'core', label: 'Hot line and glints' },
      { key: 'ground', label: 'Background' },
      { key: 'mask', label: 'Mask' },
    ],
  },
  {
    title: 'White and glow',
    rows: [
      { key: 'core_strength', label: 'Hot line strength', min: 0, max: 1.5 },
      { key: 'core_thin', label: 'Hot line thinness', min: 20, max: 200, step: 1 },
      { key: 'glints', label: 'Cream glints', min: 0, max: 1.5 },
      { key: 'glow', label: 'Red glow', min: 0, max: 3 },
      { key: 'glow_reach', label: 'Glow tightness', min: 4, max: 40, step: 0.5 },
      { key: 'second', label: 'Second streak', min: 0, max: 1 },
      { key: 'bloom', label: 'Bloom', min: 0, max: 2 },
      { key: 'bloom_threshold', label: 'Bloom starts at', min: 0, max: 1 },
      { key: 'brightness', label: 'Overall brightness', min: 0, max: 2 },
    ],
  },
  {
    title: 'Curtain and particles',
    rows: [
      { key: 'curtain', label: 'Curtain length', min: 0.05, max: 1 },
      { key: 'haze', label: 'Smooth colour under the crest', min: 0, max: 1 },
      { key: 'dust', label: 'Particle amount', min: 0, max: 2 },
      { key: 'dust_bright', label: 'Particle brightness', min: 0, max: 3 },
      { key: 'dust_size', label: 'Particle size', min: 0.5, max: 3 },
      { key: 'twinkle', label: 'Twinkle', min: 0, max: 1 },
    ],
  },
  {
    title: 'Mask and light together',
    rows: [
      { key: 'mask_bright', label: 'Mask brightness', min: 0.2, max: 2 },
      { key: 'mask_catch', label: 'Mask catches the light', min: 0, max: 1 },
      { key: 'mask_wrap', label: 'Particles bend round the face', min: 0, max: 1.5 },
      { key: 'mask_halo', label: 'Particles gather at its edge', min: 0, max: 1.5 },
      { key: 'mask_dim', label: 'Light thins behind the face', min: 0, max: 1 },
    ],
  },
  {
    title: 'Shape and motion',
    rows: [
      { key: 'height', label: 'Crest height', min: 0.1, max: 0.95 },
      { key: 'tilt', label: 'Tilt', min: -0.5, max: 0.5 },
      { key: 'wave', label: 'Wave size', min: 0, max: 2.5 },
      { key: 'speed', label: 'Speed', min: 0, max: 4 },
      { key: 'vignette', label: 'Dark corners', min: 0, max: 1.5 },
    ],
  },
]

const CSS = `
#look-lab, #look-lab * { box-sizing: border-box; cursor: auto !important; }
#look-lab {
  position: fixed; top: 12px; right: 12px; z-index: 2147483000; width: 292px;
  max-height: calc(100vh - 24px); overflow-y: auto; overscroll-behavior: contain;
  padding: 12px 12px 14px; border-radius: 12px;
  background: rgba(12, 5, 6, 0.9); border: 1px solid rgba(243, 233, 210, 0.16);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #f3e9d2; font: 12px/1.35 system-ui, -apple-system, 'Segoe UI', sans-serif;
  scrollbar-width: thin; scrollbar-color: rgba(243,233,210,0.3) transparent;
}
#look-lab[data-closed] { width: auto; padding: 0; overflow: visible; background: none; border: 0; backdrop-filter: none; }
#look-lab[data-closed] > :not(.ll-open) { display: none; }
#look-lab:not([data-closed]) > .ll-open { display: none; }
#look-lab .ll-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
#look-lab .ll-title { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; }
#look-lab button {
  font: inherit; color: #f3e9d2; background: rgba(243, 233, 210, 0.08);
  border: 1px solid rgba(243, 233, 210, 0.22); border-radius: 7px; padding: 5px 9px; cursor: pointer !important;
}
#look-lab button:hover { background: rgba(243, 233, 210, 0.16); }
#look-lab button.ll-main { background: #f3e9d2; color: #1a0608; border-color: #f3e9d2; font-weight: 600; }
#look-lab .ll-open { background: rgba(12, 5, 6, 0.9); padding: 8px 12px; border-radius: 999px; }
#look-lab .ll-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
#look-lab details { border-top: 1px solid rgba(243, 233, 210, 0.12); padding: 7px 0 3px; }
#look-lab summary { cursor: pointer !important; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; font-size: 10.5px; color: #c4b294; padding: 2px 0 6px; user-select: none; }
#look-lab .ll-row { display: grid; grid-template-columns: 1fr auto; column-gap: 8px; align-items: center; margin-bottom: 7px; }
#look-lab .ll-row label { min-width: 0; }
#look-lab .ll-val { font-variant-numeric: tabular-nums; color: #c4b294; font-size: 11px; }
#look-lab input[type=range] { grid-column: 1 / -1; width: 100%; margin: 3px 0 0; accent-color: #d9101f; }
#look-lab input[type=color] { width: 34px; height: 22px; padding: 0; border: 1px solid rgba(243,233,210,0.3); border-radius: 5px; background: none; }
#look-lab .ll-colour { display: flex; align-items: center; gap: 7px; }
#look-lab .ll-foot { display: flex; gap: 6px; margin-top: 8px; padding-top: 9px; border-top: 1px solid rgba(243, 233, 210, 0.12); }
#look-lab .ll-foot button { flex: 1; }
#look-lab textarea {
  width: 100%; height: 76px; margin-top: 8px; resize: vertical; border-radius: 7px; padding: 6px;
  background: rgba(0,0,0,0.4); color: #f3e9d2; border: 1px solid rgba(243,233,210,0.22);
  font: 10.5px/1.35 ui-monospace, Consolas, monospace;
}
#look-lab .ll-note { color: #c4b294; font-size: 11px; margin-top: 6px; }
@media (max-width: 640px) {
  #look-lab:not([data-closed]) { top: auto; bottom: 0; right: 0; left: 0; width: auto; max-height: 46vh; border-radius: 12px 12px 0 0; }
  #look-lab[data-closed] { top: auto; bottom: 12px; }
}
`

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}

function fmt(v: number, step: number) {
  return step >= 1 ? String(Math.round(v)) : v.toFixed(2)
}

export function mountLookLab() {
  if (document.getElementById('look-lab')) return
  const style = el('style')
  style.textContent = CSS
  document.head.appendChild(style)

  const root = el('div')
  root.id = 'look-lab'
  root.setAttribute('data-lenis-prevent', '')
  // The site listens on the window for drags (they spin the mask). Keep the panel's own.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'touchstart', 'touchmove'] as const) {
    root.addEventListener(type, (e) => e.stopPropagation())
  }

  const open = el('button', 'll-open', 'Tune the look')
  open.type = 'button'
  open.onclick = () => root.removeAttribute('data-closed')
  root.appendChild(open)

  const head = el('div', 'll-head')
  head.appendChild(el('div', 'll-title', 'Look lab'))
  const hide = el('button', '', 'Hide')
  hide.type = 'button'
  hide.onclick = () => root.setAttribute('data-closed', '')
  head.appendChild(hide)
  root.appendChild(head)

  /** Refreshers that pull each control's value back out of `lab` (after a preset or reset). */
  const sync: (() => void)[] = []

  const presets = el('div', 'll-presets')
  for (const name of Object.keys(LAB_PRESETS)) {
    const b = el('button', '', name)
    b.type = 'button'
    b.onclick = () => {
      Object.assign(lab, LAB_DEFAULTS, LAB_PRESETS[name])
      saveLab()
      sync.forEach((f) => f())
    }
    presets.appendChild(b)
  }
  root.appendChild(presets)
  root.appendChild(el('div', 'll-note', 'Starting points. Pick one, then move the sliders.'))

  for (const group of GROUPS) {
    const det = el('details')
    det.open = true
    det.appendChild(el('summary', '', group.title))
    for (const row of group.rows) {
      const wrap = el('div', 'll-row')
      const label = el('label', '', row.label)
      const id = 'll-' + row.key
      label.htmlFor = id
      wrap.appendChild(label)
      if (typeof LAB_DEFAULTS[row.key] === 'string') {
        const box = el('div', 'll-colour')
        const val = el('span', 'll-val')
        const input = el('input')
        input.type = 'color'
        input.id = id
        const pull = () => {
          input.value = lab[row.key] as string
          val.textContent = lab[row.key] as string
        }
        input.oninput = () => {
          ;(lab as Record<string, unknown>)[row.key] = input.value
          val.textContent = input.value
          saveLab()
        }
        pull()
        sync.push(pull)
        box.appendChild(val)
        box.appendChild(input)
        wrap.appendChild(box)
      } else {
        const step = row.step ?? 0.01
        const val = el('span', 'll-val')
        const input = el('input')
        input.type = 'range'
        input.id = id
        input.min = String(row.min ?? 0)
        input.max = String(row.max ?? 1)
        input.step = String(step)
        const pull = () => {
          input.value = String(lab[row.key])
          val.textContent = fmt(lab[row.key] as number, step)
        }
        input.oninput = () => {
          const n = parseFloat(input.value)
          ;(lab as Record<string, unknown>)[row.key] = n
          val.textContent = fmt(n, step)
          saveLab()
        }
        pull()
        sync.push(pull)
        wrap.appendChild(val)
        wrap.appendChild(input)
      }
      det.appendChild(wrap)
    }
    root.appendChild(det)
  }

  const foot = el('div', 'll-foot')
  const copy = el('button', 'll-main', 'Copy settings')
  copy.type = 'button'
  const reset = el('button', '', 'Reset')
  reset.type = 'button'
  foot.appendChild(copy)
  foot.appendChild(reset)
  root.appendChild(foot)

  const out = el('textarea')
  out.readOnly = true
  out.hidden = true
  root.appendChild(out)
  const note = el('div', 'll-note', 'When it looks right, copy the settings and paste them to Claude.')
  root.appendChild(note)

  copy.onclick = () => {
    const text = JSON.stringify(lab as Lab)
    out.value = text
    out.hidden = false
    const done = () => (note.textContent = 'Copied. Paste it into the chat.')
    const manual = () => {
      out.focus()
      out.select()
      note.textContent = 'Select the text above and copy it, then paste it into the chat.'
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, manual)
    else manual()
  }
  reset.onclick = () => {
    Object.assign(lab, LAB_DEFAULTS)
    saveLab()
    sync.forEach((f) => f())
    note.textContent = 'Back to the starting look.'
  }

  document.body.appendChild(root)
}
