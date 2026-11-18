'use strict';
const $=id=>document.getElementById(id);
const movie=$('movie'), canvas=$('screen'), scroller=$('scroller'), panel=$('panel');
const controls=[
 ['Exposure',-100,100,0],['Warmth',-100,100,0],['Saturation',0,200,100],
 ['Spot intensity',0,100,0],['Spot angle',-90,90,0],['Spot width',10,100,45]
];
const sliders=controls.map(([name,min,max,value],i)=>{
 const label=document.createElement('label'), output=document.createElement('output'), input=document.createElement('input');
 input.id='light-'+i;input.type='range';input.min=min;input.max=max;input.value=value;
 label.htmlFor=input.id; label.append(name,output);output.htmlFor=input.id;
 $('sliders').append(label,input);
 return {input,output};
});
let taps=0,timeout;
$('lights').onclick=()=>{
 clearTimeout(timeout);
 if(++taps===3){taps=0;panel.showModal();return;}
 timeout=setTimeout(()=>{taps=0},1400);
};
$('done').onclick=()=>panel.close();
panel.onclose=()=>$('lights').focus({preventScroll:true});
function buildRenderer(){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false});
 if(!gl)return null;
 const program=gl.createProgram();
 function attach(type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
  gl.attachShader(program,shader);
 }
 attach(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}');
 attach(gl.FRAGMENT_SHADER,`precision mediump float;
 varying vec2 uv;uniform sampler2D frame;uniform vec3 grade;uniform vec3 spot;
 void main(){
 vec3 c=texture2D(frame,uv).rgb;
 float y=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(y),c,grade.z)*exp2(grade.x)*vec3(1.+.22*grade.y,1.,1.-.22*grade.y);
 vec2 d=(uv-vec2(.5,1.18))*vec2(1.7778,1.);
 vec2 axis=vec2(sin(spot.y),-cos(spot.y));
 float spread=spot.z*.75+.08;
 float beam=smoothstep(cos(spread),cos(spread*.33),dot(normalize(d),axis))*exp(-length(d)*.8);
 c+=spot.x*beam*(c+.09)*vec3(1.,.85,.62);
 gl_FragColor=vec4(c,1.);
 }`);
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
 for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
 for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 const grade=gl.getUniformLocation(program,'grade'),spot=gl.getUniformLocation(program,'spot');
 return ([ev,temp,sat,power,angle,width])=>{
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,movie);
  gl.uniform3f(grade,ev/100,temp/100,sat/100);
  gl.uniform3f(spot,power/65,angle*Math.PI/180,width/100);
  gl.drawArrays(gl.TRIANGLES,0,3);
 };
}
let render;
function redraw(){
 const values=sliders.map(({input})=>Number(input.value));
 sliders.forEach(({output},i)=>output.value=values[i]+(i===4?'°':'%'));
 const adjusted=values[0]||values[1]||values[2]!==100||values[3];
 canvas.hidden=true;movie.style.filter='';
 if(!adjusted||movie.readyState<2)return;
 try{
  if(render===undefined)render=buildRenderer();
  if(render){render(values);canvas.hidden=false;return;}
 }catch{render=null;}
 movie.style.filter='brightness('+Math.pow(2,values[0]/100)+') saturate('+values[2]+'%) sepia('+Math.max(0,values[1]/2)+'%)';
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();render=null;redraw()});
canvas.addEventListener('webglcontextrestored',()=>{render=undefined;redraw()});
const key='maliks-lighting-v1';
function save(){try{localStorage.setItem(key,JSON.stringify(sliders.map(s=>Number(s.input.value))))}catch{}}
try{const saved=JSON.parse(localStorage.getItem(key));sliders.forEach(({input},i)=>{if(Number.isFinite(saved?.[i]))input.value=saved[i]})}catch{}
for(const {input} of sliders){input.oninput=redraw;input.onchange=save}
$('reset').onclick=()=>{sliders.forEach(({input},i)=>input.value=controls[i][3]);save();redraw()};
let queued=false;
function seek(){
 queued=false;
 if(movie.readyState<2||movie.seeking)return;
 const p=Math.max(0,Math.min(1,scroller.scrollTop/(scroller.scrollHeight-scroller.clientHeight)));
 const target=Math.round(p*239)/24;
 if(Math.abs(movie.currentTime-target)>.018)movie.currentTime=target;
 $('hint').textContent=p>.995?'Scroll back ↑':'Scroll to explore ↓';
}
function queue(){if(!queued){queued=true;requestAnimationFrame(seek)}}
scroller.addEventListener('scroll',queue,{passive:true});
movie.addEventListener('seeked',()=>{redraw();queue()});
movie.addEventListener('loadeddata',()=>{redraw();queue()});
movie.addEventListener('error',()=>$('hint').textContent='The walkthrough could not load. Refresh to retry.');
redraw();queue();
