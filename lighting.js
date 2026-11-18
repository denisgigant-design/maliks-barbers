'use strict';
const $=id=>document.getElementById(id);
const movie=$('movie'),canvas=$('screen'),scroller=$('scroller'),panel=$('panel');
const FPS=24, LAST=239, storageKey='maliks-lighting-tracks-v1';
const fields={
 intensity:['Intensity',0,200],color:['Colour'],exposure:['Exposure',-100,100],warmth:['Warmth',-100,100],saturation:['Saturation',0,200],
 x:['Horizontal position',-30,130],y:['Vertical position',-50,100],angle:['Angle',-180,180],width:['Beam width',5,100]
};
const main={on:true,intensity:100,color:'#ffffff',exposure:0,warmth:0,saturation:100};
const spot={on:true,intensity:70,color:'#ffd89c',x:50,y:-18,angle:0,width:45};
const published={version:1,fps:FPS,video:'walkthrough.mp4',tracks:[{name:'Main light',kind:'main',keys:[{frame:0,...main}]}]};
function load(){
 try{
  const recent=JSON.parse(localStorage.getItem(storageKey));
  if(recent?.tracks?.[0]?.kind==='main')return recent;
  const old=JSON.parse(localStorage.getItem('maliks-lighting-v1'));
  if(Array.isArray(old)&&old.length===6){
   const migrated=structuredClone(published);
   Object.assign(migrated.tracks[0].keys[0],{exposure:old[0],warmth:old[1],saturation:old[2]});
   migrated.tracks.push({kind:'spot',name:'Spotlight 1',keys:[{...spot,frame:0,intensity:old[3],angle:old[4],width:old[5]}]});return migrated;
  }
 }catch{}
 return structuredClone(published);
}
let model=load(),selected=0,frame=0;
const track=()=>model.tracks[selected];
function save(){try{localStorage.setItem(storageKey,JSON.stringify(model))}catch{$('help').textContent='Device storage is unavailable. Export your preset to keep it.'}}
const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
function colour(a,b,t){const end=rgb(b);return '#'+rgb(a).map((v,i)=>Math.round(v+(end[i]-v)*t).toString(16).padStart(2,'0')).join('')}
function sample(light,f){
 const keys=light.keys;
 let i=keys.findIndex(k=>k.frame>f);if(i<0)i=keys.length;
 if(!i)return {...keys[0],on:false};
 const a=keys[i-1],b=keys[i],v={...a};
 if(!b||!a.on||!b.on)return v;
 const t=(f-a.frame)/(b.frame-a.frame);
 for(const field of Object.keys(fields)){
  if(typeof a[field]==='number')v[field]=a[field]+(b[field]-a[field])*t;
 }
 v.color=colour(a.color,b.color,t);return v;
}
function record(change={}){
 const light=track(),k={...sample(light,frame),...change,frame};
 light.keys=light.keys.filter(item=>item.frame!==frame).concat(k).sort((a,b)=>a.frame-b.frame);
 save();refresh();paint();
}
const wash=document.createElement('div');
wash.style.cssText='position:absolute;inset:0;mix-blend-mode:screen;pointer-events:none';canvas.after(wash);
function renderer(){
 const gl=canvas.getContext('webgl',{alpha:false,depth:false,antialias:false});
 if(!gl)return null;
 const program=gl.createProgram();
 function shader(type,src){
  const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(program,s);
 }
 shader(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
 shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 uv;uniform float aspect;uniform vec4 beam;uniform vec3 tint;
 void main(){vec2 d=(vec2(uv.x,1.-uv.y)-beam.xy)*vec2(aspect,1.);vec2 axis=vec2(sin(beam.z),cos(beam.z));
 float cone=smoothstep(cos(beam.w),cos(beam.w*.26),dot(d/max(.0001,length(d)),axis));
 gl_FragColor=vec4(tint*cone*exp(-length(d)*.65),1.);}`);
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
 gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
 const beam=gl.getUniformLocation(program,'beam'),tint=gl.getUniformLocation(program,'tint');
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
 const aspect=gl.getUniformLocation(program,"aspect");
 return spots=>{gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(aspect,canvas.width/canvas.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
 for(const s of spots){gl.uniform4f(beam,s.x/100,s.y/100,s.angle*Math.PI/180,(5+s.width*.45)*Math.PI/180);
 gl.uniform3fv(tint,rgb(s.color).map(v=>v/255*s.intensity/155));gl.drawArrays(gl.TRIANGLES,0,3);}};
}
let draw;
function paint(){
 const m=sample(model.tracks[0],frame),spots=model.tracks.slice(1).map(s=>sample(s,frame)).filter(s=>s.on&&s.intensity>0);
 const filters=[],layers=[];
 if(m.on){
  const gain=m.intensity/100*2**(m.exposure/100);
  movie.style.filter='brightness('+gain+') saturate('+m.saturation+'%)';
  if(m.color!=='#ffffff')filters.push('linear-gradient('+m.color+'66,'+m.color+'66)');
  if(m.warmth){const tint=m.warmth>0?'255,155,58':'66,151,255';const c='rgba('+tint+','+Math.abs(m.warmth)/250+')';filters.push('linear-gradient('+c+','+c+')');}
 }else movie.style.filter='';
 movie.parentElement.style.setProperty('--tint',filters.join(',')||'none');
 canvas.hidden=true;
 if(spots.length){
  try{if(draw===undefined)draw=renderer();if(draw){draw(spots);canvas.hidden=false}}catch{draw=null}
  if(canvas.hidden)for(const s of spots){
   const w=5+s.width*.45,c='rgba('+rgb(s.color).join(',')+','+Math.min(.96,s.intensity/155)+')';
   layers.push('conic-gradient(from '+(180-s.angle-w)+'deg at '+s.x+'% '+s.y+'%,transparent,'+c+' '+w+'deg,transparent '+(2*w)+'deg)');
  }
 }
 wash.style.background=layers.join(',')||'none';
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();draw=null;paint()});
canvas.addEventListener('webglcontextrestored',()=>{draw=undefined;paint()});
const time=f=>(f/FPS).toFixed(2)+'s';
function refresh(){
 const v=sample(track(),frame);
 $('clock').value=time(frame)+' / 10.00s';$('timeline').value=frame;$('power').checked=v.on;
 for(const input of $('sliders').querySelectorAll('input')){
  const n=input.dataset.field;input.value=n==='color'?v[n]:Math.round(v[n]);
  input.previousElementSibling.lastChild.textContent=n==='color'?v[n]:input.value+(n==='angle'?'°':'%');
 }
 $('markers').replaceChildren();
 track().keys.forEach(k=>{const b=document.createElement('button');b.textContent=time(k.frame)+(k.on?'':' · off');b.classList.toggle('current',frame===k.frame);b.onclick=()=>jump(k.frame);$('markers').append(b)});
 $('removeKey').disabled=track().keys.length===1||!track().keys.some(k=>k.frame===frame);
 $('removeLight').hidden=selected===0;
}
function build(){
 $('track').replaceChildren(...model.tracks.map((s,i)=>new Option(s.name,i,false,i===selected)));
 $('sliders').replaceChildren();
 for(const n of Object.keys(selected?spot:main).filter(n=>n!=='on')){
  const [name,min,max]=fields[n],box=document.createElement('div'),label=document.createElement('label'),out=document.createElement('output'),input=document.createElement('input');
  input.id='field-'+n;input.dataset.field=n;label.htmlFor=input.id;label.append(name,out);
  input.type=n==='color'?'color':'range';if(min!==undefined){input.min=min;input.max=max}
  input.oninput=()=>record({[n]:n==='color'?input.value:Number(input.value)});
  box.append(label,input);$('sliders').append(box);
 }
 refresh();paint();
}
const portrait=matchMedia('(max-width: 760px) and (orientation: portrait), (pointer: coarse) and (orientation: portrait)');
const buttons=[...document.querySelectorAll('[data-anchor]')];
const timestamps=()=>portrait.matches?[88,134,239]:[89,133,239];
let motion=0, destination=null;
function seek(){if(!movie.seeking&&movie.readyState>=2&&Math.abs(movie.currentTime-frame/FPS)>.018)movie.currentTime=frame/FPS;}
function setFrame(f){
 frame=Math.max(0,Math.min(LAST,f));seek();if(panel.open)refresh();paint();
 const times=timestamps();
 buttons.forEach((b,i)=>{if(frame===times[i])b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
 $('hint').textContent=frame===LAST?'Scroll back ↑':'Scroll to explore ↓';
}
function cancelMotion(){cancelAnimationFrame(motion);motion=0;destination=null;}
function jump(f){cancelMotion();setFrame(f);}
function go(index){
 if(index<0||index>=buttons.length||panel.open)return;
 cancelMotion();const target=timestamps()[index],start=frame,begin=performance.now();destination=index;
 const length=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.min(2400,Math.max(450,Math.abs(target-start)*24));
 function tick(now){
  const t=length?Math.min(1,(now-begin)/length):1;
  setFrame(Math.round(start+(target-start)*t*t*(3-2*t)));
  if(t<1){motion=requestAnimationFrame(tick);return;}
  motion=0;destination=null;
  scroller.dispatchEvent(new CustomEvent('touranchor',{bubbles:true,detail:{anchor:buttons[index].dataset.anchor,seconds:target/FPS}}));
 }
 motion=requestAnimationFrame(tick);
}
function step(direction){
 const times=timestamps();
 if(destination!==null){go(destination+direction);return;}
 const i=direction>0?times.findIndex(f=>f>frame):times.findLastIndex(f=>f<frame);
 go(i);
}
buttons.forEach((b,i)=>b.onclick=()=>go(i));
let wheelTimer,latched=false,delta=0;
scroller.addEventListener('wheel',e=>{
 if(panel.open||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
 e.preventDefault();clearTimeout(wheelTimer);
 wheelTimer=setTimeout(()=>{latched=false;delta=0},190);
 delta+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?600:1);
 if(!latched&&Math.abs(delta)>=18){latched=true;step(Math.sign(delta))}
},{passive:false});
let origin=null;
scroller.addEventListener('touchstart',e=>{
 origin=e.touches.length===1?[e.touches[0].clientX,e.touches[0].clientY]:null;
},{passive:true});
scroller.addEventListener('touchcancel',()=>origin=null);
scroller.addEventListener('touchend',e=>{
 if(!origin||panel.open)return;
 const dx=e.changedTouches[0].clientX-origin[0],dy=origin[1]-e.changedTouches[0].clientY;origin=null;
 if(Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx))step(Math.sign(dy));
},{passive:true});
document.addEventListener('keydown',e=>{
 if(panel.open||e.altKey||e.ctrlKey||e.metaKey)return;
 const direction={ArrowDown:1,PageDown:1,ArrowUp:-1,PageUp:-1}[e.key];
 if(direction){e.preventDefault();if(!e.repeat)step(direction)}
});
function selectVideo(){
 const active=buttons.findIndex(b=>b.hasAttribute('aria-current'));
 cancelMotion();document.documentElement.classList.toggle('portrait',portrait.matches);
 movie.poster=portrait.matches?'mobile-front.jpg':'storefront.jpg';
 movie.src=portrait.matches?'mobile-tour.mp4':'walkthrough.mp4';
 canvas.width=portrait.matches?720:1280;canvas.height=portrait.matches?1280:720;
 if(active>=0)frame=timestamps()[active];setFrame(frame);
}
portrait.addEventListener('change',selectVideo);
movie.addEventListener('loadeddata',seek);movie.addEventListener('seeked',seek);
movie.onerror=()=>$('hint').textContent='The walkthrough could not load. Refresh to retry.';
$('timeline').oninput=e=>jump(Number(e.target.value));
$('track').onchange=e=>{selected=Number(e.target.value);build()};
$('power').onchange=e=>record({on:e.target.checked});
$('key').onclick=()=>record();$('stop').onclick=()=>record({on:false});
$('add').onclick=()=>{const names=new Set(model.tracks.map(t=>t.name));let n=1;while(names.has('Spotlight '+n))n++;
 model.tracks.push({kind:'spot',name:'Spotlight '+n,keys:[{...spot,frame}]});selected=model.tracks.length-1;save();build()};
$('removeKey').onclick=()=>{track().keys=track().keys.filter(k=>k.frame!==frame);save();build()};
$('removeLight').onclick=()=>{if(!selected)return;model.tracks.splice(selected,1);selected=0;save();build()};
$('reset').onclick=()=>{if(confirm('Reset all lights and keyframes on this device?')){model=structuredClone(published);selected=0;save();build()}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(model,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='maliks-lighting-preset.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)};
let taps=0,timer;
$('lights').onclick=()=>{clearTimeout(timer);if(++taps===3){taps=0;cancelMotion();panel.showModal();build()}else timer=setTimeout(()=>taps=0,1400)};
$('done').onclick=()=>panel.close();panel.onclose=()=>$('lights').focus({preventScroll:true});
build();selectVideo();

