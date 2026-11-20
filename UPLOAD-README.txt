MALIK'S BARBERS — SMOOTHER NAVIGATION (20 NOVEMBER 2026)

GitHub Pages installation
1. Extract this ZIP.
2. Upload/replace all 19 supplied files in the ROOT of your existing
   denisgigant-design/maliks-barbers repository (the folder with index.html).
3. KEEP your existing lighting.js, walkthrough.mp4, mobile-tour.mp4,
   storefront.jpg, mobile-front.jpg and other photos/videos. Do not delete them.
4. Commit the upload. On iPhone, reopen the site and refresh; a fresh test URL
   can end in ?smooth=2 to avoid a cached HTML page.

This update changes the existing website, not its design or the published
wall/sign/card positions. Your Panels and Cards editors remain available.

Changes
- Clickable clippers and wall signs now use bounded, guided transitions.
- Forward travel uses continuous inline video playback when supported.
- Reverse/unavailable-video travel uses smooth easing with limited media seeks.
- On iPhone, the seek fallback never spams concurrent requests.
- Scroll/lighting updates are paced and no longer duplicated per animation tick.
- Old decoded video frames cannot replace the wall view after a successful arrival.
- A stalled iPhone video no longer makes the click jump instantly to the end.
- iOS clipper animation and blurred scene backdrop use lighter GPU effects.
- Motion-reduction preference and user interruption remain supported.
- Versioned CSS/JavaScript references force a new asset load after publishing.

Testing: JavaScript syntax checks, ZIP integrity, browser-based desktop and
emulated iPhone navigation checks, including a simulated unavailable-video
case. The earlier real-video browser simulation also passed. Not tested on a
physical iPhone; final performance depends on iOS hardware and MP4 encoding.

Do not upload patch_smooth.py, test_smooth.py, test_playback.py or test_video.mp4;
these are internal work files and are intentionally NOT in this ZIP.
