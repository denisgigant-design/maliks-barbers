(()=>{
 'use strict';
 const editor=$('cardsPanel'), layer=$('cardLayer'), key='maliks-card-drafts-v1';
 let cards=[],selectedId=null,drag=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(Array.isArray(saved))cards=saved}catch{}
 const labels={hours:'OPEN HOURS',contact:'BOOKINGS',prices:'PRICING & SERVICES'};
 if(!cards.length){
  cards=[['hours',52,105,50],['contact',106,155,16],['prices',156,LAST,68]].map(([action,start,end,x])=>({
   id:'shop-'+action,action,start,end,x,y:action==='hours'?28:35,size:mobileTour?52:action==='hours'?45:30,shape:'long',text:''
  }));
 }else if(!cards.some(c=>c.action)){
  const old=[...cards].sort((a,b)=>a.start-b.start).slice(0,3);
  if(old[0])old[0].action='hours';
  if(old[1])old[1].action='contact';
  if(old[2])old[2].action='prices';
 }
 for(const c of cards){
  if(c.action==='prices'&&c.start>=106&&c.end<=155)c.action='contact';
  else if(c.action==='contact'&&c.start>=156)c.action='prices';
 }
 const stops={hours:85,contact:131,prices:206};
 const nav=$('tourNav'),scene=nav.parentElement,detail=$('scenePanel'),leader=$('leader'),buttons=[...nav.children];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const lines=buttons.map(()=>document.createElementNS('http://www.w3.org/2000/svg','line'));
 leader.replaceChildren(...lines);
 const layoutKey='maliks-expanded-positions-final-'+(mobileTour?'mobile':'desktop');
 let positions={};try{positions=JSON.parse(localStorage.getItem(layoutKey))||{}}catch{}
 let active=null,route=null,trip=0,travelRaf=0,fadeTimer=0,fade=null,dragPanel=null,ignoreTap=false,dismissed=null;
 let lastFrame=-1;
 const artwork={hours:'open-hours.png',contact:'bookings.png',prices:'pricing-services.png'};

 function cancelTravel(){
  trip++;cancelAnimationFrame(travelRaf);travelRaf=0;
  if(movie.dataset.guided){movie.pause();delete movie.dataset.guided}
  route=null;
 }
 function clearFade(){clearTimeout(fadeTimer);fadeTimer=0;if(fade){fade.cancel();fade=null}}
 function hidePanel(remember=false){
  if(remember) dismissed=active;
  clearFade();active=null;detail.hidden=true;detail.classList.remove('moving');
 }
 function positionPanel(){
  if(!active||detail.hidden)return;
  const defaults=mobileTour?
   {hours:{x:50,y:31},contact:{x:50,y:48},prices:{x:51,y:49}}:
   {hours:{x:50,y:29},contact:{x:22,y:51},prices:{x:80,y:50}};
  const desired=positions[active]||defaults[active];
  const hx=detail.offsetWidth/Math.max(1,scene.clientWidth)*50+1;
  const hy=detail.offsetHeight/Math.max(1,scene.clientHeight)*50+1;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  detail.style.left=clamp(desired.x,hx,100-hx)+'%';
  detail.style.top=clamp(desired.y,hy,100-hy)+'%';
 }
 function showPanel(action){
  if(!action||editor.open)return;
  if(active===action)return;
  clearFade();active=action;dismissed=null;
  const article=$(action).cloneNode(true);article.removeAttribute('id');
  const title=article.querySelector('h2');
  if(title){
   const image=document.createElement('img');image.src=artwork[action];image.className='panel-art';
   image.alt=labels[action];title.replaceChildren(image);
  }
  detail.replaceChildren(article);detail.dataset.action=action;detail.hidden=false;
  detail.setAttribute('aria-label',labels[action]);detail.title='Press and hold to move';
  markToday();positionPanel();
  const direction=action==='hours'?'translateY(-22%)':action==='contact'?'translateX(-18%)':'translateX(18%)';
  fade=detail.animate([{opacity:0,transform:direction},{opacity:1,transform:'none'}],{
   duration:reduced.matches?0:680,easing:'cubic-bezier(.16,1,.3,1)'});
  render();
 }
 function setTarget(f){
  // Keep the existing frame-to-scroll timeline and lighting effects in sync.
  jump(Math.round(Math.max(0,Math.min(LAST,f))));
 }
 function navigate(action){
  if(active===action){hidePanel(true);render();return}
  cancelTravel();hidePanel();dismissed=null;
  route=action;
  const serial=trip,end=stops[action],start=frame;
  const finish=()=>{
   if(serial!==trip)return;
   cancelAnimationFrame(travelRaf);travelRaf=0;
   if(movie.dataset.guided){movie.pause();delete movie.dataset.guided}
   setTarget(end);route=null;showPanel(action);
  };
  if(start===end||reduced.matches){finish();return}
  const scrub=()=>{
   const begun=performance.now();
   const duration=Math.max(780,Math.abs(end-start)*1000/FPS);
   const step=now=>{
    if(serial!==trip)return;
    const t=Math.min(1,(now-begun)/duration),smooth=t*t*(3-2*t);
    setTarget(start+(end-start)*smooth);
    if(t>=1){finish();return}
    travelRaf=requestAnimationFrame(step);
   };
   travelRaf=requestAnimationFrame(step);
  };
  // Move through the ACTUAL video frames instead of cutting to the side view.
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
  // Only genuine visitor scroll cancels a guided journey or starts dismissal.
  if(dragPanel?.moving)return;
  if(route)cancelTravel();
  if(!active)return;
  clearFade();
  fadeTimer=setTimeout(()=>{
   if(!active||dragPanel?.moving)return;
   const outgoing=active;
   fade=detail.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateX(-28%)'}],{
    duration:reduced.matches?0:570,fill:'forwards',easing:'ease-in'});
   fade.onfinish=()=>{if(active===outgoing){hidePanel(true);render()}};
  },2000);
 }
 scroller.addEventListener('wheel',userInteraction,{passive:true});
 scroller.addEventListener('touchmove',userInteraction,{passive:true});
 scroller.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))userInteraction();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(route)cancelTravel();if(active){hidePanel(true);render()}}});
 detail.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('a'))return;
  ignoreTap=false;
  const g={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:detail.scrollTop,moving:false};
  dragPanel=g;
  g.timer=setTimeout(()=>{
   if(dragPanel!==g||!active)return;
   clearFade();g.moving=true;ignoreTap=true;detail.classList.add('moving');
   const r=detail.getBoundingClientRect();g.dx=g.x-(r.left+r.width/2);g.dy=g.y-(r.top+r.height/2);
   try{detail.setPointerCapture(g.id)}catch{}
  },470);
 });
 detail.addEventListener('pointermove',e=>{
  const g=dragPanel;if(!g||g.id!==e.pointerId)return;
  if(!g.moving){
   if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>9){
    clearTimeout(g.timer);ignoreTap=true;
    if(e.pointerType==='touch')detail.scrollTop=g.scroll+g.y-e.clientY;
   }
   return;
  }
  const r=scene.getBoundingClientRect();
  const hx=detail.offsetWidth/r.width*50+1,hy=detail.offsetHeight/r.height*50+1;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  positions[active]={
   x:clamp(100*(e.clientX-r.left-g.dx)/r.width,hx,100-hx),
   y:clamp(100*(e.clientY-r.top-g.dy)/r.height,hy,100-hy)
  };
  positionPanel();paintLines();
 });
 function release(e){
  const g=dragPanel;if(!g||g.id!==e.pointerId)return;
  clearTimeout(g.timer);dragPanel=null;
  if(g.moving){
   detail.classList.remove('moving');ignoreTap=true;
   try{localStorage.setItem(layoutKey,JSON.stringify(positions))}catch{}
  }
 }
 window.addEventListener('pointerup',release);
 window.addEventListener('pointercancel',release);
 detail.addEventListener('contextmenu',e=>e.preventDefault());
 detail.addEventListener('click',e=>{
  if(ignoreTap){ignoreTap=false;return}
  if(e.target.closest('a'))return;
  hidePanel(true);render();
 });
 function markToday(){
  const day=new Intl.DateTimeFormat('en-IE',{weekday:'long',timeZone:'Europe/Dublin'}).format(new Date());
  for(const row of document.querySelectorAll('[data-day]')){
   const isToday=row.dataset.day===day;
   row.classList.toggle('today',isToday);row.querySelector('small').hidden=!isToday;
  }
 }
 markToday();setInterval(markToday,30000);document.addEventListener('visibilitychange',markToday);
 layer.addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');
  if(!button||editor.open)return;
  if(active===button.dataset.action){hidePanel(true);render()}
  else navigate(button.dataset.action);
 });
 const pinPoints={
  hours:[[0,50,55],[85,50,21],[131,57,22],[206,14,23]],
  contact:[[0,17,54],[85,17,52],[131,17,53],[206,16,51]],
  prices:[[0,83,54],[85,83,52],[131,83,52],[206,83,52]]
 };
 const anchors={
  hours:[[0,50,50],[85,50,29],[131,60,30],[206,20,31]],
  contact:[[0,11,52],[85,19,54],[131,24,48],[206,8,48]],
  prices:[[0,90,54],[85,80,53],[131,79,50],[206,78,48]]
 };
 function between(points,f){
  if(f<=points[0][0])return points[0].slice(1);
  for(let i=1;i<points.length;i++){
   if(f<=points[i][0]){
    const [a,x,y]=points[i-1],[b,X,Y]=points[i],t=(f-a)/(b-a);
    return [x+(X-x)*t,y+(Y-y)*t];
   }
  }
  return points[points.length-1].slice(1);
 }
 function pinFor(action){
  if(mobileTour&&frame>=48)return action==='hours'?[50,12]:action==='contact'?[16,15]:[84,15];
  return between(pinPoints[action],frame);
 }
 function paintLines(){
  const w=Math.max(1,scene.clientWidth),h=Math.max(1,scene.clientHeight);
  leader.setAttribute('viewBox',`0 0 ${w} ${h}`);
  for(let i=0;i<buttons.length;i++){
   const b=buttons[i],action=b.dataset.view,line=lines[i];
   line.style.display=b.hidden?'none':'';
   if(b.hidden)continue;
   const [px,py]=pinFor(action);
   let [tx,ty]=between(anchors[action],frame);
   if(active===action&&!detail.hidden){
    const r=detail.getBoundingClientRect(),s=scene.getBoundingClientRect();
    const cx=(r.left+r.right)/2-s.left,cy=(r.top+r.bottom)/2-s.top;
    const dx=px*w/100,dy=py*h/100;
    tx=Math.max(r.left-s.left,Math.min(r.right-s.left,dx))/w*100;
    ty=Math.max(r.top-s.top,Math.min(r.bottom-s.top,dy))/h*100;
    if(Math.abs(tx-px)<.5&&Math.abs(ty-py)<.5){tx=cx/w*100;ty=cy/h*100}
   }
   for(const [k,v] of Object.entries({x1:px*w/100,y1:py*h/100,x2:tx*w/100,y2:ty*h/100}))line.setAttribute(k,v.toFixed(1));
  }
 }
 function showPins(){
  const door=frame<48;
  for(const button of buttons){
   const action=button.dataset.view;
   button.hidden=editor.open||(door&&action!=='hours')||(!route&&active===action);
   const [x,y]=pinFor(action);
   button.style.left=x+'%';button.style.top=y+'%';
   button.setAttribute('aria-current',String(active===action));
   const label=button.querySelector('span');
   if(label&&action==='hours')label.textContent=door?'ENTER':'OPEN HOURS';
  }
 }
 function render(){
  $('cardTime').value=frame;$('cardClock').value=time(frame);
  if(!route&&!active&&!editor.open&&!dragPanel){
   const near=Object.keys(stops).find(a=>Math.abs(frame-stops[a])<=(a==='hours'?6:8));
   if(near&&dismissed!==near)showPanel(near);
   if(!near&&Math.abs(frame-lastFrame)>8)dismissed=null;
  }
  lastFrame=frame;
  showPins();positionPanel();paintLines();
  const seen=new Set();
  for(const c of cards){
   const visible=frame>=c.start&&frame<=c.end;
   if(!visible||(!editor.open&&!c.action)||(active===c.action&&!editor.open))continue;
   seen.add(c.id);
   let node=document.getElementById('cue-'+c.id);
   if(!node){
    node=document.createElement(c.action?'button':'div');
    if(c.action){node.dataset.action=c.action;node.setAttribute('aria-controls','scenePanel')}
    node.id='cue-'+c.id;node.dataset.card=c.id;layer.append(node);
   }
   node.className='info-card '+c.shape+(c.id===selectedId?' chosen':'');
   node.setAttribute('aria-expanded',String(active===c.action));
   if(c.action&&!editor.open){
    const target=artwork[c.action];
    if(node.dataset.artwork!==target){
     node.replaceChildren();
     const img=document.createElement('img');img.src=target;img.alt=labels[c.action];img.draggable=false;
     node.appendChild(img);node.dataset.artwork=target;
    }
   }else{node.dataset.artwork='';node.textContent=labels[c.action]||c.text||('Card '+(cards.indexOf(c)+1))}
   const title=c.action&&!editor.open;
   const ratio=title?c.action==='hours'?5.2:4.9:c.shape==='square'?1:2.8;
   const size=title?mobileTour?65:c.action==='hours'?49:31:c.size;
   const w=Math.min(layer.clientWidth*size/100,layer.clientHeight*ratio*.94),h=w/ratio;
   let x=c.x,y=c.y;
   if(title){
    if(c.action==='hours'){x=50;y=mobileTour?26:24}
    if(c.action==='contact'){x=mobileTour?22:8;y=mobileTour?32:35}
    if(c.action==='prices'){x=mobileTour?65:70;y=mobileTour?33:38}
   }
   Object.assign(node.style,{width:w+'px',height:h+'px',left:((layer.clientWidth-w)*x/100)+'px',top:((layer.clientHeight-h)*y/100)+'px'});
  }
  for(const node of [...layer.children])if(!seen.has(node.dataset.card))node.remove();
 }
 const selected=()=>cards.find(c=>c.id===selectedId);
 function save(){
  try{localStorage.setItem(key+"-edited","1");localStorage.setItem(key,JSON.stringify(cards))}catch{$('cardStatus').textContent='Device storage unavailable. Export your cards to keep them.'}
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
  cards.push(c);selectedId=c.id;save();fields();
 }
 $('cardsBtn').onclick=()=>{if(editor.open){editor.close();return}editor.show();layer.classList.add('editing-cards');selectedId=selected()?.id||cards[0]?.id;fields()};
 editor.onclose=()=>{layer.classList.remove('editing-cards');drag=null;render()};
 $('cardsDone').onclick=()=>editor.close();
 $('addSquare').onclick=()=>add('square');$('addLong').onclick=()=>add('long');
 $('cardTime').oninput=e=>jump(+e.target.value);
 $('cardList').onchange=e=>{selectedId=e.target.value;jump(selected().start);fields()};
 $('cardText').oninput=e=>{const c=selected();c.text=e.target.value;save();render()};
 $('cardText').onchange=fields;
 for(const [id,prop] of [['cardSize','size'],['cardX','x'],['cardY','y']]){
  $(id).oninput=e=>{selected()[prop]=+e.target.value;save();render()};
 }
 $('startHere').onclick=()=>{const c=selected();c.start=frame;c.end=Math.max(c.end,frame);save();fields()};
 $('endHere').onclick=()=>{const c=selected();if((active===c.action&&!editor.open)||frame<c.start){$('cardStatus').textContent='Choose an end at or after '+time(c.start);return}c.end=frame;$('cardStatus').textContent='';save();fields()};
 $('deleteCard').onclick=()=>{cards=cards.filter(c=>c.id!==selectedId);selectedId=cards[0]?.id;save();fields()};
 layer.onpointerdown=e=>{
  const node=e.target.closest('.info-card');if(!editor.open||!node)return;
  selectedId=node.dataset.card;fields();const c=selected();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:c.x,top:c.y,w:node.offsetWidth,h:node.offsetHeight};node.setPointerCapture(e.pointerId);e.preventDefault();
 };
 layer.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const c=selected(),limit=v=>Math.min(100,Math.max(0,Math.round(v)));
  c.x=limit(drag.left+100*(e.clientX-drag.x)/Math.max(1,layer.clientWidth-drag.w));
  c.y=limit(drag.top+100*(e.clientY-drag.y)/Math.max(1,layer.clientHeight-drag.h));
  $('cardX').value=c.x;$('cardY').value=c.y;render();
 };
 layer.onpointerup=layer.onpointercancel=()=>{if(drag)save();drag=null};
 $('exportCards').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,fps:FPS,video:movie.getAttribute('src'),cards},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='maliks-cards.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)};
 scroller.addEventListener('tourframe',render);new ResizeObserver(render).observe(layer);render();
})();


