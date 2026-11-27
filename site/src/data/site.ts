/* ============================================================================
 * site.ts — the site's public identity, in one place
 * ----------------------------------------------------------------------------
 * The absolute address is what link previews, the canonical tag and the
 * sitemap point at. When the custom domain goes live (task 7 of the finishing
 * list) change SITE_URL here AND the matching absolute URLs in index.html,
 * public/robots.txt and public/sitemap.xml, which crawlers read without
 * running any JavaScript.
 * ========================================================================= */

export const SITE_URL = 'https://melvinchirag.com'
export const SITE_NAME = 'Melvin Chirag Karupati'
export const DEFAULT_DESCRIPTION =
  "Melvin Chirag Karupati. Computer science student at Eastern Michigan University who builds AI agents, vision systems and more. Open to 2027 internships and full-time roles. Vice president of Hack The Nest, EMU's first hackathon."

/** Web3Forms access key for the contact and testimonial forms. The key is public by
 *  design (it only lets a form SEND to the inbox it was issued for), so it is safe in
 *  the bundle. Empty until Melvin pastes it; the forms then use it automatically.
 *  Get one free at web3forms.com by entering the inbox address. */
export const WEB3FORMS_KEY = 'a3297ce6-11b7-441e-8ac2-0e3877dd320a'
