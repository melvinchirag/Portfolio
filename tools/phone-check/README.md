# Phone check

Drives headless Chrome as a phone (phone size, touch, mobile browser identity, slowed CPU)
and reports errors, frame rate and screenshots. Node built-ins only, nothing to install.
Needs Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (path is in `lib.mjs`).

Run from this folder. Output folders are created where you point them; keep them out of the repo.

| Script | What it answers | Example |
|---|---|---|
| `settle.mjs` | After finger scrolls of uneven length, does the home page ever rest with text cut off? Then taps every menu word. | `node settle.mjs https://melvinchirag.com ../../.phone-out/a 390 664` |
| `audit.mjs` | Screenshot of every hero frame, the Contact section and each page, top and scrolled. | `node audit.mjs http://127.0.0.1:4188 ../../.phone-out/b` |
| `guard.mjs` | With the CPU slowed 20x, does the quality guard lower the canvas resolution, with no errors? | `node guard.mjs http://127.0.0.1:4188/ ../../.phone-out/c 20` |
| `touch.mjs` | Does a finger drag scroll the page from every height of the screen? | `node touch.mjs https://melvinchirag.com ../../.phone-out/d` |
| `menu.mjs` | The phone CM menu (top right): closed, open, every word, tap outside, Escape; add `modes` for reduced motion and no WebGL. | `node menu.mjs http://127.0.0.1:4191 ../../.phone-out/e 390 664 9391 modes` |
| `menu-desktop.mjs` | At 1440x900, is the desktop row and island menu still there and does it navigate? Optional second address to compare geometry. | `node menu-desktop.mjs http://127.0.0.1:4191 ../../.phone-out/f https://melvinchirag.com` |

Sizes worth running: 390x664 (an iPhone with Safari's bars showing: the real visible height),
360x640 (small Android), 390x844 (bars hidden).

Limits: this is Chrome on a laptop GPU. It does not prove Safari behaviour or real phone speed.
In `settle.mjs` the "cut off" lines that name the project cards on The Present are the carousel
peeking by design, not a fault.
