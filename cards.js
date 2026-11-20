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
 const layoutKey = platform => 'maliks-wall-mount-layout-v2-' + platform;
 const publishedLayouts = window.MALIKS_PANEL_PRESETS;
 const tracks = window.MALIKS_WALL_TRACKS[device];
 const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
 const stops = {hours: 85, contact: 131, prices: 206};
 const mountDefaults = {depth:0, yaw:0, pitch:0, roll:0, bend:0};
 const enterRadius = FPS / 2, leaveRadius = enterRadius + 3;
 const signDepartureDelay = 1000;
 const titles = {hours: 'Open Times', contact: 'Booking', prices: 'Pricing'};
 const assets = {
  hours:   {sign: 'neon-open-times.png', card: 'opening-hours-card.png'},
  contact: {sign: 'neon-booking.png', card: 'bookings-card.png'},
  prices:  {sign: 'neon-pricing.png', card: 'pricing-card.png'}
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
 function publishedPanel(platform, action) {
  const base = structuredClone(publishedLayouts[platform][action]);
  base.lettering = {...mountDefaults, ...base.lettering};
  return base;
 }
 function readLayout(platform) {
  const saved = stored(layoutKey(platform));
  const local = saved.basedOn === JSON.stringify(publishedLayouts[platform]) ? saved.panels || {} : {};
  return Object.fromEntries(actions.map(action => {
   const base = publishedPanel(platform, action);
   const draft = local[action] || {};
   return [action, {...base, ...draft, lettering:{...base.lettering, ...draft.lettering}}];
  }));
 }
 const settings = readLayout(device);
 function persist() {
  try {
   const basedOn = JSON.stringify(publishedLayouts[device]);
   localStorage.setItem(layoutKey(device), JSON.stringify({basedOn, panels: settings}));
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
 const mounts = new Map();
 let active = null, route = null, trip = 0, travelRaf = 0;
 let hideTimer = 0, motion = null, originScroll = 0;
 let dragPanel = null, ignoreClick = false;
 const visits = Object.fromEntries(actions.map(action => [action, {
  phase:'off', inRange:false, anchor:null, timer:0, fade:null
 }]));
 let lastScrollTop = scroller.scrollTop, scrolling = false, settleTimer = 0;
 let paintedFrame = null;
 for (const action of actions) {
  const sign = document.createElement('button');
  sign.type = 'button';
  sign.className = 'wall-sign';
  sign.dataset.action = action;
  sign.hidden = true;
  sign.setAttribute('aria-label', 'View ' + titles[action]);
  sign.setAttribute('aria-controls', 'scenePanel');
  sign.style.setProperty('--sign-image', 'url("' + assets[action].sign + '")');
  const view = document.createElement('span');
  view.className = 'sign-view';
  const face = document.createElement('span');
  face.className = 'sign-face';
  const image = document.createElement('img');
  image.src = assets[action].sign;
  image.alt = '';
  image.draggable = false;
  face.append(image);
  view.append(face);
  sign.append(view);
  layer.append(sign);
  signs.set(action, sign);
  mounts.set(action, {face, strips:[], shapeKey:'', poseKey:''});
 }
 // Fit a continuous cylindrical surface to the PNG. The middle of the sign is its pivot.
 function setCurve(mount, width, bend) {
  const key = width + '/' + bend;
  if (key === mount.shapeKey) return;
  mount.shapeKey = key;
  mount.face.classList.toggle('curved', bend !== 0);
  if (!bend) return;
  const count = 20;
  while (mount.strips.length < count) {
   const strip = document.createElement('span');
   strip.className = 'sign-strip';
   mount.face.append(strip);
   mount.strips.push(strip);
  }
  const arc = 2 * bend * Math.PI / 180, radius = width / arc;
  const step = arc / count, chord = 2 * radius * Math.sin(step / 2);
  mount.strips.forEach((strip, i) => {
   const angle = (i - count / 2) * step;
   const x = radius * Math.sin(angle);
   const z = 2 * radius * Math.sin(angle / 2) ** 2;
   strip.style.width = (chord + (i < count - 1 ? 0.45 : 0)) + 'px';
   strip.style.backgroundSize = (chord * count) + 'px 100%';
   strip.style.backgroundPosition = (-i * chord) + 'px 0';
   strip.style.transform = 'translate3d(' + x + 'px,0,' + z + 'px) rotateY(' + (-(angle + step / 2)) + 'rad)';
  });
 }
 function fitMount(action, width, preset) {
  const mount = mounts.get(action), sign = signs.get(action);
  const key = [width,preset.depth,preset.yaw,preset.pitch,preset.roll,preset.bend,preset.glow,preset.strength].join('/');
  if (key === mount.poseKey) return;
  mount.poseKey = key;
  sign.style.width = width + 'px';
  sign.style.height = width / 3 + 'px';
  sign.style.setProperty('--sign-perspective', width * 2.4 + 'px');
  sign.style.setProperty('--sign-halo', preset.glow);
  sign.style.setProperty('--halo-opacity', clamp(preset.strength / 100, 0, 1));
  mount.face.style.transform = 'translateZ(' + width * preset.depth / 100 + 'px) rotateZ(' + preset.roll +
   'deg) rotateY(' + preset.yaw + 'deg) rotateX(' + preset.pitch + 'deg)';
  setCurve(mount, width, preset.bend);
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
  const width = sw * preset.width / 100;
  const height = width / 3;
  // Preserve the centre set in the original Panels editor (its sign boxes were wider in aspect).
  const oldHeight = width / (action === 'contact' ? 5 : 5.3);
  const refX = (sw - width) * preset.x / 100 + width / 2;
  const refY = (sh - oldHeight) * preset.y / 100 + oldHeight / 2;
  const [a, b, c, d, tx, ty] = pose;
  const left = refX - width / 2, top = refY - height / 2;
  fitMount(action, width, preset);
  // One compositor transform moves the entire mounted sign with the actual video frame.
  const e = a*left + c*top + tx*sw, f = b*left + d*top + ty*sh;
  sign.style.transform = 'matrix(' + [a,b,c,d,e,f].join(',') + ')';
  sign.hidden = false;
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
   if (sign.hidden || reduced.matches) { finish(); return; }
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
  if (editor.open || panelEditor.open) return;
  const target = clamp(LAST * top / range(), 0, LAST);
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
 function showPins(sw, sh) {
  const at = paintedFrame;
  const outside = at === null || at <= exteriorEnd;
  const editing = editor.open || panelEditor.open;
  door.hidden = editing || !outside || !!route;
  for (const button of pins) {
   const action = button.dataset.view;
   const sign = signs.get(action);
   const hadFocus = document.activeElement === sign || document.activeElement === button;
   const wallVisible = wallVisibleAt(action, at) && !outside && placeSign(action, at, sw, sh);
   if (!wallVisible) sign.hidden = true;
   const expanded = active === action && !detail.hidden && !detail.inert;
   sign.setAttribute('aria-expanded', String(expanded));
   button.setAttribute('aria-expanded', String(expanded));
   button.hidden = editing || outside || wallVisible;
   if (hadFocus && !outside && !editing && !route) {
    const target = wallVisible ? sign : button;
    if (document.activeElement !== target) target.focus({preventScroll:true});
   }
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
 function render() {
  const {width:sw, height:sh} = layer.getBoundingClientRect();
  $('cardTime').value = frame;
  $('cardClock').value = time(frame);
  renderDrafts(sw, sh);
  showPins(sw, sh);
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
  render();
  const finish = () => {
   if (serial !== trip) return;
   cancelTravel();
   jump(end);
   revealWall(action, scroller.scrollTop);
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
 scroller.addEventListener('scroll', scrollWalls, {passive:true});
 scroller.addEventListener('scrollend', settleWalls);
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
  ['peDepth','depth',true], ['peYaw','yaw',true,'°'], ['pePitch','pitch',true,'°'],
  ['peRoll','roll',true,'°'], ['peBend','bend',true,'°'],
  ['peGlowStrength','strength',true], ['peGlow','glow',true]
 ];
 function syncPanelEditor() {
  const pref = settings[$('pePanel').value];
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
  settings[action] = publishedPanel(device, action);
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
 function present(at) {
  const next = clamp(at, 0, LAST);
  if (next === paintedFrame) return;
  paintedFrame = next;
  const {width, height} = layer.getBoundingClientRect();
  showPins(width, height);
 }
 if (typeof movie.requestVideoFrameCallback === 'function') {
  const onVideoFrame = (_, metadata) => {
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
 scroller.addEventListener('tourframe',render);
 new ResizeObserver(render).observe(layer);
 render();
})();
