/* Malik's Barbers – iPhone WebKit compatibility. Load BEFORE lighting.js.
   Keeps the Android/desktop site and all published panel settings unchanged. */
(function () {
  'use strict';
  var root = document.documentElement;
  var ua = navigator.userAgent || '';
  var isAppleTouch = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isAppleTouch) root.classList.add('ios-webkit');
  try {
    var canvas = document.createElement('canvas');
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) root.classList.add('no-webp');
  } catch (e) { root.classList.add('no-webp'); }

  // iOS Safari <=15.3 lacks structuredClone. The application's presets are JSON data.
  if (typeof window.structuredClone !== 'function') {
    window.structuredClone = function (data) { return JSON.parse(JSON.stringify(data)); };
  }
  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      var out = {};
      for (var i=0;i<entries.length;i++) out[entries[i][0]] = entries[i][1];
      return out;
    };
  }

  // Native <dialog> was only introduced in Safari 15.4. Keep editors accessible.
  ['panel','cardsPanel','panelEditor','lookStudio'].forEach(function (id) {
    var dialog = document.getElementById(id);
    if (!dialog) return;
    if (!('open' in dialog)) Object.defineProperty(dialog,'open',{
      get:function(){return this.hasAttribute('open');},
      set:function(value){if(value)this.setAttribute('open','');else this.removeAttribute('open');}
    });
    if (typeof dialog.show !== 'function') {
      dialog.show = function () { this.setAttribute('open',''); };
    }
    if (typeof dialog.showModal !== 'function') {
      dialog.dataset.polyfilled='true';
      dialog.showModal = function () { this.setAttribute('open',''); this.setAttribute('aria-modal','true'); };
    }
    if (typeof dialog.close !== 'function') {
      dialog.close = function () {
        if (!this.hasAttribute('open')) return;
        this.removeAttribute('open');
        this.removeAttribute('aria-modal');
        this.dispatchEvent(new Event('close'));
      };
    }
  });

  var scroller = document.getElementById('scroller');
  var movie = document.getElementById('movie');
  if (!scroller || !movie) return;
  // Videos are rendered, not gesture targets. Let iOS pan vertically over the film.
  movie.setAttribute('playsinline','');
  movie.setAttribute('webkit-playsinline','');
  movie.muted = true;
  movie.playsInline = true;
  movie.preload = 'auto';

  if (!isAppleTouch) return;
  // Older WebKit may ignore requests for individual video frames until the video
  // has been unlocked by a real touch. Do this once, without hijacking playback.
  var unlocked = false;
  function unlockMovie() {
    if (unlocked) return;
    unlocked = true;
    if (movie.readyState === 0 && typeof movie.load === 'function') {
      try { movie.load(); } catch (e) {}
    }
    try {
      var played = movie.play();
      if (played && typeof played.then === 'function') {
        played.then(function () {
          if (!movie.dataset.guided) movie.pause();
        }, function () {});
      } else if (!movie.dataset.guided) movie.pause();
    } catch (e) {}
  }
  scroller.addEventListener('touchstart', unlockMovie, { passive: true, once: true });
  // If the video doesn't preload on iOS, use the user's first real gesture to
  // request its metadata and make the later seek-to-frame calls possible.

  // Native vertical scrolling is preferred. On old iOS WebKit versions, a video
  // overlay can suppress a pan entirely. Only rescue a gesture after verifying
  // that scrollTop has not moved; don't interfere with sliders, dialogs or cards.
  var gesture = null;
  var ignored = 'button, a, input, select, textarea, dialog, [contenteditable], #scenePanel, #lookStudio, .editing-cards .info-card';
  scroller.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 1 || event.target.closest(ignored)) { gesture = null; return; }
    gesture = { y: event.touches[0].clientY, scroll: scroller.scrollTop, moves: 0, manual: false };
  }, { passive: true });
  scroller.addEventListener('touchmove', function (event) {
    if (!gesture || event.touches.length !== 1) return;
    var delta = gesture.y - event.touches[0].clientY;
    gesture.moves++;
    if (!gesture.manual && gesture.moves > 2 && Math.abs(delta) > 48 &&
        Math.abs(scroller.scrollTop - gesture.scroll) < 1 &&
        scroller.scrollHeight > scroller.clientHeight + 10) gesture.manual = true;
    if (!gesture.manual) return;
    if (event.cancelable) event.preventDefault();
    scroller.scrollTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, gesture.scroll + delta));
    // Keep manual mode until the finger lifts; otherwise inertial scroll fights it.
  }, { passive: false });
  function finishTouch() { gesture = null; }
  scroller.addEventListener('touchend', finishTouch, { passive: true });
  scroller.addEventListener('touchcancel', finishTouch, { passive: true });
})();
