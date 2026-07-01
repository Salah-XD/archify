# Archify — Launch Film (Spec)

**Date:** 2026-07-01
**Supersedes:** nothing — extends the existing `archify-video/` waitlist piece into a launch cut.
**Status:** Approved direction (brainstorming). Ready for implementation.

## Goal

A ~35s launch film announcing **Archify is now live on the Chrome Web Store**. Fixes
the current video's two problems: (1) it opens cold with no hook, (2) its CTA is
still "Join the waitlist." Adds an "edited" feel via an **on-brand 3D parallax
camera** without breaking the locked draughtsman brand.

## Fixed parameters

- **Aspect / size:** 16:9, 1920×1080.
- **Length:** ~35s.
- **Audio:** NONE in the render. User adds SFX/music in post — so beats must land on
  clean, predictable timings. No `<audio>` element, no `bgm.mp3`.
- **Direction:** On-brand 3D parallax (paper/blueprint brand, precise/mechanical
  camera — not glossy hype).
- **Content mix:** mostly schematic + ONE real product beat.
- **Brand source of truth:** `archify-video/design.md` (palette, type, motifs, motion
  rules, hyperframes composition contract). Do not deviate from palette/type.

## Key launch changes vs the waitlist video

- CTA: `Join the waitlist` → **`Install on Chrome`** + `archify.salahxd.dev`.
- Endcard tag: add **"Now live on the Chrome Web Store."**
- New opening **hook** scene (did not exist before).
- New **real product** beat (the waitlist video was 100% abstract).
- New **positioning** beat (DevTools / Wappalyzer / Archify).
- A **3D camera layer** (perspective + Z-parallax + push/pull + rack-focus)
  applied across all scenes.

## Scene breakdown (6 scenes, sequential, `data-track-index="1"`)

| # | Time | Beat | On-screen copy | 3D camera move |
|---|------|------|----------------|----------------|
| 1 | 0.0–4.0s | **Hook** | H1: "What is this page actually running?" · kicker: `▪ framework? · components? · who's reading your data?` | Fast push-in through a ghosted line-drawn web-page wireframe (layers at different Z). Corner ticks snap. Mechanical shutter register-shift out. |
| 2 | 4.0–10.0s | **Hover (REAL beat)** | Real screenshot `01-hover` (Spotify). Panel reads `FRAMEWORK Next.js 96%`, `LIBRARY MUI 75%`. Line: "Hover any element — see exactly what it's made of." | Screenshot enters on a tilted 3D plane, camera rack-focuses (CSS blur→sharp) onto the panel, slight settle. |
| 3 | 10.0–18.0s | **The trace** | kicker `▪ ARCHITECTURE TRACE`. Line: "Click anything. See what it really triggers." Nodes: `a button → <LoginButton/> → POST /api/login → JWT · localStorage → /dashboard` | Redline square nodes snap top→bottom (`back.out(2)`), hairline connectors draw (`scaleY 0→1`); camera glides DOWN the trace with node parallax. |
| 4 | 18.0–24.0s | **Security** | kicker `▪ CLIENT-SIDE SECURITY`. "3 third-party scripts can read this field." → "Know who's watching — before they do." Confidence gauge fills. | Push toward the finding; gauge fills to redline; secondary text drifts (ambient). |
| 5 | 24.0–28.0s | **Positioning** | Three staggered lines: "DevTools shows the code." / "Wappalyzer shows the stack." / "**Archify shows the system.**" (last in redline) | Three planes enter at different Z-depths, converging. |
| 6 | 28.0–35.0s | **Endcard / CTA** | `▪ ARCHIFY` · "Understand Software." · **`Install on Chrome`** · `archify.salahxd.dev` · "Free · Open source · Nothing leaves your browser." · **"Now live on the Chrome Web Store."** | Camera pulls all the way back to reveal the full film as one blueprint sheet; ticks re-seat in corners. |

## Motion / 3D approach (honest constraints)

- HyperFrames renders real DOM frames — **no native motion blur**. The "After
  Effects" feel is approximated with: `perspective` on a camera wrapper, `translateZ`
  layer separation (parallax), push-in/pull-back on Z, CSS `filter: blur()` rack-focus,
  speed-ramped eases (`expo.out`, `back.out`, `power4.inOut`), and staggered entrances.
- Respect design.md motion rules: `tl.fromTo()` only; no two transform tweens on one
  element (use nested wrappers for camera vs content transforms); vary eases; start
  each scene's first tween 0.1–0.3s late; one ambient motion per scene; hard cuts
  between scenes except the ONE mechanical shutter into scene 2's flow.
- Determinism only: no `Math.random`, `Date.now`, `repeat:-1`, or network fetches.

## Assets

- Reuse `archify-video/` project (hyperframes). New scene files in `compositions/`.
- Copy real beat image `assets/screenshots/store/01-hover-1280x800.png` into
  `archify-video/assets/` and embed it in scene 2.
- Fonts (Inter, JetBrains Mono) auto-embed via hyperframes `@font-face` from declared
  `font-family` — no `<link>`.

## Composition contract (per design.md / hyperframes)

- Root `#root` 1920×1080, `position:relative; overflow:hidden`, ≥80px safe padding.
- 6 scene sub-comps via `data-composition-src`, sequential on `data-track-index="1"`.
- Every timed element: `class="clip"` + `data-start` + `data-duration` + `data-track-index`.
- Each sub-comp: `<template>`-wrapped root, inner `data-composition-id` == host slot id
  == `window.__timelines` key; timelines paused + registered on `window.__timelines`.
- **No `<audio>` track** (audio added in post).

## Acceptance

- `npm run check` passes clean (no lint/validate/inspect errors).
- Renders to MP4 at 1920×1080, ~35s.
- Hook reads in first 2s; CTA says "Install on Chrome"; one real product beat present;
  visible 3D camera motion in every scene; brand palette/type unchanged.

## Out of scope (YAGNI)

- Vertical 9:16 cut (can be a follow-up adaptation).
- Voiceover / TTS.
- Any new brand colors or a second sans family.
