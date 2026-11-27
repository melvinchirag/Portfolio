# Benchmark plan (2026-11-26, awaiting Melvin's approval)

Compared melvinchirag.com with 11 portfolios on a simulated phone (390x664) and desktop (1440x900).
Page with screenshots: .phone-out/bench/portfolio-benchmark-plan.html (git-ignored; also published as a private artifact).

## Findings
- Strengths: distinctive look, no Start gate, 2.5 MB first load, recruiter links on first screen, CM menu pattern.
- Home visible after ~9 s (fast) and ~13 s (throttled phone); a tap saves ~2 s. Loader totalMs 5200 + unmount 500, starts after load.
- No project in site/src/data/work.ts has media; home previews are letter placeholders.
- About text fights the background; wordmark and CM button cover Vision text on phones; floating facts cross headings on desktop.
- Desktop hero can rest between frames.
- Small tap targets (9 of 12 under 40 px) and 11 px text on the new phone build.

## Stages (stop after each; preview first, live only on Melvin's word)
1. Ship phone redesign: finish checks, fix text covered by wordmark/CM, preview, real-phone test.
2. Arrive fast: ~2 s intro with name. Done: home visible <=3 s fast, <=5 s slow phone.
3. Read easily: About background, desktop settle, facts off text, 12 px minimum, 44 px taps.
4. Show the work: media on home and Work, three project pages.
5. Extras: photo, availability line, menu links, tap hint.

## Open decisions
Intro length; which three projects (suggested Lingo, ADE, Manas); availability wording.
