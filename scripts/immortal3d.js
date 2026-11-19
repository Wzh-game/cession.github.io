import {createMaterialFactory,createMeshAdder} from './three-shared.js';
let THREE,mat,add,renderer,scene,camera,tiles,player,clock,host=null,observer=null,resizeObserver=null,lastSignature='';
function makeHero(){const g=new THREE.Group();add(g,new THREE.CylinderGeometry(.19,.3,.68,7),mat(0x3c8980),0,.43,0);add(g,new THREE.SphereGeometry(.18,9,7),mat(0xf0c9a7),0,.91,0);add(g,new THREE.SphereGeometry(.19,8,6),mat(0x30252c),0,1.02,-.03).scale.set(1,.6,1);scene.add(g);return g;}
function drawTile(parent,x,z,button){
 const label=button.title||button.getAttribute('aria-label')||'',icon=button.textContent.trim(),isPlayer=icon==='🧙';
 let color=0x456d43;
 if(label.includes('未知'))color=0x202b39;
 else if(label.includes('岩'))color=0x737a7d;
 else if(label.includes('林'))color=0x285c31;
 else if(label.includes('花'))color=0x9a6485;
 else if(label.includes('石'))color=0x4b78a7;
 else if(isPlayer)color=0x99703d;
 else if(icon==='🌲')color=0x356e39;
 const ground=add(parent,new THREE.BoxGeometry(.94,.2,.94),mat(color),x,-.12,z);
 if(label.includes('林')||icon==='🌲'){
  add(parent,new THREE.CylinderGeometry(.07,.1,.42,6),mat(0x68472c),x,.2,z);
  add(parent,new THREE.ConeGeometry(.42,.85,7),mat(0x2e7839),x,.82,z);
 }else if(label.includes('岩')||icon==='🪨'){
  const rock=add(parent,new THREE.DodecahedronGeometry(.32),mat(0x8b9192),x,.22,z);rock.scale.set(1,.75,.9);
 }else if(label.includes('花')||icon==='🌸'){
  for(let i=0;i<4;i++)add(parent,new THREE.SphereGeometry(.075,6,5),mat(i%2?0xffc0d9:0xffd76b),x+(i-1.5)*.1,.12,z,false);
 }else if(label.includes('石')||icon==='💎'){
  const crystal=add(parent,new THREE.OctahedronGeometry(.22),new THREE.MeshStandardMaterial({color:0x7ce4f4,metalness:.25,roughness:.2,emissive:0x164d65}),x,.24,z);crystal.rotation.y=.5;
 }
 if(isPlayer){const glow=add(parent,new THREE.TorusGeometry(.38,.035,7,24),new THREE.MeshBasicMaterial({color:0xffdc76}),x,.03,z);glow.rotation.x=Math.PI/2;}
}
function rebuild(grid){
 const buttons=[...grid.querySelectorAll('button[data-immortal-action="map-step"]')];
 const signature=buttons.map(b=>b.dataset.value+':'+b.textContent+':'+b.title).join('|');
 if(signature===lastSignature&&host===grid)return;lastSignature=signature;host=grid;
 if(tiles){scene.remove(tiles);tiles.traverse(o=>o.geometry?.dispose());}
 tiles=new THREE.Group();scene.add(tiles);
 let px=0,pz=0;
 for(const button of buttons){const [x,y]=(button.dataset.value||'0,0').split(',').map(Number);const wx=x-4,wz=y-4;drawTile(tiles,wx,wz,button);if(button.textContent.trim()==='🧙'){px=wx;pz=wz;}}
 if(player){player.position.set(px,.02,pz);}
}
function resize(){if(!host||!renderer)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function mount(grid){
 if(!grid||!renderer)return;
 if(renderer.domElement.parentElement!==grid){grid.appendChild(renderer.domElement);host=null;lastSignature='';}
 grid.classList.add('immortal-map-3d-ready');host=grid;
 rebuild(grid);resize();
 if(resizeObserver){resizeObserver.disconnect();}resizeObserver=new ResizeObserver(resize);resizeObserver.observe(grid);
}
function boot(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x213a36);scene.fog=new THREE.FogExp2(0x213a36,.025);
 camera=new THREE.PerspectiveCamera(42,1,.1,60);camera.position.set(0,10,11);camera.lookAt(0,0,0);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.domElement.id='immortal3DCanvas';
 Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'1',pointerEvents:'none'});
 renderer.shadowMap.enabled=true;scene.add(new THREE.HemisphereLight(0xe1f4ee,0x30412e,2));
 const sun=new THREE.DirectionalLight(0xffe5b5,2.7);sun.position.set(-4,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const floor=add(scene,new THREE.PlaneGeometry(30,30),mat(0x2a4935),0,-.28,0);floor.rotation.x=-Math.PI/2;
 player=makeHero();clock=new THREE.Clock();
 observer=new MutationObserver(()=>{const grid=document.getElementById('immortalMapGrid');if(grid&&document.getElementById('immortalStage')?.offsetParent!==null)mount(grid);});
 observer.observe(document.getElementById('immortalStage')||document.body,{childList:true,subtree:true});
 const grid=document.getElementById('immortalMapGrid');if(grid)mount(grid);
 function renderImmortalFrame(){requestAnimationFrame(renderImmortalFrame);if(player)player.position.y=.02+Math.sin(clock.getElapsedTime()*3)*.035;if(host&&host.isConnected&&host.offsetParent!==null)renderer.render(scene,camera);}
 renderImmortalFrame();
}
async function start(){try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');mat=createMaterialFactory(THREE);add=createMeshAdder(THREE);boot();}catch(e){console.warn('Immortal 3D map unavailable',e);}}
start();
