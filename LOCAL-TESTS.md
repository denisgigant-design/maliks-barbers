# Internal validation

The release was exercised over local HTTP using its original films, lighting controller, wall tracks, saved layouts and barber media. The walkthrough uses frames 85, 131 and 206 of the 24 fps films for Opening hours, Booking and Pricing.

| Area | Checks performed |
| --- | --- |
| Code and package | Parsed the HTML and stylesheets, checked the JavaScript and modules, resolved local runtime assets, checked the ZIP and its root-level entry point, and compared the original scene media, wall tracks and published layout data against the source. |
| Desktop and small screens | Used headless Chromium at 1440 × 900, 1366 × 768 and 768 × 1024. Used mobile device emulation at 390 × 844, 320 × 568 and 844 × 390. Checked panel geometry, internal scrolling, visibility and horizontal overflow. |
| WebKit | Ran the actual Linux WebKit engine using an emulated iPhone profile in portrait and landscape. The portrait test decoded the original H.264 tour and drew the packed-alpha barber into its separate WebGL canvas. |
| Tour and glass | Entered through Welcome, reached all three stops, switched repeatedly during travel, dismissed panels by tapping and pressing Escape, checked the departure delay, reversed the film with scrolling and returned to the exterior. |
| Mobile input | Native emulated touch gestures moved the camera forward and backward. Scrolling a drawer exposed additional services while the camera stayed still. Rotating from portrait to landscape preserved the film and frame. |
| Services and studio | Checked all eight names and prices against the supplied HTML. Skin Fade opens the matching style. All four styles, next/previous, touch gestures, back, Escape and focus restoration worked. Opening the studio preserved the active Pricing scene and barber trigger. |
| Empty and populated galleries | The shipped empty slots displayed their labelled room reference. Separate test-only photographs exercised successful loads, multi-angle buttons, mouse dragging and recovery from a missing image. These fixture photographs are excluded from the release. |
| Authoring | Tested independent device edits, marker and panel geometry, silhouette, opacity, blur, rim light, animation duration, smart/saved placement, barber size/shadow, editor docking, reset and save. Checked JSON backup import/export equality, invalid-file rejection, persistence after reload and the three publishable preset exports. |
| Existing tools | Opened the Cards editor, created and exported a text cue. Opened the triple-press Lighting editor, added a spotlight, changed its intensity and exported its keyframe. Loaded older card, glass, barber, lighting and positioning drafts. |
| Rendering and fallbacks | A software WebGL test compiled and drew the bounded specular shader. A simulated no-WebGL packed-alpha client displayed the supplied barber poster. A deliberately unavailable tour used extracted room stills. The panels worked with GSAP disabled and with reduced motion enabled. |
| Loading | Normal test flows completed without unexpected missing assets, uncaught runtime errors or external runtime requests. Initial loads selected one tour. The barber media and Look Studio loaded on demand. |

## Flat ZIP recheck

The archive contains 38 root-level files and zero directory entries. The extracted site was checked under a local project URL. The section navigation, both film layouts, original barber playback, preset backup, gallery filenames and room-still fallback resolved with all files at the same level.

## Device and asset limits

Phone dimensions, touch input and an iPhone user agent were emulated. Physical iPhone Safari, iPhone Chrome and Android Chrome playback, thermal behaviour and device-specific performance remain unverified. Production hosting and cache behaviour are outside these local checks.

The release contains the photographic gallery implementation and four empty haircut slots. Rotatable 3D haircut models are unavailable in the supplied assets. Changes between photographed angles require at least two supplied views of the selected style.
