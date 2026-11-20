/* Published panel layouts for Malik’s Barbers */
window.MALIKS_PANEL_PRESETS = {
  "desktop": {
    "hours": {
      "width": 43,
      "height": 82,
      "x": 54,
      "y": 50,
      "glass": "#1b2520",
      "border": "#cbb57f",
      "lettering": {
        "depth": 2,
        "yaw": -45,
        "pitch": -2.5,
        "roll": -17.5,
        "bend": 1.5,
        "width": 18,
        "x": 94.7,
        "y": 24.1,
        "glow": "#00ff00",
        "strength": 100
      },
      "fields": {}
    },
    "contact": {
      "width": 64,
      "height": 78,
      "x": 52,
      "y": 41,
      "glass": "#0c2904",
      "border": "#000000",
      "lettering": {
        "depth": -2,
        "yaw": 20,
        "pitch": -17,
        "roll": -39,
        "bend": 2.5,
        "width": 26,
        "x": 0,
        "y": 17.6,
        "glow": "#0c4005",
        "strength": 100
      },
      "fields": {
        "address": {
          "size": 13
        },
        "description-1": {
          "text": ""
        },
        "button-0": {
          "size": 10,
          "color": "#000000"
        }
      }
    },
    "prices": {
      "width": 40,
      "height": 88,
      "x": 21,
      "y": 34,
      "glass": "#1c2420",
      "border": "#cdb783",
      "lettering": {
        "depth": 14,
        "yaw": 19,
        "pitch": 7.5,
        "roll": -8.5,
        "bend": -1,
        "width": 23,
        "x": 47.3,
        "y": 44.4,
        "glow": "#0000ff",
        "strength": 0
      },
      "fields": {}
    }
  },
  "mobile": {
    "hours": {
      "width": 80,
      "height": 72,
      "x": 52,
      "y": 29.91104657504615,
      "glass": "#1b2520",
      "border": "#cbb57f",
      "lettering": {
        "depth": -4,
        "yaw": 4.5,
        "pitch": 3,
        "roll": 6,
        "bend": 0,
        "width": 29,
        "x": 94.9,
        "y": 33,
        "glow": "#000000",
        "strength": 100
      },
      "fields": {}
    },
    "contact": {
      "width": 58,
      "height": 41,
      "x": 72,
      "y": 43,
      "glass": "#012102",
      "border": "#000000",
      "lettering": {
        "depth": -9,
        "yaw": 27,
        "pitch": 12,
        "roll": -22.5,
        "bend": -4.5,
        "width": 38,
        "x": 41.6,
        "y": 25.1,
        "glow": "#000000",
        "strength": 100
      },
      "fields": {
        "description-1": {
          "text": "",
          "size": 30
        },
        "address": {
          "size": 14
        }
      }
    },
    "prices": {
      "width": 62,
      "height": 81,
      "x": 28,
      "y": 15,
      "glass": "#1c2420",
      "border": "#cdb783",
      "lettering": {
        "depth": -4,
        "yaw": -26.5,
        "pitch": -8,
        "roll": -9,
        "bend": 2,
        "width": 41,
        "x": 93.5,
        "y": 43.4,
        "glow": "#39b772",
        "strength": 67
      },
      "fields": {}
    }
  }
};

/* Pricing barber overlay: enabled for everyone by the published site. */
/* Malik's Barbers – transparent pricing barber overlay.
   No GIF, canvas or background removal runs on the visitor's phone.
   The VP9 WebM file already contains an alpha channel. */
(() => {
  'use strict';
  const scene = document.querySelector('.scene');
  const panel = document.getElementById('scenePanel');
  if (!scene || !panel || document.getElementById('pricingBarber')) return;

  const style = document.createElement('style');
  style.textContent = `
    #pricingBarber {
      position: absolute;
      left: var(--pricing-barber-x, 50%);
      bottom: var(--pricing-barber-bottom, 0.8%);
      height: var(--pricing-barber-height, 87%);
      width: auto;
      aspect-ratio: 415 / 1207;
      transform: translateX(-50%) translateY(6px);
      z-index: 2;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 450ms ease-out, transform 450ms ease-out, visibility 450ms;
      isolation: isolate;
      contain: layout style;
    }
    #pricingBarber.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
    #pricingBarber::after {
      content: '';
      position: absolute;
      height: 2%;
      width: 58%;
      left: 21%;
      bottom: 0.5%;
      z-index: -1;
      background: rgba(0,0,0,0.58);
      filter: blur(7px);
      border-radius: 100%;
    }
    #pricingBarber video {
      position: relative;
      display: block;
      height: 100%;
      width: 100%;
      object-fit: contain;
      filter: drop-shadow(3px 7px 5px rgba(0,0,0,.42))
              brightness(.91) saturate(.94);
    }
    @media (max-aspect-ratio: 1/1) {
      #pricingBarber {
        left: var(--pricing-barber-x-mobile, 50%);
        bottom: var(--pricing-barber-bottom-mobile, 2%);
        height: var(--pricing-barber-height-mobile, 72%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      #pricingBarber { transition: none; }
    }
  `;
  document.head.append(style);

  const shell = document.createElement('div');
  shell.id = 'pricingBarber';
  shell.setAttribute('aria-hidden','true');
  const video = document.createElement('video');
  video.id = 'pricingBarberVideo';
  video.muted = true;
  video.playsInline = true;
  video.autoplay = false;
  video.loop = false; // the one-second movement plays once; final pose remains visible
  video.preload = 'none';
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.setAttribute('disablepictureinpicture','');
  shell.append(video);
  // Behind the red pricing card and navigation, in front of the scene footage.
  scene.insertBefore(shell, panel);

  let showing = false;
  let loaded = false;
  const sync = () => {
    const active = panel.dataset.action === 'prices' &&
      !panel.hidden && !panel.inert && !document.getElementById('panelEditor')?.open;
    if (active === showing) return;
    showing = active;
    shell.classList.toggle('is-visible', showing);
    if (showing) {
      if (!loaded) {
        loaded = true;
        video.src = 'pricing-barber-transparent.webm';
        video.load();
      }
      try { video.currentTime = 0; } catch (_) {}
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    } else {
      video.pause();
      // Reset only once hidden; does not interfere with scene travel smoothness.
      try { if (video.readyState >= 1) video.currentTime = 0; } catch (_) {}
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(panel, {attributes:true, attributeFilter:['hidden','inert','data-action']});
  const panelEditor = document.getElementById('panelEditor');
  if (panelEditor) observer.observe(panelEditor, {attributes:true, attributeFilter:['open']});
  sync();
})();
