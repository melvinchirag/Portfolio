/* ============================================================================
 * Contact.tsx — the Contact / Testimonials section that closes the Home page
 * ----------------------------------------------------------------------------
 * Rendered as a normal vertical section (id="contact", set by Home.tsx) after
 * the hero's horizontal pan ends, so the hero's Contact button can scroll
 * straight to it.
 *
 * ONE slide, TWO views, switched by a centred toggle (Melvin, 2026-08-09):
 * Contact (the message form) and Testimonials (the submission form). Only one
 * view is in the DOM at a time, so there's exactly one <h1> regardless of which
 * is showing.
 *
 * HOW SENDING WORKS RIGHT NOW (both forms, important):
 * There is no backend yet. Rather than fake a success message and silently drop
 * a real message, Submit composes a `mailto:` and hands it to the visitor's
 * mail app. For testimonials specifically this doubles as the review step:
 * "manual approval, no auto-publish" just means Melvin reads the email before
 * anything goes on the site, which a plain inbox already gives us for free.
 * When a real endpoint exists, replace the body of the two handleSubmit
 * functions; the markup and styling do not need to change.
 *
 * NOT built yet, and deliberately not stubbed: the atmospheric "ink" background
 * archive of past approved testimonials (see the addendum in CONTEXT.md). It
 * needs real approved testimonials to have anything to show, so the submission
 * form has to exist and collect a few first. The two views also don't yet have
 * visually distinct backgrounds (Melvin asked for this) — that distinction was
 * meant to come FROM the ink layer and the ten-mask contact background, neither
 * of which exist yet either. Faking a difference now would just mean redoing it.
 * ========================================================================= */

import { useState, type CSSProperties } from 'react'
import { heroScrollToTop } from '../hooks/useLenis'
import { PROFILE, SOCIALS } from '../data/profile'
import { ICON_PATHS } from '../components/SocialLinks'

/** What brings people to the contact form. Doubles as the email subject line.
 *  The last two are Melvin's own joke additions (2026-08-10) — verbatim, not
 *  softened, they're meant to be funny. */
const REASONS = [
  'A job or an internship',
  'Research',
  'Grad school or a program',
  'Building something together',
  'You have a serious crush on me',
  'You have immeasurable resentment for me',
  'Something else',
]

/** How a testimonial-writer knows Melvin. Shown back on the published card later
 *  as a small metadata signal (per the testimonials addendum). */
const RELATIONSHIPS = [
  'Teammate',
  'Classmate',
  'Collaborator',
  'Organizer',
  'Mentor',
  'Coworker',
  'Something else',
]

type View = 'contact' | 'testimonials'

/* ---------------------------------------------------------------------------
 * The Contact / Testimonials toggle. Centred at the top of the slide. Only
 * two states, so a simple two-button tablist rather than a sliding pill —
 * less to build, nothing to desync.
 *
 * DISPLAY LABEL: "Kind Words", not "Testimonials" (Melvin, 2026-08-10: "we
 * might have to think of another word for testimonials"). Kept the internal
 * view id / element ids as `testimonials` throughout the file — that's
 * plumbing, never shown on screen — so only the label users actually read
 * changed.
 * ------------------------------------------------------------------------ */
