/* Malik's Barbers — Glass Atelier integration.
   Drops into the Nov 20 website without altering its tour/lighting timeline.
   The barber video remains a separate #pricingBarber layer in .scene. */
(() => {
  'use strict';
  if (window.MALIKS_GLASS_READY) return;
  window.MALIKS_GLASS_READY = true;

  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const scene = document.querySelector('.scene');
  const detail = $('scenePanel');
  const editor = $('panelEditor');
  const panelSelect = $('pePanel');
  const scroller = $('scroller');
  if (!scene || !detail || !editor || !panelSelect) return;
  const device = root.classList.contains('mobile-tour') ||
    matchMedia('(max-width:700px)').matches ? 'mobile' : 'desktop';
  const devices = ['desktop', 'mobile'];
  const actions = ['hours', 'contact', 'prices'];
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const defaults = window.MALIKS_GLASS_PRESETS || {};
  const panelNames = { hours:'OPEN TIMES', contact:'BOOKINGS', prices:'PRICING' };
  const prefKey = (dev, action) => `maliks-glass-settings-v1-${dev}-${action}`;
  const clamp = (num, a, b) => Math.min(b, Math.max(a, Number(num) || 0));
  function base(dev, action) {
    return { blur:dev==='mobile'?15:22, opacity:dev==='mobile'?48:34,
      dock:'smart', ...(defaults[dev]?.[action] || {}) };
  }
  function read(dev, action) {
    let draft;
    try {draft=JSON.parse(localStorage.getItem(prefKey(dev,action)));} catch (_){}
    return {...base(dev,action),...(draft && typeof draft==='object' ? draft : {})};
  }
  function save(dev,action,settings){
    try {localStorage.setItem(prefKey(dev,action),JSON.stringify(settings));}
    catch (_) { if($('mgStatus')) $('mgStatus').textContent='Storage unavailable; export your presets.'; }
  }
  function el(tag, className, text) {
    const e=document.createElement(tag);
    if(className)e.className=className;
    if(text!==undefined)e.textContent=text;
    return e;
  }
  function addRows(parent, sectionId) {
    const dl=el('dl','mg-rows');
    document.querySelectorAll(`#${sectionId} dl > div`).forEach(row=>{
      const newRow=el('div');
      const dt=el('dt','',row.querySelector('dt')?.childNodes[0]?.textContent?.trim() ||
        row.querySelector('dt')?.textContent?.replace('Today','').trim() || '');
      const dd=el('dd','',row.querySelector('dd')?.textContent?.trim() || '');
      if(row.querySelector('small')?.hidden===false) newRow.classList.add('mg-row-today');
      newRow.append(dt,dd);dl.append(newRow);
    });
    parent.append(dl);
  }
  function createGlass(action) {
    const panel=el('article','mg-glass');
    panel.dataset.kind=action;
    const inner=el('div','mg-glass-inner');
    inner.append(el('span','mg-ident',action==='contact'?'VISIT US IN DUBLIN 15':
      action==='prices'?'THE GENTLEMAN’S MENU':'YOUR NEXT VISIT'));
    inner.append(el('h2','',panelNames[action]));
    inner.append(el('div','mg-rule'));
    if(action==='hours') addRows(inner,'hours');
    if(action==='prices') addRows(inner,'prices');
    if(action==='contact'){
      const address = $('contact')?.querySelector('address');
      const phone = $('contact')?.querySelector('a[href^="tel:"]');
      const map = $('contact')?.querySelector('a[href*="google.com/maps"]');
      inner.append(el('div','mg-description','Appointments and enquiries'));
      if(address) inner.append(el('address','mg-address',address.textContent.trim()));
      if(phone){
        const a=el('a','mg-phone',phone.textContent.trim());
        a.href=phone.href;a.setAttribute('aria-label','Call '+a.textContent);
        a.addEventListener('click',e=>e.stopPropagation());
        inner.append(a);
      }
      if(map){
        const a=el('a','mg-map','VIEW DIRECTIONS ↗');a.href=map.href;
        a.rel='noopener noreferrer';a.target='_blank';
        a.addEventListener('click',e=>e.stopPropagation());inner.append(a);
      }
    }
    const foot=el('div','mg-footer');
    foot.append(el('span','', 'TAP TO CLOSE'),el('span','mg-diamond'));
    inner.append(foot);panel.append(inner);
    // Clicking on card content dismisses, except for live phone/navigation links.
    return panel;
  }
  // Remove the old illustrated cards entirely. Their artwork (and any barber
  // figure baked into it) cannot show or flash during transitions anymore.
  const faces={};
  for (const old of [...detail.children]) old.remove();
  for (const action of actions){
    const face=createGlass(action);face.hidden=true;faces[action]=face;detail.append(face);
  }
  // The original panel used to be a giant button. It now hosts accessible links.
  // Keep its existing ID, click-dismiss and press-and-hold movement listeners.
  detail.setAttribute('role','dialog');
  detail.setAttribute('aria-modal','false');
  detail.setAttribute('tabindex','-1');
  detail.removeAttribute('aria-haspopup');
  detail.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !editor.open){
      e.stopPropagation();detail.click();
    }
  });
  let lastAction=null;
  let panelAnim=null;
  const glassState = ()=>!detail.hidden && !detail.inert && actions.includes(detail.dataset.action);
  function apply() {
    const active=glassState()?detail.dataset.action:null;
    for(const action of actions)faces[action].hidden=action!==active;
    if(!active){root.classList.remove('mg-smart');lastAction=null;return;}
    const pref=read(device,active);
    const glass=faces[active];
    glass.style.setProperty('--mg-glass-blur',clamp(pref.blur,0,36)+'px');
    glass.style.setProperty('--mg-glass-opacity',(clamp(pref.opacity,12,80)/100).toFixed(2));
    // Smart and authored placements are separate modes. Authored stays adjustable
    // through the old x/y/width/height editor and its published presets.
    root.classList.toggle('mg-smart',!editor.open && pref.dock==='smart');
    if(active!==lastAction){
      lastAction=active;
      if(!reduced.matches){
        panelAnim?.kill?.();
        if(window.gsap){
          const mobile=device==='mobile';
          panelAnim=window.gsap.fromTo(glass,
            {opacity:0, y:mobile?23:0, x:mobile?0:(active==='hours'?28:-28), scale:.978},
            {opacity:1,y:0,x:0,scale:1,duration:mobile?.43:.48,
              ease:'power3.out',overwrite:'auto',clearProps:'opacity,transform'});
        } else if(typeof glass.animate==='function'){
          glass.animate([{opacity:0,transform:`translate3d(${device==='mobile'?0:active==='hours'?18:-18}px,${device==='mobile'?22:0}px,0)`},
            {opacity:1,transform:'translate3d(0,0,0)'}],
            {duration:380,easing:'cubic-bezier(.2,.75,.2,1)'});
        }
      }
    }
  }
  const detailObserver=new MutationObserver(apply);
  detailObserver.observe(detail,{attributes:true,attributeFilter:['hidden','inert','data-action']});
  new MutationObserver(apply).observe(editor,{attributes:true,attributeFilter:['open']});
  panelSelect.addEventListener('change',()=>queueMicrotask(apply));
  window.addEventListener('resize',apply,{passive:true});
  // We leave existing studio positioning alone when it is open.
  // Create new publishing controls for three unique glass designs.
  const group=el('div','mg-editor');group.innerHTML=`
   <fieldset><legend>Glass studio · separate desktop / mobile</legend>
    <p class="mg-sub">Three different shapes: octagonal HOURS, shield BOOKINGS and angled PRICING. No figure inside any card. Smart dock protects the central camera view. Authored uses your original position sliders.</p>
    <div class="mg-editor-row">
      <label>Preview preset<select id="mgDevice"><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
      <label>Position mode<select id="mgDock"><option value="smart">Smart side / bottom dock</option><option value="authored">Your saved positions</option></select></label>
    </div>
    <label>Background blur <output id="mgBlurOut"></output><input id="mgBlur" type="range" min="0" max="36" step="1"></label>
    <label>Glass opacity <output id="mgOpacityOut"></output><input id="mgOpacity" type="range" min="12" max="80" step="1"></label>
    <button type="button" class="mg-export" id="mgExport">EXPORT GLASS PRESETS FOR EVERYONE</button>
    <p id="mgStatus" class="mg-sub" aria-live="polite">Published settings remain your starting point. Local changes can be exported.</p>
   </fieldset>`;
  const actionsArea=editor.querySelector('.pe-actions');
  if(actionsArea) actionsArea.before(group); else editor.append(group);
  const ui={dev:$('mgDevice'),dock:$('mgDock'),blur:$('mgBlur'),opacity:$('mgOpacity')};
  let previewDev=device;ui.dev.value=device;
  function showUI(){
    const p=read(previewDev,panelSelect.value);
    ui.dev.value=previewDev;ui.dock.value=p.dock;
    ui.blur.value=clamp(p.blur,0,36);ui.opacity.value=clamp(p.opacity,12,80);
    $('mgBlurOut').textContent=ui.blur.value+'px';$('mgOpacityOut').textContent=ui.opacity.value+'%';
    $('mgStatus').textContent=previewDev!==device?
      'Switch to '+previewDev+' to see this layout at the correct scale. Export saves both.' :
      'Adjust these values, then export to publish them for visitors.';
  }
  ui.dev.addEventListener('change',()=>{previewDev=ui.dev.value;showUI();});
  panelSelect.addEventListener('change',showUI);
  editor.addEventListener('close',apply);
  for(const [prop,node,event] of [['dock',ui.dock,'change'],['blur',ui.blur,'input'],['opacity',ui.opacity,'input']]){
    node.addEventListener(event,()=>{
      const action=panelSelect.value;
      const pref=read(previewDev,action);
      pref[prop]=prop==='dock'?node.value:Number(node.value);
      save(previewDev,action,pref);
      if(previewDev===device)apply();
      $('mgBlurOut').textContent=ui.blur.value+'px';
      $('mgOpacityOut').textContent=ui.opacity.value+'%';
    });
  }
  $('mgExport').addEventListener('click',()=>{
    const config=Object.fromEntries(devices.map(d=>[d,Object.fromEntries(actions.map(a=>[a,read(d,a)]))]));
    const content='/* Published Malik glass settings for all devices */\n'+
      'window.MALIKS_GLASS_PRESETS = '+JSON.stringify(config,null,2)+';\n';
    const url=URL.createObjectURL(new Blob([content],{type:'text/javascript;charset=utf-8'}));
    const anchor=el('a');anchor.href=url;anchor.download='glass-presets.js';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    $('mgStatus').textContent='glass-presets.js exported. Upload it beside index.html to publish desktop and mobile styles.';
  });
  showUI();apply();

  // Real GSAP is used when available; otherwise standard browser animations are
  // the fallback. Lenis is desktop-only to preserve iPhone native touch scrubbing.
  if(scroller && device==='desktop' && !reduced.matches){
    let lenis=null, raf=0;
    try{
      if(window.Lenis){
        lenis=new window.Lenis({wrapper:scroller,content:scroller.firstElementChild,
          duration:.8,smoothWheel:true,syncTouch:false,wheelMultiplier:1});
        const tick=t=>{lenis.raf(t);raf=requestAnimationFrame(tick);};
        raf=requestAnimationFrame(tick);
        new MutationObserver(()=>{
          if(root.classList.contains('tour-navigating') || editor.open ||
             $('cardsPanel')?.open || $('panel')?.open)lenis.stop();
          else lenis.start();
        }).observe(root,{attributes:true,attributeFilter:['class']});
      }
    }catch(_){ if(raf)cancelAnimationFrame(raf); lenis?.destroy?.(); }
  }
  // Footer: an unobtrusive mark; Three.js/GLSL optionally enhances it.
  const footer=document.querySelector('.stage footer');
  if(footer){
    const mark=el('span','mg-mark');mark.id='mgMark';mark.setAttribute('aria-hidden','true');
    mark.innerHTML='<span class="mg-mark-fallback">M</span><canvas width="100" height="100"></canvas>';
    footer.insertBefore(mark,footer.querySelector('.editor-buttons'));
  }
})();
