/* Only imported on request. Photographic views are opt-in entries in the local manifest. */
const dialog=document.getElementById('lookStudio'),mount=document.getElementById('studioMount');
const keys=['skin-fade','low-taper','textured-crop','classic-cut'];
const defaultNames=['Skin Fade','Low Taper','Textured Crop','Classic Cut'];
let data,loading,origin,which=0,whichView=0,paintId=0,ready=false,gesture=null,wasInert=false,veil=null,previousAria=null;
const q=selector=>mount.querySelector(selector);
const make=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n;};
const mod=(v,n)=>(v%n+n)%n;
function parse(raw){
  return keys.map((key,i)=>{
    const item=raw[key]||{};
    const views=(Array.isArray(item.views)?item.views:[]).flatMap(v=>{
      const file=v?.file;
      if(typeof file!=='string' || file.includes('..'))return [];
      // Older catalogue entries used a style directory. Their flattened filenames retain the style prefix.
      const filename=file.startsWith(key+'/')?file.split('/').join('-'):file;
      if(!/^[\w][\w .-]*\.(?:jpe?g|webp|png|avif)$/i.test(filename))return [];
      const url=new URL('./'+filename,import.meta.url);
      return [{url:url.href,label:String(v.label||'Photograph'),alt:String(v.alt||defaultNames[i]+' haircut')}];
    });
    return {key,name:defaultNames[i],detail:typeof item.detail==='string'?item.detail:'',views};
  });
}
function init(){
  if(ready)return;
  ready=true;
  mount.innerHTML=`
   <div class="studio-top"><h2 id="lookStudioTitle">Look Studio</h2><button class="studio-control studio-back" type="button">← Back to pricing</button></div>
   <div class="studio-grid"><figure class="studio-frame">
     <div class="studio-media"></div><figcaption><span class="photo-caption"></span><span class="angle-tools" hidden>
       <button type="button" class="studio-control" data-angle="-1" aria-label="Previous photo angle">←</button>
       <button type="button" class="studio-control" data-angle="1" aria-label="Next photo angle">→</button></span></figcaption>
   </figure><section class="studio-notes" aria-label="Haircut selection">
     <div class="style-heading"><h3 tabindex="-1"></h3><span class="style-count" aria-hidden="true"></span></div>
     <p class="style-copy"></p><p class="photo-status" role="status"></p>
     <div class="style-options" role="group" aria-label="Choose haircut"></div>
     <div class="studio-switch"><button class="studio-control" type="button" data-step="-1">← Previous</button><button class="studio-control" type="button" data-step="1">Next →</button></div>
   </section></div>`;
  const group=q('.style-options');
  defaultNames.forEach((name,i)=>{const btn=make('button','style-choice',name);btn.type='button';btn.dataset.style=i;group.append(btn);});
  mount.addEventListener('click',e=>{
    const t=e.target.closest('button');if(!t)return;
    if(t.classList.contains('studio-back'))close();
    else if(t.hasAttribute('data-style'))choose(+t.dataset.style);
    else if(t.hasAttribute('data-step'))choose(which+Number(t.dataset.step));
    else if(t.hasAttribute('data-angle'))angle(+t.dataset.angle);
  });
  const plane=q('.studio-frame');
  plane.addEventListener('pointerdown',e=>{
    if(!e.isPrimary || e.button!==0 || e.target.closest('button'))return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY};try{plane.setPointerCapture(e.pointerId);}catch{}
  });
  plane.addEventListener('pointerup',e=>{
    if(!gesture || gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
    if(Math.abs(dx)<32 || Math.abs(dy)>Math.abs(dx)*.75)return;
    const step=dx>0?-1:1;if(usableViews().length>1)angle(step);else choose(which+step);
  });
  plane.addEventListener('pointercancel',()=>{gesture=null;});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.altKey&&!e.ctrlKey){
      e.preventDefault();const step=e.key==='ArrowLeft'?-1:1;
      if(e.target.closest('.angle-tools'))angle(step);else choose(which+step);
    }
    if(e.key==='Tab'){
      const nodes=[...mount.querySelectorAll('button')].filter(b=>!b.disabled && b.getClientRects().length);
      if(e.shiftKey && document.activeElement===nodes[0]){e.preventDefault();nodes[nodes.length-1].focus();}
      else if(!e.shiftKey && document.activeElement===nodes[nodes.length-1]){e.preventDefault();nodes[0].focus();}
    }
  });
  dialog.addEventListener('close',restore);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
}
const failures=new Set();
function usableViews(){return (data?.[which]?.views||[]).filter(v=>!failures.has(v.url));}
function angle(step){const views=usableViews();if(views.length<2)return;whichView=mod(whichView+step,views.length);paint();}
function choose(i){which=mod(i,keys.length);whichView=0;paint();}
function paint(){
  if(!data || !dialog.open)return;
  const version=++paintId,style=data[which],views=usableViews(),view=views[whichView]||views[0];
  q('.style-heading h3').textContent=style.name;q('.style-copy').textContent=style.detail;
  q('.style-count').textContent=String(which+1).padStart(2,'0')+' / 04';
  q('.style-options').querySelectorAll('button').forEach((btn,i)=>btn.setAttribute('aria-pressed',String(which===i)));
  const status=q('.photo-status'),media=q('.studio-media'),caption=q('.photo-caption'),tools=q('.angle-tools');
  const previous=media.dataset.styleKey;media.dataset.styleKey=style.key;tools.hidden=true;
  if(!view){
    caption.textContent='Inside Malik’s Barbers';status.textContent='A haircut photograph is not available for this style.';
    if(media.dataset.photo==='room' && media.firstElementChild)return;
    media.replaceChildren();media.removeAttribute('data-photo');
    const photo=new Image();photo.draggable=false;photo.alt='The chairs and mirrors inside Malik’s Barbers';photo.width=1280;photo.height=720;photo.decoding='async';
    photo.onload=()=>{if(version===paintId && dialog.open){media.dataset.photo='room';media.replaceChildren(photo);}};
    photo.onerror=()=>{if(version===paintId){media.replaceChildren();caption.textContent='';}};
    photo.src=new URL('./cuts.jpg',import.meta.url).href;
    return;
  }
  if(previous!==style.key || media.dataset.photo!=='approved'){media.replaceChildren();media.removeAttribute('data-photo');caption.textContent='';}
  status.textContent='Loading photograph…';
  const photo=new Image();photo.draggable=false;photo.alt=view.alt;photo.decoding='async';
  photo.onload=()=>{
    if(version!==paintId||!dialog.open)return;
    media.dataset.photo='approved';media.replaceChildren(photo);caption.textContent=view.label;
    tools.hidden=views.length<2;
    status.textContent=views.length>1?'Drag the photograph or use the arrows to change the view.':'';
  };
  photo.onerror=()=>{if(version===paintId && dialog.open){failures.add(view.url);whichView=0;paint();}};
  photo.src=view.url;
}
function restore(){
  paintId++;gesture=null;
  if(dialog.dataset.compatModal==='true'){
    const scroller=document.getElementById('scroller');if(!wasInert)scroller.removeAttribute('inert');
    if(previousAria===null)scroller.removeAttribute('aria-hidden');else scroller.setAttribute('aria-hidden',previousAria);
    veil?.remove();veil=null;delete dialog.dataset.compatModal;
  }
  if(origin && origin.isConnected && origin.getClientRects().length)origin.focus({preventScroll:true});
  origin=null;
}
function close(){if(dialog.open)dialog.close();}
export async function open(opener,slug){
  init();origin=opener;
  if(!dialog.open){
    if(dialog.dataset.polyfilled==='true'){
      const scroller=document.getElementById('scroller');wasInert=scroller.hasAttribute('inert');
      previousAria=scroller.getAttribute('aria-hidden');scroller.setAttribute('aria-hidden','true');
      scroller.setAttribute('inert','');dialog.dataset.compatModal='true';
      veil=make('div','studio-veil');veil.setAttribute('aria-hidden','true');veil.addEventListener('click',close);dialog.before(veil);
    }
    dialog.showModal();
    q('.studio-back').focus({preventScroll:true});
  }
  if(!loading)loading=fetch(new URL('./looks.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Catalogue unavailable');return r.json();})
    .then(parse).catch(()=>{loading=null;return parse({});});
  if(!data)q('.photo-status').textContent='Opening the catalogue…';
  data=await loading;
  if(dialog.open)choose(slug && keys.includes(slug)?keys.indexOf(slug):which);
}
