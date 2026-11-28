import { useState } from 'react'
import { BOX_STYLES, isPreview, setBoxStyle, type BoxStyle } from '../boxStyle'

const NAMES: Record<BoxStyle, string> = { glass: 'Glass', frost: 'Frost', clay: 'Clay' }

/** Preview links only: tap to cycle the material of the text boxes. */
export function BoxSwitch() {
  const [style, setStyle] = useState(() => document.documentElement.dataset.box as BoxStyle)
  if (!isPreview) return null
  const next = BOX_STYLES[(BOX_STYLES.indexOf(style) + 1) % BOX_STYLES.length]
  return (
    <button
      type="button"
      onClick={() => {
        setBoxStyle(next)
        setStyle(next)
      }}
      aria-label={`Box style: ${NAMES[style]}. Switch to ${NAMES[next]}.`}
      className="box-switch"
    >
      Box: {NAMES[style]}
    </button>
  )
}
