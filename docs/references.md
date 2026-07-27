# References

Reference websites Melvin likes, compartmentalized by their **differences** so
we can pick a direction deliberately. Two rounds:

- **Round 2 (current, 2026-07-27)** — for the abstract/editorial hero direction.
  Look-first. Fill the table as links come in.
- **Round 1 (2026-07-24)** — the original 8, gathered for the earlier direction.
  Kept as history further down; still useful, but predates the "no single field"
  and abstract/editorial steer.

---

## Round 2 — abstract / editorial hero (2026-07-27)

**How to use this table:** each column isolates ONE axis of difference so we can
mix-and-match rather than copy a whole site. When Melvin drops a link, we fill a
row from a quick pass, then a deeper deconstruction below.

| # | Site | What Melvin likes (the specific part) | Art style | Motion technique | Likely tool stack | Steal / avoid |
|---|------|----------------------------------------|-----------|------------------|-------------------|---------------|
| _ | _(paste link)_ | _ | _ | _ | _ | _ |

### Per-site deconstruction (filled after study)
<!-- Template — copy per site:
#### <site>
- **The part Melvin flagged:**
- **Art style:** (palette, type register, texture, density, mood)
- **Motion technique:** (scroll-scrub / WebGL shader / CSS transforms / video / physics)
- **How it was likely built:** (framework, libs, rendering approach — evidence)
- **Difficulty to reproduce in our stack:** (easy / medium / hard + why)
- **Verdict:** steal what, avoid what
-->

_(empty — awaiting Melvin's links)_

### Axes we're sorting on
The point of Round 2 is to separate these so we choose each independently:
- **Structure** — one epic scroll sequence vs. discrete morphing beats vs. static hero.
- **Art style** — minimal/editorial vs. maximalist/dimensional; palette; type register.
- **Motion source** — WebGL/shader, DOM/CSS, scroll-scrubbed video, or physics sim.
- **Field signal** — must stay field-agnostic (no nebula/neural-net/binary clichés).
- **Feasibility** — how hard in Vite + R3F + GSAP/Lenis, and whether it needs assets made.

---

## Round 1 — the original 8 (2026-07-24) · history

Supplied by Melvin 2026-07-24. **Structure and copy studied; the sites were
never seen** — screenshots unavailable in this environment, so conclusions are
from DOM, copy, and structure only. Palette/type conclusions are therefore NOT
here. Note: this round predates the abstract/editorial + "no single field" steer,
so weigh it against the current direction before adopting anything.

### The vibe sentence (Round 1 draft)
> A dark, dimensional space that feels alive and moves with weight — where the
> craft is in the depth and the motion, and the words stay out of the way.

### What Melvin was drawn to (Round 1)
Asked directly, he chose **darkness and mood**, **3D/WebGL depth**, and **motion
and transitions** — **not** huge sparse typography. Impact comes from the scene
and its motion; type stays quiet and legible. (Still-relevant finding, but
revisit under the new editorial steer, which may push type louder than Round 1.)

### The references
| # | Site | Job | What to steal |
|---|---|---|---|
| 1 | [igloo.inc](https://www.igloo.inc/) | **Hero impact** | Entire page is canvas — DOM essentially empty. Most extreme scene-over-document commitment. Proof the ground can carry everything. |
| 2 | [galekto.com](https://galekto.com/) | **Structure — closest analog** | Individual portfolio where the name IS the hero, rendered letter by letter (`E V R E N`) over a WebGL ground. Nearest to Melvin's situation. |
| 3 | [noth.in](https://www.noth.in/) | **Brand system** | Loading counter to 100. Conventional nav. Facts as corner metadata. Terse one-line project descriptors. Bracketed labels `( 07 )`. |
| 4 | [cinetica.studio](https://www.cinetica.studio/) | **Hero hook** | Display words split around a nested paragraph. Themed loading copy. A live clock/date on the page. Parenthetical labels `(WHO WE ARE)`. |
| 5 | [iancoad.com](https://www.iancoad.com/) | **Micro-detail / restraint** | Cinematographer's reel — homepage is four fields (Title/Director/Producer/Awards). Work first, zero prose. Most disciplined restraint in the set. |
| 6 | [daiki-design.com](https://daiki-design.com/) | **Mood** | One enormous kanji (誠) as graphic element. Bilingual. Philosophy: "functional logic over mere ornamentation." |
| 7 | [ricardochance.com](https://www.ricardochance.com/) | **Structure — recruiter read** | Hero pattern: role label → memorable claim → substantiating paragraph → client logos → FEATURED WORK. Supports work-on-home. |
| 8 | [armory.framer.ai](https://armory.framer.ai/) | **Micro-detail only** | Animated stat counters, word-by-word paragraph reveals, `//2026` date prefixes. (Framer template — take micro-details, nothing structural.) |

### Round 1 notes
- The set is unusually coherent — dark, dimensional, motion-led, terse.
- Outliers: *Armory* (Framer AI-agency template, weakest fit — micro-details only);
  *Ricardo Chance* (copy-heavy — take the hero pattern, not the word volume).

### Patterns already adopted into the build
1. A designed loading sequence (validated by Noth.in + Cinetica).
2. Facts in the corners as small system text, never in the headline.
3. Per-character name reveal (Galekto).
4. Terse one-line project descriptors (Noth.in).
5. Bracketed/parenthetical section labels as a typographic tic.
6. A live system detail — clock/date/coordinates (Cinetica).

---

## Working method (applies to both rounds)
1. **Three rounds, never one prompt:** structure → motion → polish.
2. **Screenshot self-correction loop:** screenshot the result, compare to these
   references, list the differences, fix, repeat. This is where the look gets found.
3. **Show, don't describe** — feed the actual reference, not adjectives.
