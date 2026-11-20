(() => {
 'use strict';
 const editor = $('cardsPanel'), layer = $('cardLayer'), nav = $('tourNav');
 const scene = nav.parentElement, detail = $('scenePanel'), panelEditor = $('panelEditor');
 const door = nav.querySelector('[data-enter]');
 const pins = [...nav.querySelectorAll('[data-view]')];
 const popupImage = detail.querySelector('img');
 const mobile = mobileTour, device = mobile ? 'mobile' : 'desktop';
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const key = 'maliks-card-drafts-v1';
 const prefKey = 'maliks-panel-layout-v4-' + device;
 const layoutKey = 'maliks-expanded-positions-final-' + device;
 const publishedLayouts = window.MALIKS_PANEL_PRESETS;
 const tracks = window.MALIKS_WALL_TRACKS[device];
 const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
 const stops = {hours: 85, contact: 131, prices: 206};
 const titles = {hours: 'Open Times', contact: 'Booking', prices: 'Pricing'};
 const assets = {
  hours:   {sign: 'neon-open-times.png', card: 'opening-hours-card.png', tint: '#48ff39'},
  contact: {sign: 'neon-booking.png', card: 'bookings-card.png', tint: '#18beff'},
  prices:  {sign: 'neon-pricing.png', card: 'pricing-card.png', tint: '#ff342f'}
 };
 const popoverCopy = {
  hours: 'Opening hours. Monday to Wednesday, 10 am to 7 pm. Thursday and Friday, 10 am to 8 pm. Saturday, 9 am to 7 pm. Sunday, 10 am to 6 pm.',
  contact: 'Bookings. Unit 3A, Riverpark View, Mulhuddart Village, Dublin 15, D15 DY09. Telephone 089 955 9209.',
  prices: 'Pricing. Dry Cut €20.50. Skin Fade €22.50. Haircut and Beard €25.50. Dry Kid’s Cut €18.50. Beard Trim €12.50. Face Mask and Wax €10.50. Hot Towel Shave €25.50. Haircut and Colour €40.50.'
 };
 const exteriorEnd = mobile ? 44 : 47;
 const actions = Object.keys(stops);
 function stored(name) {
  try { return JSON.parse(localStorage.getItem(name)) || {}; }
  catch { return {}; }
 }
 function readLayout(platform) {
  const shared = publishedLayouts[platform];
  const local = stored('maliks-panel-layout-v4-' + platform);
  const legacy = stored('maliks-panel-layout-v3-' + platform);
  const oldPositions = stored('maliks-expanded-positions-final-' + platform);
  return Object.fromEntries(actions.map(action => {
   const base = shared[action];
   const draft = local[action] || {};
   const older = legacy[action] || {};
   // In v3, the menus were text. Only their sign geometry carries across.
   const oldSign = older.lettering || {};
   return [action, {
    ...base, ...draft,
    x: draft.x ?? oldPositions[action]?.x ?? base.x,
    y: draft.y ?? oldPositions[action]?.y ?? base.y,
    lettering: {...base.lettering, ...oldSign, ...draft.lettering}
   }];
  }));
 }
 const settings = readLayout(device);
 function persist() {
  try {
   localStorage.setItem(prefKey, JSON.stringify(settings));
   localStorage.setItem(layoutKey, JSON.stringify(Object.fromEntries(actions.map(a => [a, {x: settings[a].x, y: settings[a].y}]))));
  } catch { $('peStatus').textContent = 'Device storage is unavailable. Export the preset to keep these settings.'; }
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
 const signs = new Map();
 let active = null, route = null, trip = 0, travelRaf = 0;
 let hideTimer = 0, motion = null, originScroll = 0;
 let dragPanel = null, ignoreClick = false, feedback = null;
 for (const action of actions) {
  const sign = document.createElement('button');
  sign.type = 'button';
  sign.className = 'wall-sign';
  sign.dataset.action = action;
  sign.hidden = true;
  sign.setAttribute('aria-label', 'View ' + titles[action]);
  sign.setAttribute('aria-controls', 'scenePanel');
  sign.style.setProperty('--tube-tint', assets[action].tint);
  const face = document.createElement('span');
  face.className = 'sign-face';
  const image = document.createElement('img');
  image.src = assets[action].sign;
  image.alt = '';
  image.draggable = false;
  face.append(image);
  sign.append(face);
  layer.append(sign);
  signs.set(action, sign);
 }
 const stageWidth = () => layer.clientWidth;
 const stageHeight = () => layer.clientHeight;
 function wallTransform(action, at) {
  for (const segment of tracks[action]) {
   if (at < segment[0][0] || at > segment[segment.length - 1][0]) continue;
   const index = segment.findIndex(row => row[0] >= at);
   const next = segment[index];
   if (at === next[0]) return next.slice(1);
   const prev = segment[index - 1];
   const t = (at - prev[0]) / (next[0] - prev[0]);
   return prev.slice(1).map((n, i) => n + (next[i + 1] - n) * t);
  }
  return null;
 }
 function placeSign(action, at, sw, sh) {
  const sign = signs.get(action);
  const pose = wallTransform(action, at);
  if (editor.open || !pose || sw <= 0 || sh <= 0 || at <= exteriorEnd) {
   sign.hidden = true;
   return false;
  }
  const preset = settings[action].lettering;
  const width = sw * preset.width / 100;
  const height = width / 3;
  // Preserve the centre set in the original Panels editor (its sign boxes were wider in aspect).
  const oldHeight = width / (action === 'contact' ? 5 : 5.3);
  const refX = (sw - width) * preset.x / 100 + width / 2;
  const refY = (sh - oldHeight) * preset.y / 100 + oldHeight / 2;
  const [a, b, c, d, tx, ty] = pose;
  const x = a * refX + c * refY + tx * sw;
  const y = b * refX + d * refY + ty * sh;
  if (x < 0 || x > sw || y < 0 || y > sh) {
   sign.hidden = true;
   return false;
  }
  sign.hidden = false;
  sign.style.width = width + 'px';
  sign.style.height = height + 'px';
  sign.style.left = x - width / 2 + 'px';
  sign.style.top = y - height / 2 + 'px';
  sign.style.transform = 'matrix(' + [a,b,c,d,0,0].join(',') + ')';
  sign.style.setProperty('--sign-halo', preset.glow);
  sign.style.setProperty('--halo-opacity', clamp(preset.strength / 100, 0, 1));
  return true;
 }
 function showPins(at, sw, sh) {
  const outside = at <= exteriorEnd;
  const editing = editor.open || panelEditor.open;
  door.hidden = editing || !outside || !!route;
  for (const button of pins) {
   const action = button.dataset.view;
   const wallVisible = placeSign(action, at, sw, sh);
   const expanded = active === action && !detail.hidden && !detail.inert;
   signs.get(action).setAttribute('aria-expanded', String(expanded));
   button.setAttribute('aria-expanded', String(expanded));
   button.hidden = editing || outside || wallVisible;
   if (button.hidden) continue;
   const right = action === 'prices' || (action === 'hours' && at >= 109 && at < 147);
   button.className = 'edge-pin' + (right ? ' edge-right' : '') + (at > stops[action] ? ' passed-pin' : '');
   button.style.left = right ? '93%' : '7%';
   button.style.top = action === 'hours' ? '17%' : '78%';
  }
 }
 function renderDrafts(sw, sh) {
  const seen = new Set();
  if (editor.open) for (const card of cards) {
   if (frame < card.start || frame > card.end) continue;
   seen.add(card.id);
   let node = document.getElementById('cue-' + card.id);
   if (!node) {
    node = document.createElement('div');
    node.id = 'cue-' + card.id;
    node.dataset.card = card.id;
    layer.append(node);
   }
   node.className = 'info-card ' + card.shape + (card.id === selectedId ? ' chosen' : '');
   node.textContent = titles[card.action] || card.text || 'Card ' + (cards.indexOf(card) + 1);
   const ratio = card.shape === 'square' ? 1 : 2.8;
   const width = Math.min(sw * card.size / 100, sh * ratio * .94);
   const height = width / ratio;
   Object.assign(node.style, {width: width+'px', height: height+'px', left: (sw-width)*card.x/100+'px', top: (sh-height)*card.y/100+'px'});
  }
  layer.querySelectorAll('[data-card]').forEach(node => { if (!seen.has(node.dataset.card)) node.remove(); });
 }
 let paintedFrame = frame;
 function displayedFrame() {
  if (movie.readyState < 2) return frame;
  return 'requestVideoFrameCallback' in movie ? paintedFrame : Math.round(movie.currentTime * FPS);
 }
 function render() {
  const sw = stageWidth(), sh = stageHeight();
  $('cardTime').value = frame;
  $('cardClock').value = time(frame);
  renderDrafts(sw, sh);
  showPins(displayedFrame(), sw, sh);
 }
 function applyPanelStyle() {
  if (!active) return;
  const pref = settings[active];
  const w = clamp(pref.width, 20, 96);
  const h = clamp(pref.height, 14, 92);
  detail.style.width = w + '%';
  detail.style.height = h + '%';
  detail.style.left = clamp(pref.x, w/2+1, 99-w/2) + '%';
  detail.style.top = clamp(pref.y, h/2+1, 99-h/2) + '%';
 }
 function clearTimer() {
  clearTimeout(hideTimer);
  hideTimer = 0;
 }
 function stopMotion() {
  if (motion) { motion.onfinish = null; motion.cancel(); motion = null; }
 }
 function cancelDrag() {
  if (dragPanel) clearTimeout(dragPanel.timer);
  dragPanel = null;
  detail.classList.remove('moving');
 }
 function hidePanel(animate = true, restoreFocus = false) {
  clearTimer();
  cancelDrag();
  if (!active) return;
  const action = active;
  const hadFocus = detail.contains(document.activeElement);
  const opacity = Number(getComputedStyle(detail).opacity);
  const transform = getComputedStyle(detail).transform;
  stopMotion();
  active = null;
  detail.inert = true;
  const done = () => { detail.hidden = true; stopMotion(); };
  if (animate && !reduced.matches) {
   motion = detail.animate([{opacity, transform}, {opacity: 0, transform:'translateY(8px) scale(.965)'}],
    {duration:180, easing:'ease-in', fill:'forwards'});
   motion.onfinish = done;
  } else done();
  render();
  if (restoreFocus && hadFocus) {
   const sign = signs.get(action);
   const pin = pins.find(p => p.dataset.view === action);
   const target = !sign.hidden ? sign : !pin.hidden ? pin : !door.hidden ? door : scroller;
   target.focus({preventScroll:true});
  }
 }
 function flashSign(action) {
  if (feedback) { feedback.cancel(); feedback = null; }
  const face = signs.get(action).firstElementChild;
  if (reduced.matches) return;
  feedback = face.animate([{filter:'brightness(1)', transform:'scale(1)'},
   {filter:'brightness(1.42)', transform:'scale(.965)', offset:.25},
   {filter:'brightness(1)', transform:'scale(1)'}], {duration:380, easing:'ease-out'});
 }
 function showPanel(action, animate = true, focus = false) {
  clearTimer();
  stopMotion();
  cancelDrag();
  active = action;
  ignoreClick = false;
  originScroll = scroller.scrollTop;
  const source = assets[action].card;
  if (popupImage.getAttribute('src') !== source) popupImage.src = source;
  detail.dataset.action = action;
  detail.setAttribute('aria-label', popoverCopy[action] + ' Activate to dismiss.');
  detail.hidden = false;
  detail.inert = false;
  applyPanelStyle();
  if (animate && !reduced.matches) {
   const from = action === 'contact' ? 'translateX(-10px)' : action === 'prices' ? 'translateX(10px)' : 'translateY(10px)';
   motion = detail.animate([{opacity:0, transform:from+' scale(.955)'}, {opacity:1, transform:'none'}],
    {duration:310, easing:'cubic-bezier(.18,.76,.23,1)'});
  }
  render();
  if (focus) detail.focus({preventScroll:true});
 }
 function cancelTravel() {
  trip++;
  cancelAnimationFrame(travelRaf);
  travelRaf = 0;
  if (movie.dataset.guided) { movie.pause(); delete movie.dataset.guided; }
  route = null;
 }
 function navigate(action, keyboard = false) {
  cancelTravel();
  const serial = trip, start = frame, end = stops[action];
  route = action;
  if (panelEditor.open) panelEditor.close();
  if (active && (start !== end || active !== action)) hidePanel();
  if (!signs.get(action).hidden && start !== end) flashSign(action);
  render();
  const finish = () => {
   if (serial !== trip) return;
   cancelTravel();
   jump(end);
   flashSign(action);
   showPanel(action, true, keyboard);
  };
  if (start === end || reduced.matches) { finish(); return; }
  const scrub = () => {
   const from = frame, begun = performance.now();
   const duration = Math.max(240, Math.abs(end-from) * 1000/FPS);
   const step = now => {
    if (serial !== trip) return;
    const t = clamp((now-begun)/duration,0,1);
    if (t >= 1) { finish(); return; }
    jump(Math.round(from+(end-from)*t*t*(3-2*t)));
    travelRaf = requestAnimationFrame(step);
   };
   travelRaf = requestAnimationFrame(step);
  };
  if (end <= start || movie.readyState < 2) { scrub(); return; }
  movie.dataset.guided = 'true';
  movie.currentTime = start/FPS;
  let lastTime = -1, advanced = performance.now();
  const follow = now => {
   if (serial !== trip) return;
   const t = movie.currentTime;
   if (t !== lastTime) { advanced = now; lastTime = t; }
   if (t*FPS >= end-.45 || movie.ended) { finish(); return; }
   if (!Number.isFinite(t) || now-advanced > 900) {
    movie.pause(); delete movie.dataset.guided; scrub(); return;
   }
   const next = Math.round(t*FPS);
   if (next !== frame) jump(next);
   travelRaf = requestAnimationFrame(follow);
  };
  movie.play().catch(() => { /* The progress monitor falls back to frame scrubbing. */ });
  travelRaf = requestAnimationFrame(follow);
 }
 door.addEventListener('click', e => navigate('hours', e.detail === 0));
 for (const pin of pins) pin.addEventListener('click', e => navigate(pin.dataset.view, e.detail === 0));
 layer.addEventListener('click', e => {
  const sign = e.target.closest('.wall-sign');
  if (sign && !editor.open && !panelEditor.open) navigate(sign.dataset.action, e.detail === 0);
 });
 function interruptTravel() {
  if (route) { cancelTravel(); render(); }
 }
 scroller.addEventListener('wheel', interruptTravel, {passive:true});
 scroller.addEventListener('touchmove', interruptTravel, {passive:true});
 scroller.addEventListener('pointerdown', e => { if (e.target === scroller) interruptTravel(); });
 scroller.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) interruptTravel();
 });
 scroller.addEventListener('scroll', () => {
  if (!active || route || panelEditor.open || dragPanel?.moving) return;
  // Start once on departure. More scroll events must not extend the one-second delay.
  if (Math.abs(scroller.scrollTop - originScroll) < 1) { clearTimer(); return; }
  if (!hideTimer) hideTimer = setTimeout(() => hidePanel(), 1000);
 }, {passive:true});
 document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || editor.open || panelEditor.open || $('panel').open) return;
  interruptTravel();
  hidePanel(true, true);
 });
 detail.addEventListener('click', () => {
  if (ignoreClick) { ignoreClick = false; return; }
  if (active && !panelEditor.open) hidePanel(true, true);
 });
 detail.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button !== 0 || !active || panelEditor.open) return;
  ignoreClick = false;
  const g = {id:e.pointerId, x:e.clientX, y:e.clientY, moving:false};
  dragPanel = g;
  g.timer = setTimeout(() => {
   if (dragPanel !== g || !active) return;
   clearTimer();
   g.moving = true;
   ignoreClick = true;
   detail.classList.add('moving');
   const r = detail.getBoundingClientRect();
   g.dx = g.x - r.left - r.width/2;
   g.dy = g.y - r.top - r.height/2;
   detail.setPointerCapture(g.id);
  }, 450);
 });
 detail.addEventListener('pointermove', e => {
  const g = dragPanel;
  if (!g || g.id !== e.pointerId) return;
  if (!g.moving) {
   if (Math.hypot(e.clientX-g.x,e.clientY-g.y) > 9) { clearTimeout(g.timer); ignoreClick = true; }
   return;
  }
  const r = scene.getBoundingClientRect();
  settings[active].x = clamp(100*(e.clientX-r.left-g.dx)/r.width,0,100);
  settings[active].y = clamp(100*(e.clientY-r.top-g.dy)/r.height,0,100);
  applyPanelStyle();
 });
 function release(e) {
  if (!dragPanel || dragPanel.id !== e.pointerId) return;
  if (dragPanel.moving) persist();
  cancelDrag();
 }
 window.addEventListener('pointerup', release);
 window.addEventListener('pointercancel', release);
 detail.addEventListener('contextmenu', e => e.preventDefault());
 function markToday(){
  const day = new Intl.DateTimeFormat('en-IE',{weekday:'long',timeZone:'Europe/Dublin'}).format(new Date());
  document.querySelectorAll('[data-day]').forEach(row => {
   const today = row.dataset.day === day;
   row.classList.toggle('today', today);
   const small = row.querySelector('small');
   if (small) small.hidden = !today;
  });
 }
 markToday();
 setInterval(markToday, 30000);
 document.addEventListener('visibilitychange', markToday);
 // The Panels editor always previews the authored reference frame.
 const controls = [
  ['peWidth','width'], ['peHeight','height'], ['peX','x'], ['peY','y'],
  ['peLetterWidth','width',true], ['peLetterX','x',true], ['peLetterY','y',true],
  ['peGlowStrength','strength',true], ['peGlow','glow',true]
 ];
 function syncPanelEditor() {
  const pref = settings[$('pePanel').value];
  for (const [id, prop, isSign] of controls) {
   const v = (isSign ? pref.lettering : pref)[prop];
   $(id).value = v;
   const out = $(id+'Out');
   if (out) out.value = Math.round(v)+'%';
  }
 }
 function choosePanel(action) {
  cancelTravel();
  jump(stops[action]);
  if ($('peShowCard').checked) showPanel(action, false);
  else hidePanel(false);
  syncPanelEditor();
 }
 $('panelsBtn').onclick = () => {
  if (panelEditor.open) { panelEditor.close(); return; }
  if (editor.open) editor.close();
  if ($('panel').open) $('panel').close();
  panelEditor.show();
  $('pePanel').value = active || 'hours';
  $('peShowCard').checked = true;
  choosePanel($('pePanel').value);
 };
 $('peDone').onclick = () => panelEditor.close();
 panelEditor.onclose = () => { originScroll = scroller.scrollTop; render(); };
 $('pePanel').onchange = e => choosePanel(e.target.value);
 $('peShowCard').onchange = () => choosePanel($('pePanel').value);
 for (const [id, prop, isSign] of controls) {
  $(id).oninput = e => {
   const pref = settings[$('pePanel').value];
   (isSign ? pref.lettering : pref)[prop] = id === 'peGlow' ? e.target.value : Number(e.target.value);
   persist();
   applyPanelStyle();
   syncPanelEditor();
   render();
  };
 }
 $('peReset').onclick = () => {
  const action = $('pePanel').value;
  if (!confirm('Restore the published '+titles[action]+' layout on this device?')) return;
  settings[action] = structuredClone(publishedLayouts[device][action]);
  persist();
  choosePanel(action);
  $('peStatus').textContent = 'Published layout restored on this device.';
 };
 $('peExport').onclick = () => {
  const result = {desktop:readLayout('desktop'), mobile:readLayout('mobile')};
  result[device] = settings;
  const contents = '/* Published panel layouts for Malik’s Barbers */\nwindow.MALIKS_PANEL_PRESETS = '+JSON.stringify(result,null,2)+';\n';
  const href = URL.createObjectURL(new Blob([contents],{type:'text/javascript'}));
  const a = document.createElement('a');
  a.href = href;
  a.download = 'panel-presets.js';
  a.click();
  setTimeout(() => URL.revokeObjectURL(href),10000);
  $('peStatus').textContent = 'Both layouts are in panel-presets.js. Upload it to the site to make these settings the defaults.';
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
  cancelTravel();hidePanel(false);
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
 if ('requestVideoFrameCallback' in movie) {
  const onVideoFrame = (_, metadata) => {
   paintedFrame = clamp(Math.round(metadata.mediaTime * FPS), 0, LAST);
   showPins(paintedFrame, stageWidth(), stageHeight());
   movie.requestVideoFrameCallback(onVideoFrame);
  };
  movie.requestVideoFrameCallback(onVideoFrame);
 } else {
  movie.addEventListener('seeked',render);
  movie.addEventListener('timeupdate',render);
 }
 scroller.addEventListener('tourframe',render);
 new ResizeObserver(render).observe(layer);
 render();
})();
