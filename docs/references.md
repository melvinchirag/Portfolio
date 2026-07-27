# References

Supplied by Melvin 2026-07-24. Eight sites. **Structure and copy studied; the
sites were never seen** — screenshots are unavailable in this environment, so
every conclusion below is drawn from DOM, copy, and page structure. Palette and
typography conclusions are therefore *not* in here, and must come from Melvin.

---

## The vibe sentence

> **A dark, dimensional space that feels alive and moves with weight — where the
> craft is in the depth and the motion, and the words stay out of the way.**

_Draft, pending Melvin's confirmation. Everything gets measured against this._

## What Melvin is actually drawn to

Asked directly what pulled him to these sites, he chose **darkness and mood**,
**3D/WebGL depth**, and **motion and transitions**.

He did **not** choose huge sparse typography.

**This is the single most important finding in this file.** The impact must come
from the scene and its motion; type is quiet, legible and supporting. An earlier
draft of the Home spec made his name "oversized display type, the single focal
point" — that was wrong and has been corrected. Don't re-inflate it.

Convenient side effect: restrained typography reads as professional rather than
arty, which serves the 70% recruiter half of the audience.

---

## The references

| # | Site | Job | What to steal |
|---|---|---|---|
| 1 | [igloo.inc](https://www.igloo.inc/) | **Hero impact** | Entire page is canvas — the DOM is essentially empty. The most extreme commitment to scene-over-document in the set. Proof that the ground can carry everything. |
| 2 | [galekto.com](https://galekto.com/) | **Structure — closest analog** | An individual's portfolio where the name *is* the hero element, rendered letter by letter (`E V R E N`), over a WebGL ground. The nearest thing to Melvin's own situation. |
| 3 | [noth.in](https://www.noth.in/) | **Brand system** | A loading counter to `100`. Conventional nav (WORKS/STUDIO/CONTACT). Facts as corner metadata — "Creative studio in Paris" sits in a corner, never the headline. Terse one-line project descriptors: "UTOPIA — Where taste meets meaning." Bracketed section labels: `( The Studio )`, `( 07 )`. |
| 4 | [cinetica.studio](https://www.cinetica.studio/) | **Hero hook** | Display words split around a nested paragraph — `EXPERIENCE / THE` … copy … `IMPOSSIBLE`. Themed loading copy: "LOADING NEW REALITY…". A **live clock and date** running on the page — exactly the kind of nuanced eccentricity Melvin asked for. Parenthetical section labels: `(WHO WE ARE)`. |
| 5 | [iancoad.com](https://www.iancoad.com/) | **Micro-detail / restraint** | A cinematographer's reel. The *entire* homepage is four fields: Title, Director, Producer, Awards. Work first, credits as metadata, zero prose. The most disciplined restraint in the set — and on-theme given Melvin's filmmaking interest. |
| 6 | [daiki-design.com](https://daiki-design.com/) | **Mood** | One enormous kanji (誠 — sincerity) as a graphic element. Bilingual. Its stated philosophy is *"functional logic over mere ornamentation"* — which is precisely the 70/30 tension this project is navigating. |
| 7 | [ricardochance.com](https://www.ricardochance.com/) | **Structure — the recruiter read** | Hero pattern: role label → memorable claim → substantiating paragraph. "I build web experiences people remember." Then credibility, client logos, FEATURED WORK. Directly supports putting featured work on Home. |
| 8 | [armory.framer.ai](https://armory.framer.ai/) | **Micro-detail only** | Animated stat counters, word-by-word paragraph reveals, `//2026` date prefixes on case studies. |

### Honest notes on the set

- **The set is unusually coherent** — dark, dimensional, motion-led, terse. The
  process rule warns that contradictory references confuse direction; that
  mostly isn't a problem here.
- **Two outliers.** *Armory* is a Framer template for an AI agency — productized
  and marketing-shaped, the weakest fit for a personal portfolio; take its
  micro-details and nothing structural. *Ricardo Chance* is copy-heavy services
  marketing, which contradicts the terseness of the other six — take its hero
  *pattern*, not its volume of words.

---

## Patterns adopted into the Home build

1. **A designed loading sequence** — validated by Nothin' (counts to 100) and
   Cinetica ("LOADING NEW REALITY…"). Already planned; now evidence-backed.
2. **Facts in the corners as small system text**, never in the headline stack.
   Solves the "four stacked text elements" problem in the original hero.
3. **Per-character name reveal**, per Galekto. Melvin's name is his hero element too.
4. **Terse one-line project descriptors**, per Nothin'.
5. **Bracketed/parenthetical section labels** as a typographic tic.
6. **A live system detail** — clock, date, or coordinates — per Cinetica. Cheap,
   distinctive, and reads as craft.

---

## Still blocked — Melvin has to supply

I could not see these sites, so these cannot be inferred:

- [ ] **Palette.** Direction is confirmed dark/moody; exact hues are not.
      Current ember `#ff6b35` → violet `#8b5cf6` remains a **placeholder**.
- [ ] **Type pair.** Current Instrument Serif + Inter is a **placeholder**.
      Lower stakes now that type isn't the focal point, but still unchosen.
- [ ] **The field's character** — nebula vs aurora vs abstract.
- [ ] **The portrait's grade**, and which language sits left/centre/right.

Do not let the placeholder values in `site/src/` harden into decisions.

---

## Working method

1. **Three rounds, never one prompt**: structure → motion → polish. Applies
   within every page build, not just across phases.
2. **Screenshot self-correction loop**: Melvin screenshots the result, compares
   against these references, lists the visual differences, we fix, repeat.
   **This is where the look actually gets found** — not in a spec document.
3. **Show, don't describe** — feed the actual reference, not adjectives about it.
