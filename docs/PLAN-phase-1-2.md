# Plan: Phase 1 (fixes) and Phase 2 (demo videos)

Written 2026-11-19. Goal: knock out both phases in one /goal run. Every step is
one block: build, check, commit, push, log in CONTEXT.md. Site rules hold
throughout: Graphite + Sand only, no glow, reduced motion always has a still
state, pick-board before any new visual (nothing here is a new visual).

## What the code actually says (checked today)

| Item | Finding |
|---|---|
| Contact form | Already posts to FormSubmit (`site/src/pages/Contact.tsx`, `deliver()`), not Web3Forms. It goes to `PROFILE.email` = melvinchirag@gmail.com. First ever submission triggers an activation email that must be clicked once. Unknown whether that was ever done. |
| Résumé | `site/public/resume.pdf` exists but is the 2026-07-29 copy. Wrong LinkedIn (`/in/melvin-chirag`), shows only EMU, DRC, Osiris, EventsOS, Lingo, Otto_sys. No ADE, no Hack The Nest, no YC, no SPARC, no GDG. Phone number is on it. |
| Phone mask | `OFFSET = (-0.62, 0, 0)` in `MaskField.tsx` is a fixed left shift. On a narrow screen it pushes the face off the left edge. |
| Analytics | Not installed. |
| Project media | `work.ts` has 8 projects (Osiris, Lingo, EventOS, ADE, Shadow, Manas, Portfolio, OttoSys) and zero `media` entries. `ProjectMedia.tsx` already renders a `<video controls>` plus an image grid when `media` exists, and renders nothing when it does not. ffmpeg is installed. |

## Needs from Melvin (collect first, everything else can run without them)

1. Click the FormSubmit activation email if it is sitting in melvinchirag@gmail.com (step 1.1).
2. Say yes to one test message sent from the live contact form to his own inbox (step 1.1).
3. Confirm résumé facts I cannot verify from the repo: exact HTN title wording, SPARC and GDG roles and dates, ADE result, YC status, which phone and email go on it (step 1.2).
4. Raw footage or screen recordings for the projects I cannot capture myself (step 2.2).

---

## PHASE 1: fixes

### 1.1 Contact form delivery check (30 min)
Why: a form that silently fails is worse than a mailto link.
1. Read `deliver()` and the fallback path. Confirm `_honey` honeypot and `_captcha: false` behave as the comment says.
2. With Melvin's yes, submit one real test message on the live site and watch for success state and the fallback state.
3. If FormSubmit replies "needs activation", Melvin clicks the link in the inbox, then repeat once.
4. Check the success and error copy reads in plain words and the form is keyboard reachable.
5. If FormSubmit proves flaky, swap `deliver()` for Web3Forms: Melvin creates the free key himself (I do not create accounts), key goes in `VITE_WEB3FORMS_KEY` on Vercel, `deliver()` posts to `https://api.web3forms.com/submit`, mailto fallback stays.
Done when: a test message lands in melvinchirag@gmail.com and the page shows "sent".
Commit: "Contact: verified delivery" (code change only if the swap happens).

### 1.2 Résumé rewrite (60 to 90 min)
Why: recruiters are 70 percent of the audience. This is the file they open.
1. Pull facts from Otto and the Portfolio data: `work.ts`, `profile.ts`, Otto `context/facts` for HTN and ADE.
2. Draft one page, ATS-safe (real text, no tables or columns, standard headings). Sections: header, Education, Experience (DRC / CATE Lab, Hack The Nest VP & Finance Lead, SPARC, GDG), Projects (ADE, Osiris, EventOS, Lingo, Manas, Otto_sys), Awards (two hackathon wins, MLH Gemini award, SpartaHack Roots and Renewal), Skills.
3. Header: mkarupat@emich.edu and melvinchirag@gmail.com, LinkedIn `linkedin.com/in/melvin-chirag-karupati-a34452380`, GitHub, melvinchirag.com. Phone: ask Melvin whether it stays (it is public once the PDF is live).
4. Every bullet starts with a verb and carries a number or an outcome. No filler adjectives ("sophisticated", "seamlessly" are all over the old one). HTN title is "Vice President" per standing rule 56 unless Melvin says otherwise for the résumé.
5. Build the PDF (docx skill or HTML to PDF), render page 1 to an image and look at it. Check text extracts cleanly with `pdftotext`.
6. Replace `site/public/resume.pdf`, keep the old one in `parked/`. Footer link and Contact icon already point at `/resume.pdf`.
Done when: the live `/resume.pdf` shows the new file, correct LinkedIn, ADE and HTN present, one page.
Commit: "Resume: current, correct links, ADE and HTN".

