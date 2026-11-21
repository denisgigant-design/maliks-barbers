/* A small beveled glass edge. A single canvas draws on material or pointer changes.
   CSS supplies the same edge on touch devices, low-power devices and without WebGL. */
let canvas,gl,program,light,strength,host,face,scheduled=0,x=.32,power=.5,unavailable=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function setup(){
  canvas=document.createElement('canvas');canvas.width=164;canvas.height=6;canvas.setAttribute('aria-hidden','true');
  gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:true,preserveDrawingBuffer:true});
  if(!gl)return false;
  const shader=(kind,source)=>{
    const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Unavailable glass material');}return s;
  };
  program=gl.createProgram();
  const shaders=[
    shader(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'),
    shader(gl.FRAGMENT_SHADER,`precision mediump float; varying vec2 uv; uniform float source; uniform float rim;
      void main(){float bevel=uv.y*2.-1.;
        vec3 n=normalize(vec3((uv.x-.5)*.30,bevel,1.));
        vec3 l=normalize(vec3((source-uv.x)*2.,.45,1.));
        vec3 h=normalize(l+vec3(0.,0.,1.));
        float fresnel=.04+.96*pow(1.-max(n.z,0.),5.);
        float spec=pow(max(dot(n,h),0.),42.);
        float taper=smoothstep(0.,.10,uv.x)*(1.-smoothstep(.74,1.,uv.x));
        gl_FragColor=vec4(.86,.92,.87,taper*rim*(.16+.61*spec+fresnel));}`)
  ];
  for(const s of shaders)gl.attachShader(program,s);
  gl.linkProgram(program);for(const s of shaders)gl.deleteShader(s);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
  gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  light=gl.getUniformLocation(program,'source');strength=gl.getUniformLocation(program,'rim');
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();unavailable=true;canvas.remove();face?.removeEventListener('pointermove',move);});
  return true;
}
function paint(){
  scheduled=0;if(!host || face.hidden || face.parentElement.hidden || unavailable || reduced.matches)return;
  gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(light,x);gl.uniform1f(strength,power);gl.drawArrays(gl.TRIANGLES,0,3);canvas.dataset.drawn='true';
}
function queue(){if(!scheduled)scheduled=requestAnimationFrame(paint);}
function move(e){if(reduced.matches)return;const r=face.getBoundingClientRect();x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));queue();}
export function attach(sheet,rim){
  if(unavailable || reduced.matches)return;
  try{if(!canvas && !setup()){unavailable=true;return;}}catch{unavailable=true;return;}
  if(face!==sheet){
    face?.removeEventListener('pointermove',move);
    face=sheet;host=sheet.querySelector('.rim-sample');host.append(canvas);x=.32;
    sheet.addEventListener('pointermove',move,{passive:true});
  }
  power=rim/100;queue();
}
