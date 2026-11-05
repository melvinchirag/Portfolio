/* ============================================================================
 * usePageMeta.ts — per-page title, description, canonical and share tags
 * ----------------------------------------------------------------------------
 * The app is a single page, so without this every route shows the same tab
 * title and the same preview card. Each page calls this once with its own
 * title and one-line description; the hook writes the document title and
 * updates the tags that already exist in index.html (it never creates new
 * ones, so the head stays exactly the set that index.html declares).
 *
 * Crawlers that don't run JavaScript see index.html's defaults, which are the
 * Home page's values; that is the right fallback. Crawlers that do (Google,
 * and the link-preview fetchers of most chat apps) see the page's own.
 * ========================================================================= */

import { useEffect } from 'react'
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from '../data/site'

function set(selector: string, attr: string, value: string) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

/**
 * @param title  The page's own name, or null for the home page (site name only).
 * @param path   The route, starting with '/', used for the canonical address.
 * @param description One sentence; falls back to the site description.
 */
export function usePageMeta(title: string | null, path: string, description = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE_NAME}` : SITE_NAME
    const url = SITE_URL + path
    document.title = full
    set('meta[name="description"]', 'content', description)
    set('meta[property="og:title"]', 'content', full)
    set('meta[property="og:description"]', 'content', description)
    set('meta[property="og:url"]', 'content', url)
    set('meta[name="twitter:title"]', 'content', full)
    set('meta[name="twitter:description"]', 'content', description)
    set('link[rel="canonical"]', 'href', url)
  }, [title, path, description])
}
