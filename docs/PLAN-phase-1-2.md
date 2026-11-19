# Plan v2: finish the site (Phase 1 fixes, Phase 2 structure and UI, footage last)

Rewritten 2026-11-19 after Melvin's reply: "footage is makeup, structure and UI
first." Every step is one block: build, check, commit, push, log in CONTEXT.md.
Site rules hold: Graphite + Sand only, no glow, reduced motion always has a
still state. **Any new look gets a live pick-board before it is built**
(LESSONS #1). Melvin picks, then it ships.

## Decisions already made (Melvin, 2026-11-19)
- Contact form delivers to melvinchirag@gmail.com (he said "melanchirag", read as the same address; confirm once). Keep it. Visitors type, press send, it arrives in his inbox.
- Phone number stays on the résumé PDF.
- Résumé facts: Hack The Nest = Vice President and Finance Lead. SPARC = Founder and President. GDG = Vice President. Dates come from his LinkedIn. ADE won at Hack Dearborn (two awards: one main track, which he called "Ideation Matrix", and Best Use of ElevenLabs). ADE is also applied to YC, no answer yet, still working on it.
- Analytics = who visited, from which countries, which pages, how they arrived (counts, not named people). Wants a private address like stats.melvinchirag.com that opens it.
- Footage for projects is LAST.
- (2026-11-19, later) Liquid effect goes on ALL hero buttons and must feel fluid. Contact becomes a fifth menu word ("not a bad idea, it might be wise indeed").
- The phone version needs a serious rethink, not a patch. The big mask may be the wrong idea on a phone.

## What the live site looks like today (audited 2026-11-19, desktop 1440 and phone 390)
| Page | Finding |
|---|---|
| Home, desktop | Strong hero. Name, paragraph and buttons sit on the left, mask behind. Paragraph runs into the vertical text rails. |
| Home, phone | The mask is cut off at the left edge and the paragraph sits on top of it. Whole first screen reads as broken. Menu at the bottom works. |
| Work | Long accordion (Flagship, Hackathons, more). Search bar is faint. The vertical glyph "snakes" run through the middle of the list and the text. Everything below the first fold looks the same weight, so it reads as a long list, not a portfolio. |
| About | Timeline cards float over the astronaut video. Cards overlap each other and the heading and intro are low contrast on the busy background. Hard to read on both sizes. |
| Vision | Clean, but it is a wall of paragraphs. The snakes cross the paragraphs and hurt reading. No structure beyond the heading. |
| Contact | `/contact` returns the 404 page. Contact only exists as the last slide on Home and a footer link. A visitor who types /contact or shares it lands on "Nothing here." |
| All | No shared page skeleton (heading size, spacing, section rhythm differ per page). The snake rails are decoration that competes with content on every content page. |

---

## PHASE 1: things that must be right (small)

### 1.1 Contact form delivery (30 min)
The form already posts to FormSubmit and forwards to melvinchirag@gmail.com. The only unknown is whether FormSubmit was ever activated.
1. Melvin opens the live Home contact slide, types a short test message, presses send. The first submission ever makes FormSubmit email an activation link to his inbox. He clicks it once, then sends a second test.
2. Pass condition: the message lands in his inbox and the page shows the sent state.
3. I read the error and fallback copy and the keyboard path. If FormSubmit misbehaves, swap to Web3Forms (he creates the free key himself, it goes in a Vercel environment variable, nothing else changes for visitors).
4. With the new `/contact` page (step 2.6) the form lives at its own address.

### 1.2 Résumé (60 to 90 min)
1. Open Melvin's LinkedIn in his Chrome and read dates for DRC / CATE Lab, Hack The Nest, SPARC, GDG, education. I read, I do not edit anything on LinkedIn.
2. One page, ATS-safe plain text structure: header (phone, mkarupat@emich.edu, melvinchirag@gmail.com, LinkedIn `/in/melvin-chirag-karupati-a34452380`, GitHub, melvinchirag.com), Education, Experience (DRC, Hack The Nest VP and Finance Lead, SPARC Founder and President, GDG Vice President), Projects (ADE first with the Hack Dearborn awards and the YC application, then Osiris, EventOS, Lingo, Manas, Otto_sys), Awards, Skills.
3. Verbs and outcomes, no filler adjectives. One question for him: exact award names at Hack Dearborn ("Ideation Matrix" as spoken, confirm spelling).
4. Render to an image and look at it, check text extraction, replace `site/public/resume.pdf`, move the old one to `parked/`.

### 1.3 Analytics and the stats address (45 min)
1. `npm i @vercel/analytics`, mount `<Analytics />` once. No cookies, no consent banner.
2. Melvin switches on Web Analytics in the Vercel project (his account, one click). The dashboard then shows visitors, pages, referrers, countries, devices.
3. Private stats address: add `stats.melvinchirag.com` to the Vercel project (DNS already lives in Vercel) and add a host redirect in `site/vercel.json` that sends it to the analytics dashboard. The dashboard needs his Vercel login, so only he can see numbers. I make the code change; he or I (with his yes) add the domain in Vercel.
4. Check: the script loads on the live site and his own visit appears.
Note: Vercel shows aggregate counts and countries. It cannot name individual visitors, by design.

### 1.4 Liquid hero buttons (half a day; pick-board first, then build)
Melvin: apply the liquid effect to all buttons on the hero, and it must be fluid.
Hero elements that act as buttons today (HeroBeats.tsx): the two CTAs "See the work" and "Contact" (`glass-cta`), the round project-rail arrows, the frame dots at the bottom, and the text links GitHub, LinkedIn, Resume and "Read the full story".
1. Pick-board (live, real shader, real button sizes) showing 3 behaviours on the two CTAs. A) Pool: a sand drop follows the cursor inside the pill and swells to fill it on hover, retracts on leave. B) Bridge: two drops (leader and lagger, like the menu) stretch a bridge from where the cursor entered to where it sits. C) Press ripple: pill is a calm liquid surface, hover tilts the highlight, click sends a ring through it. Each shows hover, leave and press.
2. Fluid means: springs not fixed lerps (so motion overshoots a little and settles), pointer-following with lag, a squash on press, and never a hard cut between states. 60 fps with only the hovered button running its loop.
3. Build the pick on every hero button, in tiers: CTAs get the full liquid pill; rail arrows and frame dots get a small drop that swells; text links get a thin liquid underline that flows toward the cursor.
4. Implementation: reuse `mercury.ts` with generalised radii. One small canvas per button, created on first hover or focus and released after it settles, so at most two or three WebGL contexts exist at once next to the menu. Resting look stays the current CSS pill, so nothing loads or runs until someone touches it.
5. Fallbacks: no WebGL gives today's `glass-cta` hover. Reduced motion gives an instant fill and colour change, no morph. Keyboard focus shows the same liquid state as hover. Touch: tap shows the press ripple only.
6. Rules: Graphite + Sand only, no glow, no second colour, keep text readable over the liquid (label turns graphite where the drop covers it, same trick as the menu).
Done when: every hero button reacts fluidly on desktop, still works by keyboard and on touch, console clean, no frame-rate drop on the hero.
Commit: "Hero: liquid buttons".

