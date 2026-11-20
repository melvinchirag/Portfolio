/**
 * useIsPhone: true below the md breakpoint (767px and narrower). The Home hero
 * swaps its big particle mask for the phone swarm (components/scene/PhoneSwarm)
 * when this is true (Melvin, 2026-11-20: small masks that dissolve into glyphs
 * and three that dance, instead of one big mask that does not fit a phone).
 */
import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => (typeof matchMedia !== 'undefined' ? matchMedia(QUERY).matches : false))
  useEffect(() => {
    const mq = matchMedia(QUERY)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    on()
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}
