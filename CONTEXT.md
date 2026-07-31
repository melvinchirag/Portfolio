# CONTEXT — Portfolio project handoff

Last updated: 2026-07-31 · Owner: Melvin

## 🔀 PARALLEL WORK IN PROGRESS (2026-07-31) — read this, AGY
Melvin is running **Claude on the HERO (Home) + all WebGL** and **AGY on the
other pages' content/UI** at the same time. To avoid collisions:
- **AGY owns:** `About`, `Work`, `Vision`, `Contact`, `Résumé` — content, copy,
  plain layout/UI. **Claude owns:** `Home`/hero, and ALL the shared WebGL.
- **AGY MUST NOT TOUCH** (Claude is actively editing these): `Home.tsx`,
  `HeroBeats.tsx`, `heroScroll.ts`, and everything under
  `components/scene/` — `GlobalScene.tsx`, `MaskField.tsx`, `LiquidGlassField.tsx`,
  `VideoBackground.tsx`. These are the shared global canvas + hero; editing them
  in parallel will conflict. (This matches PAGE-PLAN.md's DO-NOT-TOUCH list.)
- **Git:** both are committing to `main`. **Pull before you start and before you
  push**, keep commits small, and if you must change a shared file, say so in
  CONTEXT first. Consider a separate branch for big AGY changes.
- `.sync-glass-rect` on a card = it gets liquid-glass; that class is the ONLY
  hook AGY needs from the WebGL side — don't touch the shader to use it.

### [CLAUDE] Hero Step 2 idea — prototyped, SHELVED for now (2026-07-31)
Explored a companion particle field (separate from the mask) that would morph a
cloud into procedural landmark silhouettes — Kuwait Towers, a generic skyline for
India, the Ypsilanti water tower for Michigan — as a second scrollytelling layer
alongside the mask (mask itself untouched). Built as a **standalone artifact
prototype** (canvas 2D, no site code touched) per the "never build a signature
visual blind" rule — exactly why this is worth noting: the prototype-first
process caught this BEFORE it cost a real build cycle in the actual hero.
- Mechanism worked (roving morph, per-particle arc/stagger, correct sequencing)
  and the Kuwait Towers silhouette in particular read clearly once verified.
- **Melvin's call after seeing it: too ambitious for right now.** Shelved, not
  abandoned — no site code was touched, so there's nothing to revert. If revived
  later, the working prototype exists in this session's scratchpad
  (`landmark-morph-prototype.html`) as a reference for the technique.
- **Current focus instead:** the rest of the hero via lighter-weight pieces —
  beat-to-beat transitions, liquid glass placement, beat copy/content — TBD with
  Melvin which comes next.

**Read `AGENTS.md` first (tool-agnostic entry point), then jump straight to
the `🤝 HANDOFF` section below — it is the current, authoritative state and
supersedes everything else in this file.** Everything above/below that block
is history retained for context, not the live picture. Companion docs:
`PORTFOLIO_VISION.md` (full spec), `site/CLAUDE.md` (build rules), `docs/
concepts.md` (approved visual concepts, reserved per page), `docs/references.md`
(the 4-site study → "The Blend" direction), `docs/artifacts.md` (prototype
index), `docs/particle-mask-technique.md` (the mask's full technique teardown),
`docs/pages/home.md`, `docs/CODEBASE.md` (learning doc — **stale, predates
today's mask/glass work — do not trust it on those topics yet**).

---

## ⚠️ [AGY] SESSION LOG (2026-07-28 ~16:50 EDT) — FAILURE REPORT
**What AGY Failed to Accomplish:**
- **Liquid Glass is completely broken and not showing.** The `LiquidGlassField` was extracted from Home to `GlobalScene.tsx` in an attempt to make it work globally and refract the video, but it is currently invisible/broken on the About page. 
- **Video Background is completely broken and not showing.** Attempted to implement a scrollytelling video background (`about-bg.mp4`) inside WebGL so the glass could refract it. Tried 5 different technical implementations (ScreenQuad, useAspect, viewport scaling, HTML fallback, custom THREE.Texture) and failed. The video is pitching black, failing to load, or choking the browser decoder due to 60fps scroll-scrubbing.

**What Else Was Attempted (UI Polish):**
- Removed "The Past" eyebrow text from `About.tsx`.
- Removed the glass background styling from `Nav.tsx` so it stays transparent on scroll.

**Handoff to Claude (Current State):**
- The site currently has **NO working video background** and **NO working liquid glass** on the About page. Both are fundamentally broken and missing from the screen.
- The next model (Claude) needs to take over the video/glass implementation. Recommended path: decoupling the video scrubbing (e.g., using a pre-rendered image sequence or a non-scrubbing video) and fully repairing the `LiquidGlassField` render pipeline so the glass boxes reappear.

## ✅ [CLAUDE] About video + glass — FIXED 2026-07-28 ~17:25 EDT (dev on :5174)
Both AGY failures are resolved and verified live in-browser (video + glass +
content coexisting on `/about`, no console errors, tsc + oxlint clean).

**Root causes found (by isolation testing in the browser, not guessing):**
1. **Video was scroll-scrubbing** — the old `VideoBackground` set
   `video.currentTime` every frame to scrub the mp4 to scroll position. Seeking
   a 23MB compressed video ~60×/s thrashes the browser decoder → black. Also no
   `!video.seeking` guard, and the plane was under-scaled (`viewport*1.2`) so it
   couldn't fill a plane sitting at z=-1.
2. **Glass painted the whole screen black** — this was the real "broken glass".
   Isolation proved it: glass OFF → video shows; force-output raw `u_bg` → black;
   swap video for a solid-red plane → red IS captured. Conclusion: the glass's
   scene-capture (`gl.render(scene)` → FBO) works for normal meshes but **will
   not sample a `VideoTexture`** in that manual pass (forcing `needsUpdate` every
   frame did NOT fix it — it's not an upload-timing issue). This also explains the
   long-standing "glass looks black/disappointing" history: the capture only ever
   grabbed the CLEAR COLOR, never scene geometry (the old bright-blue test only
   proved it captures the clear colour).

**The fix (architectural — how the original liquid-glass reference works anyway):**
- **Video now just PLAYS** (looping `THREE.VideoTexture`, muted autoplay) instead
  of scrubbing. Rock-solid, still moving behind the glass. Owned by `GlobalScene`
  (`useAboutVideoTexture`) so the SAME texture feeds both the plane and the glass.
- **Glass refracts the video texture DIRECTLY** (bypasses the broken scene
  capture). `LiquidGlassField` now takes an optional `bgTexture` prop; when set it
  blurs + refracts that texture and runs in a new **glass-only alpha mode**
  (`u_glassOnly`) — the quad draws ONLY the card shapes and is transparent
  elsewhere, so the real dimmed video plane shows through and a glass failure can
  never black out the page again. No `bgTexture` → original scene-capture path
  (unchanged, for Home).
- Files: `VideoBackground.tsx` (now exports `VideoPlane`, a pure textured plane),
  `GlobalScene.tsx` (owns the video texture + wiring), `LiquidGlassField.tsx`
  (bgTexture prop + `u_glassOnly` shader mode).

**Update ~17:55 EDT — Melvin's specs applied (verified live):**
- **Scroll-scrub scrollytelling — FORWARD ONLY** (Melvin changed his mind after
  seeing forward+rewind: "make it only move in one direction"). The driving
  progress is now a monotonic ratchet (`maxProgress`) so scrolling down advances
  the video and scrolling back up HOLDS it (no rewind). Implemented in
  `GlobalScene.useAboutVideoTexture`: currentTime driven by `window.scrollY`,
  eased, with a `!video.seeking` guard so it does NOT thrash the decoder (that
  guard is the fix that makes scrubbing viable where the old every-frame lerp
  failed). Confirmed in-browser: scroll up holds the frame, does not rewind.
  - ⚠️ **Scrub feels choppy — accepted, NOT a code bug.** Melvin: "the video is
    weird and the scroll is not working properly… I think it might be an issue
    with how the video was recorded. That's okay we can leave it like that." The
    clip is encoded with sparse keyframes, so seeking to arbitrary times is
    inherently janky. The WIN Melvin cares about is that **video + liquid glass
    now coexist** (AGY's failed job). Full teardown of how/why + the AGY
    post-mortem is written up in `docs/LESSONS.md` §10 (per Melvin's request to
    log it for AGY).
- **Trim** — first 3s and last 3s trimmed (`TRIM=3`, range `[3, dur-3]`); skips the
  intro/play-button frame and the tail.
- **Glass rewritten to the JSON as a clear liquid lens** — the inside-glass branch
  now refracts the SHARP background in the clear centre and blends to the blurred
  copy only at the refracting rim (`blurEdge`), with chromatic dispersion + Fresnel
  rim + directional glare, all from the JSON uniforms. Added `u_refScale` (bend
  knob) and scaled `u_refThickness` 20.79→58 (the JSON value was for 200px editor
  shapes; our DOM cards are ~700px wide so the band must scale up to stay
  proportional to the reference).

**Honest status / still to tune:**
- The glass now clearly reads as a lit glass panel (rim + rounded glass corners +
  edge refraction) but the **refraction drama is limited by the video content**:
  a smoky low-contrast red haze has few hard edges to bend, so refraction shows
  far less than Melvin's high-contrast building reference. This is content, not a
  shader bug. Options open with Melvin: push glare/rim harder for an obvious
  "glass tile" look regardless of content; add a whole-shape magnification; or use
  higher-contrast footage. Do NOT tune further blind — get his direction (LESSONS #1).
- Video brightness/text contrast (`dim=0.55` + Bloom) still a tuning item.

**[CLAUDE] Update ~20:45 EDT — new About footage swapped in (Melvin):**
- Melvin replaced the video. Gotcha: he saved it as `about-pg.mp4` (typo for
  `-bg`), while the code loads `/about-bg.mp4` (which had become a stray 0-byte
  file). Fix = renamed `about-pg.mp4` → `about-bg.mp4` (209 MB); **no code
  change** (path was already correct). Verified live on :5175.
- **The glass now clearly reads as liquid glass.** The new footage is
  high-contrast (astronaut + detailed rocky asteroids in dark space), so the
  refraction + chromatic dispersion are visibly bending hard edges at the card
  boundaries — exactly the "needs edges behind it" point from before. Same shader,
  same JSON, better content. This resolves the "glass looks subtle" concern.
- ⚠️ **209 MB is far too heavy for production** — a real visitor would wait a long
  time and scrubbing buffers slowly. Before ship: compress/transcode (H.264/H.265
  or AV1, target < ~15–25 MB) AND re-encode with DENSE keyframes so the scroll
  scrub is smooth (fixes the earlier choppiness too). Flag for the polish pass.

**[CLAUDE] Update ~21:20 EDT — scroll fixes + video compressed (Melvin: "fix these now"):**
- **Scrub reverted to BIDIRECTIONAL** (Melvin changed his mind again): scroll down
  = forward, scroll up = rewind. Removed the monotonic ratchet; lighter easing
  (0.35) so the video tracks scroll more closely. `GlobalScene.useAboutVideoTexture`.
- **Filler content added to `About.tsx`** so the page is ~3× taller (a "The
  threads" section: Storytelling/Curiosity/Practice/People/Now + closing spacer,
  all placeholder, labelled as such). This gives the video room to scrub end-to-end
  AND shrinks each per-scroll seek (smoother). All new cards use `.sync-glass-rect`.
- **Glass shader fixed for many cards** — it caps at 10 shapes; now it only feeds
  the shader the ON-SCREEN cards (viewport filter in `LiquidGlassField` useFrame),
  so glass rides whichever cards are visible instead of the first 10 in DOM order.
- **✅ VIDEO COMPRESSED (the real lag fix) — Melvin approved installing ffmpeg.**
  - Installed **ffmpeg** via `winget` (Gyan.FFmpeg 8.1.2). Binary at
    `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\ffmpeg-8.1.2-full_build\bin\`.
  - The source was **3840×2160 (4K!)**, 30fps, 20.9s → that's why it was 209 MB.
  - Original backed up OUT of `public/` to `Portfolio/video-source/about-bg-source.mp4`
    (so the 209 MB file is NOT served/deployed). Kept as the master.
  - Transcoded to `public/about-bg.mp4`: **720p, H.264 high, CRF 27, `-g 6` dense
    keyframes (every 6 frames → any scrub lands near a keyframe = fast seeks),
    `+faststart`, audio stripped** → **4.6 MB** (45× smaller). Loads instantly,
    scrubs smoothly. Verified frames via ffmpeg extraction + in-browser pixel probe.
  - Re-encode command is in git history / can be re-run from the source master.
- **Note on the footage:** the clip has genuinely DARK stretches (t≈3-5 opening and
  t≈13-18 are mostly black space; t≈8 is the bright astronaut hero shot). So some
  scroll positions land on near-black frames — that's the content, not a bug. If
  Melvin wants it bright throughout, that's a footage/color-grade choice.
- Debug note: the automation browser window kept COLLAPSING to a sliver (known env
  quirk), which broke the scroll→video math and produced false "all black"
  screenshots mid-debug. Confirmed working once the window held full size.

## ✅ [AGY] SESSION LOG (2026-07-30 ~01:40–11:34 EDT)

**Changes made this session:**

1. **Video scroll-scrubbing restored + smoothed.**
   - A previous agent had ripped out Claude's scroll-scrubbing logic and replaced
     it with a simple `video.play()` loop. Reverted to Claude's exact bidirectional
     scrub implementation (`GlobalScene.tsx → useAboutVideoTexture`).
   - Reduced the smoothing factor from `0.35` → `0.06` for a buttery glide that
     absorbs discrete mouse-wheel clicks instead of jumping.
   - Added `video.preload = 'auto'` + `video.load()` to force Chrome to fetch
     metadata for the detached video element (without this, Chrome suspends loading
     and `duration` stays `NaN`, keeping the scrubber dead on refresh).
   - Switched video source back to the 4.6 MB 720p version (`about-bg-720.mp4`)
     from Claude's original encode — a previous agent had swapped it to a 17 MB
     1080p version that Chrome was aborting (`ERR_ABORTED`).

2. **Git config fixed.**
   - Local repo git config was set to `Melvin / mlvinhere@gmail.com`. Changed to
     `melvinchirag / melvinchirag@gmail.com` to match the GitHub account that owns
     the repo. Future commits now show the correct profile.

3. **Browser tab title updated.**
   - `<title>` in `site/index.html` changed from
     "Melvin — Computer Science, Eastern Michigan University" →
     **"Melvin Chirag Karupati"**.
   - Added `<meta name="description">` tag (replaces the TODO comment).

4. **Vercel 404 on refresh — FIXED (Lesson 11).**
   - The site uses React Router (client-side routing). Refreshing on any route
     except `/` sent a real HTTP request to Vercel, which returned 404 because
     there's no physical file at `/about`, `/work`, etc.
   - Fix: created `site/vercel.json` with an SPA rewrite rule:
     `{ "source": "/(.*)", "destination": "/index.html" }`.
   - **Key gotcha:** `vercel.json` must live inside `site/` (the Vercel Root
     Directory), not at the repo root. The "Skip deployments" toggle also silently
     dropped commits that only changed files outside `site/`.
   - Full post-mortem logged in `docs/LESSONS.md` §11 `[AGY]`.

5. **Lesson 11 logged in `docs/LESSONS.md`** — Vercel SPA refresh 404 debugging,
   tagged `[AGY]`.

**Files changed:**
- `site/src/components/scene/GlobalScene.tsx` — video smoothing + load fix
- `site/index.html` — title + meta description
- `site/vercel.json` — NEW, SPA rewrite rule
- `vercel.json` — repo-root copy (unused but committed)
- `docs/LESSONS.md` — Lesson 11

**Current state:** About page video + liquid glass + scroll scrubbing all
working. Refresh works on all routes (Vercel rewrite). Tab shows
"Melvin Chirag Karupati".

---

## 🔎 [CLAUDE] REVIEW OF AGY'S SESSION (2026-07-30 ~11:45 EDT)
Melvin asked for a read of the repo after AGY's work. Verified state:
`main` (hero-build merged in), working tree clean, **`tsc` + `oxlint` both clean**.

**AGY's work checks out — good session.** Confirmed in the code: my scroll-scrub
fixes all survived intact (`START_TRIM = 0`, `preload`+`load()`, the one-time
`primed` seek, the versioned `about-bg-720.mp4` filename). AGY only retuned the
easing 0.35 → 0.06, restored the scrub after *a third agent* had replaced it with
a `play()` loop, and fixed the Vercel SPA 404 with an honest post-mortem
(`LESSONS.md` §11). About page redesigned (two-column, Henry Ford College split
out from EMU, "The threads", Pac-Man accent — yellow `#FACC15`, not banned teal).

**⚠️ Cruft found (not yet fixed — awaiting Melvin's go-ahead):**
1. **~25 MB of unused video committed & deployed.** `about-bg-1080.mp4` (8 MB)
   and `about-bg-1080-keyframe.mp4` (17.8 MB) are in git and shipped to Vercel,
   but **nothing references them** — only `about-bg-720.mp4` is used.
2. **Duplicate `vercel.json` at the repo root.** AGY's own §11 says the root copy
   is ignored by Vercel (Root Directory is `site/`). Keeping it invites someone
   editing the wrong file later.
3. **Contradictory comment** in `GlobalScene.tsx`: the block comment still says
   "the easing is kept low so the video stays close to the scroll", but the value
   is now 0.06 and the inline comment calls it "heavy smoothing".
4. **Orphaned code/assets:** `SpaceBackdrop.tsx` (+ 5 nebula JPGs in
   `public/space/`), `HeroInfoTabs.tsx`, `GlassFilterDefs.tsx`, `RevealText.tsx`
   are imported by 0 files.
5. **Turquoise still in the mask** (`MaskField.tsx` `#80fff0` / `#b9fff2`) — the
   long-standing flagged exception, still pending the hero decision.

**Also established this session:** the automation browser CANNOT play video at
all (proven with an 11 KB test clip) — see `LESSONS.md` §12. Video must be
eyeballed by Melvin in his own browser; everything else stays verifiable.

---

## 🧹 [CLAUDE] CLEANUP (2026-07-30 ~12:00 EDT) — the 5 items above, done

Melvin approved the cleanup list from the review above. All 5 done, verified
(`tsc` clean, `oxlint` clean, `npm run build` clean, both Home and About checked
live with no console errors), and committed.

1. **Removed ~25 MB of dead video** — `about-bg-1080.mp4` (8 MB) and
   `about-bg-1080-keyframe.mp4` (17.8 MB) were committed and deploying to Vercel
   but nothing referenced them (only `about-bg-720.mp4` is used). Deleted.
2. **Removed the duplicate repo-root `vercel.json`** — AGY's own Lesson 11 says
   Vercel ignores it (Root Directory is `site/`); only `site/vercel.json` matters.
3. **Fixed the contradictory scroll-easing comment** in `GlobalScene.tsx` — it
   still said "kept low" after AGY changed the value to heavy smoothing (0.06).
4. **Removed orphaned files** (0 importers, confirmed by grep before deleting):
   `SpaceBackdrop.tsx`, `HeroInfoTabs.tsx`, `GlassFilterDefs.tsx`,
   `RevealText.tsx`, and the 5 nebula JPGs in `public/space/` they used.
   - This cascaded further than expected: `MaskField.tsx` had a whole **second,
     dead `MaskField()` Canvas-wrapper function** (34 lines) that referenced the
     deleted files and was superseded by `GlobalScene.tsx`'s own Canvas months
     ago but never removed — 0 importers, confirmed before deleting. Its now-
     unused imports (`Canvas`, `EffectComposer`, `Bloom`, `LiquidGlassField`)
     were cleaned up too.
   - `index.css` had a ~160-line dead "LIQUID GLASS TABS" block
     (`.glass-panel`, its rim/glare pseudo-elements, `.reveal-fade`, `.glass-tab`,
     `.glass-tab-dot`) — all 0 usages in any `.tsx` file, confirmed before
     deleting. `.glass-cta` and `.scroll-cue` were checked and ARE still used —
     left alone.
   - Fixed two stale comments left pointing at the deleted files: the
     architecture diagram in `Home.tsx`'s header, and a `HeroInfoTabs` mention in
     `HeroBeats.tsx`.
5. **Turquoise in the mask** — left as-is (still the known, tracked exception
   pending the hero-engine decision — not part of this cleanup's scope).

**Also cleaned up operationally:** 6 stale dev servers (5173–5178) killed, back
to ONE canonical server (now `:5173`), per Lesson 7.

---

## 🎬 [CLAUDE] HERO REBUILD — STEP 1: scroll choreography (2026-07-31)
Melvin chose (from 3 options) the **incremental** path: "The Assembly" — a
particle-morph hero — built up from a motion-only step 1, rather than jumping
straight to a full deep-space engine. (Full concept + the 3 options are in the
chat; short version: mask travels/scales/morphs across beats, some particles peel
off to become the depth-field. Space engine reserved as a possible v2 environment
layer.)

**Step 1 done (this is motion only — no morph yet):**
- `MaskField.tsx` — the mask now **travels a path, scales, and z-rolls as you
  scroll**, driven off `heroScroll.progress` (the read-only contract, so it can't
  desync the GPGPU sim). New `MASK_PATH` keyframes + `samplePath()` (smoothstep
  eased). Applied to BOTH the visible group AND the raycast mesh so cursor
  interaction stays aligned wherever the mask flies to. Drag rotation still
  composes on top. **The path is a deliberate FIRST PASS to tune live with
  Melvin, not a final composition.**
- **NOT done yet (step 2):** the morph/dissolve formations between beats, and the
  peel-off depth-field so the mask isn't on pure black. Step 2's morph will be
  prototyped standalone first (it's a genuinely new effect).

**Bonus fix — self-hosted the DRACO decoder** (`MaskField.tsx`
`setDecoderPath('/draco/')`, files copied from `three/examples` into
`site/public/draco/`). Was loading from the gstatic CDN — a real production
reliability TODO, and it's blocked entirely in the sandboxed automation browser,
which is one reason the mask can't be verified there. Local files fix both.

**⚠️ Could NOT visually verify in the automation browser** (same class as
LESSONS §12): the heavy WebGL scene doesn't initialise here — the R3F canvas is
stuck at the default 300×150 and the window keeps collapsing to ~767×370, so the
mask never builds and `cyborg.glb` is never even fetched. Confirmed instead that
all assets serve (`/models/cyborg.glb`, `/draco/*` all return 206 with correct
content-types) and that `tsc`/`oxlint`/`vite build` are all clean. **Melvin needs
to eyeball the mask motion in his own browser** so we can tune the `MASK_PATH`
feel together — the path values are the one knob.

### [CLAUDE] Step 1 tweaks — Melvin's feedback (2026-07-31, later)
Melvin checked in his browser: motion is "really nice, exactly what you said,"
with tweaks. All in `MaskField.tsx`:
- **Motion felt rigid → added inertia.** New `smoothProg` ref exponentially eases
  toward `heroScroll.progress` (frame-rate-independent, constant 6.0) and the path
  samples from THAT, so the mask glides with its own momentum instead of tracking
  scroll 1:1. Constant is the tuning knob (higher = snappier).
- **Hex removed** — glyphs now cycle **binary ⇄ Telugu only** (2 categories).
  Dropped `HEX`, `HEX_START`, `uHexStart`, and the 3rd cycle branch.
- **Glyphs: localized chunks → scattered 1/5.** Replaced the roving 3-hotspot
  localization (converted ~1/3 in patches) with a **randomly scattered
  `GLYPH_FRACTION = 0.2`** of ALL particles, always visible, spread over the whole
  mask (strided over the sampler's random-order points = even scatter). Removed
  `uHots`/`uHotRadius`/`candidates`/`hotspots`/the roving `useFrame` block and the
  home-texture localization in the glyph vertex shader. `GLYPH_FRACTION` +
  `uGlyphSize` are the knobs.

**Melvin's "brighter/smoother when the window is smaller" observation — explained,
not blindly changed:**
- *Smoother when smaller* = fewer pixels → higher framerate. The inertia fix helps
  regardless; if it's still not buttery at full size it's framerate (the mask is
  ~147k additive points + now ~29k always-on glyphs + bloom).
- *Brighter when smaller* = additive points have a fixed PIXEL size, so on a
  smaller canvas the same points crowd into fewer pixels → more overlap → brighter.
  Expected physics of the technique. A resolution-proportional point size would
  stabilise it, but I did NOT change it blind (can't see the mask in the automation
  browser) — offered it to Melvin as a targeted follow-up he can verify.
- ⚠️ Note: with 20% glyphs always on, there's a lot MORE of the still-turquoise
  `#b9fff2`/`#80fff0` (the tracked banned-colour mask exception) on screen now —
  may finally be worth changing the mask colour; flagged to Melvin.
- ⚠️ Perf: 20% always-on glyphs is ~5× the previous glyph draw. If framerate
  suffers, dial `GLYPH_FRACTION` down. tsc/oxlint/build all clean; NOT visually
  verified here (automation browser can't init the heavy WebGL — Melvin verifies).

### [CLAUDE] Glyph density/brightness fix — Melvin: "too bright, whole mask is chars, not scattered" (2026-07-31)
Diagnosed: the scatter logic was CORRECT (verified — `sampler.sample` gives an
independent random surface point per particle, so strided selection is genuinely
spatially scattered). The problem was pure DENSITY: `GLYPH_FRACTION = 0.2` = ~29k
large additive glyphs, which overlap into a solid, over-bright field that reads as
"the whole mask" and not scattered. Melvin's "1/5" was a perceptual estimate; 1/5
of the total 147k is far more than the old patchy look actually was.
- **`GLYPH_FRACTION` 0.2 → 0.05** (~7.4k glyphs) and **`uGlyphSize` 26 → 20.**
  Both are now clearly-labelled ⚙️ KNOBS in `MaskField.tsx` with a value→look
  guide, so Melvin can dial density/brightness himself without a blind round-trip.
- Brightness note: the pre-glyph mask never drew a brightness complaint, so the
  spike was the glyphs (5× more, always-on, additive+bloom). Count+size cut should
  resolve it. If the BASE mask is still too bright, the levers are the base-dot
  colour/alpha (`#80fff0`), the glyph colour (`#b9fff2`), or Bloom intensity (0.7
  in `GlobalScene.tsx`) — NOT changed blind; for Melvin to point at.

### [CLAUDE] Glyph fix #2 — the 0.05/20 attempt was STILL wrong; Melvin sent a screenshot (2026-07-31)
The previous "cut density + size" attempt (0.05, 20px) still read as "the whole
mask is characters" — confirmed by Melvin's screenshot, not a perceptual
disagreement. **Root cause finally found by comparing against the base layer,
not by guessing again:** base dots render at `uParticleSize: 1.7`px. Glyphs were
at 20px — **12× bigger.** A single 20px glyph's ink footprint covers roughly the
area of ~140 neighbouring base-dot positions. So even selecting only 5% of the
particle COUNT, the glyph layer's total PAINTED AREA came out to **~4× the
entire mask's area** — an oversaturated solid sheet, not a scatter. The fraction
was never really the bug; size² was doing nearly all of it (confirmed the
scatter-selection logic itself IS spatially random — that part was always
correct, re-verified this round).
- **Reframed the knob as AREA, not particle count.** Solved `(GLYPH_FRACTION,
  uGlyphSize)` as a pair whose total footprint (`fraction × (0.6×size)²`) is
  ~1/5 of the mask's estimated visible area, using measurements from Melvin's
  screenshot. **`GLYPH_FRACTION` 0.05 → 0.015, `uGlyphSize` 20 → 7.** Landed
  deliberately a bit UNDER 1/5 (≈1/7) so the correction errs toward "too sparse,
  make bigger" rather than risking a THIRD "too much" round-trip.
- Both constants in `MaskField.tsx` now carry the full derivation + a
  fraction/size table for hitting 1/5 exactly, plus an explicit warning that
  moving them independently (not together) breaks the math.
- **Honest tradeoff flagged, not hidden:** at 7px, Telugu letters (more complex
  strokes than binary digits) may read as a small glowing mark rather than a
  crisp individual character. That's inherent to "1/5 of the AREA, scattered,
  not clumped" — legible-and-big vs. area-accurate-and-small is a real tradeoff,
  not a bug. If legibility wins, raise size and lower fraction to compensate.
- tsc/oxlint/build all clean. **Still NOT visually verified** (same automation-
  browser wall) — this is derived from Melvin's own screenshot's math this time,
  not a fresh guess, but needs a new screenshot to confirm before calling it done.

### [CLAUDE] Glyphs #3 — ROVING + legible letters (Melvin saw it: "1/7, randomly change on different points, bring back Telugu+binary") (2026-07-31)
Melvin confirmed ~1/7 coverage is right, but wanted (a) the glyph set to keep
RELOCATING (different random points over time, not a fixed sprinkle) and (b)
Telugu + binary legible again — at 7px the Telugu letters collapsed to a dot, so
they read as "gone."
- **Roving added** (`glyphVertex`): each candidate has a seed-staggered "life"
  0→1 advancing at `uRoveSpeed`; it's lit only while `life < uOnFrac` (smooth
  fade in/out via a smoothstep window), and re-picks its character (binary ⇄
  Telugu ~50/50) each relight. So glyphs bloom in at random scattered spots, fade,
  and reappear elsewhere. The geometry is now a scattered candidate POOL
  (`GLYPH_POOL_FRACTION = 0.12`); only ~`uOnFrac` of it shows at once.
- **Legibility**: `uGlyphSize` 7 → **15** (Telugu reads as letters again).
- **Coverage rebalanced** to stay ~1/7 despite bigger glyphs: `uOnFrac = 0.02`
  (~0.02 ≈ 1/7, 0.03 ≈ 1/5 at size 15). `uRoveSpeed = 0.1`.
- Knobs consolidated + documented in `MaskField.tsx`: `uGlyphSize` (legibility),
  `uOnFrac` (coverage dial), `uRoveSpeed` (rove speed). Guide inline.
- tsc/oxlint/build clean; NOT visually verified (automation-browser wall) — needs
  Melvin's screenshot to confirm coverage/legibility/rove feel.

### [CLAUDE] Glyphs #4 — rove speed too fast, smoothed (2026-07-31, later)
Melvin: "the glyphs are changing too fast their change needs to be smoother."
`uRoveSpeed` 0.1 → **0.02**. Speed and coverage are decoupled (`uOnFrac` is the
coverage dial, `uRoveSpeed` is separate), so this makes each glyph linger ~1s
with a soft ~0.5s fade in/out and the whole set relocate more slowly, WITHOUT
changing the ~1/7 on-screen coverage. tsc/oxlint clean; not yet re-verified by
Melvin. Commit `0c02d9d` (code only — this CONTEXT entry was written after the
fact; the standing "log immediately" rule was missed in the moment, caught here).

### [CLAUDE] Mask: removed the inner-back "jaw/ghost" shell (2026-07-31)
Melvin dragged the mask to profile and saw a second, detached blob hanging behind
the face — "that jaw piece I want it gone… only face." **Measured the geometry
headlessly before touching anything** (decoded the DRACO GLB with `draco3d` in
node — three's DRACOLoader can't run headless: file:// fetch + Web Workers — and
histogrammed/ASCII-mapped the sampled points; scripts were temp, in scratchpad):
- The model is natively a **straight-on frontal face** (nose = max +Z toward
  camera, symmetric). The two-mass look ONLY appears when turned to profile —
  Melvin confirmed he'd dragged it.
- Root cause: the "Soulless" model is a **hollow shell**. Its inner-back surface
  faces FORWARD, so it sneaks past `FRONT_FACING` (0.12). Side view showed two
  shells in depth: face-front at z≈[-0.03, 0.35], inner-back at z≈[-0.34, -0.19],
  separated by an EMPTY gap at z≈[-0.19, -0.03].
- **Fix:** new `BACK_CLIP = -0.11` constant + `|| p.z < BACK_CLIP` in the sampler
  reject loop — lands the clip in the measured empty gap. Removes the rear shell
  (19.5% of accepted points), keeps the whole face (80.5%, now denser since all
  ~147k particles pack into the face). tsc/oxlint clean.
- Not a guess — derived from the geometry's actual depth gap. **Melvin to verify
  on the deployed site**: drag to profile, confirm the ghost blob is gone and the
  face reads clean. If it ever removed the face instead, the front shell would be
  -Z on this model → flip the inequality (noted inline at `BACK_CLIP`).

### [CLAUDE] Glyph brightness — picked back up, first pass (2026-07-31, later)
Melvin returned to the deferred item: "first do 1 [brightness], then 2 [beat
transitions], then 3 [glass placement]." Checked the math before touching
anything: `vAlpha` already peaks at exactly 1.0 mid-fade (the smoothstep
in/out window in `glyphVertex` is a true 0→1→0 shape), and the atlas glyphs
are drawn opaque white (`ctx.fillStyle = '#ffffff'`, no alpha), so neither
alpha channel was the dimming cause — the colour itself was just not that
bright (`#b9fff2` ≈ RGB(0.73, 1.0, 0.95), already near-white but capped at 1).
- **Fix:** `uColor` for `glyphMat` is now `new THREE.Color('#b9fff2').multiplyScalar(1.5)`
  in `MaskField.tsx` — same hue, values pushed past 1.0. Because the glyph layer
  is `AdditiveBlending` and the scene runs Bloom, overdriving past 1 reads as
  "hotter" without touching the shared Bloom intensity (which would also
  brighten the base dot layer — not what was asked for).
- tsc + oxlint clean. Dev server running on `:5173` for Melvin to verify live
  (automation browser still can't render the WebGL scene — same wall as
  before). **Not yet confirmed by Melvin** — this is a considered first pass,
  not a guess; if 1.5x isn't enough or overshoots, the multiplier is the one
  knob to retune.
- Next in the requested order: (2) beat-to-beat transitions, (3) liquid glass
  placement on the Home hero.

---

# [CLAUDE] PLAYBOOK — Scroll-driven video + liquid glass on a page (replicable)
*Written by Claude, 2026-07-28, at Melvin's request so this exact process can be
re-run (e.g. with AGY) on another page. This is the authoritative "how it was
built"; the dated update notes above are the running trail that led here.*

## The goal, in one line
A page whose **background is a video that plays as you scroll** (scrollytelling),
with **liquid-glass cards floating over it that actually refract the video** —
all inside one WebGL canvas, performant enough to ship.

## The mental model (read this first — it's the whole thing)
There is ONE shared `<Canvas>` for the site (`GlobalScene.tsx`), mounted above the
router so it persists across pages. Inside it, three things stack, back to front:

1. **A video plane** at `z = -1` — the moving background.
2. **The page's DOM** (`z-10`, normal HTML) — headings, the timeline, the cards.
   The cards are nearly transparent (`bg-white/[0.02]`), so you SEE the WebGL
   through them.
3. **A liquid-glass quad** (full-screen, in the canvas) that reads where the DOM
   cards are and draws a refraction of the video *inside those card rectangles*.

The trick that makes glass "sit on" HTML cards: the glass doesn't know about the
cards as objects — every frame it reads the cards' real on-screen positions from
the DOM (`getBoundingClientRect()` of every `.sync-glass-rect`) and feeds those
rectangles to the shader. So the WebGL glass and the HTML card are always locked
together, even as the page scrolls.

## Part 1 — the video, inside WebGL (not a plain <video> behind the page)
It HAS to be a texture in the Three.js scene, because the glass refracts by
sampling a texture — it can't bend a DOM element sitting behind the canvas.
- `GlobalScene.tsx → useAboutVideoTexture(active)` creates a detached
  `<video>` element and wraps it in `THREE.VideoTexture` (colorSpace = sRGB).
  It lives OUTSIDE the canvas (a texture is a plain object) so the SAME texture
  can be handed to both the plane and the glass.
- `VideoBackground.tsx → VideoPlane` renders that texture on a plane at `z=-1`,
  sized with trig to exactly fill the camera frustum at that depth (a plane
  behind the z=0 focus plane must be scaled UP or you get black borders).
- Every frame (`SceneContents` `useFrame`) we set `videoTexture.needsUpdate =
  true` so the GPU copy stays in sync with the playing/seeking video.

## Part 2 — the liquid glass refracting the video (the key integration)
`LiquidGlassField.tsx` is a ported physically-based glass shader (SDF rounded
rects + Snell refraction + RGB dispersion + Fresnel + glare, all driven by
Melvin's exported JSON uniforms). Two changes made it work over the video:

1. **Feed the video texture straight in — do NOT capture the scene.**
   The generic version refracts by rendering the whole 3D scene to an FBO and
   bending that. That capture **cannot sample a `VideoTexture`** (proven by
   isolation — see method below). So the component now takes a `bgTexture` prop:
   when present, it skips the scene capture entirely and uses the video texture
   directly as `u_bg`, blurring that same texture for the frosted-edge copy
   (`u_blurredBg`). This is also how the original liquid-glass reference works —
   it refracts a *background texture*, never a captured 3D scene.
2. **"Glass-only" alpha mode (`u_glassOnly`).** The glass quad is full-screen.
   In this mode it outputs **transparent everywhere except inside the card
   shapes**, so the real (dimmed) video plane shows through untouched and the
   quad only *adds* the refraction on the cards. Consequence: if the glass ever
   breaks, it can't black out the page — worst case the cards just look flat.
- The look: inside each card the shader refracts the SHARP video in the clear
  centre and blends to the blurred copy only at the rim (`blurEdge`), so it reads
  as a clear liquid lens with a frosted, dispersing edge — not a frosted panel.
  Refraction is only visible over content with hard EDGES (why it looked weak
  over the old smoky-red clip and great over the asteroid clip).

## Part 3 — scroll = the video timeline (the scrollytelling)
In `useAboutVideoTexture`, a `requestAnimationFrame` loop maps scroll to time:
```
progress = clamp(window.scrollY / (scrollHeight - innerHeight), 0, 1)   // 0..1
target   = TRIM + progress * (duration - 2*TRIM)                        // trims 3s each end
smooth  += (progress - smooth) * 0.35                                   // light easing
if (!video.seeking && |video.currentTime - target| > 0.033)            // THE GUARD
    video.currentTime = target
```
- **Bidirectional:** scroll down raises `progress` → time goes forward; scroll up
  lowers it → the video rewinds. (A one-direction variant just ratchets `progress`
  with `Math.max` so it never decreases.)
- **`!video.seeking` is load-bearing.** It refuses to issue a new seek until the
  last one finished. Without it, setting `currentTime` ~60×/s piles up seeks and
  thrashes the decoder to BLACK (this was AGY's failure and the earlier bug).
- The video is never `play()`-ed; scroll drives `currentTime`. First/last 3s are
  trimmed so you never see the intro/play-button frame or the tail.

## Part 4 — performance (the difference between "toy" and "shippable")
Scrubbing quality is 90% about the FILE, not the code:
- The source was **4K, 209 MB** → seeks fetched huge byte-ranges → lag + black.
- Re-encode with ffmpeg (installed via winget) to a small, scrub-friendly file:
```
ffmpeg -i source.mp4 -vf "scale=1280:720:flags=lanczos" -c:v libx264 \
  -profile:v high -pix_fmt yuv420p -crf 27 \
  -g 6 -keyint_min 6 -sc_threshold 0 \
  -preset veryfast -movflags +faststart -an  out.mp4
```
  → **4.6 MB (45× smaller).** The knobs that matter for SCRUBBING:
  - `-g 6 -keyint_min 6 -sc_threshold 0` = a keyframe every 6 frames. Seeking
    only has to decode from the nearest keyframe, so any scrub lands fast. (Denser
    = smoother scrub but bigger file. `-g 1` = every frame a keyframe = perfectly
    smooth but large.)
  - `-movflags +faststart` = moves the index to the front so playback can start
    before the whole file downloads.
  - `scale=1280:720` + `-an` (drop audio) = the bulk of the size win.
- Keep the master OUT of `public/` (it would ship). Original is in
  `Portfolio/video-source/`; only the 4.6 MB file is in `public/`.

## The debugging method that actually found the bug (do THIS, not guessing)
When the composited page went fully black, I did NOT keep tweaking the shader.
I **isolated one layer at a time**:
1. Turned the glass OFF → the video appeared → so the glass was the culprit.
2. Forced the shader to output its raw capture → near-black → the *capture* was empty.
3. Swapped the video for a solid-red plane → the capture showed red → capture
   works for normal meshes, but silently NOT for a `VideoTexture`.
That took minutes and pointed straight at "don't capture — feed the texture in."
Guessing ("try another Texture approach") is what cost AGY an afternoon.

## Replication checklist (to do this on another page, e.g. with AGY)
1. Put the target video in the shared Canvas as a `VideoTexture` on a full-frame
   plane; set `needsUpdate` each frame. Own the texture above the canvas so it can
   be shared.
2. Give the glass component the video texture via `bgTexture`; run it in
   `u_glassOnly` mode so it only draws the card shapes.
3. Mark the page's glass cards with `class="sync-glass-rect"` and keep them nearly
   transparent so the WebGL shows through. (Shader holds 10 shapes; it auto-picks
   the on-screen ones.)
4. Drive `video.currentTime` from scroll in a rAF loop WITH the `!video.seeking`
   guard. Trim the ends. Make the page tall enough that the whole video fits the
   scroll (also makes each seek smaller = smoother).
5. Compress the video (ffmpeg command above) — dense keyframes + faststart + 720p.
   This is non-negotiable for smooth scrubbing.
6. Verify by ISOLATING layers, and check on a full-size window (a collapsed
   automation window breaks the scroll math and lies to you).

---

## [CLAUDE] Black first frame on About — root cause found, fix ⚠️ NOT VISUALLY VERIFIED
*2026-07-28 ~21:45 EDT. Melvin: "the first frame is black and dark, that's my
fault… trim the first 2 secs."*

**It was NOT his fault, and trimming was the wrong fix.** Measured rather than
guessed — extracted frames with ffmpeg and used per-frame JPEG size as a
detail/brightness proxy across the first 5s of the clip:

| t (s) | 0 | 0.5 | 1 | 1.5 | 2 | 2.4 | 2.6 | 2.8 | **3.0** | 3.2 | 3.4 | 4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| KB | 37 | 38 | 39 | 45 | 43 | 39 | 37 | 25 | **9** | 41 | 40 | 42 |

- The clip **opens on its best frame** (t=0: the wide astronaut-with-Earth shot).
- There is a ~0.3s dark dip centred on **t≈3.0**, where a foreground asteroid
  wipes across the lens (confirmed visually: t=2.6 and t=3.2 are the same
  continuous camera move, so it is an occlusion, not a scene cut).
- **My `TRIM = 3` (inherited from the previous clip, which needed a play-button
  intro skipped) landed exactly in that dip.** That is what made the page open
  black. Trimming 2s more would have started at t=2.0 and pushed the dark
  occlusion to ~6% scroll — worse.

**Fix applied** (`GlobalScene.tsx`):
- `TRIM` split into `START_TRIM = 0` / `END_TRIM = 3`. The page now opens on the
  hero frame; the tail is still dropped.
- **`video.load()` + `preload='auto'` set before `src`.** Latent bug this exposed:
  the element is detached and never `play()`ed, so with `START_TRIM = 0` the
  target equals `currentTime` (both 0) and the delta check never fires — meaning
  *no seek is ever issued*, and nothing kicks off the fetch. The old `TRIM = 3`
  was accidentally priming the load. `load()` makes it explicit.
- **One-time `primed` seek** in the rAF loop (`target + 0.001`) so a frame is
  guaranteed to decode and upload to the texture even at scroll 0.
- Asset renamed `about-bg.mp4` → **`about-bg-720.mp4`** (this path had served a
  0-byte file, a 209MB 4K cut, and now the 720p encode; versioning the name
  guarantees no stale cached copy). Bump the suffix on any future re-encode.

**⚠️ HONEST STATUS — could not visually confirm.** Midway through debugging, the
automation browser's **media pipeline wedged**: after I created too many probe
`<video>` elements (one probe froze the renderer), Chrome stopped loading video
*anywhere* — `readyState 0` / `duration NaN` in fresh tabs, AND **Chrome's own
native mp4 viewer hung at 0:00** on the raw file URL. Proof it is browser-side,
not the site: the same file returns `206` with a correct `ftyp…moov` header in
4ms via `fetch`, and ffmpeg decodes every frame. **Next session: restart Chrome,
load `/about`, and confirm the first frame is the astronaut-and-Earth shot.**
The frame data above is solid; the code change follows directly from it, but it
has not been seen rendering.

**Lesson (added to the debugging habits):** don't spawn multiple `<video>`
elements pointed at the same large file to probe state — it can exhaust Chrome's
media stack and produce fake "everything is black" results that look exactly like
an app bug. Probe with ONE element, or read frames offline with ffmpeg.

— Claude 🤖 (Opus 4.8)

---

— Claude 🤖 (Opus 4.8), 2026-07-28. Files touched: `GlobalScene.tsx`,
`VideoBackground.tsx` (`VideoPlane`), `LiquidGlassField.tsx` (`bgTexture` +
`u_glassOnly` + `u_refScale`), `About.tsx` (filler + `.sync-glass-rect` cards).
- Architecture note: the single global `<Canvas>` (`GlobalScene`) + About video
  was Melvin's deliberate test, not AGY improvising — he confirmed it. Still
  collides with the doc rule "each page owns its own world / only hero scrolls";
  revisit whether this stays.

## ✅ Working directory issue — RESOLVED 2026-07-24

**Original problem (2026-07-23):** this project's conversation was started
from `C:\Users\mkarupat\Desktop\Manas` (a *different*, unrelated project — the
Manas simulation engine). The portfolio lives in
`C:\Users\mkarupat\Desktop\Portfolio`.

Because the session was anchored to the wrong folder, anything that resolves
paths *relative to the working directory* reached into Manas instead of
Portfolio. Two visible symptoms:

1. Claude Code's internal memory/session files were stored under a path named
   after Manas (`.claude/projects/C--Users-mkarupat-Desktop-Manas/...`) — this
   is hidden bookkeeping, not files in the Manas project folder.
2. **The dev-server preview launched the Manas engine instead of the portfolio.**
   The preview tool searched for a launch config relative to the working
   directory, found Manas's, and started Manas's dev server on port 5199.

**What was NOT affected:** no Manas files were created, modified, or deleted.
Verified via `git status` — the Manas repo sat at the same commit
(`f983504`) with only the pre-existing untracked `galaxy_sim.py`. The Manas dev
server was only *run* (read-only) and was stopped.

**Resolution:** Melvin ended that session and started a fresh one anchored at
`C:\Users\mkarupat\Desktop\Portfolio` (the project root, one level above
`site`). Confirmed working directory now resolves inside the Portfolio
project, not Manas.

**One nuance carried forward:** the new session's root is `Portfolio`, not
`Portfolio\site`. `site/.claude/launch.json` (the dev-server config, port
5173) lives one level down, so a preview/launch tool that only looks for
`.claude/launch.json` in the exact working directory won't find it from the
Portfolio root. Either `cd site` before running `npm run dev` / starting a
preview, or point the preview tool explicitly at `site`. This is a minor
path-depth detail, not a repeat of the original wrong-project bug.

**⚠️ Still true — verify before building further:** as of the last session the
site had *never been visually confirmed by a human*. See "Verification
status" below for exactly what has and hasn't been checked, and why the agent
could not confirm the visual itself.

---

## Who Melvin is

Captured 2026-07-24, in his own framing. This is the raw material for every
page's content — draw from here before inventing anything.

**Studies.** Computer science student at Eastern Michigan University (EMU).
Transferred in Fall 2025 from Henry Ford College. Fall '25 was a hard first
semester at EMU; he is doing markedly better now. Several projects lined up.

**Where he's from.** Raised in Kuwait. Spent his junior and senior years of
high school in India. Then Michigan for university. Three countries — this is
the spine of the About (past) page.

**Leadership, current.** Treasurer, Google Developer Group at EMU · member of
the AI Club · leading finance for EMU's own hackathon. Aiming to become Vice
President of both GDG and the AI Club.

**Interests, in his ordering.** Computer science, AI/ML especially ·
filmmaking & storytelling · astronomy & physics, astrophysics especially ·
neuro-tech (tech + neuroscience) · robotics · aerospace, mostly interstellar
and space travel · mathematics · engineering (general knowledge, not deep).

**Trajectory.** Contributions are concentrated in CS today; he explicitly
plans to expand into the other fields promptly.

**Why this matters to the design:** the breadth *is* the story, and it maps
onto the three-tenses concept almost too neatly.

- **Past** — Kuwait → India → Michigan. A genuine three-act structure, already
  written by his life; the About page doesn't need inventing.
- **Present** — CS/AI, GDG treasurer, AI Club, hackathon finance. Concrete,
  verifiable, recruiter-legible.
- **Future** — the fields he hasn't reached yet: astrophysics, neurotech,
  interstellar travel. The Vision page has real content, not aspirational filler.

One more consequence: **filmmaking and storytelling are stated interests of
his**, which means a cinematic, scroll-directed site is self-expression rather
than decoration. That's the honest defense of this site's whole approach — use
it when the cinematic layer needs justifying.

---

## The project

**Concept: "A life in three tenses."** A personal world organized around time:
who Melvin was, is, and is becoming. A glowing **timeline thread** motif
persists across every page; scroll moves you along it.

**Audience — decided 2026-07-24: ~70% recruiter, 30% personal identity.**
Anyone landing here, recruiter or not, must be able to navigate easily and
find the work. The personality is expressed through *craft* — animation, 3D,
and nuanced eccentricities — never by making a visitor work for the content.
(Earlier drafts of the vision said "not a resume site"; that framing is
superseded. It is a recruiter-navigable site with a strong personal voice.)

**Five pages:**

| Page | Tense | What it holds |
|---|---|---|
| Home | — | Cinematic volumetric hero, identity statement, three chapter portals |
| Journey | Past | Scrollytelling through 6–10 milestone scenes |
| Now | Present | Manas as flagship case study, project cards, 3D skills constellation |
| Ahead | Future | Manifesto that assembles from particle chaos as you scroll |
| Contact | — | Email, socials, resume; thread loops back to Home |

**Tone:** authentic first, cinematic second. Dark theme only, liquid glass UI
(lineage from the Manas shell), real content — no generic "passionate
developer" copy.

**Quality bar:** the Manas raymarched/volumetric work. Explicitly *not* flat
mesh-and-sprite "web art". Custom GLSL for signature scenes.

---

## Decisions made

| Decision | Choice | Notes |
|---|---|---|
| Structure | Multi-page (5 routes) | Chosen over one-page scroll |
| **Audience** | **70% recruiter / 30% identity** | 2026-07-24. Easy navigation for everyone; personality lives in craft, not in friction. Supersedes "not a resume site" |
| **Nav labels** | **Conventional** — Home · About · Work · Vision · Contact | 2026-07-24. A recruiter hunting for projects cannot be expected to guess that "Now" means work. Routes should follow: `/about`, `/work`, `/vision`, `/contact` |
| **Three-tenses concept** | Lives in content, not nav | Carried by each page's eyebrow ("the past" / "the present" / "the future"), the timeline thread, and oversized year numerals on About. `Chapter.tsx` already has an `eyebrow` prop |
| **Résumé placement** | Persistent nav button, styled as the site's one accent use | 2026-07-24. Satisfies the "one accent, used rarely" premium tell *and* gives the top recruiter action the most privileged element on every page. Repeats in the Home footer and on Contact — but nothing else gets the accent |
| **Portrait treatment** | **Triptych** — one face in three regions: neural network / nebulae / cinematic film, dissipating on scroll | 2026-07-24. Explicitly **not** three separate animations and not a blend — three visual languages composing a single face, making "the breadth is the story" literal. Photo feeds a GPU particle system as shader source only. See `docs/pages/home.md` |
| Aesthetic | Dark, scrollytelling + 3D, liquid glass | Melvin's call |
| Visual approach | **Hybrid** | Custom shaders for signature scenes; AI-generated stills only as *shader source material*, never final output; scroll-scrubbed video only for secondary content |
| Stack | Vite + React + TS + Tailwind v4 + R3F + GSAP/Lenis + Vercel | See below |
| Sequencing | Build started before references collected | Melvin said "let's get cracking" — agent over-read this as license to also make aesthetic decisions (palette/type/shader look) that should have waited for references. Infrastructure is real; the look is placeholder — see callout above. |

### Stack — and why (this was questioned twice)

Vite + React + TypeScript · Tailwind CSS v4 · Three.js via React Three Fiber +
drei · custom GLSL · GSAP ScrollTrigger + Lenis · React Router · Vercel.

Melvin was unsure these were the right tools. What settled it: **three
independent sources converged on React + Vite + TypeScript** (Promptible's
Replit guide, Janus Tiu's cinematic guide, and our own reasoning), **two added
Tailwind**, and Promptible independently picked **Lenis**. It's also the
toolkit behind most award-tier interactive sites (Awwwards SOTD work, studios
like Active Theory/Resn). R3F is Three.js, not a different engine.

**GSAP ScrollTrigger chosen over Framer Motion** (which Promptible used):
Framer Motion is better at component enter/exit; ScrollTrigger is better at
scroll-scrubbed timelines pinned to sections — the core mechanic of Journey
and Ahead. Framer Motion can be added later for UI micro-interactions.

---

## Resources reviewed (5 total)

Melvin supplied Instagram-sourced guides. All were read in full and distilled
into `PORTFOLIO_VISION.md` Part 3. Summary of what was taken:

**Process rules adopted:**
- **Reference before build** — 5–8 curated references, each with a named job
  (mood / brand system / hero hook / structure / micro-detail). Skipping this
  is why AI-built sites look generic. *(Luke's PDF)*
- **Three rounds, not one prompt** — structure → motion → polish. *(Luke)*
- **Screenshot self-correction loop** — screenshot result, compare to
  reference, list differences, fix, repeat. *(Cindy Zhu)*
- **Show, don't describe** — feed real reference images/sites, not adjectives.
  *(Promptible)*
- **Import solved problems** — remix components from registries like 21st.dev,
  restyled to our system, never pasted as-is. *(Luke)*
- **Project CLAUDE.md** — encode art direction so every session starts
  opinionated. *(Luke)* — **done**, at `site/CLAUDE.md`.

**Techniques adopted:**
- Scroll-scrubbed video with the `!video.seeking` guard — prevents black frames
  and stutter. *(Promptible)*
- Lenis config: duration 1.2, exponential-decay easing, desktop only.
  *(Promptible)* — **implemented** in `src/hooks/useLenis.ts`.
- Progressive blur edge instead of a flat dark overlay. *(Promptible)* —
  **implemented** in `index.css`.
- Z-layer discipline: scene z-1 < content z-10 < blur z-30 < nav z-50.
  *(Promptible)* — **implemented**.
- `.liquid-glass` CSS recipe (blur + inset highlight + gradient-mask border).
  *(Janus Tiu)* — **implemented** and extended in `index.css`.
- Frame-sequence WebP scrub as the **no-WebGL/mobile fallback** so weak devices
  get a pre-rendered version of the *same* scene, never a blank div.
  *(Castimedia)* — planned, not built.

**"Premium tells" checklist** (the 50ms test — use in every design review):
generous space · one accent used rarely · one type family, few weights · one
focal point per screen · one ask per page. *(Luke)*

**Deliberately NOT adopted:** the tool stacks these guides push — Replit,
Google Antigravity, Higgsfield/Kling subscriptions. Their value was technique
and process, not toolchain.

---

## ⚠️ Current visual choices are PLACEHOLDER — not decisions

The scaffold below includes real code for routing, glass-CSS mechanics, and
scroll wiring — that part is legitimate infrastructure. But the *look* it
currently has was written by the agent before Melvin's reference folder
existed, which skips the process this whole project is built around (see
"Reference before build" below). Specifically placeholder, not chosen:

- **Palette**: ember `#ff6b35` → violet `#8b5cf6`
- **Typography**: Instrument Serif + Inter
- **Shader concept**: the drifting fBm volumetric field + glowing "thread" look
  in `SceneCanvas.tsx`

**How this gets resolved:** no separate rework phase, no ceremony — Melvin is
building the reference folder now, and as references come in, the palette,
type, and shader concept get replaced iteratively in normal course, the same
way any other feature would change. Don't treat the current look as a baseline
to preserve or protect. Don't cite "it's already built this way" as a reason to
keep something once real references arrive.

---

## Current state — 2026-07-27. Nebula CUT and parked. Hero direction reset to abstract/editorial.

**This section supersedes everything below it, including the 2026-07-26 nebula
section, which is now history.**

### ❌ The real-nebula hero was rejected — wrong *signal*, not bad craft (2026-07-27)

Melvin's words: the nebula hero *"looks like it was made for someone in
Astronomy. I'm a CS major and recruiters need to know that when they open the
website."* The build quality was fine and he liked it; it was cut because it
points the whole site at one field — the wrong one.

**The fix is NOT the opposite cliché.** Explicitly: *"That doesn't mean we need
neural nets or binary instead of nebulae."* The Hero should take an **abstract,
editorial, "insane" direction that does NOT point at any single field.** The
breadth is the story; the hero shouldn't collapse it to "space guy" or "AI guy."

**What was done:**
- `NebulaField.tsx`, `SunCursor.tsx`, and `public/nebula/*` (5 images) were
  **MOVED to `Portfolio/parked/hero-nebula/`** (outside `site`, so not built /
  linted / served). **Parked, NOT deleted** — Melvin: *"keep it safe so we can
  use it later if needed."* Revival steps are in that folder's `README.md`.
- `Home.tsx` hero background is now empty (name on black); `App.tsx` no longer
  mounts `SunCursor` (native cursor returns). Dormant `html.has-sun-cursor` CSS
  left in `index.css` — reactivates automatically if SunCursor is revived.
- Verified: `tsc --noEmit` clean, `oxlint` exit 0.

### 🧭 Site structure — Melvin's restatement (2026-07-27), build toward this

- **Hero** — scrollytelling. Either **one single epic video**, OR
  **editorial-style scrollytelling where the theme/elements change as you move
  through the hero's internal "tabs"/sections** (divide the hero smartly). The
  abstract/editorial concept above lives here.
- **About / Work / Vision / Contact** — each gets its **own distinct concept**
  (one per page), not the hero's concept repeated.
- **Résumé** — a *completely different* treatment. Open task: *"think of the
  coolest way to display my resume."*

### 🔁 LLM-independence (2026-07-27) — repo is now the source of truth, not any AI

Melvin will delegate across tools (Antigravity, Gemini, Perplexity, ChatGPT,
Claude) to survive session limits + credit caps. New files support this:
- **`AGENTS.md`** (root) — tool-agnostic entry point every AI reads first.
- **`docs/LLM-INDEPENDENCE.md`** — the full workflow: file roles, per-tool
  playbook, a copy-paste primer for chat tools, and the session-close ritual.
- **`GEMINI.md`** (root) — thin pointer to `AGENTS.md` + `CONTEXT.md`.
- **✅ DONE (2026-07-27):** project is now a git repo, pushed to the **private**
  repo **https://github.com/melvinchirag/Portfolio** (`main` branch, remote
  `origin`). `node_modules` etc. gitignored. Tools can now clone the full
  context; edits can be rolled back. Commit after meaningful changes — the log
  is a second decision trail. (`gh` CLI is NOT installed; repo was created in
  the browser. Note the repo name is capitalized `Portfolio`.)

**Root `README.md` = the "master key"** (added 2026-07-27): a living,
learning-optimized, rebuild-from-scratch doc of every tool/framework and what
each part of the site is made with. Update README §3/§6 whenever a feature lands;
**finalize (resolve all 🚧) as the closing step of the project.** Rule in
`AGENTS.md` §5b. `docs/references.md` now compartmentalizes refs by difference;
`docs/artifacts.md` indexes every prototype.

Working rule reinforced: **end every session by updating this top section**
(what changed / what's next / what's blocked) — that's what keeps any tool able
to continue.

### ✅ DIRECTION LOCKED (2026-07-27) — "The Blend" (A × B)

After deconstructing Melvin's 4 reference sites (see `docs/references.md`), they
split into two camps: **A · WebGL craft** (enzo-casalini.dev, lukebaffait.fr —
custom React+Three.js+GLSL+GSAP, Awwwards-tier) and **B · Editorial brand**
(noth.in, cinetica.studio — Webflow, bold type + brand voice + live details).

**Key finding:** enzo-casalini.dev is an Awwwards nominee built on **our exact
stack** (React + R3F + Three.js + GLSL + GSAP). The ceiling is reachable.

**Locked direction = The Blend:** an **editorial brand skeleton** (Camp B —
terse voice, corner metadata, bracket/paren labels, a live system detail, glitch
type) with **ONE signature WebGL abstract-motion centerpiece** (Camp A). Roughly
60% editorial / 40% WebGL. Chosen over WebGL-forward to concentrate all shader
risk into a single controllable place — full-WebGL means 5× the perf budgets,
fallbacks, silent-blank-page failures, and is the hardest thing to delegate to
other LLMs (the independence plan). Melvin's condition: best output for the
resources we have. Ceiling stays high; floor rises a lot.

**Sequencing (risk-ordered, matches structure→motion→polish):**
1. **Editorial hero shell first** — layout, type system, brand voice, corner
   metadata, bracket labels, live clock, (optional) glitch text. Cheap,
   deterministic, verifiable, delegable. Built as a standalone prototype with a
   reserved empty SLOT where the WebGL centerpiece will go.
2. **The one WebGL centerpiece** — designed/prototyped standalone, then dropped
   into the slot once approved. Concept TBD (candidates: refine "The Current";
   the reserved ink-fluid is earmarked elsewhere).
3. Only then wire into `site/`. Do NOT build hero sections 2–5 until Melvin says.

### ✅ HERO MASK BUILT (2026-07-27) — our own GPGPU particle mask, on branch `hero-build`

The hero centerpiece is real and working in the site (`site/src/components/scene/
MaskField.tsx`). Decision history: rejected photo-to-particles (a 2D photo can't
be a 3D sci-fi mask); studied the Codrops "Dreamy Particles" engine in full
(`docs/particle-mask-technique.md`); **rebuilt the technique from scratch** with
only MIT libs + our own shaders (NOT their code). What's done:
- GPGPU particle sim (GPUComputationRenderer + MeshSurfaceSampler + three-mesh-bvh,
  all MIT) on the **cyborg "Soulless" model** (CC BY 4.0 — MUST credit Ali Rahimi).
- **Fixed on the LEFT** (name goes centre), front-facing, no orbit; cursor still
  disturbs the particles (spring-back + repel).
- **De-crowned** — front-facing + height-clip leaves just the face.
- **"Make it ours" glyph layer (Melvin's idea):** ~5200 particles render as
  **binary + hexadecimal + TELUGU letters** (his heritage), reshuffling ~35%
  every 5s. Confirmed rendering.
- teal `#80fff0`, additive, UnrealBloom. Manual DRACO loader (self-hosted decoder
  path via gstatic) — NOT drei useGLTF (which hung after cache clears).

Update (later 2026-07-27): the glyph layer was refined per Melvin — **not the
whole mask**; only **localized roving patches** show glyphs now (3 "hotspots"
that hop to random face locations every ~2.2s), and each glyph **cycles
binary → Telugu → hex** over time (shader-driven). **Drag anywhere to spin the
mask 360°** was added (rotates the group + raycast mesh; mask stays on the left).
Bloom softened to tame an over-exposed white blob at the chin.

---

## 🚫 HARD BAN — TURQUOISE / TEAL / CYAN (set 2026-07-28 ~12:20 EDT)
Melvin, verbatim: **"I'm officially banning the use of turquoise. Never under
any circumstances use turquoise for any of the font. It is banned."** He finds
it cliché and hates it. This applies to ALL fonts and UI chrome, site-wide, on
every page, forever unless he personally lifts it. The old accent `#80fff0`
(and relatives `#b9fff2`, `rgba(128,255,240,…)`, `#eafffb`) have been purged
from nav, name, beat rail, clock, glass-tab CSS. **Do not reintroduce any
turquoise/teal/cyan accent.** When an accent colour is needed, pick something
else and confirm with Melvin — do NOT default back to teal.
- ⚠️ **Still teal, flagged:** the MASK particles are `#80fff0`/`#b9fff2`
  (`MaskField.tsx`). Left as-is only because the mask's whole future is under
  review (see replan below). If the mask survives, its colour MUST change off
  teal too.

## 📏 STANDING RULE (set 2026-07-28 ~11:32 EDT) — log every change, immediately
Melvin: **every change from now on gets logged to `CONTEXT.md` right after it
happens** — not batched at session end. `CONTEXT.md` remains the single log;
no separate logging doc. If you make a change and the session ends before you
log it, that's the failure mode this rule exists to prevent — log AS YOU GO.

### 🔬 GLASS DIAGNOSIS — CONFIRMED with a live test (2026-07-28 ~11:30 EDT)
Melvin: "the glass isn't the way it needs to be." Investigated properly instead
of guessing:
- **Read the actual shader body** (`LiquidGlassField.tsx`) line by line —
  confirmed the refraction/dispersion/Fresnel/glare math is real and correctly
  wired (not a stub).
- **Found a concrete bug:** the drop-shadow pass (`outColor.rgb -= dShadow`)
  darkens pixels *toward black* to fake a shadow — but the scene background is
  already `#050609` (near-black). You cannot visibly darken something that's
  already black. This part of the effect is currently mathematically inert,
  not just "weak." Not fixed yet — fixing it has no visible effect until there
  is non-black content for the shadow to fall on, so it's parked with the
  background work, not a standalone fix.
- **Ran a live, reversible test** to settle the "is it the shader or the scene"
  question for real: temporarily swapped `MaskField.tsx`'s scene clear colour
  from `#050609` to a bright test blue (`#3d6fb8`), screenshotted the glass
  panel, then reverted (confirmed clean revert via `git diff` + `tsc`).
  **Result: with real contrast behind it, the glass genuinely looks like real
  liquid glass** — visible blur, a soft rim highlight, a glare streak. This is
  no longer a hypothesis — **the shader works. The scene has nothing to show
  through it.** Confirms and upgrades the earlier "KEY DIAGNOSIS" section
  above from theory to verified fact.
- **Conclusion or anyone touching glass next:** do not keep tuning shader
  uniforms. The fix is the deep-space background (📋 item 7). Build that, then
  judge the glass against it — most of the "disappointing" complaint should
  resolve on its own once there's something to refract.

### 🎬 TRANSITION QUALITY — assessed, confirmed weak (2026-07-28 ~11:32 EDT)
Melvin asked about beat-to-beat transition quality. Watched it scroll live:
**currently just a 700ms CSS opacity cross-fade** (`HeroBeats.tsx`, the
`transition-opacity duration-700` classes) — content fades in/out in place.
No movement, no parallax, no stagger between individual elements (eyebrow/
heading/body all fade as one block), and the mask itself does not react to
which beat is active — it just sits there running its own idle physics
regardless of scroll position. This was always known to be skeleton-only (see
"SCROLLYTELLING SKELETON" below — beats 2-5 are explicit placeholders), but
worth being honest: even beat 1's real content transitions plainly. **Not yet
fixed — needs a real decision on transition language** (this is exactly the
kind of thing PROMPT.md's rule #1 warns about: don't guess a transition style
and build it blind — get a reference or a described target first).

### 🗒️ NEW FEEDBACK BATCH — Melvin, 2026-07-28 ~12:00 EDT (verbatim list)
Given after reviewing the deep-space build. **Important context: Melvin said
"there's no changes made, it looks the same" — because SIX stale dev servers
were running (5173-5178) and he was on an old one. Killed 5173-5177; ONLY
`:5178` is canonical now.** His actual list (working through step by step):

- **A. Glass info tabs (bottom-right NOW/BUILDING/WINS/BEYOND) → REMOVE.**
  Verbatim: "it's absolutely ugly, it should be gone." So `HeroInfoTabs` comes
  OUT of the hero. (The `LiquidGlassField` shader can stay in the tree but is
  then inert — no `.sync-glass-rect` elements to render — note perf below.)
- **B. Clock → a full-height right-edge RAIL.** Not inline text (never was
  built as item 3). Spec: a vertical strip pinned to the right edge of the
  screen, **full viewport height**, ~1 inch (~72-96px) wide, containing just
  the clock. Aesthetic choice. Sticky across scroll.
- **C. Beat rail labels → hidden by default, show on HOVER only.** The 5 dots +
  connecting line stay visible (they trace scroll progress), but the text
  labels (Identity/Past/Present/Future/Invitation) must NOT show at rest —
  only when the cursor hovers a given dot does that dot's label appear.
- **D. Name — STILL WRONG, must actually change this time.**
  - Nav logo (top-LEFT): "Melvin" → **"Melvin Chirag"**.
  - Hero name (📋 item 4): the top-RIGHT lockup **"Melvin Chirag"** (Chirag in
    accent colour) with **"Karupati"** smaller below. Currently the hero still
    shows a centred "Melvin" only — item 4 was logged but never built.
- **E. Mask vertical alignment — sits too low, move it UP** a bit (toward the
  top). Tune `OFFSET.y` in `MaskField.tsx` (currently y=0; +y = up).
- **F. Ears + crown STILL THERE — not actually removed.** Verbatim: "when I
  told you to remove the crown and the ears, you just decreased the density,
  but they're not actually gone." Correct — the current front-facing + yCap
  rejection-sampling leaks ear/crown points (tries<10 fallback accepts a bad
  sample). **Real fix = build a pre-filtered face-only sub-geometry and sample
  from THAT (no rejection).** Melvin said he'll "pinpoint and show properly
  later" — so DEFER the precise geometry work, but it's a real bug, not done.
- Melvin is also still "suspicious about the scrollytelling aspect" generally —
  expect more direction there.

**DONE this session (verified live on :5178, tsc+oxlint clean, no console
errors):**
- A ✅ `HeroInfoTabs` removed from the hero (`HeroBeats.tsx`). NOTE:
  `HeroInfoTabs.tsx` is now an **orphaned file** (no importers) — left on disk,
  not deleted, in case glass content is reintroduced. `LiquidGlassField`
  `useFrame` now **early-returns when there are 0 `.sync-glass-rect` elements**
  (hides the quad + skips the scene-capture + 2 blur passes) so it costs
  nothing while inert. It stays mounted, ready if glass returns.
- B ✅ `HeroClockRail.tsx` — new full-height right-edge clock strip (rotated
  time, "Michigan"/"EDT" labels, fixed, desktop-only). Rendered from
  `HeroBeats`. The old inline `LocalTime` in beat 1 was removed (was redundant).
- C ✅ Beat-rail labels now hover-only (`group` + `group-hover:opacity-100`),
  dots + progress line stay visible.
- D ✅ Nav logo → "Melvin **Chirag**" (Chirag in `#80fff0`). Hero name → a
  top-right lockup: "Melvin **Chirag**" big + "Karupati" smaller below +
  tagline. Uses plain styled spans (dropped `RevealText` here — it can't do the
  two-tone name; `RevealText.tsx` still exists for future use).
- E ✅ `OFFSET.y` 0 → **0.4** — mask raised.
- F ⏳ DEFERRED (ears/crown) — Melvin will pinpoint.

**Open observations from the live check (for next session / Melvin):**
- The raised mask now OVERLAPS the left beat-rail dots. Rail renders on top
  (z-20 > canvas z-0) so it's not hidden, but they're visually close — may want
  to reposition the rail or the mask.
- Nebula brightness varies a lot per image (rotation): the darker teal ones sit
  back nicely at `DIM=0.06`; the brighter Carina/orange one reads more
  prominent. May want per-image dimming, or curate the set.

### 🌌 DEEP-SPACE BACKGROUND — BUILT 2026-07-28 ~11:47 EDT (📋 item 7)
Built same session as the glass diagnosis above, directly acting on it. Melvin
also connected this to the transitions complaint: **"true scrollytelling…
there needs to be that moving effect"** — the background's own motion IS
meant to carry scroll motion, not just content cross-fading. Considered and
declined generating a video for this (no video-gen tool in this environment;
the parked real astrophotography is proven, zero-cost, and already licensed —
video remains a valid v2 upgrade if the photo fidelity isn't enough once seen).

**What's built** — `site/src/components/scene/SpaceBackdrop.tsx`:
- Reuses the 5 real NASA/ESA/ESO nebula photos parked in
  `parked/hero-nebula/nebula/` — **copied** (not moved) to
  `site/public/space/`, so the parked originals stay untouched as history.
  Rotates one per page load via `localStorage['melvin:space-index']` (separate
  key from the old parked version's, so they don't collide if that ever
  revives too).
- **Architectural constraint that matters:** this had to be real WebGL geometry
  *inside the same `<Canvas>`* as the mask, not a DOM/CSS layer behind it —
  `LiquidGlassField` captures its background by rendering the Three.js scene to
  a texture, so it can only refract things that are actually IN that scene.
  Drawn FIRST in the JSX (before `<MaskParticles/>`) so it sits behind the mask
  in the (depth-test-disabled) particle draw order.
- **Two layered motions**, both cheap/read-only: (1) a constant slow "Ken
  Burns" pan/zoom via `useFrame` + `Math.sin/cos`, and (2) a **scroll-linked**
  zoom/pan that reads `heroScroll.progress` (the existing one-way contract —
  zero risk added to the mask/scroll system) so scrolling through the beats
  feels like drifting further into the nebula. Rendered on an oversized
  (70×70 unit) plane so panning never reveals an edge.
- **Dimming — tuned live, not guessed once and left:** first attempt at
  `DIM = 0.28` was tested in-browser and was **way too bright** — the nebula
  filled the whole screen near full-strength and fought the mask hard (ACES
  tonemapping + the Bloom pass both push midtones up more than a flat colour
  multiply suggests). Dropped to **`DIM = 0.06`**, re-tested, confirmed
  tasteful — atmospheric colour/depth without competing with the mask. If it
  ever needs adjusting again, that constant is the one knob.
- On-screen CC BY credit line (bottom-left, `MaskField.tsx`) — required for 3
  of the 5 images (orion/eagle/lagoon), rendered unconditionally for
  simplicity. Confirmed rendering in browser.
- **Verified live in browser (not just tsc):** mask + nebula + glass all
  visible together, glass panel now shows a real warm rim highlight and subtle
  refracted colour (previously flat/black) — **this is the live proof that the
  earlier glass diagnosis was correct**, not just a plausible theory. No
  console errors. `tsc`/`oxlint` clean.
- **Not yet done:** meteor showers and the satellite (rest of 📋 item 7's
  spec) — deliberately deferred to keep this slice testable; the core
  mechanism (real photo + layered motion + glass-visible) is proven first.
  Add those next as a follow-up, not a rebuild.
- `parked/hero-nebula/README.md` updated to note the photos were reused (not
  revived) for this different, more restrained concept.

## 🛑 STOP-AND-REPLAN — Melvin very unhappy, 2026-07-28 ~12:20 EDT
Melvin reviewed the deep-space + name-lockup build and strongly disliked it
("absolutely disgusting", "horrible", "vibe coded", "really disappointed").
Called for a full stop and replan. **Done immediately (this session, verified
live, committed):** removed the static nebula → black; font → Times New Roman
(placeholder); name lockup → CENTRED (was wrongly top-right); ALL turquoise
purged from fonts/UI (now hard-banned, see above); mask vertically centred
(y=0 — he meant "sitting too low, centre it", NOT "move to the top", which is
what the previous +0.4 did). Clock rail kept per his request.

**Known issue created by centring the name:** the centred "Melvin Chirag"
overlaps the left-positioned mask. This is the direct tension between "name in
the centre" + "mask on the left" — NOT resolved, because it's entangled with
the unresolved question of whether the mask stays at all (below). Don't
band-aid the layout until that's decided.

### The strategic questions Melvin raised (NEEDS HIS DECISION — do not build blind)
1. **The static-image nebula was fundamentally wrong.** It "looks like a static
   image." What he actually wants (his words): a **real deep-space WebGL
   environment like the one built for the Manas project** — a 3D deep-space
   simulation with stars, floating nebulae, planets, depth — so the mask looks
   like it's genuinely *in* deep space. Not a photo. He said the Manas repo is
   in a local directory and to browse it. (Manas lives at
   `C:\Users\mkarupat\Desktop\Manas` per this file's top section.)
2. **"That's not scrollytelling."** Zoom-into-a-photo ≠ scrollytelling. His
   definition: as you scroll, **the whole background/scene moves and interacts —
   a full living scene**, not content fading over a static image. He notes this
   needs real animation. (True scrollytelling = the scene itself is animated and
   scroll-driven.)
3. **The mask might be CUT.** He's seriously considering removing the particle
   mask entirely: *"unless you can promise me you can create a real deep space
   environment for the mask to exist, we should not move forward with it."* He
   floated that **a video / animation for the hero might be better** than the
   current mask. → OPEN DECISION: keep the mask (only if a real deep-space env
   is delivered) vs. drop it for a video/animation hero.
4. **Glass was NOT ignored — he still wants it, done RIGHT.** He's frustrated
   that removing the info tabs removed the only glass surface, and that the real
   WebGL glass (matching his JSON export + the reference screenshot) isn't
   visible. The liquid-glass UI is still a firm requirement — it needs a proper
   home/surface in the hero, built to his spec. (The `LiquidGlassField` shader
   IS built and correct — see earlier logs — it just has no shapes to render
   now. Reintroduce a tasteful glass surface, not the old ugly tabs.)
5. **Future idea (About or Vision page, NOT the hero):** a deep-space scene with
   **50-60 small masks**, properly positioned, colours synced to a chosen
   palette that varies by screen position (e.g. red low, white high, gold mid) —
   a coordinated field, not one mask. Noted for later; do not build now.

### ✅ DECISIONS from the replan (2026-07-28 ~12:35 EDT)
- **Hero = three.js/R3F procedural deep-space ENGINE, not video.** Rationale:
  for scrollytelling a live scroll-driven 3D scene beats scrubbing a video; it's
  lightweight, interactive, and reads as "his own engineering" (shock-and-awe).
  **Confirmed achievable** — studied the Manas repo (`C:\Users\mkarupat\Desktop\
  Manas`): pure three.js v0.178, fully procedural (deterministic starfield via a
  point-shader, soft nebula gradient-blobs on canvas, procedural planet textures,
  UnrealBloom). Same engine family as our R3F. So the promise is grounded, not
  hopeful. The engine will be STYLISED (like Manas), not photoreal — that ceiling
  is real and Melvin's own reference is stylised, so it matches.
- **The mask stays** (its survival was conditional on a real deep-space env; that
  condition is now met). Mask + engine could ALSO anchor About/Vision later.
- **Workflow split (Melvin's plan, adopted):** FOUNDATIONS (page content,
  structure, plain UI, planning) → Melvin + Antigravity/cheaper tools; PIZZAZZ
  (deep-space engine, mask, scrollytelling motion, real liquid glass, shaders) →
  strongest model (Claude) in focused sessions. Foundations first, then pizzazz.
- **New docs created this session for the handoff:** `docs/LESSONS.md` (honest
  retrospective of every mistake + what to do better — Melvin explicitly asked
  for this) and `docs/PAGE-PLAN.md` (all 5 pages' structure + drafted content +
  the foundations-vs-pizzazz fidelity boundary AGY must respect). Both added to
  the `AGENTS.md` read-list.
- Deep-space engine itself = NOT started (deliberately — it's Claude/pizzazz
  work for a fresh-credit session; this session set up the foundations handoff).

**Recommended replan stance (for the assistant): do NOT keep iterating on the
current single-mask-on-black hero.** The honest fork is (a) commit to building
a real animated deep-space WebGL environment (feasible as a STYLISED scene —
procedural starfield + depth + parallax + volumetric-ish clouds + planets +
scroll-driven camera; NOT photoreal, that ceiling is real and known), then the
mask can live in it; or (b) pivot the hero to a video/animation. This is
Melvin's call — present both honestly with the Manas repo as evidence of what's
achievable. Study `Manas` before promising anything.

## 🤝 HANDOFF — continue here with any AI (state as of 2026-07-28 ~11:19 EDT)

**Read `AGENTS.md` then this file. Work is on git branch `hero-build`
(not merged to main, but pushed to origin).** Everything below is the live
picture — the sections further down this file (nebula, old loader rounds,
face-triptych) are HISTORY, already superseded, kept only for the reasoning
trail. Melvin is switching AI tools soon (session-limit reasons) — this block
exists so a new tool can pick up with zero re-explanation.

### How to run + SEE it (important gotchas — read before touching code)
```bash
cd site && npm run dev          # opens on :5176 (or next free port)
npx tsc --noEmit && npx oxlint  # must both be clean before committing
```
- **After editing, open a FRESH browser tab** on the localhost URL. Vite HMR
  gets *poisoned* if a component throws mid-edit → black screen that persists in
  that tab; a brand-new tab loads clean. If black persists everywhere: stop the
  dev server, `rm -rf site/node_modules/.vite`, restart, new tab.
- The model + shaders take longer than you'd think to build (GPU sampling +
  DRACO decode) — **wait ~10–15s before judging a "blank" load.**
- Neural-net loader plays ~5s once per tab session before the hero.
- **Browser-window-collapses-tiny is a known environment quirk** (not a code
  bug) — if screenshots come back ~150–400px tall, try `resize_window` a couple
  times (it's flaky, sometimes takes 2-3 tries) or just trust `tsc`/console
  + ask Melvin to eyeball full-size.

### What's built and WORKING right now on Home (`/`)
Full pipeline: `App.tsx` mounts `<Nav/>` + `<Loader/>`; `Home.tsx` is now a
**5-beat scroll track** (see "SCROLLYTELLING SKELETON" below) whose beat 1
renders `<MaskField/>` (background, persists across all beats) + centred name/
tagline + `<HeroInfoTabs/>` (right side, glass). `GlassFilterDefs` is **no
longer mounted** — see item 3 below, its approach was superseded.

1. **The GPGPU particle mask** — `site/src/components/scene/MaskField.tsx`.
   Our own clean-room build (MIT libs: GPUComputationRenderer, MeshSurfaceSampler,
   three-mesh-bvh; NOT the Codrops repo's code — see `docs/particle-mask-
   technique.md` for the full study). Cyborg "Soulless" model, CC BY 4.0.
   - **Fixed on the LEFT** of the screen (`OFFSET = (-0.62,0,0)`), de-crowned to
     just the face (`FRONT_FACING` normal-facing filter + `yCap` height clip).
   - **Drag anywhere to rotate 360°** (added this session — was missing before).
   - **Glyph layer, Melvin's idea, refined this session:** NOT the whole mask —
     **3 roving hotspot patches** (`N_HOTSPOTS`, hop to a new random face point
     every 2.2s) show particles as glyphs that **cycle binary → Telugu → hex**
     over time (all in the `glyphVertex`/`glyphFragment` shaders). Rest of the
     face is plain dots.
   - Known minor remnant: a small disconnected glyph cluster sometimes appears
     near the ear/side (leftover geometry past the face clip) — cosmetic, not
     urgent, same root cause as the "push density up via pre-filtered mesh"
     TODO below (a proper pre-filtered sub-geometry fixes both at once).
   - Tunable knobs: `SIZE` (384, ~147k particles — raising freezes mount via
     rejection-sampling cost; fix = pre-filter mesh first, then sample without
     rejection, lets you go 512–768+), glyph colour `#b9fff2`, base dots
     `#80fff0`, `uForce` 0.72, Bloom intensity 0.7 (lowered this session — was
     blowing out to a white blob at the chin).
   - DRACO decoder loads from gstatic CDN — **self-host before production**
     (offline/reliability).

2. **The hero copy layer** — `Home.tsx`. Name "Melvin" (RevealText, centred per
   Melvin's explicit layout call), tagline **"CS, and beyond"**, a slim caption
   line (Computer Science · EMU · live clock via `LocalTime`). Outer wrapper is
   `pointer-events-none` so mouse still reaches the WebGL canvas to disturb the
   mask; the tabs re-enable `pointer-events-auto` for themselves.

3. **Liquid-glass info tabs** — `site/src/components/HeroInfoTabs.tsx`.
   Right side of the hero, reusing the "Hero Current" artifact's beat-card
   layout (eyebrow/heading/body). Four pill tabs (Now/Building/Wins/Beyond),
   auto-advance every 6s (restarts on manual click), each showing a glass
   content panel. **The glass RENDERING TECHNIQUE has changed since it was
   first built — read this in full before touching glass code:**

   **Attempt 1 (superseded, kept as dead code, do not resurrect):**
   an SVG `feDisplacementMap` CSS filter (`GlassFilterDefs.tsx`, id
   `glass-distort`, class `.uses-glass-distort`) chained via `backdrop-filter`,
   animated via a `requestAnimationFrame` loop. Built because a full WebGL port
   of the reference repo seemed too risky under time pressure. Melvin's verdict
   after seeing it: **"the liquid glass is shit."** `GlassFilterDefs.tsx` is
   **still on disk but no longer imported anywhere** (not in `App.tsx`) — dead
   code, same category as the old `SceneCanvas`/`ParticleField` orphans. Its
   `.uses-glass-distort` CSS class in `index.css` is likewise unused in any JSX.

   **Attempt 2 (current, live) — a REAL WebGL port:**
   `site/src/components/scene/LiquidGlassField.tsx` (379 lines), mounted
   inside `MaskField.tsx`'s `<Canvas>` (after `<MaskParticles/>`, before
   `<EffectComposer><Bloom/></EffectComposer>` — so Bloom applies to the
   composited result including the glass). This is a genuine, complete,
   physically-based port of `iyinchao/liquid-glass-studio`'s shader (MIT
   license) — confirmed by direct code read, not a stub:
   - **Full pipeline per frame:** hides the glass quad → renders the R3F scene
     to an FBO (`sceneFBO`) → two-pass Gaussian blur (vertical then horizontal,
     separate FBOs) → shows the glass quad again → draws a full-screen shader
     that reads both the sharp and blurred captures.
   - **The fragment shader has:** an SDF rounded-rect (`roundedRectSDF`) merged
     across up to 10 shapes with a metaball `smin` blend (matches the
     reference's "shapes merge" behaviour), a real per-pixel surface normal via
     finite differences, **Snell's-law refraction** (`safeAsin`/`thetaI`/
     `thetaT`/`edgeFactor`), **RGB chromatic dispersion**
     (`getTextureDispersion`, tri-channel sampling offset), a **Fresnel edge**
     term, and an **angle-based glare** term (`vec2ToAngle`, `glareConvergence`).
     This is the real physics, not an approximation.
   - **Already parameterized to Melvin's exported spec.** His Liquid Glass
     Studio JSON export (`C:\Users\mkarupat\Downloads\liquid-glass-2026-07-27T
     22-12-22.json`) is hard-coded into the uniforms almost verbatim: e.g.
     `u_tint` alpha is `0.0` (tint intentionally OFF — don't "fix" this),
     `u_shadowExpand 21.08`, `u_glareAngle -45°`. Cross-check the uniform block
     (top of the file) against the JSON before changing any value — most of
     the work of matching his spec is already done.
   - **Shapes come from real DOM elements, not hardcoded positions:** each
     frame it queries `document.querySelectorAll('.sync-glass-rect')` (applied
     to both `.glass-tab` and `.glass-panel` in `HeroInfoTabs.tsx`), reads each
     element's live `getBoundingClientRect()` + computed `border-radius`, and
     feeds up to 10 of them into the shader's `u_rects`/`u_radii` arrays. This
     means the glass shapes automatically track wherever the DOM tabs/panel
     actually are on screen — including through the new scrollytelling beats,
     though that hasn't been tested since beats were added.
   - **⚠️ THE ROOT CAUSE OF "IT STILL LOOKS BAD" (found 2026-07-28, read the
     "KEY DIAGNOSIS" section right below this list) — it is very likely NOT a
     shader bug.** The shader refracts/blurs whatever the R3F scene actually
     contains, which right now is: pure black + the particle mask. Real
     refraction over a black void necessarily renders as a dark, low-contrast
     rectangle — that is correct optics, not broken code. **Do not "fix" the
     shader further before the deep-space background exists** — verify the
     diagnosis by temporarily testing the glass over something visually busy
     (e.g. the DOM's own colourful content, or a test texture) before assuming
     more shader tuning is needed.
   - **Not yet re-verified working after the scrollytelling skeleton landed**
     (both were built same session, glass wasn't re-screenshotted after). Given
     it reads live DOM rects every frame it SHOULD keep working across beats,
     but confirm before trusting that.
   - Content is REAL, sourced from `C:\Users\mkarupat\Desktop\Otto_sys\
     NOTES.md` (Melvin's separate automation-project context file — read it for
     full bio detail). **Load-bearing rule from that file, followed here:**
     Melvin is *actively building* in CS/AI-ML only; astrophysics/neurotech/
     aerospace/robotics/quantum/filmmaking are **stated interests**, never
     implied as active work. The "Beyond" tab keeps that line honest ("fields
     he reads into, not fields he's building in. Yet."). Tab facts: **Now** =
     AI/ML @ EMU, GDG Treasurer, CS50P. **Building** = Osiris (touchless CV
     device control) + Manas (astrophysics sim engine, in-progress). **Wins** =
     Lingo (SpartaHack 11) + EventsOS (GrizHacks, Oakland University).
     **Beyond** = the interest list, explicitly framed as curiosity. If
     Melvin's real facts change, this is the file to update — hand-authored
     content, not fetched.
   - The DOM-side `.glass-panel`/`.glass-tab` CSS (shape, hover states,
     `.reveal-fade` text transitions) in `index.css` is still live and used —
     only the *distortion rendering* moved from CSS/SVG to WebGL, not the
     panel layout/shape/interaction styling.

### ✅ NATIVE FOUNDATIONS BUILT (About, Work, Vision, Contact) — 2026-07-28

Built out the 4 inner pages natively using React + Tailwind, replacing the placeholder `Chapter.tsx`. This is the structural content pass — WebGL interactions / scrollytelling for these pages are reserved for later.

1. **`/about`**: Vertical milestone timeline (Kuwait → India → Michigan).
2. **`/work`**: Case study cards (Osiris, Manas), Hackathon wins (Lingo, EventsOS), and Leadership roles. Includes a placeholder for the "3D skills constellation".
3. **`/vision`**: Manifesto text for AI Engineering role + Interests section making clear distinction between active building and curiosity. Placeholder left for future Navier-Stokes sim.
4. **`/contact`**: Link layout (Email, LinkedIn, GitHub, Resume) looping back to home.

### ✅ SCROLLYTELLING SKELETON — BUILT 2026-07-28 (~01:30 EDT)

The hero now actually scrolls. Structure only — beats 2-5 are labelled
placeholders by design; their concepts/styling are still Melvin's to decide.

**Architecture (the important part — read before touching scroll):**
- `site/src/hooks/heroScroll.ts` — **the ONE contract.** A tall scroll track
  publishes `{progress 0→1, beat 0-4, beatProgress 0→1}` into a plain mutable
  object. Everything else READS it; nothing writes back. Deliberately NOT React
  state (scroll fires ~60fps; state would re-render the hero every frame).
  `useHeroBeat()` is the React-facing hook and only re-renders on beat CHANGE.
  **This is why scroll work cannot break the mask** — the mask's GPGPU internals
  were never touched.
- `site/src/pages/Home.tsx` — the scroll track: a `500vh` section wrapping a
  `sticky top-0 h-screen` viewport. `MaskField` mounts ONCE inside the sticky
  container so it never remounts/reloads while scrolling. Uses CSS `sticky`
  rather than GSAP pinning (one line, can't desync, plays well with Lenis).
  GSAP ScrollTrigger stays available for per-beat scrubbed animation later.
- `site/src/components/HeroBeats.tsx` — beat content + the left beat rail
  (dots + a fill line driven straight from `heroScroll.progress` via rAF) +
  a bottom-right `01 / 05` counter. Beat 1 = the real hero (name, tagline,
  glass tabs). Beats 2-5 = explicit placeholders.
- Only change to `MaskField.tsx`: wrapper `fixed inset-0` → `absolute inset-0`
  so it's scoped to the sticky hero instead of escaping it.

**Verified in browser:** all 5 beats advance, rail + counter track correctly,
content cross-fades, **the mask persists across every beat without reloading**,
tsc + oxlint clean, no console errors.

**Also applied:** tagline copy fix "CS, and beyond" → **"Computer Science and
Beyond"** (was 📋 item 2 below).

### 🔬 KEY DIAGNOSIS — why the liquid glass STILL looks disappointing (2026-07-28)

The WebGL port (item 3 above, `LiquidGlassField.tsx`) is a genuine, complete,
physically-based shader — confirmed by direct code read, not a guess. Melvin
still called the result disappointing after it was built. **Read this before
touching the shader again — the likely explanation is optics, not a bug:**

**There is nothing behind the glass to refract.** The glass panel sits
bottom-right over pure black; the mask is on the left. Refraction, dispersion,
and Fresnel are all *distortions of what's behind the glass* — over a black
void they necessarily render as a dark, low-contrast rectangle, no matter how
correct the shader is. Compare Melvin's own reference screenshot: that glass
sits over a vivid photo of colourful buildings, which is exactly why it reads
as glass there.

**Consequence: the deep-space background (📋 item 7 below) is a PREREQUISITE
for the glass to look good, not a later polish item.** Build the background
FIRST, then evaluate/tune the glass against it. Continuing to tune the shader
before the background exists risks another round of "still doesn't look right"
for a reason no shader change can fix.

**Before spending more time on the shader itself:** sanity-check this
diagnosis by temporarily pointing the glass at something visually busy (a test
texture, or the DOM's own colour) — if it suddenly looks right, the diagnosis
is confirmed and the fix is 100% "add the background", zero shader work needed.

### ⚠️ NEW ISSUE FOUND — mask takes ~20 seconds to appear

On a cold load the hero is blank for roughly 20s before the mask renders
(DRACO decode + surface sampling + GPGPU setup on the main thread). A recruiter
will not wait that long. Not fixed. Likely fixes: pre-filter the mask mesh
offline so sampling is cheap, lower `SIZE` for first paint then upgrade,
self-host the DRACO decoder, and/or show the loader until the mask is ready.

### 📋 NEXT CHANGES — Melvin's spec, given 2026-07-27 ~17:06 EDT
### (item 2 done; item 3-8 still OPEN)

Full itemized feedback from Melvin's last message this session. **None of this
is implemented yet** — capturing it precisely here so nothing is lost across
the tool switch. Treat this as the priority queue, ahead of the "Immediate NEXT
steps" list below it (which was written before this feedback landed).

1. **STILL OPEN — the liquid glass isn't good enough, even after a real fix
   attempt.** Melvin's words, first round: "the liquid glass is shit" (about
   the CSS/SVG version). **Action taken:** a genuine, complete WebGL2 port of
   `iyinchao/liquid-glass-studio`'s shader into React Three Fiber
   (`LiquidGlassField.tsx`) — SDF rounded-rects, Snell's-law refraction, RGB
   dispersion, real Fresnel, angular glare, over a 2-pass Gaussian-blurred
   scene capture; DOM text stays on top, WebGL shapes track the DOM elements'
   real bounding boxes every frame. **Melvin's next-session feedback was still
   "really disappointing."** Per the KEY DIAGNOSIS section above, the most
   likely cause is NOT the shader — it's that the shader has nothing but black
   to refract. **Do not assume the shader itself needs more work until the
   deep-space background (item 7) exists and has been tried against it.**

2. **Tagline copy:** "CS, and beyond" → **"Computer Science and Beyond"**
   (spelled out, not the CS abbreviation). File: `Home.tsx`.

3. **The clock becomes a persistent sticky sidebar, not inline text.** Move off
   the centered caption line entirely. New spec: pinned to the **right edge of
   the screen**, **spans the full height of the viewport**, and stays fixed
   there **regardless of scroll position** — i.e. it survives across all future
   scrollytelling sections once those exist, not just the hero. This is a new
   dedicated component (a tall vertical strip), not a repositioned `<LocalTime>`
   — `LocalTime`'s clock logic can be reused, but the layout is new.

4. **Name lockup redesigned, moved to top-right.** Currently the hero shows
   centered "Melvin" only. New spec:
   - Position: **top-right** of the hero (not center — center is freed up).
   - Big line: **"Melvin Chirag"** — with **"Chirag" in a different (accent)
     colour** than "Melvin".
   - Smaller line below: **"Karupati"**.
   - (Note: this is the HERO's name display, separate from `Nav.tsx`'s existing
     small top-left "Melvin" logo — that logo can stay as-is unless Melvin says
     otherwise; confirm if unsure.)

5. **Glyph patches too big — shrink from ~1/3 of the mask to ~1/8.** Reduce
   `GLYPH_COUNT` and/or `hotRadius` and/or `N_HOTSPOTS` in `MaskField.tsx` so
   the total glyph-covered area is much sparser. This is a tuning pass, not a
   rebuild — the mechanism (roving hotspots, binary→Telugu→hex cycle) is right,
   just the current visual coverage is judged too dense.

6. **A control panel — Phase 2, but now with a concrete position and scope.**
   Position: **center-left of the screen**. Functions:
   - Toggle **OFF** the camera-mirror option (the opt-in webcam-tracking feature
     from earlier this session's plan — was never built yet, still Phase 2, but
     now has a concrete toggle location).
   - Change the mask's **visual parameters** (the "curated tinker panel" idea —
     color, density, etc., NOT the raw dev/Leva panel).
   - **New consideration:** Melvin may introduce **a second face/mask
     variant** — the control panel's scope should account for possibly
     switching between multiple masks, not just tuning one. Don't over-build
     this now; just don't paint the panel into a single-mask-only corner.

7. **🟡 PARTIALLY DONE (2026-07-28) — see "DEEP-SPACE BACKGROUND" above.**
   Real nebula photo + layered motion (ambient drift + scroll-linked parallax)
   is live and verified. Still missing: meteor showers, galaxies, the
   satellite. Original spec below, kept for the remaining scope —
   **Background becomes deep space — nebulae, meteor showers, galaxies, a
   satellite — all faded, atmospheric, behind the mask.** Melvin's framing:
   *"the mask is in space — actual space."* Currently the background is flat
   `#050609`.
   - **⚠️ Flag, not a block — read before building:** this consciously reopens
     the earlier hard decision to drop the nebula background (parked
     2026-07-27 in `parked/hero-nebula/`, rejected then because it read as
     *"made for someone in Astronomy"* rather than a CS student). **The
     reasoning is different this time and should hold, but confirm with Melvin
     if it feels off when built:** the mask (with its binary/Telugu/hex CS
     signal) is now the strong identity anchor; a *faded, atmospheric* space
     backdrop behind it is scenery, not the subject — closer to "he happens to
     be in space" than "he is a space person." That distinction is the whole
     ballgame — keep it VERY faded/dim, never competing with the mask for
     attention.
   - **Reuse opportunity:** `parked/hero-nebula/` already has 5 real NASA/ESA/
     ESO nebula photographs, already downsampled, with licenses sorted out
     (2 public domain, 3 CC BY 4.0 — attribution required, see that folder's
     README). These could be the nebula layer directly, heavily dimmed/blurred,
     instead of sourcing new imagery.
   - Meteor showers ≈ the "shooting stars" idea from Melvin's own earlier
     layered-mask brainstorm this session (back layer = stars/shooting stars,
     not the old wave/current effect) — this is consistent with, not new
     versus, that plan.
   - New element not previously discussed: **a satellite** (faded, presumably
     small/distant, reinforcing "space" without being a focal object).

8. **A real plan is still needed for About / Work / Vision / Contact /
   Résumé.** Melvin's own words: *"I need to work out an actual plan."* This
   is explicitly open — none of these pages have a concept yet beyond
   `docs/concepts.md`'s reservation of the ink-fluid sim (candidate for
   Vision). Don't invent concepts for these unprompted; this needs a
   references-first pass (same method as the hero) when Melvin is ready for it.

### ~~Immediate NEXT steps~~ — RETIRED, folded into "📋 NEXT CHANGES" above
This block used to duplicate the priority queue and had gone stale (it still
said scrollytelling wasn't built after it was). Everything still open now
lives in the single "📋 NEXT CHANGES" list above — check there, not here.

### Credits owed (must appear on the site + README before shipping)
- Cyborg "Soulless" 3D model — **Ali Rahimi (@Free-Radical-666), CC BY 4.0**.
- Particle-mask technique learned from Codrops "Dreamy Particles" by Dominik
  Fojcik (our code is a clean-room reimplementation using MIT libs — see
  `docs/particle-mask-technique.md`).
- Liquid-glass technique referenced from `iyinchao/liquid-glass-studio` (MIT) —
  our implementation is CSS/SVG, not their code, but the physical concept
  (refraction/dispersion/fresnel/glare) is credited inspiration.

### Constraints reminder
Dark only; comment non-obvious code (Melvin reads it); update this file + the
README master key when things change; confirm before deploy/delete; don't ship
unlicensed code. Repo: private github.com/melvinchirag/Portfolio, branch
`hero-build` pushed to origin.

### ⏹️ FULLY SUPERSEDED — kept for history only, do not treat as live
The two sub-sections immediately below ("Hero direction — look first" and
"Open questions") predate the reference study, "The Blend" direction lock, the
built mask, scrollytelling skeleton, and the glass work — every question in
them has since been answered and every blocker resolved. They're left as-is
below only so the reasoning trail isn't lost. **Do not act on anything in them.**

### 🎨 ~~Hero direction — "look first", references studied~~ (RESOLVED)

- Melvin's steer: **get the LOOK right before worrying about font/content.**
- A field-agnostic hero **prototype ("The Current")** was built as a standalone
  artifact (scrollytelling + kinetic type + a curl-noise "light current"):
  https://claude.ai/code/artifact/dfabfa71-13fe-48d6-a619-825987bf081f · source
  `scratchpad/hero-current.html`. Melvin: *"it's good but it can use massive
  improvements."* Directionally OK, not the target yet.
- ~~BLOCKED on Melvin's reference sites.~~ **Resolved** — he supplied them, they
  were studied (see "DIRECTION LOCKED" above), and the resulting direction
  ("The Blend") is what everything since has been built toward.

### ❓ ~~Open questions to resolve with Melvin~~ (BOTH ANSWERED)

1. **"Under construction" launch version?** ~~Melvin leans NO~~ — **settled: no
   holding page**, build and ship the real thing directly.
2. ~~The direction itself is still unchosen.~~ **Resolved — "The Blend" locked**
   (see "DIRECTION LOCKED" section above), and the hero mask + scrollytelling
   skeleton + glass tabs are the direct result of that decision.

---

## Superseded 2026-07-27 — the nebula hero (kept for history)

## Current state — 2026-07-26. Loader shipped + fixed. Hero §1 rebuilt on real NASA/ESA imagery.

**Read this whole section before touching Home or the loader — it supersedes
everything below it in this file that talks about the particle field.**

Other four pages (About/Work/Vision/Contact) are still placeholders.

### ✅ Loader bug fixed (2026-07-26)

Melvin reported the loader was invisible (blank screen for the full sequence,
then straight to hero). Root cause: `site/src/components/Loader.tsx`'s cleanup
called `gl.getExtension('WEBGL_lose_context')?.loseContext()`. **React
StrictMode runs every effect twice in dev** (mount → cleanup → mount) —
`loseContext()` is *permanent* for that canvas, so the second mount got a dead
context back and every draw silently no-op'd. Fixed by removing that call
(context is released anyway when the canvas unmounts); left a comment
explaining why so it isn't re-added. **Verify this still displays correctly
next session** — it was fixed but not re-watched by Melvin afterward.

### 🎨 Hero §1 background — REBUILT on real photographs, not procedural noise (2026-07-26)

**What happened:** the procedural nebula shader (ridged-multifractal noise,
described further down this file) was shown to Melvin and rejected again —
*"it doesn't look like a picture from a NASA satellite… from a human
perspective, that just looks like a poorly done nebula."* Also flagged: the
sun cursor was *"too big… looks like Cartoon Network… too much flaring
plasma."*

**Diagnosis — same lesson as the face triptych, hit a third time.**
Procedural code cannot produce a photograph. Real nebula images are turbulent
physics evolved over millions of years, captured at extreme dynamic range,
processed by scientists for hours — no noise function reproduces that. Melvin
independently proposed the fix himself: *"we should directly reference
satellite images of NASA."* That is now the architecture.

**What's built now:**
- **`site/src/components/scene/NebulaField.tsx`** — full-screen WebGL shader
  that displays a REAL JWST/Hubble/ESO photograph as the background (cover-fit,
  slow drift, pointer parallax), and layers on interaction a still image can't
  provide: the sun-cursor **pushes** the gas radially, **swirls** it at the
  cavity wall, **clears**/dims it near the cursor, and **lights** the
  surrounding gas with warm scattered light (physically motivated — hot young
  stars really do blow cavities into their birth nebulae via radiation
  pressure and stellar wind).
- **Five real images ship in `site/public/nebula/`** (~800KB–1.2MB each,
  downsampled from originals up to 123 MP via a one-off script,
  `scratchpad/prep-neb.js`, which needed jpeg-js's decode limits raised —
  `maxResolutionInMP`/`maxMemoryUsageInMB` — to handle the JWST originals):
  - `carina.jpg` — Cosmic Cliffs (NASA/ESA/CSA/STScI, JWST) — public domain
  - `orion.jpg` — Orion Nebula (ESO/VISTA) — **CC BY 4.0, attribution required**
  - `tarantula.jpg` — Tarantula Nebula (NASA/ESA/CSA/STScI, JWST) — public domain
  - `eagle.jpg` — Pillars of Creation (NASA/ESA/Hubble) — **CC BY 4.0**
  - `lagoon.jpg` — Lagoon Nebula (NASA/ESA/Hubble) — **CC BY 4.0**
  - **A small on-screen credit line (bottom-right) is required by the CC BY
    images and is rendered by `NebulaField`. Do not remove it.**
- **Rotation:** one nebula per page load, advancing through all five via
  `localStorage` (`melvin:nebula-index`), so reload → next nebula. This is
  Melvin's stated long-term vision (*"every time somebody opens the website...
  we should have five different nebulas"*) already fully implemented, not a
  stub.
- **`site/src/components/SunCursor.tsx`** — completely rebuilt, smaller and
  restrained per Melvin's notes: real limb darkening (brighter centre, cooler
  edge — the single detail that sells "star" over "circle"), three
  exponential glow layers at different falloff rates instead of one, a
  **static** (not animated) faint diffraction cross, no more animated flares.
  Grows and brightens on hover of `a, button, [role=button], [data-glow]`.

**Architecture change:** the global `<SceneCanvas>` was removed from `App.tsx`
entirely. Per Melvin's *"each page can have a concept"* direction, the nebula
is mounted **inside `Home.tsx` only** — other pages currently render on plain
black until they get their own concepts.

**⚠️ DEAD CODE — not yet deleted, do not resurrect by accident:**
`site/src/components/SceneCanvas.tsx`, `site/src/components/scene/ParticleField.tsx`,
`site/src/components/scene/particles.glsl.ts`, and `site/src/components/scene/noise.ts`
are still on disk but **no longer imported anywhere**. They were the old
global procedural field, superseded by `NebulaField.tsx`. `Cursor.tsx` (the
old lerped-dot cursor, pre-sun) has already been deleted. Clean up the four
remaining orphans next session unless Melvin wants the procedural field kept
as a reference/fallback.

**Also fixed:** `NEBULAS` array in `NebulaField.tsx` was made non-exported
(oxlint fast-refresh warning) — no other file needs it.

**Verified this pass:** `npx tsc --noEmit` clean, `oxlint` clean, dev server
serves clean, all five `/nebula/*.jpg` return 200. **NOT yet re-confirmed
visually by Melvin after the rebuild** — he watched an early version
("impressed, but a caveat") right as this file was being updated; the caveat
itself was not yet stated when this section was written. Get that caveat
first thing next session.

### 🏗️ Still the standing architecture (unchanged, keep building toward this)

- **The hero page is the ONLY page with scrollytelling.** Hard rule.
- Hero is **five scroll sections**, each its own theme/transition — not one
  continuous effect.
- **The nebula belongs to Section 1 only**; sections 2–5 undesigned. Melvin
  wants to try **anime.js** (not installed) and add elements himself before
  the full 5-section scroll is built. **Do not build sections 2–5 until he
  says so.**
- **Comment every important aspect of the code** — Melvin reads it and edits
  it himself. Both new files above are heavily commented for this reason.
  Keep `docs/CODEBASE.md` + its artifact current with these changes (not yet
  done as of this update — do next).

---

## Superseded below — kept for history only

Everything from here to the next `---` describes the OLD procedural-noise
nebula attempt (ridged multifractal, domain warping, ionisation colour) and
the old global `SceneCanvas`/`ParticleField` system. **It has been replaced by
the real-imagery system described above.** Left in place so the reasoning
trail isn't lost, not because it's current.

**The face triptych is DROPPED (2026-07-25).** History for context: the
particle-assembled face failed (yellow blob); we pivoted to an *image* triptych
(neural / film / contour treatments of his real photo). Melvin looked at the
wired-in version and rejected it — too small, floating in a busy field, reads
unfinished. He officially dropped the face idea for now ("will look into it
later"). `PortraitTriptych.tsx` and `site/public/portrait/*` were deleted. The
`scratchpad/portrait-bake/` tools (`triptych.js`, `bake.js`) still exist for if
it returns. **Do not rebuild the face without Melvin re-opening it.**

**The lasting lesson (now in `docs/CODEBASE.md` §7c):** representational art (a
real face) needs real tools — photo / 3D / generative-AI image. Abstract
generative motion (particles, growing networks, fields) is code's home turf.
Getting this line wrong cost several rounds.

**New hero direction — Melvin's vision (2026-07-25):**
- A **loading sequence** first: black screen → a neuron appears → it grows and
  connects, a neural network building itself → dissolves into the hero. Built in
  **code, not video** (Melvin considered Google Flow/Veo; we established code is
  right here — precise timing, seamless dissolve into the LIVE hero, KB not MB,
  full control). Reasoning written up in `docs/CODEBASE.md` §7c.
- Keep **scrollytelling**. The hero itself (what the loader dissolves into) is
  still just the clean name-on-field placeholder — to be designed next.

### ⚠️ Loader: FOUR rejected renditions, then a process fix (2026-07-25)

Melvin liked v1's *behaviour* (B&W, ~5s, accelerating, random origin — all
keepers) but rejected v2–v4 on **look**. Every rendition read as a microscope /
CT image:

| # | What was built | Why it failed |
|---|---|---|
| 2 | Accurate dendrite growth, thin white ink | "Looks like a neuron culture / scanner" |
| 3 | + bloom, sparks, signals, birth flashes | Same, plus washed out |
| 4 | + 3-layer depth-of-field, camera, haze, grain | **Blurry and cluttered** — the DOF blur made it muddy |
| 5 | Lichtenberg/electric: sharp, angular, sparse, 3D | Over-corrected — thin, spindly, unbalanced. "Looks terrible" |

**THE REAL DIAGNOSIS (this is the important part).** It was never a rendering
problem. **There was no agreed visual target.** Melvin had an image in his head;
I had no reference, so each round I guessed, built ~250 lines against the guess,
and got rejected — oscillating between "too dense/soft" and "too sparse/sharp".
Note the irony: the project's own **"reference before build"** rule was followed
for the *site* (8 reference sites) and skipped entirely for the *loader*.

**THE PROCESS FIX — use this for any future visual work.** Stop building one
guess at a time. Build a **concept explorer**: one artifact with 5–6 genuinely
different directions animating side by side, let Melvin point at one in 30
seconds, *then* go deep on the winner. Converts guess→build→reject into
pick→refine. Explorer artifact:
https://claude.ai/code/artifact/5752aa81-6bec-4447-9ba2-2afe24df14cd
**Corollary: probe new visuals as a standalone artifact FIRST; only wire into
the site once approved.** Wiring an unapproved concept in wastes a full cycle.

**Result:** Melvin picked #1 (ink/fluid) — but **not for the loader**. See below.

### 🎨 NEW ARCHITECTURAL DECISION — one page, one concept (2026-07-25)

Melvin, on seeing the ink sim: *"we shouldn't use it as a loading page. I have
bigger plans for this kind of thing… each page can have a concept."* So the
site's variety comes from **each page having its own visual world**, not one
effect repeated everywhere. Approved concepts get **reserved** in
`docs/concepts.md` rather than spent on the first surface that needs something.

Corollary worth remembering: **match the concept's weight to the surface's
dwell time.** A loader is glanced at for 5 seconds; a page is sat with. Don't
burn the best idea on the shortest moment.

**Reserved so far:** the **ink fluid simulation** — a real Navier-Stokes GPU sim
(vorticity confinement, 28-iteration pressure solve), luminous ink in black
water. Melvin: *"very, very pretty… reads as a fluid… a nice Chinese art / comic
style feel. I really love it."* Artifact:
https://claude.ai/code/artifact/0c2546e1-2b6d-4137-9000-88c39653e3c2 · source
`scratchpad/ink-fluid.html`. **Page assignment still open** — Vision (manifesto)
is the strongest candidate.

### 🏗️ HERO ARCHITECTURE — Melvin's direction, 2026-07-25 (build toward this)

- **The hero page is the ONLY page with scrollytelling.** About / Work / Vision
  / Contact must NOT have it. This is a hard rule.
- The hero is **five scroll sections**, each with its **own theme and its own
  transition** between them. It is explicitly *not* one continuous effect.
- **The particle/nebula field belongs to SECTION 1 ONLY.** On arrival you see
  it; as you scroll it transitions into something else. Do not extend it across
  the whole hero.
- **Section 1 = name + identity line over the nebula.** That is the current
  work; sections 2–5 are undesigned.
- Melvin wants to try **anime.js** for some of this — not installed yet, and he
  wants to add elements himself before we build the full 5-section scroll. Do
  not build sections 2–5 until he says.

**Section 1 brief (current task):**
- The field currently *"looks too much like just random particles"*. It must
  read as a **nebula — specifically Orion, a gaseous cluster**, not points.
- **Mouse-interactive.**
- **Custom cursor = a miniature SUN**, built in WebGL: it should glow and look
  like a sun, and **glow brighter when hovering anything important**.
- **Comment every important aspect of the code** — Melvin reads it and will
  make changes himself. Keep `docs/CODEBASE.md` + its artifact current.

### ✅ LOADER — SOLVED AND SHIPPED (2026-07-25)

Rendition #6 was **approved outright**: *"That's exactly what I wanted. That's
literally what I wanted. Perfect. Lock it, fix it. We're using it."*

It is live in `site/src/components/Loader.tsx` — raw WebGL: neuron cell bodies
igniting in a cascade, growing dendrites, arcing across to connect, rendered as
**volumetric point clouds with multi-pass bloom** in real 3D with a camera
pushing through. Cool blue dendrites, warm gold cell bodies. 5.2s, once per tab
session, skippable, fresh network every visit, reduced-motion and no-WebGL safe,
full GPU cleanup on unmount. Verified: tsc + lint clean, serving clean.
**Do not restyle without Melvin re-opening it.** Full detail in
`docs/concepts.md`.

**THE TRANSFERABLE LESSON — why #6 worked when #2–#5 failed.** All four failures
were 2D canvas **line drawings**, and flat line art reads as a diagram or a scan
no matter how it is graded. CGI reads as CGI because of: **volumetric mass**
(overlapping soft sprites, never wireframe) + **real multi-pass bloom** +
**real 3D with a moving camera** + **atmosphere** (fog, dust) + **filmic finish**
(tone mapping, chromatic aberration, vignette, grain). Reach for that stack
whenever the brief is "make it look like VFX".

**Hero field contrast pass (2026-07-25):** the field kept reading as a flat,
bright orange wall. Reduced particle counts (~120k→62k high), made density
sampling far more selective (exp 2.1→3.0) to carve real black voids, trimmed
the buffer instead of uniform-filling, and lowered bloom (0.55→0.4, threshold
→0.62) + deepened vignette. Goal: deep field with voids and bright cores, not a
uniform sheet. Needs Melvin's eyes.

**Codebase learning doc** now exists: `docs/CODEBASE.md` (source of truth) +
artifact at https://claude.ai/code/artifact/06f5580e-4945-4653-9978-015275579359.
Keep both current when code changes — **NOT yet updated for the 2026-07-26
nebula rebuild above; do that next.** Per-line comments were tried and
reversed — see `site/CLAUDE.md` "Comments and documentation".

**File tree below is STALE** (pre-dates the 2026-07-26 rebuild — no
`NebulaField.tsx`/`SunCursor.tsx`/`public/nebula/`, and still lists the
now-orphaned `ParticleField.tsx`/`particles.glsl.ts`/`noise.ts` as if they were
live). Kept for history only.

```
Desktop\Portfolio\
├── PORTFOLIO_VISION.md          spine: vision, phases, resource playbook
├── CONTEXT.md                   this file
├── .claude\launch.json          dev server, runs `npm --prefix site run dev`
├── docs\
│   ├── references.md            8 reference sites, each with a named job
│   └── pages\home.md            the Home spec — 5 beats, current truth
└── site\
    ├── CLAUDE.md                art direction + hard rules
    ├── .claude\launch.json      older config, only works if cwd is site\
    └── src\
        ├── App.tsx              routes /about /work /vision /contact
        ├── index.css            tokens, .liquid-glass, accent CTA, reveals, cursor
        ├── components\
        │   ├── Nav.tsx          top bar, accent Résumé button, hide/show on scroll
        │   ├── SceneCanvas.tsx  canvas host, post-processing, camera parallax,
        │   │                    no-WebGL fallback
        │   ├── Loader.tsx       counts in, skippable, first visit only
        │   ├── Cursor.tsx       lerped glow dot, desktop only
        │   ├── RevealText.tsx   per-character reveal, accessible
        │   └── scene\
        │       ├── ParticleField.tsx   fBm-sampled filamentary distribution
        │       ├── particles.glsl.ts   vertex/fragment shaders + simplex noise
        │       └── noise.ts            CPU value-noise fBm for the distribution
        ├── hooks\
        │   ├── useLenis.ts             tuned — don't change casually
        │   ├── useQualityTier.ts       particle count + DPR by device
        │   └── usePrefersReducedMotion.ts
        └── pages\
            ├── Home.tsx        hero: centre stack + corner metadata + live clock
            └── Chapter.tsx     shared placeholder for the other 4 routes
```

**Architecture note that matters:** particles carry two positions — `position`
(chaos) and `aTarget` — and resolve via a single `uResolve` uniform. Beat 2's
portrait fills `aTarget` from Melvin's photo and animates that uniform. **No
GPGPU, and no rewrite required.** `aTarget` currently holds a placeholder
sphere so the mechanism is wired and testable.

### Verification status

**Confirmed (2026-07-24):**
- `npx tsc --noEmit` passes; `oxlint` clean.
- Dev server starts clean from the repo root via the new `.claude/launch.json`.
- Page loads with **zero console errors or warnings**.
- DOM correct: nav renders Melvin/About/Work/Vision/Contact/Résumé; hero name
  renders as 6 animated characters plus an `sr-only` full string; corner
  metadata and the live clock render; routes resolve.
- WebGL context is created and alive at full viewport size.
- Accessibility: the collapsed mobile menu is `inert`, so its links are no
  longer in the tab order (this was a real bug, found and fixed).

**NOT confirmed — needs Melvin to look:**
- **Whether the particle field renders at all**, and whether it reads as deep
  and volumetric rather than as flat dots.
- Whether drift feels organic, and whether pointer parallax reads as depth.
- Whether the name reveal glides without bouncing.
- Whether the nav is legible over the scene without a dark overlay.
- Frame rate.
- Typography, spacing, colour balance — the entire aesthetic judgement.

**Why the agent cannot self-verify — confirmed again 2026-07-24.** The
automated browser pane does not composite. `document.visibilityState` reports
`"visible"` and a WebGL context is created at the correct size, **but
`requestAnimationFrame` never fires** — verified directly: a rAF-based probe
timed out after 30s without a single callback. React Three Fiber's render loop
runs on rAF, so the scene has never drawn a frame in that environment, and
`gl.readPixels` therefore proves nothing.

**This is a limitation of the verification environment, not a defect in the
code.** Do not "fix" canvas sizing or the render loop based on a blank
screenshot from the pane. Verify in a real browser first.

**How to verify properly:**
```bash
cd site; npm run dev
```
Then open the printed localhost URL in a normal browser window.

---

## What's next

**Immediate — Melvin looks at Beat 1 and reacts:**
1. Run the dev server, open Home in a real browser.
2. Judge it against `docs/references.md`, list what's visually wrong.
3. Then the screenshot self-correction loop: compare, list differences, fix,
   repeat. **This is where the look actually gets found** — not in a spec.

**Then Beat 2** — the field resolves into the triptych portrait. Blocked on
Melvin's photo. The `aTarget` mechanism is already wired for it.

**Content still owed by Melvin:**
- [ ] Identity line (the hero currently ships a visible placeholder)
- [ ] "Who I am" — 3–4 sentences, real voice
- [ ] A portrait photo to feed the particle system
- [x] Featured projects: Manas + 2 — name, one-liner, stack, role, links
- [x] 6–10 About milestones (Kuwait → India → Michigan)
- [ ] Skills grouped into constellations
- [x] Vision: the manifesto (bullets are fine)
- [ ] Résumé PDF (nav links `/resume.pdf`, which does not exist yet), email,
      socials, domain name

**Still-open decisions:** accent palette + type pair (ember `#ff6b35` → violet
`#8b5cf6`, Instrument Serif + Inter — **placeholder, not locked**) · the
field's character · which language sits left/centre/right in the triptych ·
domain name · sound in/out.

**Known issues:**
- `npm audit` reports a high-severity advisory in `react-router` (RSC-mode CSRF
  bypass). **Not reachable here** — this is a client-only SPA with no server
  actions. The fix is a breaking downgrade, so it is knowingly deferred.
- `/resume.pdf` is linked from the nav but not yet present — it 404s.