### 1.5 Contact as the fifth menu word (2 to 3 hours)
Melvin: yes, add it. It needs a real page first, because `/contact` 404s today.
1. Build the `/contact` route and page: the form (same delivery as 1.1), direct email, LinkedIn, GitHub, résumé link, one line on what he is open to. Uses the page skeleton from 2.1 (build the skeleton first, or use the same heading and spacing values now and fold into 2.1).
2. Menu: five words. Row form widens (about 540 px) and Contact joins Home and About in the open row. Island form lists five words. Phone row tightens padding so five words fit inside 94 vw at 360 and 390.
3. Home hero "Contact" button keeps scrolling to the Home contact slide (part of the scroll story); the menu word goes to the page. Both deliver to the same inbox.
4. Update sitemap, the 404 text, and CONTEXT.md. Check all five words on desktop and phone.
Commit: "Contact page and fifth menu word".

---

## PHASE 2: finish the structure and UI

Method for every page: (a) write the page's job in one sentence, (b) decide the section order, (c) a live pick-board with 2 or 3 layouts using the real content, (d) Melvin picks, (e) build, check desktop and phone, commit.

### 2.1 Shared skeleton and rules (half a day, no pick-board needed)
Fix the things every page shares before touching individual pages.
1. One page template: eyebrow label, page title, one-line intro, then sections with one spacing rhythm and one max content width. Replace per-page one-offs.
2. Snake rails and glyph channels: keep them as background decoration but keep them out of the reading column on content pages (Work, Vision, About, Contact). On those pages they run in the outer margins only, and fade where text sits.
3. Contrast pass: headings, intros and small mono text meet readable contrast on every background, including over the About video.
4. Footer and menu are already settled; no change.
Done when: Work, Vision, About and Contact share the same skeleton and no text is crossed by a decoration.

