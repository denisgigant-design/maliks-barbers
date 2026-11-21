(() => {
 'use strict';
 const editor = $('cardsPanel'), layer = $('cardLayer'), nav = $('tourNav');
 const scene = nav.parentElement, detail = $('scenePanel'), panelEditor = $('panelEditor');
 const door = nav.querySelector('[data-enter]');
 const pins = [...nav.querySelectorAll('[data-view]')];
 const mobile = mobileTour, device = mobile ? 'mobile' : 'desktop';
 const iosWebkit = document.documentElement.classList.contains('ios-webkit');
 const glass=window.MalikGlass;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const key = 'maliks-card-drafts-v4';
 const layoutKey = platform => 'maliks-wall-mount-layout-v4-' + platform;
 const publishedLayouts = window.MALIKS_PANEL_PRESETS;
 const tracks = window.MALIKS_WALL_TRACKS[device];
 const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
 const stops = {hours: 85, contact: 131, prices: 206};
 const mountDefaults = {depth:0, yaw:0, pitch:0, roll:0, bend:0};
 const enterRadius = FPS / 2, leaveRadius = enterRadius + 3;
 const signDepartureDelay = 1000;
 const titles = glass.names;
 const exteriorEnd = mobile ? 44 : 47;
 const actions = Object.keys(stops);
 function stored(name) {
  try { return JSON.parse(localStorage.getItem(name)) || {}; }
  catch { return {}; }
 }
 function publishedPanel(platform, action) {
  const base = structuredClone(publishedLayouts[platform][action]);
  base.lettering = {...mountDefaults, ...base.lettering};
  return base;
 }
 function mergeLayout(base,draft,previous){
  const merged={...base};
  for(const [field,next] of Object.entries(draft||{})){
   if(field==='__proto__'||field==='constructor'||field==='prototype')continue;
   const prior=previous?.[field];
   if(previous && JSON.stringify(next)===JSON.stringify(prior))continue;
   merged[field]=next && typeof next==='object' && !Array.isArray(next)?
    mergeLayout(base?.[field],next,prior):next;
  }
  return merged;
 }
 function readLayout(platform) {
  const saved=stored(layoutKey(platform));
  let previous;
  if(saved.basedOn && saved.basedOn!==JSON.stringify(publishedLayouts[platform])){
   try{previous=JSON.parse(saved.basedOn);}catch{}
  }
  return Object.fromEntries(actions.map(action=>[action,
    mergeLayout(publishedPanel(platform,action),saved.panels?.[action],previous?.[action])]));
 }
 const layouts = {desktop:readLayout('desktop'),mobile:readLayout('mobile')};
 let editDevice = device;
 const settings = layouts[device];
 function persist(platform=device) {
  try {
   const basedOn = JSON.stringify(publishedLayouts[platform]);
   localStorage.setItem(layoutKey(platform), JSON.stringify({basedOn, panels:layouts[platform]}));
  } catch { $('peStatus').textContent = 'Device storage is unavailable. Export a backup to keep your settings.'; }
 }
 let cards=structuredClone(window.MALIKS_EXPERIENCE_DEFAULTS?.cards || []),selectedId=null,cardDrag=null;
 try{const existing=JSON.parse(localStorage.getItem(key));if(Array.isArray(existing))cards=existing}catch{}
 if(!cards.length && !stored(key+'-edited') && !window.MALIKS_EXPERIENCE_DEFAULTS?.cards){
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
 const mounts = new Map();
 let active = null, route = null, trip = 0, travelRaf = 0;
 let travelSeekAt = 0;
 const travelFps = iosWebkit ? 25 : 30; // Prevent iPhone video/decode and layout saturation.
 let hideTimer = 0, motion = null, originScroll = 0;
 let dragPanel = null, ignoreClick = false;
 const visits = Object.fromEntries(actions.map(action => [action, {
  phase:'off', inRange:false, anchor:null, timer:0, fade:null
 }]));
 let lastScrollTop = scroller.scrollTop, scrolling = false, settleTimer = 0;
 let paintedFrame = null, lastNativeFrame = 0, landingFrame = null;
 for (const button of pins) {
  const action=button.dataset.view;
  button.dataset.action=action;
  signs.set(action,button);
  mounts.set(action,{face:glass.marker(button,action),key:''});
 }
 function fitMount(action,width,preset,height,wall) {
  const mount=mounts.get(action),sign=signs.get(action),material=glass.read(device,action);
  const cacheKey=[width,height,wall,preset.depth,preset.yaw,preset.pitch,preset.roll,preset.bend,preset.glow,preset.strength,material.rim,material.blur,material.opacity].join('/');
  if(mount.key===cacheKey)return;
  mount.key=cacheKey;
  sign.style.width=width+'px';sign.style.height=height+'px';
  sign.style.setProperty('--sign-perspective',width*2.8+'px');
  sign.style.setProperty('--clipper-scale',material.markerScale/100);
  const color=preset.glow||'#ffffff';
  const rgb=[1,3,5].map(i=>parseInt(color.substring(i,i+2),16)||0);
  const light=(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])/255;
  sign.style.setProperty('--rim',Math.min(.95,.2+material.rim*.004+preset.strength*.003*(.4+light*.6)));
  sign.style.setProperty('--glass-opacity',Math.min(.82,.30+material.opacity*.006));
  sign.style.setProperty('--glass-blur',Math.round(material.blur*.55)+'px');
  mount.face.style.transform=wall?'translateZ('+width*preset.depth/100+'px) rotateZ('+preset.roll+'deg) rotateY('+preset.yaw+'deg) rotateX('+preset.pitch+'deg)':'none';
  glass.changeShape(mount.face,'marker',wall?preset.bend:0);
 }
 // Precompute the same subpixel transform for each decoded frame in either swipe direction.
 function makeWallPoses(action) {
  const stop = stops[action], identity = [1,0,0,1,0,0];
  const rows = tracks[action].find(rows => rows[0][0] <= stop && rows[rows.length-1][0] >= stop);
  function sample(at) {
   const i = rows.findIndex(row => row[0] >= at);
   if (i < 0) return rows[rows.length-1].slice(1);
   const next = rows[i];
   if (i === 0 || at === next[0]) return next.slice(1);
   const prev = rows[i-1], t = (at - prev[0]) / (next[0] - prev[0]);
   return prev.slice(1).map((v, col) => v + (next[col+1] - v) * t);
  }
  function smooth(at) {
   const left = sample(at-2), middle = sample(at), right = sample(at+2);
   return middle.map((v, i) => (left[i] + 2*v + right[i]) / 4);
  }
  const reference = smooth(stop);
  const poses = new Map();
  // Follow the real wall during the departure delay, including outside the arrival area.
  for (let at = rows[0][0]; at <= rows[rows.length - 1][0]; at++) {
   const values = smooth(at);
   poses.set(at, values.map((v, i) => identity[i] + (v - reference[i])));
  }
  return poses;
 }
 const poses = Object.fromEntries(actions.map(action => [action, makeWallPoses(action)]));
 function placeSign(action, at, sw, sh) {
  const sign = signs.get(action);
  const pose = poses[action].get(at);
  if (!pose || !sw || !sh) {
   sign.hidden = true;
   return false;
  }
  const preset = settings[action].lettering;
  const authoredWidth=sw*preset.width/100,scale=glass.read(device,action).markerScale/100;
  const width=clamp(Math.max(88,authoredWidth*.38)*scale,76,Math.min(140,sw*.94));
  const height=58;
  const oldHeight=authoredWidth/(action==='contact'?5:5.3);
  const refX=(sw-authoredWidth)*preset.x/100+authoredWidth/2;
  const refY=(sh-oldHeight)*preset.y/100+oldHeight/2;
  const [a,b,c,d,tx,ty]=pose;
  const left=clamp(refX-width/2,1,sw-width-1),top=clamp(refY-height/2,1,sh-height-1);
  fitMount(action,width,preset,height,true);
  sign.className='glass-marker wall-sign';
  sign.style.left='0';sign.style.top='0';
  sign.style.transform='matrix('+[a,b,c,d,a*left+c*top+tx*sw,b*left+d*top+ty*sh].join(',')+')';
  sign.hidden=false;
  return true;
 }
 function cancelDeparture(visit) {
  clearTimeout(visit.timer);
  if (visit.fade) {
   visit.fade.onfinish = null;
   visit.fade.cancel();
   visit.fade = null;
  }
 }
 function resetVisits() {
  for (const visit of Object.values(visits)) {
   cancelDeparture(visit);
   visit.phase = 'off';
   visit.inRange = false;
   visit.anchor = null;
  }
 }
 function revealWall(action, anchor) {
  const visit = visits[action];
  cancelDeparture(visit);
  visit.phase = 'mounted';
  visit.anchor = anchor;
  visit.inRange = true;
 }
 function leaveWall(action) {
  const visit = visits[action];
  if (visit.phase !== 'mounted') return;
  visit.phase = 'leaving';
  visit.timer = setTimeout(() => {
   const sign = signs.get(action);
   const finish = () => {
    visit.phase = 'off';
    if (visit.fade) { visit.fade.cancel(); visit.fade = null; }
    render();
   };
   if (sign.hidden || !sign.classList.contains('wall-sign') || reduced.matches || typeof sign.animate !== 'function') { finish(); return; }
   visit.fade = sign.animate([{opacity:1}, {opacity:0}], {duration:240, easing:'ease-out', fill:'forwards'});
   visit.fade.onfinish = finish;
  }, signDepartureDelay);
 }
 function wallVisibleAt(action, at) {
  if (at === null) return false;
  if (editor.open || panelEditor.open) {
   return panelEditor.open && action === $('pePanel').value && Math.abs(at-stops[action]) <= 1;
  }
  const visit = visits[action];
  const targetDistance = Math.abs(frame-stops[action]);
  if (targetDistance > leaveRadius) visit.inRange = false;
  if (!visit.inRange && targetDistance <= enterRadius && Math.abs(at-stops[action]) <= enterRadius && (!route || route === action)) {
   revealWall(action, scrolling ? null : scroller.scrollTop);
  }
  return visit.phase !== 'off';
 }
 function settleWalls() {
  clearTimeout(settleTimer);
  scrolling = false;
  for (const action of actions) {
   const visit = visits[action];
   if (visit.phase === 'mounted' && visit.inRange) visit.anchor = scroller.scrollTop;
  }
 }
 function scrollWalls() {
  const top = scroller.scrollTop, previous = lastScrollTop;
  if (top === previous) return;
  lastScrollTop = top;
  scrolling = true;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settleWalls, 140);
  if (editor.open || panelEditor.open || route) return;
  const target = clamp(LAST * top / range(), 0, LAST);
  if (landingFrame !== null && Math.abs(target-landingFrame) > 1) landingFrame = null;
  for (const action of actions) {
   const visit = visits[action], distance = Math.abs(target - stops[action]);
   // An arriving swipe can settle anywhere near the wall. A new scroll from that spot is a departure.
   if (visit.phase === 'mounted') {
    if (visit.anchor === null ? distance > leaveRadius : Math.abs(top-visit.anchor) >= 1) leaveWall(action);
   } else if (!route && visit.anchor !== null && distance <= enterRadius &&
     Math.abs(top-visit.anchor) < Math.abs(previous-visit.anchor)) {
    revealWall(action, null);
   }
  }
 }
 // Prefer the authored edge and height. If a panel or another marker occupies that
 // space, choose the nearest clear point along either edge without changing the preset.
 function edgePosition(preferredX,otherX,y,w,sh,occupied){
  const ys=[y,30,sh-30];
  for(const box of occupied)ys.push(box.y-box.h/2-34,box.y+box.h/2+34);
  let best={x:preferredX,y},bestScore=Infinity;
  for(const x of [preferredX,otherX]){
   for(const wanted of ys){
    const cy=clamp(wanted,30,Math.max(30,sh-30));
    let score=Math.abs(cy-y)+Math.abs(x-preferredX)*.38;
    for(const b of occupied){
     const dx=Math.max(0,Math.min(x+w/2+2,b.x+b.w/2)-Math.max(x-w/2-2,b.x-b.w/2));
     const dy=Math.max(0,Math.min(cy+30,b.y+b.h/2)-Math.max(cy-30,b.y-b.h/2));
     score+=dx*dy*100;
    }
    if(score<bestScore){best={x,y:cy};bestScore=score;}
   }
  }
  return best;
 }
 function showPins(sw,sh,roomRect) {
  const at=paintedFrame;
  const outside=at===null || at<=exteriorEnd, editing=editor.open||panelEditor.open;
  const activeElement=document.activeElement;
  const lanes=[];
  const gutter=Math.max(0,(scene.parentElement.clientWidth-sw)/2);
  if(active && !detail.hidden)lanes.push({x:parseFloat(detail.style.left),y:parseFloat(detail.style.top),w:detail.offsetWidth,h:detail.offsetHeight});
  for(const mark of pins){
   if(!mark.hidden && mark.classList.contains('wall-sign') && at!==null && poses[mark.dataset.view].has(at)){
    const rect=mark.getBoundingClientRect();
    lanes.push({x:rect.left-roomRect.left+rect.width/2,y:rect.top-roomRect.top+rect.height/2,w:rect.width,h:rect.height});
   }
  }
  door.hidden=editing || !outside || !!route;
  for(const button of pins){
   const action=button.dataset.view,expanded=active===action&&!detail.hidden&&!detail.inert;
   button.setAttribute('aria-expanded',String(expanded));
   const wall=wallVisibleAt(action,at) && !outside && poses[action].has(at);
   const parent=wall?layer:nav;
   if(button.parentNode!==parent)parent.append(button);
   button.hidden=outside || (editing&&!wall);
   if(button.hidden)continue;
   if(wall)placeSign(action,at,sw,sh);
   else{
    const right=action==='prices'||(action==='hours'&&at>=109&&at<147);
    const p=glass.read(device,action),preset=settings[action].lettering;
    const w=clamp((action==='hours'?98:82)*p.markerScale/100,72,Math.max(72,(sw-8)/2));
    fitMount(action,w,preset,58,false);
    button.className='glass-marker edge-pin'+(right?' edge-right':'');
    const edge=gutter>=190 && sw<530 ? -Math.min(gutter*.5,w/2+12+gutter*p.edgeInset/100) :
      w/2+4+(sw-w-8)*p.edgeInset/100;
    const preferred=right?sw-edge:edge;
    const position=edgePosition(preferred,sw-preferred,sh*p.edgeY/100,w,sh,lanes);
    lanes.push({...position,w,h:58});
    button.style.left=position.x+'px';button.style.top=position.y+'px';button.style.transform='';
   }
   if(activeElement===button && !editing && document.activeElement!==button)button.focus({preventScroll:true});
  }
 }
 let draftsMounted = false;
 function renderDrafts(sw, sh) {
  if (!editor.open && !draftsMounted) return;
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
  draftsMounted = seen.size > 0;
 }
 function render() {
  const roomRect=layer.getBoundingClientRect(),{width:sw,height:sh}=roomRect;
  $('cardTime').value = frame;
  $('cardClock').value = time(frame);
  renderDrafts(sw, sh);
  showPins(sw,sh,roomRect);
 }
 function applyPanelStyle() {
  if (!active) return;
  glass.place(device,active,settings[active]);
 }
 function clearTimer() {
  clearTimeout(hideTimer);
  hideTimer = 0;
 }
 let motionSerial=0;
 function stopMotion() {
  motionSerial++;
  if(motion){motion.cancel();motion=null;}
  // An interrupted close must not leave a translucent panel on its next opening.
  for(const face of Object.values(glass.faces)){
   face.style.removeProperty('opacity');face.style.removeProperty('transform');
  }
 }
 function transition(show,animate,action,done) {
  const face=glass.faces[action],serial=++motionSerial;
  const ms=glass.read(device,action).duration*(show?1:.7);
  const finish=()=>{if(serial!==motionSerial)return;motion=null;if(done)done();};
  if(!animate || reduced.matches || !ms){finish();return;}
  // Keep the glass surface fully resolved through navigation.
  const animations=glass.contentMotion(face,ms,show);
  motion={cancel(){animations.forEach(a=>a.cancel());}};
  if(animations.length)Promise.all(animations.map(a=>a.finished)).then(()=>{if(serial!==motionSerial)return;finish();animations.forEach(a=>a.cancel());},()=>{});else finish();
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
  stopMotion();
  active=null;detail.inert=true;detail.setAttribute('inert','');
  transition(false,animate,action,()=>{detail.hidden=true;});
  render();
  if (restoreFocus && hadFocus) {
   const sign = signs.get(action);
   
   const target = !sign.hidden ? sign : !door.hidden ? door : scroller;
   target.focus({preventScroll:true});
  }
 }
 function showPanel(action, animate = true, focus = false) {
  clearTimer();
  stopMotion();
  cancelDrag();
  active = action;
  ignoreClick = false;
  originScroll = scroller.scrollTop;
  detail.dataset.action=action;
  // Commit both geometry and material before making the panel visible.
  glass.reveal(action);
  applyPanelStyle();
  detail.hidden=false;detail.inert=false;detail.removeAttribute('inert');
  transition(true,animate,action);
  render();
  if (focus) detail.focus({preventScroll:true});
 }
 // A single guided navigation runs at a controlled update rate. Previously every
 // requestAnimationFrame tried another video seek (often 60 seeks/second), while
 // scroll events immediately sought AGAIN. Mobile WebKit cannot decode that load.
 let clearArrival=null,lastIntent=-Infinity;
 function cancelTravel() {
  trip++;if(clearArrival){clearArrival();clearArrival=null;}
  cancelAnimationFrame(travelRaf);
  travelRaf = 0;
  if (movie.dataset.guided) {
   movie.pause();
   delete movie.dataset.guided;
  }
  if (movie.playbackRate !== 1) movie.playbackRate = 1;
  route = null;
  document.documentElement.classList.remove('tour-navigating');
 }
 function navigate(action, keyboard = false) {
  if (action!=='outside' && !Object.prototype.hasOwnProperty.call(stops,action)) return;
  const now=performance.now(), revealAfter=now-lastIntent<240?now+140:now;
  lastIntent=now;cancelTravel();
  landingFrame = null;
  const serial = trip, start = frame, end = action==='outside'?0:stops[action];
  route = action;
  document.documentElement.classList.add('tour-navigating');
  if (panelEditor.open) panelEditor.close();
  if (active && (start !== end || active !== action)) hidePanel(false);
  else if(!active && !detail.hidden){stopMotion();detail.hidden=true;}
  render();
  const finish = () => {
   if (serial !== trip) return;
   cancelAnimationFrame(travelRaf);
   movie.pause();delete movie.dataset.guided;
   if(movie.playbackRate!==1)movie.playbackRate=1;
   landingFrame=end;
   jump(end);
   let timeout=0,hold=0;
   const arrive=()=>{
    if(serial!==trip)return;
    cancelTravel();landingFrame=null;present(end);
    if(action==='outside'){resetVisits();hidePanel(false);render();if(keyboard)door.focus({preventScroll:true});}
    else{revealWall(action,scroller.scrollTop);showPanel(action,true,keyboard);}
   };
   const ready=()=>{
    if(serial!==trip || hold)return;
    clearTimeout(timeout);movie.removeEventListener('seeked',decoded);
    const delay=revealAfter-performance.now();
    if(delay>0)hold=setTimeout(arrive,delay);else arrive();
   };
   const decoded=()=>{if(!movie.seeking && Math.abs(movie.currentTime*FPS-end)<=1.05)ready();};
   clearArrival=()=>{clearTimeout(timeout);clearTimeout(hold);movie.removeEventListener('seeked',decoded);};
   if(movie.error || movie.readyState<1 || (!movie.seeking && Math.abs(movie.currentTime*FPS-end)<=1.05)){ready();return;}
   movie.addEventListener('seeked',decoded);
   timeout=setTimeout(()=>{if(movie.seeking || movie.readyState<2 || Math.abs(movie.currentTime*FPS-end)>1.05)showStill();ready();},850);
  };
  if (start === end || reduced.matches) { finish(); return; }
  movie.dataset.guided = 'true'; // Suspend normal per-frame seeking while travelling.
  let lastPaint = 0;
  function moveTo(value, now) {
   if (now - lastPaint < 1000 / travelFps && Math.abs(value-end) > .7) return;
   lastPaint = now;
   // Let the scroll listener do ONE setFrame/lighting update per tick.
   // In particular do not call jump(), which previously duplicated the work.
   scroller.scrollTop = clamp(value,0,LAST) / LAST * range();
  }
  // Smooth reverse transitions and unavailable-video fallback: compositor-led
  // scroll, with at most one sparse, in-flight video seek on iOS. This avoids
  // overlapping seek requests, dropped frames and the sudden iPhone jump.
  let scrubbing = false;
  const scrub = () => {
   if (serial !== trip || scrubbing) return;
   scrubbing = true;
   cancelAnimationFrame(travelRaf);
   travelRaf = 0;
   try { movie.pause(); movie.playbackRate = 1; } catch (_) {}
   const from = clamp(LAST * scroller.scrollTop / range(),0,LAST);
   const begun = performance.now();
   const duration = clamp(460 + Math.abs(end-from) * 10, 700, 1650);
   const seekGap = iosWebkit ? 170 : 120;
   const step = now => {
    if (serial !== trip) return;
    const t = clamp((now-begun)/duration,0,1);
    if (t >= 1) { finish(); return; }
    const ease = t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
    const value = from + (end-from)*ease;
    moveTo(value, now);
    if (movie.readyState >= 1 && !movie.error && !movie.seeking &&
        now - travelSeekAt >= seekGap) {
     travelSeekAt = now;
     seekFilm(value,true);
    }
    travelRaf = requestAnimationFrame(step);
   };
   travelRaf = requestAnimationFrame(step);
  };
  if (end < start || movie.error || movie.readyState < 2) { scrub(); return; }
  // Forward travel follows real decoded footage instead of frame-by-frame seeks.
  // A click is a user gesture, so muted inline playback is allowed on most iPhones.
  // If blocked/buffered, fall back to the bounded scrub above, not an abrupt jump.
  try { movie.pause(); movie.playbackRate = iosWebkit ? 1.75 : 2; } catch (_) { scrub(); return; }
  if (Math.abs(movie.currentTime - start/FPS) > .10) {
   if(!seekFilm(start,true)){scrub();return;}
  }
  let lastMedia = movie.currentTime, lastAdvance = performance.now(), hasPlayed = false;
  const follow = now => {
   if (serial !== trip) return;
   const at = movie.currentTime;
   if (at > lastMedia + .008) { lastAdvance = now; lastMedia = at; }
   if (at*FPS >= end-.35 || movie.ended) { finish(); return; }
   if (movie.error || (!hasPlayed && now - lastAdvance > 550) ||
       (hasPlayed && now - lastAdvance > 650)) { scrub(); return; }
   moveTo(Math.max(start, Math.min(end, at*FPS)), now);
   travelRaf = requestAnimationFrame(follow);
  };
  try {
   const playing = movie.play();
   if (playing && typeof playing.then === 'function') {
    playing.then(() => { hasPlayed = true; }, () => { if (serial === trip) scrub(); });
   } else hasPlayed = true;
   travelRaf = requestAnimationFrame(follow);
  } catch (_) { scrub(); }
 }
 door.addEventListener('click', e => navigate('hours', e.detail === 0));
 for(const button of pins)button.addEventListener('click',e=>{
  if(editor.open||panelEditor.open)return;
  const action=button.dataset.view;
  if(active===action && !route){hidePanel(true,true);return;}
  navigate(action,e.detail===0);
 });
 $('returnEntrance').addEventListener('click',e=>navigate('outside',e.detail===0));
 function interruptTravel() {
  landingFrame = null;
  if (route) { cancelTravel(); seek(); render(); }
 }
 scroller.addEventListener('wheel', interruptTravel, {passive:true});
 scroller.addEventListener('touchmove', interruptTravel, {passive:true});
 scroller.addEventListener('scrollend', settleWalls);
 scroller.addEventListener('pointerdown', e => { if (e.target === scroller) interruptTravel(); });
 scroller.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) interruptTravel();
 });
 scroller.addEventListener('scroll', () => {
  scrollWalls();
  if (!active || route || panelEditor.open || dragPanel?.moving) return;
  // Start once on departure. More scroll events must not extend the one-second delay.
  if (Math.abs(scroller.scrollTop - originScroll) < 1) { clearTimer(); return; }
  if (!hideTimer) hideTimer = setTimeout(() => hidePanel(), 1000);
 }, {passive:true});
 document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || $('lookStudio').open || editor.open || panelEditor.open || $('panel').open) return;
  interruptTravel();
  hidePanel(true, true);
 });
 detail.addEventListener('click', e => {
  if(e.target.closest('a,button:not(.glass-dismiss),input,select') || String(window.getSelection()).trim())return;
  if (ignoreClick) { ignoreClick = false; return; }
  if (active && !panelEditor.open) hidePanel(true, true);
 });
 detail.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button !== 0 || !active || panelEditor.open || e.target.closest('a,button,.glass-content')) return;
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
   if(glass.read(device,active).dock==='smart'){
    const area=scene.getBoundingClientRect();
    Object.assign(settings[active],{width:r.width/area.width*100,height:r.height/area.height*100,x:(r.left-area.left+r.width/2)/area.width*100,y:(r.top-area.top+r.height/2)/area.height*100});
    glass.save(device,active,{dock:'authored',scale:100});applyPanelStyle();
   }
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
 detail.addEventListener('contextmenu', e => {if(dragPanel?.moving)e.preventDefault();});
 function markToday(){
  const day = new Intl.DateTimeFormat('en-IE',{weekday:'long',timeZone:'Europe/Dublin'}).format(new Date());
  document.querySelectorAll('[data-day]').forEach(row => {
   const today = row.dataset.day === day;
   row.classList.toggle('today', today);
   const small = row.querySelector('small');
   if (small) small.hidden = !today;
  });
 }
 let dayTimer;
 function updateDay(){clearTimeout(dayTimer);markToday();if(!document.hidden)dayTimer=setTimeout(updateDay,3600000-(Date.now()%3600000)+50);}
 updateDay();
 document.addEventListener('visibilitychange', updateDay);
 // The Panels editor always previews the authored reference frame.
 const controls = [
  ['peWidth','width'], ['peHeight','height'], ['peX','x'], ['peY','y'],
  ['peLetterWidth','width',true], ['peLetterX','x',true], ['peLetterY','y',true],
  ['peDepth','depth',true], ['peYaw','yaw',true,'°'], ['pePitch','pitch',true,'°'],
  ['peRoll','roll',true,'°'], ['peBend','bend',true,'°'],
  ['peGlowStrength','strength',true], ['peGlow','glow',true]
 ];
 function syncPanelEditor() {
  const pref = layouts[editDevice][$('pePanel').value];
  for (const [id, prop, isSign, unit = '%'] of controls) {
   const v = (isSign ? pref.lettering : pref)[prop];
   $(id).value = v;
   const out = $(id+'Out');
   if (out) out.value = Number(v.toFixed(1)) + unit;
  }
 }
 function choosePanel(action) {
  cancelTravel();
  jump(stops[action]);
  if ($('peShowCard').checked) showPanel(action, false);
  else hidePanel(false);
  syncPanelEditor();
  render();
  const isLeft=active ? Number.parseFloat(detail.style.left)<scene.clientWidth/2 : settings[action].lettering.x<50;
  window.MalikBarber.suggestDock(isLeft?1:0);
 }
 $('panelsBtn').onclick = () => {
  if (panelEditor.open) { panelEditor.close(); return; }
  if (editor.open) editor.close();
  if ($('panel').open) $('panel').close();
  panelEditor.show();
  resetVisits();
  $('pePanel').value = active || 'hours';
  choosePanel($('pePanel').value);
 };
 $('peDone').onclick = () => panelEditor.close();
 panelEditor.onclose = () => { originScroll = scroller.scrollTop; render(); };
 $('pePanel').onchange = e => choosePanel(e.target.value);
 $('peShowCard').onchange = () => choosePanel($('pePanel').value);
 for (const [id, prop, isSign] of controls) {
  $(id).oninput = e => {
   const pref = layouts[editDevice][$('pePanel').value];
   (isSign ? pref.lettering : pref)[prop] = id === 'peGlow' ? e.target.value : Number(e.target.value);
   if(!isSign && glass.read(editDevice,$('pePanel').value).dock==='smart')glass.save(editDevice,$('pePanel').value,{dock:'authored'});
   persist(editDevice);
   window.MalikPresetUI?.sync();
   applyPanelStyle();
   syncPanelEditor();
   render();
  };
 }
 $('peReset').onclick = () => {
  const action = $('pePanel').value;
  if (!confirm('Restore the published '+titles[action]+' layout on this device?')) return;
  layouts[editDevice][action]=publishedPanel(editDevice,action);
  glass.reset(editDevice,action);persist(editDevice);window.MalikPresetUI?.sync();
  choosePanel(action);
  $('peStatus').textContent = 'Published layout restored on this device.';
 };
 $('peExport').onclick = () => {
  const result = {desktop:readLayout('desktop'), mobile:readLayout('mobile')};
  Object.assign(result,layouts);
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
  const id = crypto && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const c={id,shape,start:frame,end:LAST,x:50,y:40,size:shape==='square'?24:46,text:''};
  cards.push(c);selectedId=c.id;saveCards();fields();
 }
 $('cardsBtn').onclick=()=>{
  if(editor.open){editor.close();return}
  if(panelEditor.open)panelEditor.close();
  cancelTravel();hidePanel(false);
  editor.show();resetVisits();layer.classList.add('editing-cards');selectedId=selected()?.id||cards[0]?.id;fields();
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
 let renderPending = false;
 function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; render(); });
 }
 function present(at) {
  const next = clamp(at, 0, LAST);
  if (landingFrame !== null) {
   if (Math.abs(next-landingFrame) > 1) return;
   landingFrame = null;
  }
  if (next === paintedFrame) return;
  paintedFrame = next;
  scheduleRender();
 }
 if (typeof movie.requestVideoFrameCallback === 'function') {
  const onVideoFrame = (_, metadata) => {
   lastNativeFrame = performance.now();
   present(Math.round(metadata.mediaTime * FPS));
   movie.requestVideoFrameCallback(onVideoFrame);
  };
  movie.requestVideoFrameCallback(onVideoFrame);
 } else {
  // currentTime changes before the decoded image during a seek. Keep the previous pose until it lands.
  const sample = () => {
   if (!movie.seeking && movie.readyState >= 2) present(Math.floor(movie.currentTime * FPS + .001));
  };
  let playbackRaf = 0;
  function followPlayback() {
   sample();
   playbackRaf = movie.paused || movie.ended ? 0 : requestAnimationFrame(followPlayback);
  }
  movie.addEventListener('playing', () => { if (!playbackRaf) followPlayback(); });
  movie.addEventListener('seeked', sample);
  movie.addEventListener('loadeddata', sample);
  movie.addEventListener('timeupdate', sample);
  sample();
 }
 scroller.addEventListener('tourframe', () => {
  // Old iOS does not decode seek frames before a user gesture; keep the tour
  // controls responsive even when the native video cannot report its frame.
  if (movie.readyState<2 || movie.error || (iosWebkit && typeof movie.requestVideoFrameCallback==='function' && performance.now()-lastNativeFrame>300)) present(frame);
  scheduleRender();
 });
 function resizeScene(){applyPanelStyle();scheduleRender();}
 if(typeof ResizeObserver==='function')new ResizeObserver(resizeScene).observe(scene.parentElement);
 window.addEventListener('resize',resizeScene,{passive:true});
 window.MalikLayout={
  device,layouts,publishedPanel,layoutKey,persist,get editDevice(){return editDevice;},
  edit(next){editDevice=next;window.MalikBarber.editDevice(next);syncPanelEditor();},
  refresh(){for(const d of ['desktop','mobile'])Object.assign(layouts[d],readLayout(d));syncPanelEditor();applyPanelStyle();render();},
  preview(){applyPanelStyle();render();},
  snapshotCards(){return structuredClone(cards);},
  restoreCards(list){cards=structuredClone(list);selectedId=cards.find(c=>c.id===selectedId)?.id||cards[0]?.id;fields();}
 };
 reduced.addEventListener?.('change',()=>{if(route)navigate(route);else if(active)showPanel(active,false);else if(!detail.hidden){stopMotion();detail.hidden=true;}});
 render();
})();
