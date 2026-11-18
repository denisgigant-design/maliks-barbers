(()=>{
 const editor=$('cardsPanel'), layer=$('cardLayer'), key='maliks-card-drafts-v1';
 let cards=[],selectedId=null,drag=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(Array.isArray(saved))cards=saved}catch{}
 const labels={hours:'Opening hours',prices:'Haircut prices',contact:'Book appointments'};
 {
  if(!cards.length){
   cards=[['hours',52,105,50],['contact',106,155,16],['prices',156,LAST,18]].map(([action,start,end,x])=>({
    id:'shop-'+action,action,start,end,x,y:34,size:mobileTour?42:24,shape:'long',text:''
   }));
  }else if(cards.length && !cards.some(c=>c.action)){
   const [first,...rest]=[...cards].sort((a,b)=>a.start-b.start).slice(0,3);
   first.action='hours';
   rest.sort((a,b)=>a.x-b.x).forEach((c,i)=>c.action=i?'prices':'contact');
  }
 }

 // Earlier drafts assigned the two side scenes in reverse.
 for(const c of cards){
  if(c.action==='prices' && c.start>=106 && c.end<=155)c.action='contact';
  else if(c.action==='contact' && c.start>=156)c.action='prices';
 }
 const stops={hours:85,contact:131,prices:206};
 const targetFrame=action=>stops[action];
 const nav=$('tourNav'), detail=$('scenePanel'), line=$('leader').firstElementChild;
 const scene=nav.parentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=null, scrollArmed=false, hold=0, entrance=null, leaving=false, trace=0;
 function clearPanel(){
  clearTimeout(hold);hold=0;active=null;scrollArmed=false;leaving=false;
  entrance?.cancel();detail.hidden=true;line.style.display='none';render();
 }
 function place(){
  if(!active)return;
  const progress=Math.max(0,Math.min(1,(frame-85)/(stops[active]-85||1)));
  const end=active==='hours'?50:active==='prices'?18:28;
  const x=active==='hours'?50:(active==='prices'?94:6)*(1-progress)+end*progress;
  const half=detail.offsetWidth/scene.clientWidth*50+1;
  detail.style.left=Math.min(100-half,Math.max(half,x))+'%';
  detail.style.top=(active==='hours'?54:50)+'%';
 }
 function draw(){
  cancelAnimationFrame(trace);
  if(!active||active==='hours'){line.style.display='none';return}
  const dot=nav.querySelector('[data-view="'+active+'"]');
  if(dot.hidden){line.style.display='none';return}
  const base=scene.getBoundingClientRect(),d=dot.getBoundingClientRect(),p=detail.getBoundingClientRect();
  const x=d.left+d.width/2,y=d.top+d.height/2,tx=Math.max(p.left,Math.min(p.right,x)),ty=Math.max(p.top,Math.min(p.bottom,y));
  for(const [key,value] of Object.entries({x1:x-base.left,y1:y-base.top,x2:tx-base.left,y2:ty-base.top}))line.setAttribute(key,value);
  line.style.display='';trace=requestAnimationFrame(draw);
 }
 function openPanel(action,navigate){
  if(active===action){clearPanel();return}
  clearTimeout(hold);hold=0;entrance?.cancel();leaving=false;active=action;
  const content=$(action).cloneNode(true);content.removeAttribute('id');
  detail.replaceChildren(content);detail.hidden=false;detail.dataset.action=action;detail.setAttribute('aria-label',labels[action]);
  detail.onclick=e=>{if(!e.target.closest('a'))clearPanel()};
  markToday();place();
  const from=action==='hours'?'translateY(-35%)':action==='contact'?'translateX(-40%)':'translateX(40%)';
  entrance=detail.animate([{opacity:0,transform:from},{opacity:1,transform:'none'}],{duration:reduced.matches?0:650,easing:'ease-out'});
  scrollArmed=false;
  if(navigate)jump(stops[action]);
  render();draw();

 }
 for(const button of nav.children){
  button.onclick=()=>{
   if(button.dataset.view==='hours'){clearPanel();scroller.scrollTo({top:range()*85/LAST,behavior:reduced.matches?'instant':'smooth'})}
   else openPanel(button.dataset.view,true);
  };
 }
 function dismissAfterScroll(){
  if(!active||!scrollArmed||hold||leaving)return;
  hold=setTimeout(()=>{
   leaving=true;entrance?.cancel();
   entrance=detail.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateX(-45%)'}],{duration:reduced.matches?0:520,fill:'forwards',easing:'ease-in'});
   entrance.onfinish=clearPanel;
  },2000);
 }
 // A click can move the tour programmatically. Only visitor-initiated scrolling dismisses a panel.
 function armScroll(){if(active)scrollArmed=true}
 scroller.addEventListener('wheel',armScroll,{passive:true});
 scroller.addEventListener('touchmove',armScroll,{passive:true});
 scroller.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))armScroll();
 });
 scroller.addEventListener('scroll',dismissAfterScroll,{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)clearPanel()});

 function markToday(){
  const day=new Intl.DateTimeFormat('en-IE',{weekday:'long',timeZone:'Europe/Dublin'}).format(new Date());
  for(const row of document.querySelectorAll('[data-day]')){
   const active=row.dataset.day===day;
   row.classList.toggle('today',active);row.querySelector('small').hidden=!active;
  }
 }
 markToday();setInterval(markToday,1000*30);document.addEventListener('visibilitychange',markToday);
 layer.addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');
  if(!button||editor.open)return;
  openPanel(button.dataset.action,false);
 });
 const selected=()=>cards.find(c=>c.id===selectedId);
 function save(){
  try{localStorage.setItem(key+"-edited","1");localStorage.setItem(key,JSON.stringify(cards))}catch{$('cardStatus').textContent='Device storage unavailable. Export your cards to keep them.'}
 }
 function render(){
  $('cardTime').value=frame;$('cardClock').value=time(frame);

  place();
  if(active&&active!=='hours'){
   const dot=nav.querySelector('[data-view="'+active+'"]');
   const fraction=Math.max(0,Math.min(1,(frame-85)/(stops[active]-85)));
   dot.style.left=(active==='prices'?82-8*fraction:18-11*fraction)+'%';
   dot.style.top=(62+12*fraction)+'%';
  }else for(const dot of nav.children){dot.style.left='';dot.style.top=''}
  const atDoor=frame<Math.min(48,targetFrame('hours'));
  for(const button of nav.children){
   const action=button.dataset.view;
   button.hidden=editor.open||(action==='hours'?!atDoor:atDoor||(frame>105&&active!==action));
  }
  const seen=new Set();
  for(const c of cards){
   const couchTitle=c.action==='hours'&&!editor.open&&!mobileTour;
   const visible=couchTitle ? frame>=52&&frame<=105 : frame>=c.start&&frame<=c.end;
   if(!visible||(!editor.open&&!c.action))continue;
   seen.add(c.id);
   let node=document.getElementById('cue-'+c.id);
   if(!node){node=document.createElement(c.action?'button':'div');if(c.action){node.dataset.action=c.action;node.setAttribute('aria-controls','scenePanel')};node.id='cue-'+c.id;node.dataset.card=c.id;layer.append(node)}
   if(c.action)node.setAttribute('aria-expanded',String(active===c.action));
   node.className='info-card '+c.shape+(c.id===selectedId?' chosen':'');
   node.textContent=labels[c.action]||c.text||(editor.open?'Card '+(cards.indexOf(c)+1):'');
   if(c.action==='hours'&&!editor.open)node.innerHTML='Opening <em>Hours</em>';
   const ratio=c.shape==='square'?1:2.8;
   const w=Math.min(layer.clientWidth*c.size/100,layer.clientHeight*ratio*.95),h=w/ratio;
   Object.assign(node.style,{width:w+'px',height:h+'px',left:((layer.clientWidth-w)*(couchTitle?50:!editor.open&&c.action==='prices'?12:c.x)/100)+'px',top:((layer.clientHeight-h)*(couchTitle?48:c.y)/100)+'px'});
  }
  for(const node of [...layer.children])if(!seen.has(node.dataset.card))node.remove();
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
 $('endHere').onclick=()=>{const c=selected();if(frame<c.start){$('cardStatus').textContent='Choose an end at or after '+time(c.start);return}c.end=frame;$('cardStatus').textContent='';save();fields()};
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



