/* ============================================================================
 * Contact.tsx — the contact section that closes the Home page
 * ----------------------------------------------------------------------------
 * Rendered as a normal vertical section (id="contact") after the hero's
 * horizontal pan ends, so the hero's Contact button can scroll straight to it.
 *
 * HOW SENDING WORKS RIGHT NOW (important):
 * There is no backend yet. Rather than fake a success message and silently drop
 * a real person's message, Submit composes a `mailto:` with the form contents
 * and hands it to the visitor's mail app. Nothing is ever lost, and the
 * confirmation copy says exactly what happened instead of claiming "sent".
 * When a real endpoint exists, replace the body of `handleSubmit` and the
 * confirmation copy; the markup and styling do not need to change.
 *
 * The testimonials archive (the ambient depth layer of past testimonials, plus
 * the "Work With Me?" submission flow) is a SEPARATE later pass — see the
 * addendum logged in CONTEXT.md. Deliberately not stubbed here, so there is no
 * dead control sitting on a live page.
 * ========================================================================= */

import { useState } from 'react'
import { heroScrollToTop } from '../hooks/useLenis'
import { PROFILE } from '../data/profile'

/** Direct routes, for people who would rather not fill in a form. */
const LINKS = [
  { label: 'Email', href: `mailto:${PROFILE.email}`, value: PROFILE.email },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/melvin-chirag-karupati-a34452380',
    value: 'linkedin.com/in/melvin-chirag-karupati',
  },
  { label: 'GitHub', href: 'https://github.com/melvinchirag', value: 'github.com/melvinchirag' },
  { label: 'Resume', href: PROFILE.resume, value: 'Download PDF' },
]

/** What brings people here. Doubles as the email subject line. */
const REASONS = [
  'A job or an internship',
  'Research',
  'Grad school or a program',
  'Building something together',
  'Something else',
]

export function Contact() {
  // `composed` flips to the confirmation state after the mail app is handed the
  // message. Named for what actually happened (we composed a draft), not "sent".
  const [composed, setComposed] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const reason = String(data.get('reason') ?? '')
    const message = String(data.get('message') ?? '')

    // encodeURIComponent on every part so line breaks, ampersands and accents
    // survive the trip into the mail client intact.
    const subject = encodeURIComponent(`${reason}, from ${name}`)
    const body = encodeURIComponent(`${message}\n\n${name}\n${email}`)
    window.location.href = `mailto:${PROFILE.email}?subject=${subject}&body=${body}`
    setComposed(true)
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-28 pb-24 md:px-10">
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
        {/* ---------------------------------------------------------------- */}
        {/* The form */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="sr-only">
            Send a message
          </h2>

          {composed ? (
            // aria-live so a screen reader announces the swap without a page change.
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
                <a href={`mailto:${PROFILE.email}`} className="text-white/85 underline underline-offset-4 hover:text-white">
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
                <button
                  type="submit"
                  className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide text-white/90"
                >
                  Send message
                </button>
                <p className="text-[12px] text-white/40">Opens in your mail app.</p>
              </div>
            </form>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Direct routes, for people who would rather skip the form */}
        {/* ---------------------------------------------------------------- */}
        <section aria-labelledby="contact-direct-heading">
          <h2
            id="contact-direct-heading"
            className="text-[11px] tracking-[0.3em] text-white/40 uppercase"
          >
            Or find me here
          </h2>

          {/* A quiet list separated by hairlines, not a stack of glass cards.
              Four heavy cards competed with the form for attention; this is the
              secondary path and should read that way. */}
          <ul className="mt-6 flex flex-col">
            {LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-baseline justify-between gap-6 border-t border-white/8 py-4 transition-colors last:border-b hover:bg-white/[0.02]"
                >
                  <span className="text-[11px] tracking-[0.2em] text-white/40 uppercase">
                    {link.label}
                  </span>
                  <span className="text-right text-[13.5px] text-white/75 transition-colors group-hover:text-white">
                    {link.value}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-[12.5px] leading-relaxed text-white/45">
            Based in Michigan, working on computer vision and applied machine learning. Happy to talk
            to anyone building something interesting.
          </p>
        </section>
      </div>

      {/* Loop back to the top of the hero. Uses Lenis (heroScrollToTop) so it
          glides instead of fighting the smooth-scroll engine. */}
      <div className="mt-24 flex justify-center">
        <button
          type="button"
          onClick={heroScrollToTop}
          className="glass-cta rounded-full px-7 py-2.5 text-sm tracking-wide text-white/80 transition-colors hover:text-white"
        >
          Return to Start
        </button>
      </div>
    </div>
  )
}