### 1.3 Phone mask offset (45 min)
Why: on a phone the mask is clipped off the left edge.
1. Reproduce at 390 x 844 and 360 x 800 through a 127.0.0.1 dev server (iframe or window resize; laptop lock throttles rAF, so judge position only, not timing).
2. Make the offset a function of aspect ratio: full -0.62 at 16:9 and wider, easing to 0 (centred, scaled to fit width) at portrait. One helper in `MaskField.tsx`, used at lines 942 and 1315 and by any ray-pick that uses OFFSET.
3. Check the ray mesh used for pointer picking moves with it (line 942), the intro fly-in still lands on the mask, and the Contact swarm is unaffected.
4. Screenshot desktop, tablet and phone before and after. Desktop must be pixel-identical in position.
Done when: the face is fully visible and centred on phone, desktop unchanged, no console errors.
Commit: "Mask: aspect-aware offset so the phone shows the whole face".
Note: the full vertical phone layout is Phase 3, not this step.

### 1.4 Vercel Analytics (15 min)
1. `npm i @vercel/analytics` in `site/`.
2. Mount `<Analytics />` once in `main.tsx` or `App.tsx`. Page views are tracked on route change, no cookies, so no consent banner needed.
3. Melvin turns on Web Analytics in the Vercel project (Analytics tab, one click). I do not change dashboard settings.
4. After deploy, load the site and confirm the `/_vercel/insights/script.js` request returns 200.
Done when: the script loads on the live site and Melvin sees a visit in the Vercel dashboard.
Commit: "Analytics: Vercel Web Analytics".

### 1.5 Phase 1 close (10 min)
Run `tsc -b` and `npm run build`, check the live site once on desktop and phone width, update CONTEXT.md task table (tasks 2, 5, 6 partly), report in a table.

---

## PHASE 2: demo videos

Rule for all videos: a visitor sees a real recording of the real thing, never a mock-up. A project without a real recording stays text-only (the page already hides empty media).

### 2.1 Spec and player upgrade (45 min)
1. Spec: 16:9, 1280 x 720, H.264 mp4, no audio track unless narrated, 15 to 40 seconds, target 3 MB or less each (the About video is 4.6 MB for reference), plus a poster jpg frame.
2. `ProjectMedia.tsx`: add `poster` support, `preload="none"` so nothing downloads until play, lazy-mount via IntersectionObserver, `muted loop playsInline` autoplay only when in view and only when reduced motion is off, otherwise a still poster with a play button and `controls`. Keep a caption slot.
3. `work.ts` type: `media?: { video?: string; poster?: string; images?: string[]; caption?: string }`.
4. Compression helper: one ffmpeg command saved in `docs/` so every clip is made the same way (`-vf scale=1280:-2 -c:v libx264 -crf 28 -preset slow -movflags +faststart -an`), and a poster grab at the 1-second mark.
Done when: a test clip plays, pauses off-screen, and falls back to poster under reduced motion.
Commit: "Work: video player with poster, lazy load, reduced-motion still".

### 2.2 Source the footage (parallel with 2.1, depends on Melvin)
| Project | Where the footage comes from | Who |
|---|---|---|
| Portfolio | I record the live site with Chrome automation (intro, mask, menu, Work page) | Claude |
| Manas | Screen recording of the Tauri app running a simulation | Melvin, or Claude if the repo builds locally |
| ADE | Devpost demo video or screen recording of the desktop app | Melvin |
| Lingo | Devpost demo video | Melvin (download from Devpost) |
| EventOS | Devpost demo video | Melvin |
| Osiris | Screen recording of sign language to speech running | Melvin |
| Shadow | Devpost demo video | Melvin |
| OttoSys | Terminal recording is optional; skip unless he wants it | Skip |
For each: confirm Melvin owns the footage or it is his team's own Devpost upload, and that no sponsor logos or private data show.

### 2.3 Process and wire in (20 min per clip)
1. Trim to the best 15 to 40 seconds, compress with the 2.1 command, grab the poster.
2. Place at `site/public/work/<id>/demo.mp4` and `poster.jpg`.
3. Add `media` to the project in `work.ts`. Add a one-line caption saying what the viewer is seeing.
4. Check on the live row: expands, plays, loads nothing until opened, mobile width OK.
Order: Portfolio, Osiris, ADE first (flagship and recruiter-relevant), then Lingo, EventOS, Manas, Shadow.
Commit per project: "Work: <name> demo".

### 2.4 Performance guard (20 min)
1. Page weight on first load must not rise (videos load only when a row is opened). Check with the network panel.
2. Total `public/work/` size under 25 MB.
3. Lighthouse on `/work` before and after: no drop in Performance.
4. Phone: expand a row on a throttled connection and confirm the poster shows first.

### 2.5 Phase 2 close
Update CONTEXT.md, report in a table: project, clip length, size, live or waiting on footage.

---

## Order for the /goal run
1.1 (starts the wait on Melvin's inbox) then 1.4, 1.3, 1.2 (résumé last because it needs his answers), then 2.1, 2.3 for Portfolio, then each project as footage arrives, then 2.4 and the two close steps.

## Stop points (things I will not do alone)
- Sending the contact test message (needs his yes).
- Creating a Web3Forms or Vercel setting (his account).
- Publishing any footage that is not his or his team's own.
- Committing Otto files; this plan touches only the Portfolio repo.
