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

import { useEffect, useState, type CSSProperties } from 'react'
import { heroScrollToTop } from '../hooks/useLenis'
import { PROFILE, SOCIALS } from '../data/profile'
import { WEB3FORMS_KEY } from '../data/site'
import { ICON_PATHS } from '../components/SocialLinks'
import { Reveal } from '../components/Reveal'
import { WipNote } from '../components/WipNote'
import { usePageMeta } from '../hooks/usePageMeta'
import { useReadingColumn } from '../hooks/readingColumn'

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

/* ---------------------------------------------------------------------------
 * DELIVERY (task 2 of the finishing list, 2026-11-05). Melvin: "when they say
 * contact us, it should directly come to my email." Both forms POST to
 * FormSubmit's JSON endpoint for PROFILE.email, which forwards the message to
 * that inbox; no backend, no account, nothing to run. First submission ever
 * triggers a one-time activation email to that inbox (click the link once).
 * `_honey` is a hidden honeypot: bots fill it, humans can't see it, and a
 * filled one is quietly "sent" without going anywhere. If the request fails
 * (offline, endpoint down, not yet activated) the form shows an inline error.
 * (2026-11-19: the automatic mailto fallback was removed. A failed send now shows an inline notice and keeps the typed text.)
 * ------------------------------------------------------------------------ */
type SendStatus = 'idle' | 'sending' | 'sent' | 'failed'

