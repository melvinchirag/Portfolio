/* ============================================================================
 * ProjectMedia.tsx — the images + video block inside an expanded project row
 * ----------------------------------------------------------------------------
 * Degrades gracefully: when a project has no media yet (the common case while
 * content is still being gathered) it renders a dashed "coming" placeholder
 * rather than an empty gap, so an unfinished row still looks intentional. When
 * media exists it shows an optional demo <video> above a lazy-loaded image grid.
 * Paths are expected under /public (e.g. '/work/osiris/demo.mp4').
 * ========================================================================= */

import type { WorkProject } from '../../data/work'

export function ProjectMedia({ media }: { media?: WorkProject['media'] }) {
  const images = media?.images ?? []
  const hasVideo = Boolean(media?.video)

  if (images.length === 0 && !hasVideo) {
    return (
      <div className="mt-6 flex h-28 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01]">
        <p className="text-[10px] tracking-widest text-white/20 uppercase">Demo &amp; screenshots coming</p>
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {hasVideo && (
        <video
          src={media!.video}
          controls
          playsInline
          preload="metadata"
          className="w-full rounded-lg border border-white/10"
        />
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="aspect-video w-full rounded-lg border border-white/10 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  )
}
