/* Glass surfaces and service content. cards.js owns navigation and panel lifetimes. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const scene = document.querySelector('.scene');
  const detail = byId('scenePanel');
  const actions = ['hours', 'contact', 'prices'];
  const names = {hours:'Opening hours', contact:'Booking', prices:'Pricing'};
  const shapes = {hours:'rounded', contact:'rounded', prices:'rounded'};
  const profiles = {
    facet:[[0,13],[10,0],[87,0],[100,9],[100,86],[90,100],[12,100],[0,90]],
    shield:[[0,5],[16,0],[84,0],[100,5],[96,79],[82,91],[50,100],[18,91],[4,79]],
    asymmetric:[[0,13],[12,0],[72,0],[76,4],[100,4],[100,76],[90,96],[66,96],[60,100],[0,100]],
    marker:[[0,30],[9,0],[85,0],[100,48],[90,100],[12,100],[0,76]]
  };
  const icons = {
    hours:'M10 2.7a7.3 7.3 0 1 0 .1 0 M10 5.7v4.7l3 1.6',
    contact:'M6 2.8 8.2 6.6 6.5 8.4c1.1 2.4 2.7 4.1 5.1 5.1l1.8-1.7 3.8 2.2c-.5 2.3-1.7 3.5-3.8 3.2C7.7 16.3 3.7 12.3 2.8 6.6c-.3-2.1.9-3.3 3.2-3.8Z',
    prices:'M3 4h9l6 6-8 8-7-7Z M7 7h.1'
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const element = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const readJSON = key => {try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const key = (device,action) => 'maliks-glass-settings-v4-'+device+'-'+action;
  const limits = {blur:[0,36],opacity:[12,85],rim:[0,100],duration:[0,1000],scale:[65,135],
    markerScale:[65,150],edgeInset:[0,45],edgeY:[5,95]};
  const cache = new Map();
  function defaults(device,action) {
    return {classicStyle:true,blur:device==='mobile'?14:20,opacity:43,dock:'smart',shape:shapes[action],
      scale:100,markerScale:100,rim:52,duration:350,edgeInset:3,edgeY:action==='hours'?17:77,
      ...window.MALIKS_GLASS_PRESETS?.[device]?.[action]};
  }
  function sanitize(device,action,draft) {
    const baseline=defaults(device,action), p={...baseline,...draft};
    for(const [prop,[lo,hi]] of Object.entries(limits)){
      const number=Number(p[prop]);
      p[prop]=Number.isFinite(number)?clamp(number,lo,hi):baseline[prop];
    }
    if(!['smart','authored'].includes(p.dock))p.dock='authored';
    if(!['rounded','facet','shield','asymmetric'].includes(p.shape))p.shape=shapes[action];
    return p;
  }
  function read(device,action) {
    const name=key(device,action);
    if(cache.has(name))return cache.get(name);
    const draft=readJSON(name)||{};
    if(draft.shape && !draft.classicStyle) draft.shape="rounded";
    const layout=readJSON('maliks-wall-mount-layout-v4-'+device);
    const manual=layout?.panels?.[action];
    let published=window.MALIKS_PANEL_PRESETS?.[device]?.[action];
    try{published=JSON.parse(layout.basedOn)[action]||published;}catch{}
    if(!draft.dock && manual && published && ['width','height','x','y'].some(k=>manual[k]!=null && manual[k]!==published[k]))draft.dock='authored';
    const p=sanitize(device,action,draft);
    cache.set(name,p);return p;
  }
  function save(device,action,delta) {
    const p=sanitize(device,action,{...read(device,action),...delta,classicStyle:true});
    const name=key(device,action);
    cache.set(name,p);
    try{localStorage.setItem(name,JSON.stringify(p));}catch{byId('peStatus').textContent='Device storage is unavailable. Export a backup to keep these settings.';}
    return p;
  }
  function surface(node,shape) {
    const skin=element('span','glass-skin');
    skin.setAttribute('aria-hidden','true');
    const rim=svg('svg');rim.setAttribute('class','glass-rim');rim.setAttribute('viewBox','0 0 100 100');
    rim.setAttribute('preserveAspectRatio','none');rim.setAttribute('aria-hidden','true');
    rim.append(svg('polygon'),svg('path'));node.prepend(skin,rim);
    changeShape(node,shape);
  }
  function changeShape(node,shape,bend=0) {
    const tag=shape+'/'+bend;
    if(node.dataset.profile===tag)return;
    if(shape==='marker' && !node.querySelector('.glass-rim')){node.dataset.profile=tag;return;}
    if(shape==='rounded'){node.dataset.profile=tag;node.dataset.shape=shape;node.style.removeProperty('--cut');return;}
    const points=profiles[shape].map(([x,y])=>[x,y]);
    if(shape==='marker'){
      // Change the central ridge and opposite lip while the marker keeps its wall pose.
      const bow=bend/45*9;
      points.splice(2,0,[48,2+bow*.6]);points.splice(-2,0,[50,98+bow*.6]);
    }
    node.dataset.profile=tag;node.dataset.shape=shape;
    node.style.setProperty('--cut','polygon('+points.map(p=>p[0]+'% '+p[1]+'%').join(',')+')');
    const rim=node.querySelector('.glass-rim');
    rim.firstElementChild.setAttribute('points',points.map(p=>p.join(',')).join(' '));
    const [x,y]=points[0],[x1,y1]=points[1],last=points[points.length-1];
    rim.lastElementChild.setAttribute('d','M '+last.join(' ')+' L '+(x+2)+' '+y+' L '+(x1+1)+' '+(y1+1)+' L '+(x1+14)+' '+(y1+1));
  }
  function marker(button,action) {
    button.textContent='';
    button.style.setProperty('--wall-light-x',{hours:'29%',contact:'72%',prices:'40%'}[action]);
    const pose=element('span','marker-pose'),face=element('span','marker-surface');
    const clipper=element('i','nav-clipper');clipper.setAttribute('aria-hidden','true');
    clipper.append(element('i','clipper-grip'),element('i','clipper-blade'));
    face.append(clipper);pose.append(face);
    button.append(pose,element('span','marker-label',names[action]));
    return face;
  }
  const faces={},rows=[...byId('prices').querySelectorAll('dl>div')].map(row=>({
    name:row.querySelector('dt').textContent,price:row.querySelector('dd').textContent
  }));
  let selected=null, studioPromise=null;
  function openStudio(opener) {
    const slug=selected!==null && rows[selected]?.name==='Skin Fade'?'skin-fade':undefined;
    opener.setAttribute('aria-busy','true');
    if(!studioPromise)studioPromise=import('./look-studio.js?v=classic3-flat');
    studioPromise.then(studio=>{if(opener.isConnected && !opener.closest('[hidden],[inert]'))return studio.open(opener,slug);}).catch(()=>{
      studioPromise=null;const status=opener.parentElement.querySelector('[role=status]');
      if(status)status.textContent='Look Studio could not load. Select it again to retry.';
    }).finally(()=>opener.removeAttribute('aria-busy'));
  }
  function serviceCatalogue() {
    const wrap=element('div','catalogue'),list=element('div','service-list');
    list.setAttribute('role','group');list.setAttribute('aria-label','Select a service');
    rows.forEach((item,index)=>{
      const btn=element('button','service-row');btn.type='button';btn.dataset.service=index;btn.setAttribute('aria-pressed','false');
      btn.append(element('span','service-name',item.name),element('span','service-price',item.price));list.append(btn);
    });
    const launch=element('button','studio-entry');launch.type='button';launch.setAttribute('aria-haspopup','dialog');
    const arrow=svg('svg'),line=svg('path');arrow.setAttribute('viewBox','0 0 16 16');arrow.setAttribute('width','14');arrow.setAttribute('height','14');arrow.setAttribute('aria-hidden','true');
    line.setAttribute('d','M3 13 13 3M4 3h9v9');line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','1.3');arrow.append(line);
    launch.append(element('span','launch-name','Look Studio'),arrow);
    const status=element('span','catalogue-status');status.setAttribute('role','status');
    wrap.append(list,launch,status);return wrap;
  }
  function selectService(index) {
    if(!rows[index])return;
    selected=index;
    document.querySelectorAll('[data-service]').forEach(btn=>btn.setAttribute('aria-pressed',String(+btn.dataset.service===index)));
    document.querySelectorAll('.studio-entry').forEach(node=>node.setAttribute('aria-label',rows[index].name==='Skin Fade'?'Open Skin Fade in Look Studio':'Open Look Studio'));
  }
  function build() {
    for(const action of actions){
      const article=element('article','glass-sheet');article.dataset.kind=action;article.hidden=true;surface(article,shapes[action]);
      const head=element('header'),title=element('h2','',names[action]);title.id='glass-title-'+action;
      head.append(title,element('div','rim-sample'));
      const body=element('div','glass-content');body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label',names[action]+' details');
      if(action==='hours')body.append(byId('hours').querySelector('dl').cloneNode(true));
      if(action==='contact'){
        const source=byId('contact');
        for(const selector of ['address','.shop-phone','p','.shop-actions'])body.append(source.querySelector(selector).cloneNode(true));
      }
      if(action==='prices')body.append(serviceCatalogue());
      const foot=element('div','glass-footer'),close=element('button','glass-dismiss');
      close.type='button';close.setAttribute('aria-label','Back to shop');
      close.append(element('span','return-long','Back to shop'),element('span','return-short','Back'));
      if(action==='prices'){foot.append(body.querySelector('.studio-entry'),body.querySelector('.catalogue-status'));}
      foot.append(close);
      article.append(head,body,foot);detail.append(article);faces[action]=article;
      surface(byId(action),shapes[action]);
    }
    byId('prices').querySelector('dl').replaceWith(serviceCatalogue());
    byId('hours').querySelector('h2').textContent='Opening hours';
    byId('contact').querySelector('h2').textContent='Booking & contact';
    byId('prices').querySelector('h2').textContent='Services & pricing';
    for(const root of [detail,byId('prices')]){
      root.addEventListener('click',e=>{
        const service=e.target.closest('[data-service]'),opener=e.target.closest('.studio-entry');
        if(service)selectService(+service.dataset.service);
        else if(opener)openStudio(opener);
      });
    }
  }
  function reveal(action) {
    for(const kind of actions) faces[kind].hidden=kind!==action;
    detail.setAttribute('aria-labelledby','glass-title-'+action);
    faces[action].querySelector('.glass-content').scrollTop=0;
  }
  function applyMaterial(node,p,layout) {
    node.style.setProperty('--glass-blur',p.blur+'px');node.style.setProperty('--glass-opacity',String(p.opacity/100));
    node.style.setProperty('--rim',String(p.rim/100));changeShape(node,p.shape);
    const rgb=hex=>/^#[0-9a-f]{6}$/i.test(hex||'')?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(','):null;
    const tint=rgb(layout?.glass),border=rgb(layout?.border);
    if(tint)node.style.setProperty('--glass-rgb',tint);
    if(border)node.style.setProperty('--glass-border-rgb',border);
  }
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  function place(device,action,layout) {
    const p=read(device,action), face=faces[action];applyMaterial(face,p,layout);
    const box=scene.getBoundingClientRect(),stage=scene.parentElement.getBoundingClientRect();
    const sw=box.width, sh=box.height, gap=box.left-stage.left, full=stage.width, factor=p.scale/100;
    if(!sw||!sh)return;
    const compact=sw<590 || (device==='mobile' && matchMedia('(orientation:portrait)').matches);
    const gutter=gap>=210 && compact;
    const drawer=p.dock==='smart' && compact;
    let w,h,x,y,side;
    if(p.dock==='authored'){
      w=clamp(sw*layout.width/100*factor,Math.min(90,sw),sw*.98);
      h=clamp(sh*layout.height/100*factor,Math.min(92,sh*.5),sh*.96);
      x=clamp(sw*layout.x/100,w/2,sw-w/2);y=clamp(sh*layout.y/100,h/2,sh-h/2);
      side=x<sw/2?'left':'right';
    }else if(compact&&!gutter){
      w=Math.min(full-24,(action==='prices'?344:322)*factor);
      if(action==='prices'){
        const barber=window.MalikBarber.value(device);
        const bw=sh*barber.size/100*(1+barber.depth/150)*415/1207;
        const free=gap+sw*barber.x/100-bw/2-15;
        if(barber.enabled && free>=158)w=Math.min(w,Math.max(158,free-5));
      }
      h=Math.min(sh*.39,Math.max(132,sh*.34*factor),260*factor);
      const left=-gap+12,right=full-gap-12-w;
      x=(action==='prices'?left:action==='contact'?right:(left+right)/2)+w/2;
      y=sh-h/2-7;side='bottom';
    }else{
      w=gutter?Math.min(gap-20,315*factor):clamp(sw*.28*factor,Math.min(220,stage.width*.33),Math.min(375*factor,full*.42));
      h=Math.min(sh*.82,(action==='prices'?457:action==='hours'?391:300)*factor);
      const edges=[-gap+Math.min(28,full*.023),sw+gap-Math.min(28,full*.023)-w];
      const pref=layout.lettering, oldW=sw*pref.width/100;
      const markerX=(sw-oldW)*pref.x/100+oldW/2,markerY=sh*pref.y/100;
      const obstacles=[{x:markerX-oldW*.32,y:markerY-18,w:oldW*.64,h:48,weight:11}];
      const subject={hours:[.35,.29,.31,.52],contact:[.07,.29,.41,.5],prices:[.29,.24,.26,.43]}[action];
      obstacles.push({x:sw*subject[0],y:sh*subject[1],w:sw*subject[2],h:sh*subject[3],weight:1.8});
      if(action==='prices'){
        const v=window.MalikBarber.value(device),bh=sh*v.size/100*(1+v.depth/150),bw=bh*415/1207;
        if(v.enabled)obstacles.push({x:sw*v.x/100-bw/2,y:sh*(1-v.bottom/100)-bh,w:bw,h:bh,weight:18});
      }
      const top=(sh-h)*.48;
      const score=(x,i)=>obstacles.reduce((sum,o)=>sum+overlap({x,y:top,w,h},o)*o.weight,0)+(i===(action==='contact'?1:0)?0:1);
      const i=score(edges[0],0)<=score(edges[1],1)?0:1;
      x=edges[i]+w/2;y=top+h/2;side=i?'right':'left';
    }
    Object.assign(detail.style,{width:w+'px',height:h+'px',left:x+'px',top:y+'px'});
    detail.dataset.drawer=String(drawer);detail.dataset.narrow=String(w<245);detail.dataset.side=side;
    if(p.rim>0 && !detail.hidden && !reduced.matches && matchMedia('(hover:hover) and (pointer:fine)').matches &&
       !navigator.connection?.saveData && (navigator.deviceMemory||8)>=4){
      if(!bevelPromise)bevelPromise=import('./glass-mark.mjs?v=classic3-flat').catch(()=>null);
      bevelPromise.then(api=>{if(api && !detail.hidden && !detail.inert && detail.dataset.action===action)api.attach(face,p.rim);});
    }
  }
  // V5: animate information only. Never animate glass or panel geometry.
  function contentMotion(root, duration, entering=true) {
    if(reduced.matches || !duration || !root.animate)return [];
    const nodes=[...root.querySelectorAll('header h2, :scope > h2, :scope > .signature, dl > div, .service-row, address, p, .shop-phone, .shop-actions a, .glass-dismiss, .studio-entry')]
      .filter(n=>!n.closest('[hidden]'));
    const stagger=Math.min(28, duration*.39/Math.max(1,nodes.length-1));
    const span=Math.max(1,duration-stagger*Math.max(0,nodes.length-1));
    return nodes.map((node,i)=>node.animate(entering?
      [{opacity:.08,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}]:
      [{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-3px)'}],
      {duration:entering?span:duration,delay:entering?i*stagger:0,fill:entering?'backwards':'both',easing:'cubic-bezier(.2,.72,.25,1)'}));
  }
  function installCardMotion(){
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries)if(entry.isIntersecting && entry.intersectionRatio>=.15){
          observer.unobserve(entry.target);contentMotion(entry.target,460);
        }
      },{root:document.querySelector('main'),threshold:.15});
      for(const action of actions)observer.observe(byId(action));
    }
    const selector='button, a[href], [role="button"]';
    const pressed=new Map(), timers=new WeakMap();
    const control=e=>e.target instanceof Element?e.target.closest(selector):null;
    function release(id){const b=pressed.get(id);if(b){b.classList.remove('malik-pressed');pressed.delete(id);}}
    document.addEventListener('pointerdown',e=>{
      const b=control(e);if(!b||b.disabled||b.closest('[inert]')||e.button!==0)return;
      release(e.pointerId);pressed.set(e.pointerId,b);b.classList.add('malik-pressed');
    },{passive:true,capture:true});
    for(const type of ['pointerup','pointercancel'])window.addEventListener(type,e=>release(e.pointerId),{passive:true,capture:true});
    window.addEventListener('blur',()=>{for(const id of pressed.keys())release(id);});
    document.addEventListener('click',e=>{
      const b=control(e);if(!b||b.disabled||b.closest('[inert]'))return;
      clearTimeout(timers.get(b));b.classList.add('malik-activated');
      timers.set(b,setTimeout(()=>b.classList.remove('malik-activated'),180));
    },true);
  }
  let bevelPromise=null;
  build();
  installCardMotion();
  const initialDevice=mobileTour?'mobile':'desktop';
  for(const action of actions)applyMaterial(faces[action],read(initialDevice,action),window.MALIKS_PANEL_PRESETS[initialDevice][action]);
  window.MalikGlass={actions,names,limits,faces,read,save,defaults,key,sanitize,marker,changeShape,place,reveal,contentMotion,
    clearCache(){cache.clear();}, reset(device,action){
      const p=sanitize(device,action,defaults(device,action));cache.set(key(device,action),p);
      try{localStorage.removeItem(key(device,action));}catch{}return p;
    }};
})();
