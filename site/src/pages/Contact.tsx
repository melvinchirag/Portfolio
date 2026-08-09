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

import { useState } from 'react'
import { heroScrollToTop } from '../hooks/useLenis'
import { PROFILE } from '../data/profile'
import { SocialLinks } from '../components/SocialLinks'

/** What brings people to the contact form. Doubles as the email subject line. */
const REASONS = [
  'A job or an internship',
  'Research',
  'Grad school or a program',
  'Building something together',
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
 * ------------------------------------------------------------------------ */
function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: 'contact', label: 'Contact' },
    { id: 'testimonials', label: 'Testimonials' },
  ]
  return (
    <div
      role="tablist"
      aria-label="Contact or testimonials"
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

/* ---------------------------------------------------------------------------
 * Icon-only social/contact buttons. NO visible handles or URLs (Melvin,
 * 2026-08-09: showing the raw URL "reads very amateur"). Same `.social-btn`
 * material as the hero row: neutral at rest, accent plus a warm halo on
 * hover/focus. The actual address lives in href + aria-label/title, not on
 * screen — still fully reachable, just not printed out.
 * ------------------------------------------------------------------------ */
function FindMeHere() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      <SocialLinks size={19} />
      <a
        href={`mailto:${PROFILE.email}`}
        aria-label="Email"
        title={PROFILE.email}
        className="social-btn flex h-9 w-9 items-center justify-center rounded-full border"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width={19} height={19} aria-hidden>
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      </a>
      <a
        href={PROFILE.resume}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Resume"
        title="Download resume (PDF)"
        className="social-btn flex h-9 w-9 items-center justify-center rounded-full border"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width={19} height={19} aria-hidden>
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
      </a>
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
        <p className="mb-4 text-[11px] tracking-[0.3em] text-white/40 uppercase">( Say Hello )</p>
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-tight text-white">
          Let's Build Something Meaningful.
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
                  What is this about
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

        <section aria-labelledby="contact-direct-heading">
          <h2 id="contact-direct-heading" className="text-[11px] tracking-[0.3em] text-white/40 uppercase">
            Or find me here
          </h2>

          <FindMeHere />

          <p className="mt-8 text-[12.5px] leading-relaxed text-white/45">
            Based in Michigan, working on computer vision and applied machine learning. Happy to talk
            to anyone building something interesting.
          </p>
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
        <p className="mb-4 text-[11px] tracking-[0.3em] text-white/40 uppercase">( Testimonials )</p>
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
