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
        "pitch": 0,
        "roll": -21,
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

/* PRICING BARBER OVERLAY V4 — published editor layouts + iPhone-safe transparent video.
   Keep this block after window.MALIKS_PANEL_PRESETS. Exporter preserves this extension. */
(() => {
  'use strict';
  if (window.MALIKS_BARBER_V4_READY) return;
  window.MALIKS_BARBER_V4_READY = true;
  const scene = document.querySelector('.scene');
  const panel = document.getElementById('scenePanel');
  const panelEditor = document.getElementById('panelEditor');
  const panelChoice = document.getElementById('pePanel');
  if (!scene || !panel || !panelEditor || !panelChoice) return;

  const device = document.documentElement.classList.contains('mobile-tour') ||
    matchMedia('(max-aspect-ratio:1/1)').matches ? 'mobile' : 'desktop';
  const devices = ['desktop','mobile'];
  const defaults = {
    desktop:{enabled:true,x:70,bottom:.8,size:86,depth:0,layer:'behind-card',shadow:55},
    mobile:{enabled:true,x:67,bottom:1.5,size:57,depth:0,layer:'behind-card',shadow:48}
  };
  let published = JSON.parse(JSON.stringify(defaults));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
  const localKey=d=>'maliks-pricing-barber-v3-'+d;
  function readLocal(d){
    try {const v=JSON.parse(localStorage.getItem(localKey(d)));
      return v && (v.version===3||v.version===4) && v.settings ? v.settings : null;
    } catch(_){return null;}
  }
  function value(d){return {...defaults[d],...published[d],...(readLocal(d)||{})};}
  function save(d,v){
    try{localStorage.setItem(localKey(d),JSON.stringify({version:4,settings:v}));}
    catch(_){const s=document.getElementById('bvStatus');if(s)s.textContent='Storage unavailable. Export to save.';}
  }
  function downloadJS(filename,content){
    const blob=new Blob([content],{type:'text/javascript;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),15000);
  }

  const css=document.createElement('style');
  css.id='maliks-barber-v4-styles';
  css.textContent=`
    #pricingBarber {position:absolute;isolation:isolate;aspect-ratio:415 / 1207;pointer-events:none;
      visibility:hidden;opacity:0;transform:translateX(-50%) translateY(7px);
      transition:opacity .28s ease,transform .28s ease,visibility .28s;}
    #pricingBarber.is-visible {visibility:visible;opacity:1;transform:translateX(-50%) translateY(0);}
    #pricingBarber::after {content:"";position:absolute;bottom:-.6%;left:9%;width:82%;height:2.6%;
      z-index:-1;border-radius:50%;background:#000;opacity:var(--barber-shadow-alpha,.5);
      filter:blur(var(--barber-shadow-blur,8px));}
    #pricingBarberVideo,#pricingBarberCanvas,#pricingBarberPoster {position:absolute!important;inset:0!important;
      width:100%!important;height:100%!important;object-fit:contain;pointer-events:none;}
    #pricingBarberPoster {z-index:1;}
    #pricingBarberVideo {z-index:2;filter:drop-shadow(3px 5px 4px rgb(0 0 0 / var(--barber-shadow-alpha,.5))) brightness(.94) saturate(.95);}
    #pricingBarberCanvas {z-index:3;display:none;filter:drop-shadow(3px 5px 4px rgb(0 0 0 / var(--barber-shadow-alpha,.5))) brightness(.94) saturate(.95);}
    #pricingBarber.packed #pricingBarberVideo {z-index:0;opacity:.001;filter:none;}
    #pricingBarber.packed #pricingBarberCanvas.drawn {display:block;}
    #barberEditSection {margin-top:12px;min-width:0;}
    #barberEditSection[hidden] {display:none!important;}
    #barberEditSection .barber-note {font:11px/1.45 Arial,sans-serif;color:#d9d1bc;margin:5px 0 9px;}
    #barberEditSection .barber-control {display:block;margin:11px 0 6px;}
    #barberEditSection .barber-control>span {display:flex;align-items:center;justify-content:space-between;gap:10px;}
    #barberEditSection .barber-control output {font-size:12px;color:#baf4d0;}
    #barberEditSection .barber-control input[type=range] {width:100%;min-height:25px;}
    #barberEditSection select {width:100%;min-height:35px;}
    #barberEditSection button {font:600 12px Arial,sans-serif;min-height:36px;border:1px solid #d2b77c77;
      border-radius:8px;background:#20352a;color:#f8eddd;padding:7px 9px;}
    #barberEditSection .barber-ctrl-row,.barber-nudges {display:flex;gap:5px;flex-wrap:wrap;margin:7px 0;}
    #barberEditSection .barber-ctrl-row>button,.barber-nudges>button {flex:1;}
    #barberEditSection .export {background:#d7bb81;color:#16251e;font-weight:800;}
    .editor-dock {display:flex;gap:4px;margin-left:auto;margin-right:6px;flex-shrink:0;}
    .editor-dock button {min-width:32px;min-height:34px;border-radius:8px!important;
      border:1px solid #ccba956b;background:#20352a;color:#fcf9ee;padding:3px 6px;touch-action:manipulation;}
    #panelEditor header,#panel header,#cardsPanel header {cursor:grab;touch-action:none;user-select:none;
      -webkit-user-select:none;gap:5px;}
    #panelEditor header button,#panel header button,#cardsPanel header button {cursor:pointer;touch-action:manipulation;}
    #panelEditor header:active,#panel header:active,#cardsPanel header:active {cursor:grabbing;}
    @media(max-width:700px){
      #tourNav .door-dot {--clipper-size:13px!important;}
      #tourNav .door-dot span {font-size:9px!important;letter-spacing:.075em!important;
        top:calc(64% + 15px)!important;}
      #panelEditor header h2,#panel header h2,#cardsPanel header h2 {font-size:18px;}
      .editor-dock button {min-width:36px;}
    }
    @media(prefers-reduced-motion:reduce){#pricingBarber{transition:none;}}
  `;
  document.head.append(css);

  // Every customization window can dock left/right or be dragged by its titlebar.
  // Position is private to the device, never alters customer-facing published layouts.
  ['panelEditor','panel','cardsPanel'].forEach(id=>{
    const dialog=document.getElementById(id);const header=dialog&&dialog.querySelector('header');
    if(!header)return;
    const dock=document.createElement('span');dock.className='editor-dock';
    dock.innerHTML='<button type="button" aria-label="Move controls to left edge" title="Move controls left">◀</button><button type="button" aria-label="Move controls to right edge" title="Move controls right">▶</button>';
    const lastButton=header.querySelector('button');
    if(lastButton) header.insertBefore(dock,lastButton); else header.append(dock);
    const key='maliks-editor-horizontal-v1-'+device+'-'+id;
    const maxTravel=()=>Math.max(0,innerWidth-dialog.getBoundingClientRect().width-8);
    const remembered=()=>{try {const d=JSON.parse(localStorage.getItem(key));return d&&typeof d.fraction==='number'?clamp(d.fraction,0,1):null;}catch(_){return null;}};
    let fraction=remembered();
    function position(f,persist=true){
      if(!dialog.open)return;
      fraction=clamp(f,0,1);
      const width=dialog.getBoundingClientRect().width;
      if(!dialog.dataset.editorSized){dialog.style.boxSizing='border-box';dialog.style.width=width+'px';dialog.dataset.editorSized='1';}
      dialog.style.right='auto';dialog.style.left=(4+maxTravel()*fraction)+'px';
      if(persist)try{localStorage.setItem(key,JSON.stringify({fraction}));}catch(_){}
    }
    function init(){
      if(!dialog.open)return;
      if(fraction!==null)position(fraction,false);
    }
    for(const [i,btn] of [...dock.querySelectorAll('button')].entries())
      btn.addEventListener('click',e=>{e.stopPropagation();position(i===0?0:1);});
    let drag=null;
    header.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button,input,select,a'))return;
      if(!dialog.open)return;
      const rect=dialog.getBoundingClientRect();
      drag={id:e.pointerId,start:e.clientX,from:rect.left,width:rect.width};
      try{header.setPointerCapture(e.pointerId);}catch(_){}
      header.style.cursor='grabbing';
      e.preventDefault();
    });
    header.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      const range=Math.max(1,innerWidth-drag.width-8);
      const left=clamp(drag.from+e.clientX-drag.start-4,0,range);
      position(left/range,false);
    });
    function end(e){if(!drag||drag.id!==e.pointerId)return;drag=null;header.style.cursor='';if(fraction!==null)position(fraction,true);}
    header.addEventListener('pointerup',end);
    header.addEventListener('pointercancel',end);
    // dialog.show() is not a modal: observe its opening and restore the dock.
    new MutationObserver(init).observe(dialog,{attributes:true,attributeFilter:['open']});
    window.addEventListener('resize',()=>{if(dialog.open&&fraction!==null)position(fraction,false);},{passive:true});
    init();
  });

  const shell=document.createElement('div');shell.id='pricingBarber';shell.setAttribute('aria-hidden','true');
  const poster=document.createElement('img');poster.id='pricingBarberPoster';poster.alt='';
  poster.src='pricing-barber-poster.png';poster.decoding='async';
  const movie=document.createElement('video');movie.id='pricingBarberVideo';
  movie.muted=true;movie.defaultMuted=true;movie.playsInline=true;movie.autoplay=false;
  movie.loop=false;movie.preload='none';movie.disablePictureInPicture=true;
  movie.setAttribute('muted','');movie.setAttribute('playsinline','');
  movie.setAttribute('webkit-playsinline','');movie.setAttribute('disablepictureinpicture','');
  const cutout=document.createElement('canvas');cutout.id='pricingBarberCanvas';
  cutout.width=415;cutout.height=1207;cutout.setAttribute('aria-hidden','true');
  shell.append(poster,movie,cutout);scene.append(shell);

  const section=document.createElement('fieldset');section.id='barberEditSection';
  section.className='pe-group';section.hidden=true;
  section.innerHTML=`<legend>Barber video placement</legend>
    <p class="barber-note">Move this controls window left or right using ◀ ▶ at the top, or drag its title. Changes save on this device until exported.</p>
    <label class="barber-control" for="bvEnabled"><span>Show barber <input id="bvEnabled" type="checkbox" style="width:auto"></span></label>
    <label class="barber-control" for="bvDevice">Preset to edit<select id="bvDevice"><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
    <p class="barber-note" id="bvDeviceNote" hidden>You're editing another screen size. Switch devices to preview that placement accurately.</p>
    <label class="barber-control" for="bvX"><span>Left / right <output id="bvXOut"></output></span><input id="bvX" type="range" min="0" max="100" step=".5"></label>
    <label class="barber-control" for="bvBottom"><span>Up / down <output id="bvBottomOut"></output></span><input id="bvBottom" type="range" min="-25" max="55" step=".5"></label>
    <div class="barber-nudges" aria-label="Fine position adjustments">
      <button type="button" data-bv-nudge="x:-1" aria-label="Move barber left">←</button>
      <button type="button" data-bv-nudge="bottom:1" aria-label="Move barber up">↑</button>
      <button type="button" data-bv-nudge="bottom:-1" aria-label="Move barber down">↓</button>
      <button type="button" data-bv-nudge="x:1" aria-label="Move barber right">→</button></div>
    <label class="barber-control" for="bvSize"><span>Barber size <output id="bvSizeOut"></output></span><input id="bvSize" type="range" min="18" max="145" step="1"></label>
    <label class="barber-control" for="bvDepth"><span>Back / forward <output id="bvDepthOut"></output></span><input id="bvDepth" type="range" min="-65" max="65" step="1"></label>
    <label class="barber-control" for="bvLayer">Layer order<select id="bvLayer">
      <option value="behind-all">Behind wall signs and pop-up</option><option value="behind-card">In front of wall art; behind pop-up</option>
      <option value="above-card">In front of pop-up; below navigation</option><option value="above-all">In front of everything</option></select></label>
    <label class="barber-control" for="bvShadow"><span>Shadow strength <output id="bvShadowOut"></output></span><input id="bvShadow" type="range" min="0" max="100" step="1"></label>
    <div class="barber-ctrl-row"><button type="button" id="bvReset">Reset this device</button>
    <button type="button" class="export" id="bvExport">Export barber-preset.js</button></div>
    <p class="barber-note" id="bvStatus" aria-live="polite">Export contains both mobile and desktop positions.</p>`;
  panelChoice.after(section);
  const $=id=>document.getElementById(id);const status=$('bvStatus');
  const props={bvX:'x',bvBottom:'bottom',bvSize:'size',bvDepth:'depth',bvLayer:'layer',bvShadow:'shadow',bvEnabled:'enabled'};
  const units={bvX:'%',bvBottom:'%',bvSize:'%',bvShadow:'%'};
  let selectedDevice=device,showing=false,loaded=false,sourceMode='',rendering=false,renderToken=0;
  let gl=null,program=null,texture=null,buffer=null;
  const apple=document.documentElement.classList.contains('ios-webkit');
  const safari=/Safari/.test(navigator.userAgent)&&!/Chrome|Chromium|CriOS|Edg|OPR/.test(navigator.userAgent);
  const packed=apple||safari||!movie.canPlayType('video/webm; codecs="vp9"');
  sourceMode=packed?'packed':'webm';
  shell.classList.toggle('packed',packed);

  function initGL(){
    if(gl)return true;
    try{
      gl=cutout.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true})||
         cutout.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
      if(!gl)return false;
      const makeShader=(kind,src)=>{
        const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);
        if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;
      };
      const vs=makeShader(gl.VERTEX_SHADER,'attribute vec2 a; varying vec2 uv; void main(){uv=(a+1.0)*0.5; gl_Position=vec4(a,0.0,1.0);}');
      const fs=makeShader(gl.FRAGMENT_SHADER,`precision mediump float;
        uniform sampler2D tex;varying vec2 uv;
        void main(){
          vec3 color=texture2D(tex,vec2(uv.x*.5,((uv.y*1206.0+1.0)/1208.0))).rgb;
          float alpha=texture2D(tex,vec2(.5+uv.x*.5,((uv.y*1206.0+1.0)/1208.0))).r;
          gl_FragColor=vec4(color,clamp((alpha-.018)/.96,0.,1.));
        }`);
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Could not link alpha shader');
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program,'tex'),0);
      gl.viewport(0,0,415,1207);gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      cutout.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;cutout.classList.remove('drawn');stopRender();});
      return true;
    }catch(_){gl=null;return false;}
  }
  function drawPacked(){
    if(!showing||movie.readyState<2||movie.videoWidth!==830||!initGL())return false;
    try{
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,movie);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      cutout.classList.add('drawn');return true;
    }catch(_){cutout.classList.remove('drawn');return false;}
  }
  function stopRender(){rendering=false;renderToken++;}
  function startRender(){
    if(!packed||rendering||!showing)return;
    rendering=true;const token=++renderToken;
    const frame=()=>{
      if(!rendering||token!==renderToken||!showing)return;
      drawPacked();
      if(movie.ended){rendering=false;return;}
      if(typeof movie.requestVideoFrameCallback==='function')movie.requestVideoFrameCallback(frame);
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  movie.addEventListener('loadeddata',()=>{if(packed){drawPacked();startRender();}});
  movie.addEventListener('playing',()=>{if(packed)startRender();});
  movie.addEventListener('seeked',()=>{if(packed)drawPacked();});
  movie.addEventListener('ended',()=>{if(packed){drawPacked();stopRender();}});
  movie.addEventListener('error',()=>{cutout.classList.remove('drawn');});

  function applyPosition(){
    const v=value(device);const h=clamp(v.size*(1+v.depth/150),5,205);
    shell.style.left=v.x+'%';shell.style.bottom=v.bottom+'%';shell.style.height=h+'%';
    shell.style.zIndex=({'behind-all':2,'behind-card':5,'above-card':7,'above-all':10})[v.layer]||5;
    shell.style.setProperty('--barber-shadow-alpha',(clamp(v.shadow,0,100)*.009).toFixed(3));
    shell.style.setProperty('--barber-shadow-blur',(4+clamp(v.shadow,0,100)*.11).toFixed(1)+'px');
  }
  function shouldShow(){
    if(!value(device).enabled)return false;
    if(panelEditor.open)return panelChoice.value==='prices';
    return panel.dataset.action==='prices'&&!panel.hidden&&!panel.inert;
  }
  function sync(){
    applyPosition();const visible=shouldShow();if(showing===visible)return;
    showing=visible;shell.classList.toggle('is-visible',visible);
    if(visible){
      if(!loaded){loaded=true;movie.src=packed?'pricing-barber-alpha-packed.mp4':'pricing-barber-transparent.webm';movie.load();}
      try{if(movie.readyState>0)movie.currentTime=0;}catch(_){}
      try{const p=movie.play();if(p&&p.catch)p.catch(()=>{cutout.classList.remove('drawn');});}catch(_){}
      if(packed)startRender();
    }else{
      stopRender();movie.pause();cutout.classList.remove('drawn');
      try{if(movie.readyState>=1)movie.currentTime=0;}catch(_){}
    }
  }
  function updateUI(){
    const v=value(selectedDevice);$('bvDevice').value=selectedDevice;
    $('bvDeviceNote').hidden=selectedDevice===device;
    for(const [id,prop] of Object.entries(props)){
      const el=$(id);if(id==='bvEnabled')el.checked=!!v[prop];else el.value=v[prop];
      const out=$(id+'Out');if(out)out.textContent=String(v[prop])+(units[id]||'');
    }
  }
  function edit(prop,next){
    const v=value(selectedDevice);
    v[prop]=prop==='enabled'?!!next:prop==='layer'?String(next):Number(next);
    save(selectedDevice,v);updateUI();sync();
  }
  for(const [id,prop] of Object.entries(props)){
    const el=$(id);el.addEventListener(id==='bvLayer'||id==='bvEnabled'?'change':'input',()=>edit(prop,id==='bvEnabled'?el.checked:el.value));
  }
  section.querySelectorAll('[data-bv-nudge]').forEach(b=>b.addEventListener('click',()=>{
    const [prop,step]=b.dataset.bvNudge.split(':');const v=value(selectedDevice);
    edit(prop,clamp(Number(v[prop])+Number(step),prop==='x'?0:-25,prop==='x'?100:55));
  }));
  $('bvDevice').addEventListener('change',e=>{selectedDevice=e.target.value;updateUI();});
  $('bvReset').addEventListener('click',()=>{
    if(!confirm('Restore published barber placement for '+selectedDevice+'?'))return;
    try{localStorage.removeItem(localKey(selectedDevice));}catch(_){}
    updateUI();sync();status.textContent='Published '+selectedDevice+' placement restored.';
  });
  $('bvExport').addEventListener('click',()=>{
    const out=Object.fromEntries(devices.map(d=>[d,value(d)]));
    downloadJS('barber-preset.js','/* Published barber presets for all visitors */\nwindow.MALIKS_BARBER_PRESETS = '+JSON.stringify(out,null,2)+';\n');
    status.textContent='Exported desktop + mobile positions. Upload barber-preset.js to GitHub.';
  });
  // Existing Panels exporter originally removed this extension. Preserve all its code.
  const otherExport=$('peExport');
  if(otherExport)otherExport.addEventListener('click',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const result={};
    for(const d of devices){
      const base=window.MALIKS_PANEL_PRESETS[d];let override=null;
      try{const raw=JSON.parse(localStorage.getItem('maliks-wall-mount-layout-v2-'+d));
        if(raw&&raw.basedOn===JSON.stringify(base))override=raw.panels;
      }catch(_){}
      result[d]=override||base;
    }
    try{
      const script=[...document.scripts].find(s=>/panel-presets\.js(?:[?#]|$)/.test(s.src));
      if(!script)throw Error('Panel script missing');
      const response=await fetch(script.src,{cache:'no-store'});
      if(!response.ok)throw Error('Panel file unavailable');
      const source=await response.text();const marker='/* PRICING BARBER OVERLAY V4';
      const pos=source.indexOf(marker);if(pos<0)throw Error('Barber extension missing');
      const content='/* Published panel layouts for Malik’s Barbers */\nwindow.MALIKS_PANEL_PRESETS = '+JSON.stringify(result,null,2)+';\n\n'+source.slice(pos);
      downloadJS('panel-presets.js',content);
      $('peStatus').textContent='Exported published panels; movable editor and barber controls preserved.';
    }catch(err){$('peStatus').textContent='Could not export: '+err.message;}
  },true);
  function sectionSync(){section.hidden=panelChoice.value!=='prices';sync();}
  panelChoice.addEventListener('change',sectionSync);
  $('panelsBtn')?.addEventListener('click',()=>setTimeout(sectionSync,0));
  panelEditor.addEventListener('close',sectionSync);
  const observe=new MutationObserver(sectionSync);
  observe.observe(panel,{attributes:true,attributeFilter:['hidden','inert','data-action']});
  observe.observe(panelEditor,{attributes:true,attributeFilter:['open']});
  window.addEventListener('pageshow',sync);
  // Published per-device position overrides: no dependence on a visitor's storage.
  const presetScript=document.createElement('script');
  presetScript.src='barber-preset.js';presetScript.async=true;
  presetScript.onload=()=>{
    const v=window.MALIKS_BARBER_PRESETS;
    if(v&&typeof v==='object')for(const d of devices)if(v[d])published[d]={...defaults[d],...v[d]};
    updateUI();sync();
  };
  document.head.append(presetScript);
  updateUI();sectionSync();
})();
