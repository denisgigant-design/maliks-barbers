/* Optional tasteful Three.js/WebGL/GLSL metal mark.
   A tiny render at <=1.5 device pixel ratio, omitted on mobile and reduce-motion. */
const holder=document.getElementById('mgMark');
const mobile=matchMedia('(max-width:700px)').matches;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
if(holder && !mobile && !reduce){
  try {
    const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
    const canvas=holder.querySelector('canvas');
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    renderer.setSize(51,51,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(38,1,.1,20);
    camera.position.set(0,0,4.1);
    const uniforms={uTime:{value:0}};
    const shader=new THREE.ShaderMaterial({
      uniforms,side:THREE.DoubleSide,
      vertexShader:`varying vec3 vNormalView; varying vec3 vPosition; void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        vNormalView=normalize(normalMatrix*normal);vPosition=position;
        gl_Position=projectionMatrix*mv;
      }`,
      fragmentShader:`precision mediump float;uniform float uTime;
      varying vec3 vNormalView; varying vec3 vPosition;
      void main(){
        vec3 n=normalize(vNormalView);
        float rim=pow(1.0-abs(n.z),1.65);
        float light=0.58+0.28*max(dot(n,normalize(vec3(-0.42,0.7,0.55))),0.0);
        float sweep=pow(max(0.0,sin(vPosition.y*4.5+uTime*.45)),7.0)*.12;
        vec3 gold=mix(vec3(.30,.21,.105),vec3(.91,.77,.48),light+rim*.2+sweep);
        gl_FragColor=vec4(gold, .81+rim*.14);
      }`,transparent:true
    });
    const mark=new THREE.Group();
    const barGeometry=new THREE.BoxGeometry(.15,1.10,.14);
    const a=[[-.57,-.14,-.16],[ -.19,.20,.16],[.19,.20,-.16],[.57,-.14,.16]];
    a.forEach(([x,y,rot],i)=>{
      const piece=new THREE.Mesh(barGeometry,shader);piece.position.set(x,y,0);
      piece.rotation.z=i<2?(i===0?-.37:.39):(i===2?-.39:.37);
      mark.add(piece);
    });
    const backing=new THREE.Mesh(new THREE.TorusGeometry(.92,.019,4,50),shader);
    backing.rotation.x=.14;mark.add(backing);
    scene.add(mark);holder.classList.add('is-webgl');
    const clock=new THREE.Clock();
    let running=false,visible=true,raf=0;
    const paint=()=>{
      if(!running)return;
      const t=clock.getElapsedTime();
      uniforms.uTime.value=t;
      mark.rotation.y=Math.sin(t*.40)*.15;
      mark.rotation.x=Math.cos(t*.38)*.07;
      renderer.render(scene,camera);
      raf=requestAnimationFrame(paint);
    };
    const update=()=>{
      const should=visible&&!document.hidden;
      if(should&&!running){running=true;paint();}
      else if(!should&&running){running=false;cancelAnimationFrame(raf);}
    };
    const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);update();},{threshold:.05});
    observer.observe(holder);
    document.addEventListener('visibilitychange',update);
    update();
  }catch(_){/* The static monogram stays in place without network/WebGL. */}
}
