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

/* PRICING BARBER OVERLAY V3 — keep this block after MALIKS_PANEL_PRESETS.
   Source is preserved when the existing Panels > Export site preset button is used.
   The independent barber-preset.js file is the only file needed for publishing later adjustments. */
(() => {
  'use strict';
  if (window.MALIKS_BARBER_V3_READY) return;
  window.MALIKS_BARBER_V3_READY = true;

  const scene = document.querySelector('.scene');
  const panel = document.getElementById('scenePanel');
  const panelEditor = document.getElementById('panelEditor');
  const panelChoice = document.getElementById('pePanel');
  if (!scene || !panel || !panelEditor || !panelChoice) return;

  const device = document.documentElement.classList.contains('mobile-tour') ||
    matchMedia('(max-aspect-ratio: 1/1)').matches ? 'mobile' : 'desktop';
  const allDevices = ['desktop','mobile'];
  const defaults = {
    desktop: {enabled:true, x:70, bottom:0.8, size:86, depth:0, layer:'behind-card', shadow:55},
    mobile:  {enabled:true, x:67, bottom:1.5, size:57, depth:0, layer:'behind-card', shadow:48}
  };
  let published = structuredClone(defaults);
  const storageKey = d => 'maliks-pricing-barber-v3-' + d;
  const clamp = (x,lo,hi) => Math.min(hi, Math.max(lo, Number(x) || 0));
  function loadLocal(d) {
    try { const v = JSON.parse(localStorage.getItem(storageKey(d)));
      return v && v.version === 3 && v.settings ? v.settings : null;
    } catch {return null;}
  }
  function value(d) {return {...defaults[d],...published[d],...(loadLocal(d) || {})};}
  function save(d, v) {
    try {localStorage.setItem(storageKey(d), JSON.stringify({version:3,settings:v}));}
    catch (_) {status.textContent='Local storage unavailable. Export the preset to save your changes.';}
  }

  const css = document.createElement('style');
  css.id = 'pricing-barber-style-v3';
  css.textContent = `
    #pricingBarber { position:absolute; box-sizing:border-box; width:auto;
      aspect-ratio:415 / 1207; pointer-events:none; visibility:hidden; opacity:0;
      transform:translateX(-50%) translateY(7px);
      transition:opacity 300ms ease-out, transform 300ms ease-out, visibility 300ms;
      contain:layout style; isolation:isolate; }
    #pricingBarber.is-visible {visibility:visible;opacity:1; transform:translateX(-50%) translateY(0);}
    #pricingBarber::after {content:"";position:absolute;z-index:-1;bottom:-.65%;left:10%;width:80%;height:3%;
      border-radius:100%;background:#000;opacity:var(--barber-shadow-alpha,.55);
      filter:blur(var(--barber-shadow-blur,8px));transform:scaleX(1.1);pointer-events:none;}
    #pricingBarberVideo {position:relative!important;inset:auto!important;width:100%!important;
      height:100%!important;display:block;object-fit:contain;pointer-events:none;
      filter:drop-shadow(3px 5px 4px rgb(0 0 0 / var(--barber-shadow-alpha,.55))) brightness(.94) saturate(.95);}
    #barberEditSection {margin-top:13px;}
    #barberEditSection[hidden] {display:none!important;}
    #barberEditSection .barber-note {font-size:11px;line-height:1.4;color:#d9d1bc;margin:6px 0 9px;}
    #barberEditSection .barber-control {display:block;margin:11px 0 6px;}
    #barberEditSection .barber-control > span {display:flex;justify-content:space-between;gap:10px;align-items:center;}
    #barberEditSection .barber-control output {font-size:12px;color:#baf4d0;}
    #barberEditSection .barber-control input[type=range] {width:100%;min-height:25px;margin-top:3px;}
    #barberEditSection select {width:100%;min-height:35px;}
    #barberEditSection button {font:600 12px/1.25 Arial,sans-serif;min-height:36px;
      border:1px solid #d2b77c77;border-radius:8px;background:#20352a;color:#f8eddd;padding:7px 9px;}
    #barberEditSection .barber-ctrl-row {display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}
    #barberEditSection .barber-ctrl-row > button {flex:1;}
    #barberEditSection .barber-ctrl-row > button.export {background:#d7bb81;color:#16251e;font-weight:800;}
    #barberEditSection .barber-nudges {display:flex;gap:6px;justify-content:space-evenly;align-items:center;margin:5px 0;}
    #barberEditSection .barber-nudges button {min-width:42px;font-size:16px;}
    #barberEditSection .barber-warning {font-size:11px;color:#f3d4a6;}
    @media(max-width:700px) {
      #tourNav .door-dot {--clipper-size:13px!important;}
      #tourNav .door-dot span {font-size:9px!important;letter-spacing:.075em!important;
        top:calc(64% + 15px)!important;}
      #barberEditSection .barber-ctrl-row button {min-height:38px;}
    }
    @media(prefers-reduced-motion:reduce) {#pricingBarber {transition:none;}}
  `;
  document.head.append(css);

  const shell = document.createElement('div');
  shell.id = 'pricingBarber';
  shell.setAttribute('aria-hidden','true');
  const movie = document.createElement('video');
  movie.id = 'pricingBarberVideo';
  movie.muted = true;
  movie.playsInline = true;
  movie.autoplay = false;
  movie.loop = false;
  movie.preload = 'none';
  movie.disablePictureInPicture = true;
  movie.setAttribute('playsinline', '');
  movie.setAttribute('webkit-playsinline', '');
  movie.setAttribute('disablepictureinpicture','');
  shell.append(movie);
  scene.append(shell);

  const editorSection = document.createElement('fieldset');
  editorSection.id = 'barberEditSection';
  editorSection.className = 'pe-group';
  editorSection.hidden = true;
  editorSection.innerHTML = `
    <legend>Barber video placement</legend>
    <p class="barber-note">Adjust the real transparent video. Changes preview instantly and save only on your device until exported.</p>
    <label class="barber-control" for="bvEnabled"><span>Show barber <input type="checkbox" id="bvEnabled" style="width:auto;flex:0 0 auto"></span></label>
    <label class="barber-control" for="bvDevice">Preset to edit
      <select id="bvDevice"><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select>
    </label>
    <p class="barber-warning" id="bvDeviceNote" hidden>You're editing a different screen size. Switch devices for an accurate live preview.</p>
    <label class="barber-control" for="bvX"><span>Left / right <output id="bvXOut"></output></span>
      <input type="range" id="bvX" min="0" max="100" step="0.5"></label>
    <label class="barber-control" for="bvBottom"><span>Up / down <output id="bvBottomOut"></output></span>
      <input type="range" id="bvBottom" min="-25" max="55" step="0.5"></label>
    <div class="barber-nudges" aria-label="Position nudges">
      <button type="button" data-bv-nudge="x:-1" title="Move left">←</button>
      <button type="button" data-bv-nudge="bottom:1" title="Move up">↑</button>
      <button type="button" data-bv-nudge="bottom:-1" title="Move down">↓</button>
      <button type="button" data-bv-nudge="x:1" title="Move right">→</button>
    </div>
    <label class="barber-control" for="bvSize"><span>Barber size <output id="bvSizeOut"></output></span>
      <input type="range" id="bvSize" min="18" max="145" step="1"></label>
    <label class="barber-control" for="bvDepth"><span>Depth (back ↔ forward) <output id="bvDepthOut"></output></span>
      <input type="range" id="bvDepth" min="-65" max="65" step="1"></label>
    <label class="barber-control" for="bvLayer">Layer order
      <select id="bvLayer">
        <option value="behind-all">Behind wall signs and pop-up</option>
        <option value="behind-card">In front of wall art; behind pop-up</option>
        <option value="above-card">In front of pop-up; below navigation</option>
        <option value="above-all">In front of everything</option>
      </select>
    </label>
    <label class="barber-control" for="bvShadow"><span>Shadow strength <output id="bvShadowOut"></output></span>
      <input type="range" id="bvShadow" min="0" max="100" step="1"></label>
    <div class="barber-ctrl-row">
      <button type="button" id="bvReset">Reset selected device</button>
      <button type="button" class="export" id="bvExport">Export barber-preset.js</button>
    </div>
    <p class="barber-note" id="bvStatus" aria-live="polite">Upload exported barber-preset.js to the same GitHub folder as index.html. It contains both desktop and mobile placements.</p>
  `;
  // Pricing-only controls appear immediately under the panel selector on mobile and desktop.
  panelChoice.after(editorSection);
  const $ = id => document.getElementById(id);
  const status = $('bvStatus');
  const keys = {bvX:'x',bvBottom:'bottom',bvSize:'size',bvDepth:'depth',bvShadow:'shadow',bvLayer:'layer',bvEnabled:'enabled'};
  const rangeUnits = {bvX:'%',bvBottom:'%',bvSize:'%',bvDepth:'',bvShadow:'%'};
  let selectedDevice = device;
  $('bvDevice').value = device;
  let showing = false;
  let sourceLoaded = false;

  function applyPosition() {
    const v = value(device);
    // Depth is a separate perspective-like size multiplier; the feet stay anchored.
    const h = clamp(v.size * (1 + v.depth / 150), 5, 205);
    shell.style.left = v.x + '%';
    shell.style.bottom = v.bottom + '%';
    shell.style.height = h + '%';
    shell.style.zIndex = ({'behind-all':2,'behind-card':5,'above-card':7,'above-all':10})[v.layer] || 5;
    shell.style.setProperty('--barber-shadow-alpha',(clamp(v.shadow,0,100)*.009).toFixed(3));
    shell.style.setProperty('--barber-shadow-blur',(4+clamp(v.shadow,0,100)*.11).toFixed(1)+'px');
  }
  function shouldShow() {
    const v = value(device);
    if (!v.enabled) return false;
    if (panelEditor.open) return panelChoice.value === 'prices';
    return panel.dataset.action === 'prices' && !panel.hidden && !panel.inert;
  }
  function sync() {
    applyPosition();
    const visible = shouldShow();
    if (showing === visible) return;
    showing = visible;
    shell.classList.toggle('is-visible', visible);
    if (visible) {
      if (!sourceLoaded) {
        sourceLoaded = true;
        movie.src = 'pricing-barber-transparent.webm';
        movie.load();
      }
      try { if (movie.readyState >= 1) movie.currentTime = 0; } catch (_) {}
      try { const p=movie.play(); if (p && p.catch) p.catch(()=>{}); } catch (_) {}
    } else {
      movie.pause();
      try { if (movie.readyState >= 1) movie.currentTime = 0; } catch (_) {}
    }
  }
  function updateUI() {
    const v = value(selectedDevice);
    $('bvDevice').value = selectedDevice;
    $('bvDeviceNote').hidden = selectedDevice === device;
    for (const [id,prop] of Object.entries(keys)) {
      const el = $(id); if (!el) continue;
      if (id === 'bvEnabled') el.checked = !!v[prop];
      else el.value = v[prop];
      const out = $(id+'Out');
      if(out) out.textContent = String(v[prop]) + (rangeUnits[id] || '');
    }
  }
  function edit(prop, next) {
    const v = value(selectedDevice);
    if (prop==='enabled') v[prop] = !!next;
    else if (prop==='layer') v[prop] = String(next);
    else v[prop] = Number(next);
    save(selectedDevice, v);
    updateUI();
    sync();
  }
  for (const [id,prop] of Object.entries(keys)) {
    const el = $(id); if (!el) continue;
    el.addEventListener(id === 'bvLayer' || id === 'bvEnabled' ? 'change' : 'input', () =>
      edit(prop, id==='bvEnabled' ? el.checked : el.value));
  }
  editorSection.querySelectorAll('[data-bv-nudge]').forEach(button => {
    button.addEventListener('click', () => {
      const [prop,step] = button.dataset.bvNudge.split(':');
      const v = value(selectedDevice);
      edit(prop,clamp(Number(v[prop])+Number(step),prop==='x'?0:-25,prop==='x'?100:55));
    });
  });
  $('bvDevice').addEventListener('change', e=>{selectedDevice=e.target.value;updateUI();});
  $('bvReset').addEventListener('click',()=>{
    if (!confirm('Restore the published barber placement for '+selectedDevice+'?')) return;
    try {localStorage.removeItem(storageKey(selectedDevice));} catch (_) {}
    updateUI();sync();
    status.textContent='Published '+selectedDevice+' barber placement restored on this device.';
  });

  function downloadJS(name, contents) {
    const url=URL.createObjectURL(new Blob([contents],{type:'text/javascript;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=name;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  $('bvExport').addEventListener('click',()=>{
    const out = Object.fromEntries(allDevices.map(d=>[d,value(d)]));
    const code = '/* Published transparent barber positions — desktop and mobile */\n'+
      'window.MALIKS_BARBER_PRESETS = '+JSON.stringify(out,null,2)+';\n';
    downloadJS('barber-preset.js',code);
    status.textContent='Downloaded barber-preset.js with BOTH desktop and mobile settings. Upload it over the old file on GitHub.';
  });

  // Preserve this overlay engine when the original Panels editor exports panel-presets.js.
  // Otherwise its older exporter would accidentally remove the barber feature.
  const otherExport = $('peExport');
  if (otherExport) otherExport.addEventListener('click', async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    const result={};
    for (const d of allDevices) {
      const base=window.MALIKS_PANEL_PRESETS[d];
      let override=null;
      try {
        const raw=JSON.parse(localStorage.getItem('maliks-wall-mount-layout-v2-'+d));
        if (raw && raw.basedOn===JSON.stringify(base)) override=raw.panels;
      } catch(_){}
      result[d]=override||base;
    }
    try {
      const ownScript=[...document.scripts].find(s=>/panel-presets\.js(?:[?#]|$)/.test(s.src));
      if (!ownScript) throw new Error('Panel script source not found');
      const response=await fetch(ownScript.src,{cache:'no-store'});
      if (!response.ok) throw new Error('Could not read existing panel-presets.js');
      const source=await response.text();
      const marker='/* PRICING BARBER OVERLAY V3';
      const pos=source.indexOf(marker);
      if (pos<0) throw new Error('Barber extension missing in source');
      const contents='/* Published panel layouts for Malik’s Barbers */\n'+
        'window.MALIKS_PANEL_PRESETS = '+JSON.stringify(result,null,2)+';\n\n'+source.slice(pos);
      downloadJS('panel-presets.js',contents);
      $('peStatus').textContent='Exported panel-presets.js, preserving the barber controls. Barber positions export separately.';
    } catch (err) {
      $('peStatus').textContent='Export failed: '+err.message+'. Your existing settings are still saved on this device.';
    }
  }, true);

  // Update which controls are shown whenever a different panel is chosen.
  function sectionSync() {
    editorSection.hidden = panelChoice.value !== 'prices';
    sync();
  }
  panelChoice.addEventListener('change', sectionSync);
  document.getElementById('panelsBtn')?.addEventListener('click',()=>setTimeout(sectionSync,0));
  panelEditor.addEventListener('close',sectionSync);
  const observer = new MutationObserver(sectionSync);
  observer.observe(panel,{attributes:true,attributeFilter:['hidden','inert','data-action']});
  observer.observe(panelEditor,{attributes:true,attributeFilter:['open']});
  window.addEventListener('pageshow',sync);
  updateUI();

  // Load the published barber settings separately, so the original panel export
  // and the barber export never overwrite one another.
  const presetScript = document.createElement('script');
  presetScript.src = 'barber-preset.js';
  presetScript.async = true;
  presetScript.onload = () => {
    const incoming=window.MALIKS_BARBER_PRESETS;
    if (incoming && typeof incoming==='object') {
      for (const d of allDevices) if(incoming[d]) published[d]={...defaults[d],...incoming[d]};
      updateUI();sync();
    }
  };
  // The built-in defaults continue working if the optional file has not been uploaded.
  document.head.append(presetScript);
  sectionSync();
})();
