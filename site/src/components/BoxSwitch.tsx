import { useState } from 'react'
import { BOX_STYLES, isPreview, setBoxStyle, type BoxStyle } from '../boxStyle'
import { TYPE_STYLES, chooseTypeStyle, typeStyle, type TypeStyle } from '../typeStyle'

const TYPE_NAMES: Record<TypeStyle, string> = { halo: 'Halo', nova: 'Nova', classic: 'Classic' }
const NAMES: Record<BoxStyle, string> = { glass: 'Liquid', smoke: 'Smoke', veil: 'Veil', frost: 'Frost' }

/** Preview links only: tap to cycle the material of the text boxes. */
export function BoxSwitch() {
  const [style, setStyle] = useState(() => document.documentElement.dataset.box as BoxStyle)
  if (!isPreview) return null
  const next = BOX_STYLES[(BOX_STYLES.indexOf(style) + 1) % BOX_STYLES.length]
  const nextType = TYPE_STYLES[(TYPE_STYLES.indexOf(typeStyle) + 1) % TYPE_STYLES.length]
  return (
    <>
    <button type="button" onClick={() => chooseTypeStyle(nextType)} className="box-switch type-switch">
      Letters: {TYPE_NAMES[typeStyle]}
    </button>
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
    </>
  )
}
