(()=>{
 const editor=$('cardsPanel'), layer=$('cardLayer'), key='maliks-card-drafts-v1';
 let cards=[],selectedId=null,drag=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(Array.isArray(saved))cards=saved}catch{}
 const selected=()=>cards.find(c=>c.id===selectedId);
 function save(){
  try{localStorage.setItem(key,JSON.stringify(cards))}catch{$('cardStatus').textContent='Device storage unavailable. Export your cards to keep them.'}
 }
 function render(){
  $('cardTime').value=frame;$('cardClock').value=time(frame);
  const seen=new Set();
  for(const c of cards){
   if(frame<c.start||frame>c.end)continue;
   seen.add(c.id);
   let node=document.getElementById('cue-'+c.id);
   if(!node){node=document.createElement('div');node.id='cue-'+c.id;node.dataset.card=c.id;layer.append(node)}
   node.className='info-card '+c.shape+(c.id===selectedId?' chosen':'');
   node.textContent=c.text||(editor.open?'Card '+(cards.indexOf(c)+1):'');
   const ratio=c.shape==='square'?1:2.8;
   const w=Math.min(layer.clientWidth*c.size/100,layer.clientHeight*ratio*.95),h=w/ratio;
   Object.assign(node.style,{width:w+'px',height:h+'px',left:((layer.clientWidth-w)*c.x/100)+'px',top:((layer.clientHeight-h)*c.y/100)+'px'});
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
