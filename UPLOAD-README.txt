MALIK'S BARBERS — WALL LETTERING / PANELS EDITOR UPDATE
========================================================
Based on the existing Malik's Barbers walkthrough (19 November 2026).

UPLOAD TO EXISTING GITHUB REPOSITORY
-----------------------------------
https://github.com/denisgigant-design/maliks-barbers

1. Extract Malik-Barbers-Wall-Panels-Update.zip.
2. Open the repository and use Add file > Upload files.
3. Upload these seven files to the ROOT of the repo, not an assets folder:
   - index.html       (replace)
   - shop.css         (replace)
   - cards.js         (replace)
   - panel-presets.js (NEW; required for the editor's publish workflow)
   - open-hours.png   (replace/add)
   - bookings.png     (replace/add; retained as an optional art asset)
   - pricing-services.png (replace/add)
4. Commit the upload. Refresh the live GitHub Pages website. A hard refresh
   may be needed if your browser has kept an older cached version.

DO NOT DELETE THE EXISTING MEDIA FILES OR LIGHTING.JS:
   lighting.js, storefront.jpg, mobile-front.jpg, walkthrough.mp4,
   mobile-tour.mp4, tour.mp4, and the other existing .jpg files.
   These are NOT contained in this small update ZIP.

NEW INTERACTION SEQUENCE
------------------------
- ENTER disappears immediately when clicked.
- The video moves to the couch/TV; only the large transparent OPEN HOURS
  lettering with matching emerald-gold glow appears at that viewpoint.
  No marker or long line runs through it.
- Touch the lettering once to open the weekday/time panel. No duplicate
  OPEN HOURS heading appears inside that panel.
- The BOOKING viewpoint shows just a clean gold BOOKING(S) wall heading;
  tap it to open the narrower glass information panel. No BOOKING heading
  is repeated inside the panel.
- The PRICING viewpoint shows the transparent Pricing & Services image;
  tap it to reveal the glass menu. Services remain ivory-white and prices
  are vivid neon red.
- Off-view navigation markers retreat to the screen edges, with small
  connector stubs. They do not cross the active panel.
- Tap X to close a panel. You can still press and hold a panel to move it.

PANELS EDITOR
-------------
- Tap the new Panels button beside Cards and Lighting.
- Select OPEN HOURS, BOOKINGS or PRICING & SERVICES.
- Change panel width, height, horizontal position and vertical position
  using independent sliders. The current panel updates live.
- Choose the glass tint and border colour.
- Select a piece of text (or tap the text inside the panel), then change
  the wording, text colour or individual text size.
- Adjust wall lettering width, position, glow colour and glow intensity.
- Use Reset this panel to return one panel to its defaults.
- Changes are saved in THIS device/browser automatically. Existing saved
  panel positions are read from the previous website version.

IMPORTANT — PUBLISHING YOUR CHANGES FOR ALL VISITORS
---------------------------------------------------
Static GitHub Pages cannot automatically publish edits from your browser.
Once you are happy with the settings in Panels, tap EXPORT SITE PRESET.
This downloads a new file named panel-presets.js. Upload and REPLACE
panel-presets.js in the GitHub repository root. This makes the exported
panel settings the defaults for viewers. Desktop and mobile settings are
separate; if you edit both, export once after editing each version and
upload each exported preset in sequence while retaining the published
other-device settings. Local browser edits always override the published
preset on that one device; Reset this panel returns to the starter look.

NOTE: I tested the controls and responsiveness using a browser with the
original videos unavailable locally. Exact lettering/panel alignment against
moving footage should be checked on the live site, and you can fine-tune it
from Panels without editing source code.
