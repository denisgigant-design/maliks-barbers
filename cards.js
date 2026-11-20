(()=>{
 'use strict';
 const editor=$('cardsPanel'), layer=$('cardLayer'), nav=$('tourNav'), scene=nav.parentElement;
 const detail=$('scenePanel'), panelEditor=$('panelEditor'), buttons=[...nav.querySelectorAll('button[data-view]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const mobile=mobileTour, device=mobile?'mobile':'desktop';
 const key='maliks-card-drafts-v1', layoutKey='maliks-expanded-positions-final-'+device;
 const prefKey='maliks-panel-layout-v4-'+device; // New artwork panels use portrait-friendly dimensions.
 const legacyPrefKey='maliks-panel-layout-v3-'+device;
 const titles={hours:'OPEN HOURS',contact:'BOOKINGS',prices:'PRICING & SERVICES'};
 const stops={hours:85,contact:131,prices:206};
 const wallFrames={hours:[50,111],contact:[109,165],prices:[167,LAST]};
 const images={hours:'open-hours.png',prices:'pricing-services.png'}; // Wall headings stay unchanged.
 const cardArt={hours:'opening-hours-card.png',prices:'pricing-card.png'};
 const portraitDefaults=mobile?{width:94,height:82,x:50,y:50}:{width:44,height:88,x:50,y:50};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const defaults={
  desktop:{
   hours:{width:74,height:27,x:50,y:35,glass:'#1b2520',border:'#cbb57f',lettering:{width:73,x:50,y:39,glow:'#30c37e',strength:72}},
   contact:{width:29,height:43,x:20,y:51,glass:'#1a2320',border:'#c7ab7a',lettering:{width:32,x:16,y:44,glow:'#e5bc70',strength:67}},
   prices:{width:33,height:49,x:79,y:50,glass:'#1c2420',border:'#cdb783',lettering:{width:36,x:69,y:40,glow:'#39b772',strength:67}}
  },
  mobile:{
   hours:{width:86,height:31,x:50,y:38,glass:'#1b2520',border:'#cbb57f',lettering:{width:89,x:50,y:38,glow:'#30c37e',strength:72}},
   contact:{width:62,height:48,x:47,y:50,glass:'#1a2320',border:'#c7ab7a',lettering:{width:64,x:21,y:46,glow:'#e5bc70',strength:65}},
   prices:{width:77,height:49,x:51,y:51,glass:'#1c2420',border:'#cdb783',lettering:{width:84,x:50,y:42,glow:'#39b772',strength:67}}
  }
 };
 let previousPositions={};try{previousPositions=JSON.parse(localStorage.getItem(layoutKey))||{}}catch{}
 let locallySaved={};try{locallySaved=JSON.parse(localStorage.getItem(prefKey))||{}}catch{}
 let legacySaved={};try{legacySaved=JSON.parse(localStorage.getItem(legacyPrefKey))||{}}catch{}
 const published=window.MALIKS_PANEL_PRESETS?.[device]||{};
 function merged(action){
  const standard=defaults[device][action],pub=published[action]||{},local=locallySaved[action]||(action==='contact'?legacySaved[action]:{});
  const usePortrait=action==='hours'||action==='prices';
  return {
   ...standard,...pub,...local,
   ...(usePortrait?Object.fromEntries(Object.entries(portraitDefaults).map(([k,v])=>[k,locallySaved[action]?.[k]??v])):{}),
   x:usePortrait?(locallySaved[action]?.x??portraitDefaults.x):(local.x??previousPositions[action]?.x??pub.x??standard.x),
   y:usePortrait?(locallySaved[action]?.y??portraitDefaults.y):(local.y??previousPositions[action]?.y??pub.y??standard.y),
   lettering:{...standard.lettering,...(pub.lettering||{}),...(local.lettering||{})},
   fields:{...(pub.fields||{}),...(local.fields||{})}
  };
 }
 const settings=Object.fromEntries(Object.keys(stops).map(k=>[k,merged(k)]));
 function persist(){
  try{
   localStorage.setItem(prefKey,JSON.stringify(settings));
   localStorage.setItem(layoutKey,JSON.stringify(Object.fromEntries(Object.entries(settings).map(([k,v])=>[k,{x:v.x,y:v.y}]))));
  }catch{if($('peStatus'))$('peStatus').textContent='Storage blocked. Export your settings to keep a copy.'}
 }
 let cards=[],selectedId=null,cardDrag=null;
 try{const existing=JSON.parse(localStorage.getItem(key));if(Array.isArray(existing))cards=existing}catch{}
 if(!cards.length){
  cards=[['hours',52,105,50],['contact',106,155,16],['prices',156,LAST,68]].map(([action,start,end,x])=>({
   id:'shop-'+action,action,start,end,x,y:action==='hours'?28:35,size:mobile?52:action==='hours'?45:30,shape:'long',text:''
  }));
 }else if(!cards.some(c=>c.action)){
  const sorted=[...cards].sort((a,b)=>a.start-b.start).slice(0,3);
  if(sorted[0])sorted[0].action='hours';if(sorted[1])sorted[1].action='contact';if(sorted[2])sorted[2].action='prices';
 }
 for(const c of cards){
  if(c.action==='prices'&&c.start>=106&&c.end<=155)c.action='contact';
  else if(c.action==='contact'&&c.start>=156)c.action='prices';
 }
 let active=null,route=null,trip=0,travelRaf=0,fadeTimer=0,fade=null,dragPanel=null,ignoreTap=false;
 let enterClicked=false,dragTitle=null,selectedField=null;
 const cssRGB=(color)=>{
  const el=document.createElement('span');el.style.color=color;document.body.append(el);
  const computed=getComputedStyle(el).color;el.remove();
  const m=computed.match(/[\d.]+/g)||['255','250','241'];
  return '#'+m.slice(0,3).map(x=>Math.round(Number(x)).toString(16).padStart(2,'0')).join('');
 };
 function cancelTravel(){
  trip++;cancelAnimationFrame(travelRaf);travelRaf=0;
  if(movie.dataset.guided){movie.pause();delete movie.dataset.guided}
  route=null;
 }
 function clearFade(){clearTimeout(fadeTimer);fadeTimer=0;if(fade){fade.cancel();fade=null}}
 function hidePanel(){
  clearFade();active=null;detail.hidden=true;detail.classList.remove('moving','editing-panel');render();
 }
 function setTarget(frameNo){jump(Math.round(clamp(frameNo,0,LAST)))}
 function isCurrent(action){
  if(frame<48)return false;
  const [start,end]=wallFrames[action];
  return frame>=start&&frame<=end;
 }
 function wallMarkup(action){
  if(action==='contact'){
   const title=document.createElement('span');title.className='simple-booking';title.textContent='BOOKINGS';return title;
  }
  const picture=document.createElement('img');picture.src=images[action];picture.alt=titles[action];picture.draggable=false;
  return picture;
 }
 function applyPanelStyle(){
  if(!active||detail.hidden)return;
  const pref=settings[active];
  const sw=Math.max(scene.clientWidth,1),sh=Math.max(scene.clientHeight,1);
  const width=clamp(pref.width,20,96)*sw/100,height=clamp(pref.height,14,87)*sh/100;
  // Prevent a panel exceeding the display even on tiny portrait screens.
  detail.style.width=Math.min(width,sw*.96)+'px';
  detail.style.height=Math.min(height,sh*.92)+'px';
  detail.style.maxWidth='96%';detail.style.maxHeight='92%';
  detail.style.setProperty('--glass-tint',pref.glass);
  detail.style.setProperty('--glass-border',pref.border);
  const halfX=detail.offsetWidth/sw*50+1,halfY=detail.offsetHeight/sh*50+1;
  const x=clamp(pref.x,halfX,100-halfX),y=clamp(pref.y,halfY,100-halfY);
  detail.style.left=x+'%';detail.style.top=y+'%';
 }
 function makeFields(article,action){
  const add=(node,key,label)=>{if(node){node.dataset.peField=key;node.dataset.peLabel=label}};
  if(action==='hours'||action==='prices'){
   [...article.querySelectorAll('dl > div')].forEach((row,i)=>{
    const name=row.querySelector('dt'),value=row.querySelector('dd');
    const label=name?.firstChild?.textContent.trim()||'Item '+(i+1);
    add(name,`row-${i}-name`,label+' — title');add(value,`row-${i}-value`,label+' — '+(action==='prices'?'price':'time'));
   });
  }else{
   add(article.querySelector('address'),'address','Address');
   const ps=[...article.querySelectorAll('p')];
   ps.forEach((node,i)=>add(node,'description-'+i,i?'Opening hours summary':'Parking information'));
   add(article.querySelector('.shop-phone'),'phone','Telephone number');
   [...article.querySelectorAll('.shop-actions a')].forEach((node,i)=>add(node,'button-'+i,i?'Directions button':'Call button'));
  }
  article.querySelectorAll('[data-pe-field]').forEach(node=>{
   const pref=settings[action].fields[node.dataset.peField];
   if(!pref)return;
   if(typeof pref.text==='string'){
    if(node.querySelector('small')&&node.firstChild)node.firstChild.textContent=pref.text+' ';
    else node.textContent=pref.text;
    if(node.classList.contains('shop-phone'))node.href='tel:'+pref.text.replace(/[^+\d]/g,'');
   }
   if(pref.color)node.style.color=pref.color;
   if(pref.size)node.style.fontSize=pref.size+'px';
  });
 }
 function populateFields(){
  const nodes=[...detail.querySelectorAll('[data-pe-field]')];
  $('peElement').replaceChildren(...nodes.map(node=>new Option(node.dataset.peLabel,node.dataset.peField)));
  if(!nodes.some(n=>n.dataset.peField===selectedField))selectedField=nodes[0]?.dataset.peField||null;
  $('peElement').value=selectedField||'';syncField();
 }
 function syncField(){
  const node=[...detail.querySelectorAll('[data-pe-field]')].find(n=>n.dataset.peField===selectedField);
  if(!node)return;
  $('peText').value=node.querySelector('small')?node.firstChild.textContent.trim():node.innerText.replace(/\n{3,}/g,'\n\n').trim();
  const col=cssRGB(getComputedStyle(node).color);
  $('peTextColor').value=col;
  const px=clamp(Math.round(parseFloat(getComputedStyle(node).fontSize)),9,34);
  $('peTextSize').value=px;$('peTextSizeOut').value=px+'px';
 }
 function showPanel(action,animate=true){
  if(!action)return;
  clearFade();active=action;
  const isArtwork=Object.hasOwn(cardArt,action);
  const close=document.createElement('button');close.className='panel-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close '+titles[action]+' panel');
  close.onclick=e=>{e.stopPropagation();hidePanel()};
  if(isArtwork){
   // The actual customer-supplied transparent cards replace the original HTML menus.
   const image=document.createElement('img');
   image.className='illustrated-menu';image.src=cardArt[action];
   image.alt=action==='hours'?"Malik's Barbers opening hours, Monday to Sunday":'Malik’s Barbers service prices';
   image.draggable=false;
   detail.replaceChildren(image,close);
  }else{
   // Bookings is deliberately untouched.
   const article=$(action).cloneNode(true);article.removeAttribute('id');
   article.querySelector('h2')?.remove();
   article.querySelector('.signature')?.remove();
   makeFields(article,action);
   detail.replaceChildren(close,article);
  }
  detail.hidden=false;detail.dataset.action=action;
  detail.classList.toggle('artwork-panel',isArtwork);
  detail.setAttribute('aria-label',titles[action]+' details');
  detail.classList.toggle('editing-panel',panelEditor.open);
  markToday();applyPanelStyle();
  if(animate&&!reduced.matches){
   const from=action==='hours'?'translateY(-13%)':action==='contact'?'translateX(-12%)':'translateX(12%)';
   fade=detail.animate([{opacity:0,transform:from},{opacity:1,transform:'none'}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  if(panelEditor.open){
   $('pePanel').value=action;populateFields();syncPanelEditor();
   const locked=isArtwork;
   for(const id of ['peElement','peText','peTextColor','peTextSize'])$(id).disabled=locked;
   $('peStatus').textContent=locked
    ? 'This design is a single uploaded image. You can resize and move the panel; its printed text cannot be edited separately.'
    : 'Adjust the panel and its text, then export the preset to publish changes.';
  }
  render();
 }
 function navigate(action){
  if(panelEditor.open){panelEditor.close()}
  cancelTravel();hidePanel();
  route=action;
  if(action==='hours'&&frame<48)enterClicked=true;
  render(); // Hide ENTER immediately, rather than leaving the dot over the zoom.
  const serial=trip,end=stops[action],start=frame;
  const finish=()=>{
   if(serial!==trip)return;
   cancelAnimationFrame(travelRaf);travelRaf=0;
   if(movie.dataset.guided){movie.pause();delete movie.dataset.guided}
   route=null;setTarget(end);render(); // Arrive at the artwork. Only an artwork tap opens the glass panel.
  };
  if(start===end||reduced.matches){finish();return}
  const scrub=()=>{
   const begun=performance.now(),duration=Math.max(800,Math.abs(end-start)*1000/FPS);
   const step=now=>{
    if(serial!==trip)return;
    const t=clamp((now-begun)/duration,0,1),ease=t*t*(3-2*t);
    setTarget(start+(end-start)*ease);
    if(t>=1)finish();else travelRaf=requestAnimationFrame(step);
   };
   travelRaf=requestAnimationFrame(step);
  };
  if(end>start&&movie.readyState>=2){
   movie.dataset.guided='true';movie.currentTime=start/FPS;
   movie.play().then(()=>{
    if(serial!==trip)return;
    const follow=()=>{
     if(serial!==trip)return;
     const next=Math.round(movie.currentTime*FPS);
     if(next>=end||movie.ended){finish();return}
     if(next!==frame)setTarget(next);
     travelRaf=requestAnimationFrame(follow);
    };
    follow();
   }).catch(()=>{if(serial===trip){delete movie.dataset.guided;scrub()}});
  }else scrub();
 }
 buttons.forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
 function userInteraction(){
  if(dragPanel?.moving||dragTitle)return;
  if(route)cancelTravel();
  if(!active||panelEditor.open)return;
  clearFade();
  fadeTimer=setTimeout(()=>{
   if(!active||dragPanel?.moving||panelEditor.open)return;
   const outgoing=active;
   fade=detail.animate([{opacity:1},{opacity:0}],{duration:reduced.matches?0:410,fill:'forwards'});
   fade.onfinish=()=>{if(active===outgoing)hidePanel()};
  },1900);
 }
 scroller.addEventListener('wheel',userInteraction,{passive:true});
 scroller.addEventListener('touchmove',userInteraction,{passive:true});
 scroller.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))userInteraction()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(route)cancelTravel();if(active)hidePanel()}});
 detail.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('a,button'))return;
  if(panelEditor.open){
   const node=e.target.closest('[data-pe-field]');
   if(node){selectedField=node.dataset.peField;$('peElement').value=selectedField;syncField();}
   return;
  }
  ignoreTap=false;
  const g={id:e.pointerId,x:e.clientX,y:e.clientY,moving:false};dragPanel=g;
  g.timer=setTimeout(()=>{
   if(dragPanel!==g||!active)return;
   clearFade();g.moving=true;ignoreTap=true;detail.classList.add('moving');
   const r=detail.getBoundingClientRect();g.dx=g.x-(r.left+r.width/2);g.dy=g.y-(r.top+r.height/2);
   try{detail.setPointerCapture(g.id)}catch{}
  },450);
 });
 detail.addEventListener('pointermove',e=>{
  const g=dragPanel;if(!g||g.id!==e.pointerId)return;
  if(!g.moving){if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>9)clearTimeout(g.timer);return}
  const r=scene.getBoundingClientRect();
  settings[active].x=100*(e.clientX-r.left-g.dx)/r.width;
  settings[active].y=100*(e.clientY-r.top-g.dy)/r.height;
  applyPanelStyle();
 });
 function release(e){
  const g=dragPanel;if(!g||g.id!==e.pointerId)return;
  clearTimeout(g.timer);dragPanel=null;
  if(g.moving){detail.classList.remove('moving');ignoreTap=true;persist()}
 }
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 detail.addEventListener('contextmenu',e=>e.preventDefault());
 function markToday(){
  const day=new Intl.DateTimeFormat('en-IE',{weekday:'long',timeZone:'Europe/Dublin'}).format(new Date());
  document.querySelectorAll('[data-day]').forEach(row=>{
   const today=row.dataset.day===day;row.classList.toggle('today',today);
   const small=row.querySelector('small');if(small)small.hidden=!today;
  });
 }
 markToday();setInterval(markToday,30000);document.addEventListener('visibilitychange',markToday);
 layer.addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');if(!button||editor.open||dragTitle)return;
  if(panelEditor.open){panelEditor.close()}
  if(active===button.dataset.action)hidePanel();else showPanel(button.dataset.action);
 });
 // No long leader lines through the room: only small marker stubs when the viewpoint is off screen.
 $('leader').hidden=true;
 function markerPosition(action){
  if(frame<48)return {x:50,y:55};
  if(action==='hours')return {x:active==='contact'||isCurrent('contact')?93:7,y:17};
  if(action==='contact')return {x:7,y:78};
  return {x:93,y:78};
 }
 function showPins(){
  for(const button of buttons){
   const action=button.dataset.view,door=frame<48;
   const currently=isCurrent(action)||active===action;
   button.hidden=editor.open||panelEditor.open||
    (door?(action!=='hours'||enterClicked):currently);
   button.classList.toggle('edge-pin',!door);
   button.classList.toggle('entrance-pin',door);
   const pos=markerPosition(action);
   button.classList.toggle('edge-right',pos.x>50);
   button.classList.toggle('passed-pin',!door&&frame>wallFrames[action][1]);
   button.style.left=pos.x+'%';button.style.top=pos.y+'%';
   button.style.setProperty('--line-direction',pos.x>50?'-1':'1');
   const label=button.querySelector('span');
   if(label)label.textContent=door?'ENTER':action==='hours'?'HOURS':action==='contact'?'BOOKINGS':'PRICING';
  }
 }
 function render(){
  $('cardTime').value=frame;$('cardClock').value=time(frame);
  showPins();applyPanelStyle();
  const seen=new Set();
  for(const c of cards){
   const title=!!c.action&&!editor.open;
   const visible=title?isCurrent(c.action):frame>=c.start&&frame<=c.end;
   if(!visible||(!editor.open&&!c.action)||(title&&active===c.action))continue;
   seen.add(c.id);
   let node=document.getElementById('cue-'+c.id);
   if(!node){
    node=document.createElement(c.action?'button':'div');
    if(c.action){node.dataset.action=c.action;node.type='button';node.setAttribute('aria-controls','scenePanel')}
    node.id='cue-'+c.id;node.dataset.card=c.id;layer.append(node);
   }
   node.className='info-card '+c.shape+(c.id===selectedId?' chosen':'')+(title?' wall-lettering':'');
   node.setAttribute('aria-expanded',String(active===c.action));
   if(title){
    if(node.dataset.artwork!==c.action){node.replaceChildren(wallMarkup(c.action));node.dataset.artwork=c.action}
    const lp=settings[c.action].lettering;
    node.style.setProperty('--letter-glow',lp.glow);
    node.style.setProperty('--letter-glow-opacity',String(clamp(lp.strength/100,0,1)));
    const ratio=c.action==='contact'?5:5.3;
    const w=Math.min(layer.clientWidth*lp.width/100,layer.clientHeight*ratio*.95),h=w/ratio;
    Object.assign(node.style,{width:w+'px',height:h+'px',left:((layer.clientWidth-w)*lp.x/100)+'px',top:((layer.clientHeight-h)*lp.y/100)+'px'});
   }else{
    node.dataset.artwork='';node.textContent=titles[c.action]||c.text||('Card '+(cards.indexOf(c)+1));
    node.style.removeProperty('--letter-glow');node.style.removeProperty('--letter-glow-opacity');
    const ratio=c.shape==='square'?1:2.8;
    const w=Math.min(layer.clientWidth*c.size/100,layer.clientHeight*ratio*.94),h=w/ratio;
    Object.assign(node.style,{width:w+'px',height:h+'px',left:((layer.clientWidth-w)*c.x/100)+'px',top:((layer.clientHeight-h)*c.y/100)+'px'});
   }
  }
  [...layer.children].forEach(node=>{if(!seen.has(node.dataset.card))node.remove()});
 }
 // ----- Panels editor -----
 function syncPanelEditor(){
  const action=$('pePanel').value,p=settings[action],lp=p.lettering;
  for(const [id,value,unit] of [['peWidth',p.width,'%'],['peHeight',p.height,'%'],['peX',p.x,'%'],['peY',p.y,'%'],
   ['peLetterWidth',lp.width,'%'],['peLetterX',lp.x,'%'],['peLetterY',lp.y,'%'],['peGlowStrength',lp.strength,'%']]){
   $(id).value=Math.round(value);const out=$(id+'Out');if(out)out.value=Math.round(value)+unit;
  }
  $('peGlass').value=p.glass;$('peBorder').value=p.border;$('peGlow').value=lp.glow;
 }
 function choosePanel(action){
  cancelTravel();setTarget(stops[action]);selectedField=null;
  showPanel(action,false);syncPanelEditor();
 }
 $('panelsBtn').onclick=()=>{
  if(panelEditor.open){panelEditor.close();return}
  if(editor.open)editor.close();
  if($('panel').open)$('panel').close();
  panelEditor.show();
  detail.classList.add('editing-panel');
  $('pePanel').value=active||'hours';choosePanel($('pePanel').value);
 };
 $('peDone').onclick=()=>panelEditor.close();
 panelEditor.onclose=()=>{detail.classList.remove('editing-panel');render()};
 $('pePanel').onchange=e=>choosePanel(e.target.value);
 const applyEdit=(action,fn)=>{fn(settings[action]);persist();applyPanelStyle();render();syncPanelEditor()};
 for(const [id,key] of [['peWidth','width'],['peHeight','height'],['peX','x'],['peY','y']]){
  $(id).oninput=e=>applyEdit($('pePanel').value,p=>p[key]=Number(e.target.value));
 }
 for(const [id,key] of [['peGlass','glass'],['peBorder','border']]){
  $(id).oninput=e=>applyEdit($('pePanel').value,p=>p[key]=e.target.value);
 }
 for(const [id,key] of [['peLetterWidth','width'],['peLetterX','x'],['peLetterY','y'],['peGlowStrength','strength'],['peGlow','glow']]){
  $(id).oninput=e=>applyEdit($('pePanel').value,p=>p.lettering[key]=id==='peGlow'?e.target.value:Number(e.target.value));
 }
 $('peElement').onchange=e=>{selectedField=e.target.value;syncField()};
 function updateField(changes){
  const action=$('pePanel').value,node=[...detail.querySelectorAll('[data-pe-field]')].find(n=>n.dataset.peField===selectedField);
  if(!node)return;
  const old=settings[action].fields[selectedField]||{};
  const next={...old,...changes};settings[action].fields[selectedField]=next;
  if(changes.text!==undefined){
   if(node.querySelector('small')&&node.firstChild)node.firstChild.textContent=changes.text+' ';
   else node.textContent=changes.text;
   if(node.classList.contains('shop-phone'))node.href='tel:'+changes.text.replace(/[^+\d]/g,'');
  }
  if(changes.color)node.style.color=changes.color;
  if(changes.size)node.style.fontSize=changes.size+'px';
  persist();
 }
 $('peText').oninput=e=>updateField({text:e.target.value});
 $('peTextColor').oninput=e=>updateField({color:e.target.value});
 $('peTextSize').oninput=e=>{
  const n=Number(e.target.value);$('peTextSizeOut').value=n+'px';updateField({size:n});
 };
 $('peReset').onclick=()=>{
  const action=$('pePanel').value;
  if(!confirm('Reset panel size, position, colours and wording for '+titles[action]+'?'))return;
  const standard=defaults[device][action];settings[action]=structuredClone(standard);
  if(cardArt[action])Object.assign(settings[action],portraitDefaults);
  settings[action].fields={};
  persist();choosePanel(action);$('peStatus').textContent='Restored '+titles[action]+' defaults on this device.';
 };
 $('peExport').onclick=()=>{
  const result={desktop:{...window.MALIKS_PANEL_PRESETS?.desktop},mobile:{...window.MALIKS_PANEL_PRESETS?.mobile}};
  result[device]=Object.fromEntries(Object.entries(settings).map(([k,v])=>[k,v]));
  const contents='/* Malik’s Barbers published panel settings */\nwindow.MALIKS_PANEL_PRESETS = '+JSON.stringify(result,null,2)+';\n';
  const href=URL.createObjectURL(new Blob([contents],{type:'text/javascript'}));
  const a=document.createElement('a');a.href=href;a.download='panel-presets.js';a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);
  $('peStatus').textContent='Download created. Upload panel-presets.js to the GitHub repository root to publish these settings.';
 };
 // ----- Existing Cards editor retained unchanged in purpose -----
 const selected=()=>cards.find(c=>c.id===selectedId);
 function saveCards(){
  try{localStorage.setItem(key+'-edited','1');localStorage.setItem(key,JSON.stringify(cards))}
  catch{$('cardStatus').textContent='Device storage unavailable. Export your cards to keep them.'}
 }
 function fields(){
  const c=selected();$('cardFields').disabled=!c;
  $('cardList').replaceChildren(...cards.map((v,i)=>new Option((i+1)+'. '+(v.text.slice(0,26)||(v.shape==='square'?'Squircle':'Long rectangle'))+' · '+time(v.start),v.id,false,v===c)));
  if(c){$('cardText').value=c.text;$('cardX').value=c.x;$('cardY').value=c.y;$('cardSize').value=c.size;
   $('startClock').value=time(c.start);$('endClock').value=time(c.end)}
  else{$('cardText').value='';$('startClock').value='';$('endClock').value=''}
  render();
 }
 function add(shape){
  const c={id:crypto.randomUUID(),shape,start:frame,end:LAST,x:50,y:40,size:shape==='square'?24:46,text:''};
  cards.push(c);selectedId=c.id;saveCards();fields();
 }
 $('cardsBtn').onclick=()=>{
  if(editor.open){editor.close();return}
  if(panelEditor.open)panelEditor.close();
  editor.show();layer.classList.add('editing-cards');selectedId=selected()?.id||cards[0]?.id;fields();
 };
 editor.onclose=()=>{layer.classList.remove('editing-cards');cardDrag=null;render()};
 $('cardsDone').onclick=()=>editor.close();
 $('addSquare').onclick=()=>add('square');$('addLong').onclick=()=>add('long');
 $('cardTime').oninput=e=>jump(+e.target.value);
 $('cardList').onchange=e=>{selectedId=e.target.value;jump(selected().start);fields()};
 $('cardText').oninput=e=>{const c=selected();if(c){c.text=e.target.value;saveCards();render()}};
 $('cardText').onchange=fields;
 for(const [id,prop] of [['cardSize','size'],['cardX','x'],['cardY','y']]){
  $(id).oninput=e=>{const c=selected();if(c){c[prop]=+e.target.value;saveCards();render()}};
 }
 $('startHere').onclick=()=>{const c=selected();if(!c)return;c.start=frame;c.end=Math.max(c.end,frame);saveCards();fields()};
 $('endHere').onclick=()=>{const c=selected();if(!c)return;if(frame<c.start){$('cardStatus').textContent='Choose an end after '+time(c.start);return}c.end=frame;saveCards();fields()};
 $('deleteCard').onclick=()=>{cards=cards.filter(c=>c.id!==selectedId);selectedId=cards[0]?.id;saveCards();fields()};
 layer.addEventListener('pointerdown',e=>{
  const node=e.target.closest('.info-card');if(!editor.open||!node)return;
  selectedId=node.dataset.card;fields();const c=selected();if(!c)return;
  cardDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:c.x,top:c.y,w:node.offsetWidth,h:node.offsetHeight};
  try{node.setPointerCapture(e.pointerId)}catch{}e.preventDefault();
 });
 layer.addEventListener('pointermove',e=>{
  if(!cardDrag||cardDrag.id!==e.pointerId)return;
  const c=selected();if(!c)return;
  c.x=clamp(Math.round(cardDrag.left+100*(e.clientX-cardDrag.x)/Math.max(1,layer.clientWidth-cardDrag.w)),0,100);
  c.y=clamp(Math.round(cardDrag.top+100*(e.clientY-cardDrag.y)/Math.max(1,layer.clientHeight-cardDrag.h)),0,100);
  $('cardX').value=c.x;$('cardY').value=c.y;render();
 });
 layer.addEventListener('pointerup',()=>{if(cardDrag)saveCards();cardDrag=null});
 layer.addEventListener('pointercancel',()=>{if(cardDrag)saveCards();cardDrag=null});
 $('exportCards').onclick=()=>{
  const href=URL.createObjectURL(new Blob([JSON.stringify({version:1,fps:FPS,video:movie.getAttribute('src'),cards},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=href;a.download='maliks-cards.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);
 };
 scroller.addEventListener('tourframe',render);new ResizeObserver(render).observe(layer);render();
})();
