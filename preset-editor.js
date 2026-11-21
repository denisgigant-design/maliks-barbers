/* The original storage keys remain authoritative. Backups include both film layouts. */
(() => {
  'use strict';
  const G=window.MalikGlass,L=window.MalikLayout,B=window.MalikBarber;
  const $=id=>document.getElementById(id), editor=$('panelEditor');
  const devices=['desktop','mobile'],editors=['panelEditor','panel','cardsPanel'];
  const dockKey=(d,id)=>'maliks-editor-horizontal-v1-'+d+'-'+id;
  const barberKey=d=>'maliks-pricing-barber-v3-'+d;
  const local=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
  const both=fn=>Object.fromEntries(devices.map(d=>[d,fn(d)]));
  const sections=fn=>Object.fromEntries(G.actions.map(a=>[a,fn(a)]));
  const status=text=>{$('peStatus').textContent=text;};
  const group=document.createElement('fieldset');group.className='pe-group';
  group.innerHTML=`<legend>Glass and motion</legend>
   <label for="mgDock">Placement</label><select id="mgDock"><option value="smart">Smart edge docking</option><option value="authored">Saved position</option></select>
   <label for="mgShape">Silhouette</label><select id="mgShape"><option value="rounded">Rounded glass</option><option value="facet">Vertical facets</option><option value="shield">Sculpted shield</option><option value="asymmetric">Stepped asymmetric</option></select>`;
  editor.querySelector('.pe-actions').before(group);
  const fields={scale:['Panel scale','%'],markerScale:['Marker scale','%'],edgeInset:['Directional marker inset','%'],
    edgeY:['Directional marker height','%'],opacity:['Glass opacity','%'],blur:['Backdrop blur',' px'],
    rim:['Reflected edge light','%'],duration:['Transition duration',' ms']};
  const controls={dock:$('mgDock'),shape:$('mgShape')};
  for(const [prop,[label,unit]] of Object.entries(fields)){
    const id='mg'+prop[0].toUpperCase()+prop.slice(1);
    const name=document.createElement('label'),out=document.createElement('output'),input=document.createElement('input');
    name.htmlFor=id;name.append(label,out);out.id=id+'Out';out.htmlFor=id;
    input.id=id;input.type='range';[input.min,input.max]=G.limits[prop];input.step=prop==='duration'?10:1;
    controls[prop]=input;group.append(name,input);
  }
  const publications=document.createElement('div');publications.className='preset-tools';
  publications.innerHTML=`<button type="button" id="saveExperience">Save settings</button>
   <button type="button" id="exportExperience">Export backup</button>
   <button type="button" id="importExperience">Import backup</button>
   <button type="button" id="mgExport">Export glass styles</button>
   <input id="presetFile" type="file" accept=".json,application/json" hidden>`;
  $('peStatus').before(publications);
  const device=$('mgDevice'),choice=$('pePanel');
  device.value=L.device;
  function sync(){
    const d=device.value,p=G.read(d,choice.value);
    for(const [prop,input] of Object.entries(controls)){
      input.value=p[prop];if(fields[prop])$(input.id+'Out').value=p[prop]+fields[prop][1];
    }
    $('layoutNote').textContent=d===L.device?'Previewing the '+d+' tour.':'Editing the '+d+' preset. This film uses the '+L.device+' layout.';
  }
  for(const [prop,input] of Object.entries(controls)){
    input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{
      G.save(device.value,choice.value,{[prop]:fields[prop]?Number(input.value):input.value});
      sync();L.preview();
    });
  }
  device.addEventListener('change',()=>{L.edit(device.value);sync();});
  $('bvDevice').addEventListener('change',()=>{device.value=$('bvDevice').value;L.edit(device.value);sync();});
  choice.addEventListener('change',sync);
  new MutationObserver(()=>{if(editor.open)sync();}).observe(editor,{attributes:true,attributeFilter:['open']});
  function download(name,contents,mime){
    const url=URL.createObjectURL(new Blob([contents],{type:mime}));
    const link=document.createElement('a');link.href=url;link.download=name;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function snapshot(){
    return {format:'maliks-cinematic-presets',version:2,panels:structuredClone(L.layouts),
      glass:both(d=>sections(a=>G.read(d,a))),barber:both(d=>B.value(d)),
      editorDocks:both(d=>Object.fromEntries(editors.map(id=>[id,local(dockKey(d,id))?.fraction??null]))),
      cards:L.snapshotCards(),lighting:window.MalikLighting.snapshot()};
  }
  const isObject=x=>x!==null && typeof x==='object' && !Array.isArray(x);
  const number=(n,min,max)=>Number.isFinite(n) && n>=min && n<=max;
  const colour=x=>typeof x==='string' && /^#[a-fA-F0-9]{6}$/.test(x);
  const rangeFields=(o,spec)=>isObject(o) && Object.entries(spec).every(([k,[lo,hi]])=>number(o[k],lo,hi));
  const coords={width:[1,200],height:[1,200],x:[-100,200],y:[-100,200]};
  const lettering={width:[1,110],x:[0,100],y:[0,100],depth:[-60,60],yaw:[-45,45],pitch:[-60,60],roll:[-180,180],bend:[-45,45],strength:[0,100]};
  function validateLights(m){
    if(!isObject(m)||m.version!==1||!Array.isArray(m.tracks)||!m.tracks.length||m.tracks.length>250)return false;
    return m.tracks.every((t,i)=>isObject(t) && t.kind===(i?'spot':'main') && typeof t.name==='string' &&
      Array.isArray(t.keys) && t.keys.length && t.keys.length<=240 && t.keys.every((k,j)=>isObject(k) &&
      Number.isInteger(k.frame) && number(k.frame,0,239) && (!j || k.frame>t.keys[j-1].frame) &&
      typeof k.on==='boolean' && colour(k.color) && number(k.intensity,0,200) &&
      rangeFields(k,i?{x:[-30,130],y:[-50,100],angle:[-180,180],width:[5,100]}:{exposure:[-100,100],warmth:[-100,100],saturation:[0,200]})));
  }
  function validate(v){
    if(!isObject(v)||v.format!=='maliks-cinematic-presets'||v.version!==2)throw Error('Choose a V2 experience backup.');
    for(const d of devices){
      for(const a of G.actions){
        const layout=v.panels?.[d]?.[a],p=v.glass?.[d]?.[a];
        if(!rangeFields(layout,coords) || !rangeFields(layout.lettering,lettering)||!colour(layout.lettering.glow))throw Error('Invalid '+d+' marker or panel placement.');
        if(!rangeFields(p,G.limits)||!['smart','authored'].includes(p.dock)||!['rounded','facet','shield','asymmetric'].includes(p.shape))throw Error('Invalid '+d+' glass settings.');
      }
      const b=v.barber?.[d];
      if(!rangeFields(b,{x:[0,100],bottom:[-25,55],size:[18,145],depth:[-65,65],shadow:[0,100]})||
        typeof b.enabled!=='boolean'||!['behind-all','behind-card','above-card','above-all'].includes(b.layer))throw Error('Invalid barber placement.');
      if(!isObject(v.editorDocks?.[d]) || !editors.every(id=>v.editorDocks[d][id]===null||number(v.editorDocks[d][id],0,1)))throw Error('Invalid editor position.');
    }
    if(!Array.isArray(v.cards)||v.cards.length>4000||!v.cards.every(c=>isObject(c)&&typeof c.id==='string'&&typeof c.text==='string'&&
      ['square','long'].includes(c.shape)&&number(c.start,0,239)&&number(c.end,c.start,239)&&rangeFields(c,{size:[1,100],x:[0,100],y:[0,100]})))throw Error('Invalid card cues.');
    if(!validateLights(v.lighting))throw Error('Invalid lighting keyframes.');
  }
  function install(v){
    validate(v);const entries=[];
    for(const d of devices){
      entries.push([L.layoutKey(d),{basedOn:JSON.stringify(window.MALIKS_PANEL_PRESETS[d]),panels:v.panels[d]}],
        [barberKey(d),{version:4,settings:v.barber[d]}]);
      for(const a of G.actions)entries.push([G.key(d,a),{...v.glass[d][a],classicStyle:true}]);
      for(const id of editors)entries.push([dockKey(d,id),v.editorDocks[d][id]===null?null:{fraction:v.editorDocks[d][id]}]);
    }
    entries.push(['maliks-card-drafts-v1',v.cards],['maliks-card-drafts-v1-edited',1],['maliks-lighting-tracks-v1',v.lighting]);
    const previous=entries.map(([key])=>[key,localStorage.getItem(key)]);
    let committed=0;
    try{for(const [key,value] of entries){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));committed++;}}
    catch(err){
      for(const [key,old] of previous.slice(0,committed).reverse()){if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);}
      throw err;
    }
    G.clearCache();L.refresh();L.restoreCards(v.cards);window.MalikLighting.restore(v.lighting);B.refresh();sync();
  }
  $('saveExperience').onclick=()=>{try{install(snapshot());status('Desktop and mobile settings saved on this device.');}catch(e){status('Could not save settings. '+e.message);}};
  $('exportExperience').onclick=()=>{download('maliks-experience.json',JSON.stringify(snapshot(),null,2),'application/json');status('Backup exported with both layouts, editor positions, card cues and lighting.');};
  $('mgExport').onclick=()=>{download('glass-presets.js','/* Published glass settings */\nwindow.MALIKS_GLASS_PRESETS = '+JSON.stringify(snapshot().glass,null,2)+';\n','text/javascript');status('glass-presets.js exported for both layouts.');};
  $('importExperience').onclick=()=>$('presetFile').click();
  $('presetFile').onchange=async e=>{
    const input=e.target,file=input.files[0];if(!file)return;
    try{if(file.size>4*1024*1024)throw Error('Backup exceeds 4 MB.');
      const v=JSON.parse(await file.text());install(v);status('Backup imported for desktop and mobile.');
    }catch(err){status('Could not import this backup. '+err.message);}
    input.value='';
  };
  window.MalikPresetUI={sync};sync();
})();
