MALIK'S BARBERS – iPhone Safari/Chrome compatibility update
20 November 2026

GitHub Pages deployment:
1. Extract this ZIP.
2. Upload/replace ALL included files in the ROOT of the existing
   denisgigant-design/maliks-barbers repository (same folder as index.html).
3. Do NOT delete your existing lighting.js, walkthrough.mp4, mobile-tour.mp4,
   storefront.jpg, mobile-front.jpg, or other existing site assets.
4. Commit the changes. Open the published website on iPhone Safari or Chrome.
   If it shows an old version, refresh the tab or reopen using the same URL
   with ?iosfix=1 after the address (not part of the site source).

Cross-browser fixes:
- Adds ios-compat.js BEFORE lighting.js to polyfill structuredClone, dialog
  editors and other functions missing on older iOS WebKit versions.
- Makes the scroll container momentum-scrollable on iPhone and provides a
  guarded touch-swipe recovery if Safari blocks native scrolling.
- Lets touches pass through the video surface to the page's scroll area.
- Unlocks inline muted video from a real iPhone touch gesture.
- Keeps walkthrough controls and pop-up cards responsive even if Safari's
  video decoder delays the frame callbacks or refuses to preload the film.
- Provides PNG fallbacks for older iPhones without WebP support.
- Provides CSS fallbacks for older Safari versions without aspect-ratio,
  container units, individual translate and newer RGB colour syntax.
- Preserves existing video editing, lighting settings, published desktop and
  mobile panel presets, neon signs, card styling and the Android experience.
- Forces CSS/JS refresh via updated version tokens in index.html.

This is an upgrade ZIP, not a new project; the MP4s and photography remain in
place in the original repository. This ZIP cannot correct an MP4 encoded with
an iPhone-unsupported codec. For iPhone video playback specifically, both
videos should be MP4/H.264 (AVC) with yuv420p pixel format.
