/* ============================================================================
 * Home.tsx — the hero (clean slate)
 * ----------------------------------------------------------------------------
 * The triptych / particle-face hero was dropped, and (2026-07-27) so was the
 * real-nebula background — it read as "astronomy person", the wrong signal for
 * a CS major. Both are parked in /parked, not deleted. This is back to a
 * minimal, honest placeholder: the name on black, facts in the corners.
 *
 * The new hero direction is ABSTRACT / EDITORIAL — deliberately not pointing at
 * any single field. Nothing here is a decision to preserve; it's the neutral
 * ground we design the new hero on top of.
 * ========================================================================= */

import { useEffect, useState } from 'react'
import { RevealText } from '../components/RevealText'
import { MaskField } from '../components/scene/MaskField'

/**
 * A live clock, borrowed from Cinetica. Small, useless, and exactly the kind of
 * nuanced eccentricity that reads as craft.
 */
function LocalTime() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Detroit',
        }).format(new Date()),
      )
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [])

  return <span className="tabular-nums">{time || '--:--:--'}</span>
}

export function Home() {
  return (
    <section className="relative h-screen">
      {/* PHASE 1: the particle-mask centerpiece, shown alone while we get the
          look right. Type + editorial chrome come back on top once it's dialed
          in. LocalTime/RevealText kept imported for that next step. */}
      <MaskField />
    </section>
  )
}

// Kept for the next phase (type overlay); referenced here so lint doesn't flag
// them as unused while Phase 1 shows the mask alone.
void LocalTime
void RevealText