### 2.2 Phone version (the big one; pick-board first)
Melvin's call: the big mask may not belong on a phone. Treat this as a design problem, not a position bug.
1. Pick-board with 3 live phone options on the real hero content, shown in a phone-width frame: A) mask smaller and centred above the name (fits, still the signature), B) mask as a full-bleed background at low strength behind the text with a strong text plate, C) no 3D mask on phones, replaced by the name assembly plus a calm particle field or the name alone, with the mask coming back at tablet width and up.
2. Include a performance note per option (1.4M particles on a phone is a battery and heat cost; option C is the cheapest).
3. Melvin picks. Build it, then run the same skeleton fixes from 2.1 at 390 and 360 widths: About timeline as a single column, Work list tap targets, menu clearance for the bottom row.
4. Test on a real phone via the live site. The laptop lock throttles animation, so I judge layout from screenshots and Melvin judges feel on his phone.

### 2.3 Home (pick-board for the hero order)
Job: in 10 seconds a recruiter knows who he is, what he builds, and where to go next.
1. Review the beats (Past, Present, Future frames, project rail, contact slide) and the order.
2. Fix the paragraph colliding with the rails. Decide what is above the fold on desktop: name, one sentence, two buttons, plus proof (the two hackathon wins, Hack The Nest) as a quiet line.
3. Board with 2 or 3 above-the-fold layouts. Build the pick.

### 2.4 Work (pick-board for the list)
Job: show the best three projects fast, let people dig in.
1. Today it is one long accordion. Proposed structure: Flagship (ADE and Osiris as large cards with outcome line and stack), then Hackathon wins as a compact grid, then Systems and tools, then the search.
2. Each project gets the same anatomy: one-line what it is, the result (award, status), stack, links, then the expandable story. Media slot stays, empty until footage (the page already hides empty media).
3. Board: A) big cards plus compact list, B) the current accordion, cleaned up, C) a two-column index with a preview panel. Build the pick.

### 2.5 About (pick-board)
Job: the human story in under a minute, readable.
1. The timeline cards overlap the video. Options: A) a single readable column over a dimmed video, B) timeline on a left rail with the astronaut kept as the right-side picture, C) the ASCII portrait board from before (https://claude.ai/artifact/Yc1Xt6YfNmrUnCZS3PFTNi) as the hero with the timeline below.
2. Proofread copy, check the facts against his LinkedIn and the résumé.
3. Build the pick.

### 2.6 Vision and a real Contact page
1. Vision: break the wall into three blocks (Now, Next, Underneath) with one strong line each, supporting paragraph below. Board with 2 layouts, then build.
2. Contact page and the fifth menu word moved to Phase 1, step 1.5. Here: only restyle it with the finished page skeleton.

### 2.7 Page-by-page review and close
Desktop and phone screenshots of every page, Lighthouse on each, console clean, CONTEXT.md updated, a before and after table to Melvin.

---

## LATER (after the site feels finished)
- Footage for each project (spec, player upgrade, compression command, per-project steps are in the earlier plan: Portfolio and Osiris and ADE first).
- Second mask, ASCII About extras, full-screen menu glide, Lighthouse and Awwwards pass.

## Order for the /goal run
1.1 (starts the wait on his inbox), 1.3 and 1.2 (both done on the code side), then 1.4 (board, then build), 1.5, then 2.1 then 2.2 (phone) then 2.3, 2.4, 2.5, 2.6 each as pick-board then build, then 2.7.
Pick-boards pause the run until Melvin chooses; I batch them so several boards are ready at once.

## Stop points (I will not do these alone)
- Sending the form test (Melvin sends it).
- Vercel dashboard settings, adding the stats domain, Web3Forms key (his account; I give the exact clicks).
- Editing anything on LinkedIn (read only).
- Committing Otto files; this plan touches only the Portfolio repo.