function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: 'contact', label: 'Contact' },
    { id: 'testimonials', label: 'Kind Words' },
  ]
  return (
    <div
      role="tablist"
      aria-label="Contact or kind words"
      className="inline-flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={view === t.id}
          aria-controls={`panel-${t.id}`}
          onClick={() => onChange(t.id)}
          className={`ease-out-expo rounded-full px-5 py-2 text-sm tracking-wide transition-colors duration-300 ${
            view === t.id
              ? 'text-accent bg-[rgba(243,198,127,0.12)] shadow-[inset_0_0_0_1px_rgba(243,198,127,0.4)]'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Email + Resume, in the same brand-mark-style single-path SVG format as
 *  SocialLinks' icons, so they slot into the same loop uniformly. */
const EXTRA_ICONS: { label: string; href: string; title: string; path: string }[] = [
  {
    label: 'Email',
    href: `mailto:${PROFILE.email}`,
    title: PROFILE.email,
    path: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
  },
  {
    label: 'Resume',
    href: PROFILE.resume,
    title: 'Download resume (PDF)',
    path: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  },
]

/* ---------------------------------------------------------------------------
 * Icon-only social/contact buttons, orbiting a circle counter-clockwise. The
 * original ask (Melvin, 2026-08-10) was "place the social buttons such that
 * they look like an infinity symbol... move in a loop... glow when I hover...
 * halt as I hover and continue when I stop" — everything but the ∞ survived
 * unchanged; see the note below for why that part didn't.
 * NO visible handles or URLs (Melvin, 2026-08-09:
 * showing the raw URL "reads very amateur") — the actual address lives in
 * href + aria-label/title, not on screen, still fully reachable.
 *
 * A CIRCLE, NOT THE FIGURE-EIGHT (Melvin, 2026-08-10, after four attempts at
 * the ∞ and a fifth with the curve stroked on screen: "just make it circular
 * and please remove the trace"). The lemniscate was measurably correct every
 * time it was reported broken; the problem is that an unmarked path can't
 * communicate its own shape, and he doesn't want it marked. A circle is the one
 * closed path that doesn't need marking. See index.css for the full note.
 *
 * The path, the counter-clockwise direction, timing and pause-on-hover all live
 * in `.orbit-ring` / `.orbit-ring-item` (index.css); this component only places
 * each icon at its own evenly-spaced entry point along the shared path.
 * ------------------------------------------------------------------------ */

function FindMeHere() {
  const items = [
    ...SOCIALS.map((s) => ({ label: s.label, href: s.href, title: s.label, path: ICON_PATHS[s.label] })),
    ...EXTRA_ICONS,
  ]
  return (
    <div className="orbit-ring mt-6">
      {items.map((item, i) => {
        const icon = (
          <svg viewBox="0 0 24 24" fill="currentColor" width={19} height={19} aria-hidden>
            <path d={item.path} />
          </svg>
        )
        const shape = 'social-btn flex h-9 w-9 items-center justify-center rounded-full border'
        // Evenly spaced around the loop: 6 items → 1/6 of the path apart.
        const style = { '--start': `${(i / items.length) * 100}%` } as CSSProperties
        return (
          <div key={item.label} className="orbit-ring-item" style={style}>
            {item.href ? (
              <a
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={item.label}
                title={item.title}
                className={shape}
              >
                {icon}
              </a>
            ) : (
              <span
                aria-label={`${item.label} — link coming soon`}
                title={`${item.label} — link coming soon`}
                className={`${shape} cursor-default border-white/8 text-white/20`}
              >
                {icon}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Contact view: the message form + quiet icon row.
 * ------------------------------------------------------------------------ */
function ContactView() {
  const [composed, setComposed] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const reason = String(data.get('reason') ?? '')
    const message = String(data.get('message') ?? '')

    const subject = encodeURIComponent(`${reason}, from ${name}`)
    const body = encodeURIComponent(`${message}\n\n${name}\n${email}`)
    window.location.href = `mailto:${PROFILE.email}?subject=${subject}&body=${body}`
    setComposed(true)
  }

  return (
    <div id="panel-contact" role="tabpanel" aria-labelledby="tab-contact">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-tight text-white">
          Let's Build What Comes Next.
        </h1>
        <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-white/70">
          I'm always open to internships, jobs, research, and projects worth building. If you have
          something in mind, or you just want to talk through an idea, send it over.
        </p>
      </header>

      <div className="mt-16 grid gap-14 md:grid-cols-[1.1fr_0.9fr] md:gap-20">
        <section aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="sr-only">
            Send a message
          </h2>

          {composed ? (
            <div
              aria-live="polite"
              className="rounded-2xl p-8 text-[14px] leading-relaxed text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)]"
            >
              <p className="font-display text-2xl text-white">Your message is ready to send.</p>
              <p className="mt-4">
                Your mail app should have opened with everything filled in. Hit send there and it
                comes straight to me.
              </p>
              <p className="mt-4 text-white/60">
                Nothing opened? Write to{' '}
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="text-white/85 underline underline-offset-4 hover:text-white"
                >
                  {PROFILE.email}
                </a>{' '}
                and I'll get it.
              </p>
              <button
                type="button"
                onClick={() => setComposed(false)}
                className="mt-7 text-[13px] tracking-wide text-white/60 transition-colors hover:text-white"
              >
                Write another <span aria-hidden>→</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                    Your name
                  </label>
                  <input id="name" name="name" type="text" required autoComplete="name" className="field" />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                    Email
                  </label>
                  <input id="email" name="email" type="email" required autoComplete="email" className="field" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="reason" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                  What is this about?
                </label>
                <select id="reason" name="reason" required defaultValue={REASONS[0]} className="field field-select">
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell me a bit about it."
                  className="field resize-y"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-5">
                <button type="submit" className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide">
                  Send message
                </button>
                <p className="text-[12px] text-white/40">Opens in your mail app.</p>
              </div>
            </form>
          )}
        </section>

        {/* Centred in the right-hand column, and vertically centred against the
            form beside it (Melvin, 2026-08-10: "the socials need to be aligned
            in the center right"). `self-center` overrides the grid's default
            stretch so this block sits on the form's midline instead of hanging
            from the top; `items-center` centres the ring and its label inside
            the column. A circular ring reads as off-balance unless its label is
            centred over it too, so both are centred, not just the ring. */}
        <section
          aria-labelledby="contact-direct-heading"
          className="flex flex-col items-center md:self-center"
        >
          {/* Re-checked 2026-08-10: as a flex column with `items-center`, both
              this label and the ring below are independently centred on the
              SAME cross-axis line, so their boxes are provably aligned — this
              `text-align: center` is a no-op hardening, not the fix for
              anything measured broken. If it still reads as off-centre, the
              likely cause is the ring's OWN motion, not this layout: 6 points
              rotating together in one direction are bilaterally symmetric
              about a vertical axis only 12 times per lap (every 30deg) — the
              rest of the time the cluster is genuinely, correctly lopsided,
              which a static label above it will always look "off" against.
              That can't be fixed without either breaking "all one direction"
              (a mirrored pair would need half the icons going clockwise) or
              stopping the motion — both are calls for Melvin, not a guess. */}
          <h2
            id="contact-direct-heading"
            className="text-center text-[11px] tracking-[0.3em] text-white/40 uppercase"
          >
            Stalk me here
          </h2>

          <FindMeHere />
        </section>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Testimonials view: submission form only. The ambient "ink" archive of
 * approved testimonials is a separate, later build (see file header).
 * ------------------------------------------------------------------------ */
function TestimonialsView() {
  const [composed, setComposed] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const relationship = String(data.get('relationship') ?? '')
    const organization = String(data.get('organization') ?? '')
    const testimonial = String(data.get('testimonial') ?? '')

    const subject = encodeURIComponent(`Testimonial from ${name}`)
    const body = encodeURIComponent(
      `${testimonial}\n\n${name}\n${relationship}${organization ? ` at ${organization}` : ''}\n${email}`,
    )
    window.location.href = `mailto:${PROFILE.email}?subject=${subject}&body=${body}`
    setComposed(true)
  }

  return (
    <div id="panel-testimonials" role="tabpanel" aria-labelledby="tab-testimonials">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-tight text-white">
          Work With Me?
        </h1>
        <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-white/70">
          If we have built, learned, organized, or collaborated together, share a few words about
          the experience. Submitted testimonials may be reviewed and published on this site.
        </p>
      </header>

      <div className="mt-16 max-w-xl">
        {composed ? (
          <div
            aria-live="polite"
            className="rounded-2xl p-8 text-[14px] leading-relaxed text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)]"
          >
            <p className="font-display text-2xl text-white">Your testimonial is ready to send.</p>
            <p className="mt-4">
              Your mail app should have opened with everything filled in. I read every one myself,
              and I'll only publish it after that.
            </p>
            <button
              type="button"
              onClick={() => setComposed(false)}
              className="mt-7 text-[13px] tracking-wide text-white/60 transition-colors hover:text-white"
            >
              Write another <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="t-name" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                  Your name
                </label>
                <input id="t-name" name="name" type="text" required autoComplete="name" className="field" />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="t-email" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                  Email
                </label>
                <input id="t-email" name="email" type="email" required autoComplete="email" className="field" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="relationship" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                  How we worked together
                </label>
                <select
                  id="relationship"
                  name="relationship"
                  required
                  defaultValue={RELATIONSHIPS[0]}
                  className="field field-select"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="organization" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                  Organization (optional)
                </label>
                <input id="organization" name="organization" type="text" className="field" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="testimonial" className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                Your testimonial
              </label>
              <textarea
                id="testimonial"
                name="testimonial"
                required
                rows={6}
                placeholder="What was it like working together?"
                className="field resize-y"
              />
            </div>

            {/* Publish notice directly above Submit: sending the form IS the
                agreement, so there is no separate checkbox to also get right. */}
            <p className="text-[12px] leading-relaxed text-white/45">
              Submissions are reviewed before anything is published. Sending this means you're okay
              with that.
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-5">
              <button type="submit" className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide">
                Submit testimonial
              </button>
              <p className="text-[12px] text-white/40">Opens in your mail app.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function Contact() {
  const [view, setView] = useState<View>('contact')

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-16 pb-24 md:px-10">
      <div className="mb-14 flex justify-center">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === 'contact' ? <ContactView /> : <TestimonialsView />}

      {/* Loop back to the top of the hero. Uses Lenis (heroScrollToTop) so it
          glides instead of fighting the smooth-scroll engine. */}
      <div className="mt-24 flex justify-center">
        <button
          type="button"
          onClick={heroScrollToTop}
          className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide"
        >
          Return to Start
        </button>
      </div>
    </div>
  )
}
