import {createMaterialFactory,createMeshAdder} from './three-shared.js';
let THREE,mat,add,renderer,scene,camera,worldGroup,hero,clock,host=null,resizeObserver=null,stageObserver=null,ray,pointer,lastX=NaN,lastY=NaN,lastQuality='';
const hits=[];
function makePixelSprite(kind,icon){
 const c=document.createElement('canvas');c.width=64;c.height=80;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 if(kind==='hero'){
  g.fillStyle='#211b2c';g.fillRect(18,4,28,12);g.fillRect(12,12,8,20);g.fillRect(44,12,8,20);
  g.fillStyle='#f1c9a5';g.fillRect(20,12,24,22);g.fillStyle='#30242b';g.fillRect(18,8,28,8);
  g.fillStyle='#15131a';g.fillRect(24,21,5,5);g.fillRect(36,21,5,5);
  g.fillStyle='#62a9d6';g.fillRect(14,36,36,28);g.fillStyle='#f0d078';g.fillRect(24,42,16,5);
  g.fillStyle='#293d5d';g.fillRect(16,64,13,12);g.fillRect(35,64,13,12);
 }else{
  g.fillStyle='#17121f';g.fillRect(10,24,44,42);g.fillStyle='#7545a0';g.fillRect(12,22,40,40);g.fillRect(18,14,28,14);
  g.fillStyle='#f2d77c';g.fillRect(18,8,7,16);g.fillRect(39,8,7,16);g.fillStyle='#fff0b0';g.fillRect(20,30,7,7);g.fillRect(37,30,7,7);
  g.fillStyle='#21131a';g.fillRect(23,32,4,5);g.fillRect(39,32,4,5);g.fillStyle='#2a1720';g.fillRect(27,48,10,4);
 }
 if(icon){g.font='18px sans-serif';g.textAlign='center';g.fillText(icon,32,13);}
 const tex=new THREE.CanvasTexture(c);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:.08}));
 sprite.scale.set(kind==='hero'?1.05:.9,kind==='hero'?1.32:1.12,1);sprite.position.y=kind==='hero'?.68:.56;return sprite;
}
function shadow(parent,x,z,sx=.5,sz=.4,opacity=.3){const m=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshBasicMaterial({color:0x080b18,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.008,z);m.scale.set(sx,sz,1);parent.add(m);}
function tree(parent,x,z,kind){
 const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);shadow(parent,x,z,.62,.5,.34);
 add(g,new THREE.CylinderGeometry(.09,.14,.7,6),mat(0x63452f),0,.35,0);
 if(kind==='forest'){add(g,new THREE.ConeGeometry(.7,1.5,7),mat(0x36794d),0,1.2,0);add(g,new THREE.SphereGeometry(.42,7,6),mat(0x5aa66d),.18,1.55,-.08,false);}
 else{add(g,new THREE.ConeGeometry(.58,1.35,7),mat(0x4c629a),0,1.12,0);add(g,new THREE.ConeGeometry(.4,.9,7),mat(0x7b8bc2),0,1.7,0,false);}
}
function rock(parent,x,z,color=0x77839c){shadow(parent,x,z,.45,.36,.32);const r=add(parent,new THREE.DodecahedronGeometry(.38),mat(color),x,.23,z);r.scale.set(1,.72,.9);}
function landmark(parent,x,z,kind){
 shadow(parent,x,z,.8,.62,.4);
 if(kind==='spring'){add(parent,new THREE.CylinderGeometry(.65,.72,.18,12),mat(0x7b9d9e),x,.08,z);const water=add(parent,new THREE.CircleGeometry(.52,20),new THREE.MeshStandardMaterial({color:0x58d7e8,metalness:.2,roughness:.18,emissive:0x124c65}),x,.19,z,false,false);water.rotation.x=-Math.PI/2;}
 else if(kind==='ruins'){add(parent,new THREE.BoxGeometry(.9,1.2,.22),mat(0x9a8d77),x,.6,z);add(parent,new THREE.BoxGeometry(.22,.8,.9),mat(0x756c66),x,.4,z);add(parent,new THREE.TorusGeometry(.42,.07,7,20),mat(0xe7c46e),x,.85,z);}
 else if(kind==='swordpeak'){const blade=add(parent,new THREE.ConeGeometry(.22,1.65,5),new THREE.MeshStandardMaterial({color:0xa9d9ee,metalness:.75,roughness:.2,emissive:0x244b70}),x,.84,z);blade.rotation.z=Math.PI;}
 else if(kind==='forest'){tree(parent,x,z,'forest');tree(parent,x+.7,z+.2,'forest');}
 else if(kind==='voidaltar'){add(parent,new THREE.CylinderGeometry(.75,.9,.22,8),mat(0x40364e),x,.11,z);const ring=add(parent,new THREE.TorusGeometry(.52,.055,8,24),new THREE.MeshStandardMaterial({color:0x9c71df,emissive:0x3d176b,metalness:.35}),x,.72,z);ring.rotation.x=Math.PI/2;}
 else{add(parent,new THREE.CylinderGeometry(.6,.75,.25,8),mat(0xc3a56c),x,.12,z);add(parent,new THREE.ConeGeometry(.55,.8,8),mat(0x9d7a46),x,.6,z);}
}
function visualHash(x,y,seed=0){let n=Math.imul((x|0)+seed,374761393)^Math.imul((y|0)-seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function buildTile(parent,dx,dz,info){
 const x=Number.isFinite(info.x)?info.x:dx,y=Number.isFinite(info.y)?info.y:dz,h=visualHash(x,y,19),h2=visualHash(x,y,83);
 const palettes={jiutian:[0x668f4e,0x729d57,0x5e8548,0x7da45c,0x587e49],yaochi:[0x559b91,0x65aaa0,0x47877f,0x78b6a8],zhuxian:[0x88745d,0x9b8065,0x75634f,0xa18b70],forest:[0x356d43,0x417c4c,0x2f613c,0x508a54],chaos:[0x51415e,0x615071,0x44364f,0x6a5878],wilderness:[0x648a5a,0x739b61,0x587c50]};
 const palette=palettes[info.region]||palettes.wilderness;
 let color=info.hidden?0x172538:info.water?0x285b82:info.blocked?(info.region==='chaos'?0x51445f:0x687783):palette[Math.floor(h*palette.length)%palette.length];
 if(info.path&&!info.hidden)color=info.region==='zhuxian'?0x9d8b78:0x9c8968;
 const lift=(h2-.5)*.035;
 const base=add(parent,new THREE.BoxGeometry(.98,.18,.98),mat(color),dx,-.11+lift,dz,false,true);base.userData={dx,dz,info};hits.push(base);
 if(info.hidden)return;
 if(info.path){for(let k=0;k<3;k++){const px=dx+(k-1)*.25,pz=dz+(k%2?.18:-.18);const stone=add(parent,new THREE.DodecahedronGeometry(.12,0),mat(0xb6a17b),px,-.005+lift,pz,false,true);stone.scale.set(1,.22,.72);}}
 if(info.water){const w=add(parent,new THREE.PlaneGeometry(.94,.94),new THREE.MeshStandardMaterial({color:0x42b9d4,transparent:true,opacity:.78,roughness:.16,metalness:.12,emissive:0x07384a}),dx,-.012+lift,dz,false,false);w.rotation.x=-Math.PI/2;for(let k=0;k<(matchMedia('(max-width:700px)').matches?1:2);k++){const ripple=add(parent,new THREE.TorusGeometry(.16+k*.12,.012,4,16),new THREE.MeshBasicMaterial({color:0xa4f2ff,transparent:true,opacity:.38,depthWrite:false}),dx+(k-.5)*.18,.006+lift,dz,false,false);ripple.rotation.x=Math.PI/2;}}
 if(info.landmark)landmark(parent,dx,dz,info.landmark);
 else if(info.tree)tree(parent,dx,dz,info.region==='forest'?'forest':'normal');
 else if(info.blocked)rock(parent,dx,dz,info.region==='chaos'?0x55445f:0x75828c);
 else if(info.crystal){const c=add(parent,new THREE.OctahedronGeometry(.25),new THREE.MeshStandardMaterial({color:0x9ceaff,metalness:.3,roughness:.16,emissive:0x245d83}),dx,.3+lift,dz);c.rotation.y=.5;const glow=add(parent,new THREE.OctahedronGeometry(.38),new THREE.MeshBasicMaterial({color:0x65cfff,transparent:true,opacity:.12,depthWrite:false}),dx,.3+lift,dz,false,false);}
 else if(!info.path&&h>(matchMedia('(max-width:700px)').matches?.58:.35)){const tuftCount=matchMedia('(max-width:700px)').matches?1:(h>.78?3:2);for(let k=0;k<tuftCount;k++){const a=(k/tuftCount)*Math.PI*2+h2*2.4,rr=.2+visualHash(x+k,y-k,7)*.2,tx=dx+Math.cos(a)*rr,tz=dz+Math.sin(a)*rr,hh=.12+visualHash(x-k,y+k,9)*.18;const blade=add(parent,new THREE.ConeGeometry(.035,hh,4),mat(info.region==='chaos'?0x8770a0:info.region==='zhuxian'?0xb1a17b:0x91b96a),tx,hh/2-.015+lift,tz,false,false);blade.rotation.z=(visualHash(x+k*2,y-k*3,3)-.5)*.55;}}
 if(!info.tree&&!info.blocked&&!info.water&&!info.landmark&&h2>.82){const flower=add(parent,new THREE.SphereGeometry(.055,6,5),mat(info.region==='chaos'?0xb08ee0:info.region==='yaochi'?0xd4f7f1:0xf1d28a),dx+(h-.5)*.55,.055+lift,dz+(h2-.5)*.55,false,false);}
 if(info.monster){shadow(parent,dx,dz,.42,.3,.35);const m=makePixelSprite('monster',info.monster.icon);m.position.set(dx,.56,dz);parent.add(m);}
 if(info.boss){shadow(parent,dx,dz,.56,.4,.4);const m=makePixelSprite('monster',info.boss.icon);m.scale.set(1.25,1.5,1);m.position.set(dx,.72,dz);parent.add(m);}
}
function rebuild(){
 const s=window.getImmortal3DState?.();if(!s||!scene)return;
 const q=document.documentElement.dataset.qualityLevel||'high';
 if(s.x===lastX&&s.y===lastY&&q===lastQuality)return;
 lastX=s.x;lastY=s.y;lastQuality=q;
 if(worldGroup){scene.remove(worldGroup);worldGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!o.material.userData?.sharedImmortalMaterial){if(o.material.map)o.material.map.dispose();o.material.dispose();}});}
 worldGroup=new THREE.Group();scene.add(worldGroup);hits.length=0;
 const mobile=matchMedia('(max-width:700px)').matches;const radius=mobile?(q==='low'?4:q==='high'?5:6):(q==='low'?5:q==='high'?7:8);
 for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  const info=window.getImmortal3DInfo?.(s.x+dx,s.y+dz)||{};buildTile(worldGroup,dx,dz,info);
 }
 if(hero)hero.position.set(0,.68,0);
}
function resize(){if(!host||!renderer)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function quality(){
 if(!renderer||!host)return;const q=document.documentElement.dataset.qualityLevel||'high',mobile=matchMedia('(max-width:700px)').matches;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?.9:q==='low'?.8:q==='high'?1.1:1.5));
 renderer.shadowMap.enabled=!mobile&&q!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=q==='extreme'?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=q==='extreme'?1.1:1;
 renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);
}
function ensureHost(){
 const next=document.getElementById('immortalMapWorld');if(!next||!renderer)return;
 if(host===next&&renderer.domElement.parentElement===next){resize();return;}
 if(resizeObserver)resizeObserver.disconnect();
 host=next;host.appendChild(renderer.domElement);
 resizeObserver=new ResizeObserver(()=>{resize();});resizeObserver.observe(host);
 lastX=NaN;rebuild();quality();resize();
}
function clickWorld(e){
 if(!host||!renderer)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
 ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits,false)[0];if(!hit)return;
 const {dx,dz,info}=hit.object.userData;
 if(dx===0&&dz===0){if(info.site||info.boss)window.interactImmortalMap?.();return;}
 if(Math.abs(dx)+Math.abs(dz)===1){window.moveImmortalOpenWorld?.(Math.sign(dx),Math.sign(dz));return;}
 if(info.site||info.boss)window.toast?.('请走到地点旁边，再按「调查」进行互动');
}
function boot(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x263a55);scene.fog=new THREE.FogExp2(0x263a55,.025);
 camera=new THREE.PerspectiveCamera(52,1,.1,100);camera.position.set(0,12.5,14.5);camera.lookAt(0,0,0);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.domElement.id='immortal3DCanvas';
 Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'1',display:'block',touchAction:'manipulation'});
 scene.add(new THREE.HemisphereLight(0xddeaff,0x30283f,1.8));
 const sun=new THREE.DirectionalLight(0xffe5bf,3);sun.position.set(-6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.bias=-.0002;sun.shadow.normalBias=.03;scene.add(sun);
 hero=makePixelSprite('hero');hero.position.set(0,.68,0);scene.add(hero);
 const sh=new THREE.Mesh(new THREE.CircleGeometry(.38,20),new THREE.MeshBasicMaterial({color:0x080b18,transparent:true,opacity:.35,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=.012;scene.add(sh);
 ray=new THREE.Raycaster();pointer=new THREE.Vector2();renderer.domElement.addEventListener('click',clickWorld);
 stageObserver=new MutationObserver(()=>{ensureHost();});const stage=document.getElementById('immortalStage');if(stage)stageObserver.observe(stage,{childList:true,subtree:true});
 ensureHost();clock=new THREE.Clock();
 const qualityObserver=new MutationObserver(()=>{lastQuality='';quality();rebuild();});qualityObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-quality-level']});
 let lastFrameAt=0;function frame(now=0){requestAnimationFrame(frame);const mobile=matchMedia('(max-width:700px)').matches,interval=mobile?1000/30:1000/45;if(document.hidden||!host||!host.isConnected||host.offsetParent===null||now-lastFrameAt<interval)return;lastFrameAt=now;hero.position.y=.68+Math.sin(clock.getElapsedTime()*3)*.035;renderer.render(scene,camera);}
 frame();
 window.updateImmortalWorld3D=()=>{rebuild();};window.mountImmortalWorld3D=()=>{ensureHost();lastX=NaN;rebuild();resize();};
}
async function start(){try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');const cachedMaterial=createMaterialFactory(THREE);mat=(...args)=>{const m=cachedMaterial(...args);m.userData.sharedImmortalMaterial=true;return m;};add=createMeshAdder(THREE);boot();}catch(e){console.warn('Immortal open world 3D unavailable',e);const showFallback=()=>{const el=document.getElementById('immortalMapWorld');if(el&&!el.querySelector('.immortal-world-fallback'))el.innerHTML='<div class="immortal-world-fallback">3D 地图暂时无法加载，请检查网络或浏览器 WebGL 支持</div>';};showFallback();const stage=document.getElementById('immortalStage');if(stage)new MutationObserver(showFallback).observe(stage,{childList:true,subtree:true});}}
start();
