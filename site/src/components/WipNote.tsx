/* ============================================================================
 * WipNote.tsx — the "work in progress" line
 * ----------------------------------------------------------------------------
 * Melvin, 2026-11-05: "put a note somewhere in the website, like work in
 * progress note, just for fun." One mono line in the site's label voice, no
 * banner, no icon library. It sits in the footer of every inner page and at
 * the foot of the Contact section on Home. Delete this file and its two uses
 * when the site is finished.
 * ========================================================================= */

export function WipNote({ className = '' }: { className?: string }) {
  return (
    <span className={`label inline-flex items-center gap-2 text-sand-dim/80 ${className}`}>
      <span aria-hidden className="inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-sand" />
      Work in progress. Things here still move, break and glow.
    </span>
  )
}