async function deliver(fields: Record<string, string>, subject: string): Promise<boolean> {
  try {
    // Web3Forms: one POST, no activation links, nothing opens on the visitor's side.
    // Used as soon as WEB3FORMS_KEY is set. FormSubmit stays as the fallback until then.
    if (WEB3FORMS_KEY) {
      const { name = '', email = '', ...rest } = fields
      const message = Object.entries(rest)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n\n')
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, from_name: name, name, email, message }),
      })
      const j = (await r.json()) as { success?: boolean }
      return r.ok && j.success === true
    }
    const r = await fetch(`https://formsubmit.co/ajax/${PROFILE.email}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...fields, _subject: subject, _template: 'table', _captcha: 'false' }),
    })
    if (!r.ok) return false
    const j = (await r.json()) as { success?: string | boolean }
    return j.success === true || j.success === 'true'
  } catch {
    return false
  }
}

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
      className="inline-flex gap-1 rounded-full p-1 shadow-[inset_0_0_0_1px_var(--color-line)]"
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
              ? 'text-sand bg-sand/10 shadow-[inset_0_0_0_1px_rgba(205,183,138,0.4)]'
              : 'text-sand-dim hover:text-sand'
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
 * Icon-only social/contact buttons: six crystal beads, standing still. The
 * revolving ring was removed on 2026-11-27 (Melvin: "that just looks cheap").
 * No visible handles or URLs; the address lives in href, aria-label and title.
 * The slow bloom that asks to be pressed is drawn by LiquidGlassField, one bead
 * after the next (`--i`).
 * ------------------------------------------------------------------------ */

function FindMeHere() {
  const items = [
    ...SOCIALS.map((s) => ({ label: s.label, href: s.href, title: s.label, path: ICON_PATHS[s.label] })),
    ...EXTRA_ICONS,
  ]
  return (
    <ul className="mt-7 grid grid-cols-3 gap-x-8 gap-y-7">
      {items.map((item, i) => {
        const icon = (
          <svg viewBox="0 0 24 24" fill="currentColor" width={21} height={21} aria-hidden>
            <path d={item.path} />
          </svg>
        )
        const shape = 'social-btn flex h-14 w-14 items-center justify-center rounded-full border'
        return (
          <li key={item.label} style={{ '--i': i } as CSSProperties}>
            {item.href ? (
              <a
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={item.label}
                title={item.title}
                className={`${shape} social-glass sync-glass-rect`}
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
          </li>
        )
      })}
    </ul>
  )
}

/* ---------------------------------------------------------------------------
 * Contact view: the message form + quiet icon row.
 * ------------------------------------------------------------------------ */
function ContactView() {
  const [status, setStatus] = useState<SendStatus>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const reason = String(data.get('reason') ?? '')
    const message = String(data.get('message') ?? '')
    if (String(data.get('_honey') ?? '')) { setStatus('sent'); return } // bot

    setStatus('sending')
    const subjectText = `${reason}, from ${name}`
    if (await deliver({ name, email, reason, message }, subjectText)) {
      setStatus('sent')
      return
    }
    // Never open the visitor's mail app on their behalf: say it failed and keep what they typed.
    setStatus('failed')
  }

  return (
    <div id="panel-contact" role="tabpanel" aria-labelledby="tab-contact">
      <Reveal as="header" className="text-box max-w-2xl p-5 md:p-7">
        <h1 className="display-wide font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] font-bold tracking-tight text-white">
          Let's Build What Comes Next.
        </h1>
        <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-white/70">
          I’m looking for 2027 internships and full-time roles, and I’m always up to collaborate
          on new projects and startups. If you have something in mind, or you just want to talk
          through an idea, send it over.
        </p>
      </Reveal>

      <Reveal delay={120} className="mt-8 grid gap-14 md:grid-cols-[1.1fr_0.9fr] md:gap-20">
        <section aria-labelledby="contact-form-heading" className="text-box self-start p-5 md:p-7">
          <h2 id="contact-form-heading" className="sr-only">
            Send a message
          </h2>

          {status === 'sent' ? (
            <div
              aria-live="polite"
              className="rounded-2xl p-8 text-[14px] leading-relaxed text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)]"
            >
              <p className="font-display text-2xl text-white">Sent. It is in my inbox.</p>
              <p className="mt-4">
                I read everything myself and I will write back to the address you gave.
              </p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="mt-7 text-[13px] tracking-wide text-white/60 transition-colors hover:text-white"
              >
                Write another <span aria-hidden>→</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
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

              {status === 'failed' && (
                <p role="alert" className="text-[13px] leading-relaxed text-white/80">
                  That did not send, and what you typed is still here. Try again in a moment, or write to{' '}
                  <a href={`mailto:${PROFILE.email}`} className="text-white underline underline-offset-4">
                    {PROFILE.email}
                  </a>
                  .
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-5">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide disabled:opacity-60"
                >
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
                <p className="text-[12px] text-white/40">Goes straight to my inbox.</p>
              </div>
            </form>
          )}
        </section>

        <section
          aria-labelledby="contact-direct-heading"
          className="flex flex-col items-center md:self-center"
        >
          <h2
            id="contact-direct-heading"
            className="text-center text-[11px] tracking-[0.3em] text-sand/80 uppercase"
          >
            Stalk me here
          </h2>

          <FindMeHere />
        </section>
      </Reveal>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Testimonials view: submission form only. The ambient "ink" archive of
 * approved testimonials is a separate, later build (see file header).
 * ------------------------------------------------------------------------ */
function TestimonialsView() {
  const [status, setStatus] = useState<SendStatus>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const relationship = String(data.get('relationship') ?? '')
    const organization = String(data.get('organization') ?? '')
    const testimonial = String(data.get('testimonial') ?? '')
    if (String(data.get('_honey') ?? '')) { setStatus('sent'); return } // bot

    setStatus('sending')
    const subjectText = `Testimonial from ${name}`
    if (await deliver({ name, email, relationship, organization, testimonial }, subjectText)) {
      setStatus('sent')
      return
    }
    // Never open the visitor's mail app on their behalf: say it failed and keep what they typed.
    setStatus('failed')
  }

  return (
    <div id="panel-testimonials" role="tabpanel" aria-labelledby="tab-testimonials">
      <Reveal as="header" className="text-box max-w-2xl p-5 md:p-7">
        <h1 className="display-wide font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] font-bold tracking-tight text-white">
          Work With Me?
        </h1>
        <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-white/70">
          If we have built, learned, organized, or collaborated together, share a few words about
          the experience. Submitted testimonials may be reviewed and published on this site.
        </p>
      </Reveal>

      <Reveal delay={120} className="text-box mt-8 max-w-2xl p-5 md:p-7">
        {status === 'sent' ? (
          <div
            aria-live="polite"
            className="rounded-2xl p-8 text-[14px] leading-relaxed text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.075)]"
          >
            <p className="font-display text-2xl text-white">Sent. Thank you.</p>
            <p className="mt-4">I read every one myself, and I will only publish it after that.</p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-7 text-[13px] tracking-wide text-white/60 transition-colors hover:text-white"
            >
              Write another <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
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

            {status === 'failed' && (
                <p role="alert" className="text-[13px] leading-relaxed text-white/80">
                  That did not send, and what you typed is still here. Try again in a moment, or write to{' '}
                  <a href={`mailto:${PROFILE.email}`} className="text-white underline underline-offset-4">
                    {PROFILE.email}
                  </a>
                  .
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-5">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide disabled:opacity-60"
              >
                {status === 'sending' ? 'Sending…' : 'Submit testimonial'}
              </button>
              <p className="text-[12px] text-white/40">Goes straight to my inbox.</p>
            </div>
          </form>
        )}
      </Reveal>
    </div>
  )
}

export function Contact() {
  const [view, setView] = useState<View>('contact')

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-16 pb-24 md:px-10">
      <Reveal className="mb-14 flex justify-center">
        <ViewToggle view={view} onChange={setView} />
      </Reveal>

      {view === 'contact' ? <ContactView /> : <TestimonialsView />}

      {/* Loop back to the top of the hero. Uses Lenis (heroScrollToTop) so it
          glides instead of fighting the smooth-scroll engine. */}
      <Reveal className="mt-24 flex justify-center">
        <button
          type="button"
          onClick={heroScrollToTop}
          className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide"
        >
          Return to Start
        </button>
      </Reveal>
      <Reveal className="mt-10 flex justify-center">
        <WipNote />
      </Reveal>
    </div>
  )
}

/** The standalone /contact page (the fifth menu word). Same form, same delivery
 *  and the same Contact / Kind Words toggle as the Home slide, but as its own
 *  address: no scroll hand-off, no "Return to Start", the footer follows. */
export function ContactPage() {
  usePageMeta(
    'Contact',
    '/contact',
    'Send Melvin Chirag Karupati a message about internships, jobs, research or projects. It goes straight to his inbox.',
  )
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  useReadingColumn(512)
  const [view, setView] = useState<View>('contact')

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-32 pb-24 md:px-10">
      <Reveal className="mb-14 flex justify-center">
        <ViewToggle view={view} onChange={setView} />
      </Reveal>
      {view === 'contact' ? <ContactView /> : <TestimonialsView />}
    </div>
  )
}
