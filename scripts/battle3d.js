import {createMaterialFactory} from './three-shared.js';
let THREE,mat;
const stage=document.getElementById('stage');
let renderer,scene,camera,arena,unitLayer,rayClock,resizeObserver,qualityKey='';
function part(g,geo,m,x,y,z){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function makeBattleFigure(card,index,total){
 const enemy=!card.classList.contains('is-player')&&!card.classList.contains('is-pet');
 const pet=card.classList.contains('is-pet'),dead=card.classList.contains('dead');
 const base=enemy?0x9b3540:pet?0x4b9c5b:0x397eaa;
 const color=dead?0x55585b:base;
 const g=new THREE.Group();
 if(enemy){
  part(g,new THREE.IcosahedronGeometry(.48,1),mat(color),0,.62,0).scale.set(1,1.2,.85);
  part(g,new THREE.SphereGeometry(.2,10,8),mat(0x3b2028),0,1.12,0);
  for(const side of [-1,1]){const horn=part(g,new THREE.ConeGeometry(.12,.42,6),mat(0xd6b77b),side*.27,1.35,0);horn.rotation.z=-side*.35;part(g,new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:0xffe18b}),side*.1,1.17,.18);}
 }else if(pet){
  part(g,new THREE.SphereGeometry(.48,10,8),mat(color),0,.42,0).scale.set(1.25,.72,.8);
  part(g,new THREE.SphereGeometry(.27,10,8),mat(color),0,.82,.28);
  for(const side of [-1,1]){part(g,new THREE.CylinderGeometry(.07,.09,.38,6),mat(color),side*.27,.2,.08);part(g,new THREE.SphereGeometry(.045,6,5),new THREE.MeshBasicMaterial({color:0xffe7a3}),side*.1,.9,.5);}
 }else{
  part(g,new THREE.CylinderGeometry(.24,.38,.86,8),mat(color),0,.56,0);
  part(g,new THREE.SphereGeometry(.23,10,8),mat(0xf0c9a5),0,1.16,0);
  part(g,new THREE.SphereGeometry(.24,8,6),mat(0x30232a),0,1.3,-.04).scale.set(1,.6,1);
  part(g,new THREE.BoxGeometry(.42,.08,.42),mat(0xd8b45e),0,.76,0);
  const sword=part(g,new THREE.BoxGeometry(.045,.65,.07),mat(0xd6e4e9,.25,.65),.36,.76,0);sword.rotation.z=-.25;
 }
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,18),new THREE.MeshBasicMaterial({color:0x060b12,transparent:true,opacity:.35,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;g.add(shadow);
 const enemyIndex=Number(card.dataset.index||index);
 const x=(enemyIndex-(total-1)/2)*1.65;
 g.position.set(x,0,enemy? -2.1:2.1);
 g.userData={phase:index*.8,acting:card.classList.contains('acting'),dead};
 return g;
}
function syncBattleUnits(overlay){
 if(!unitLayer)return;
 while(unitLayer.children.length){const child=unitLayer.children.pop();child.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 const cards=[...overlay.querySelectorAll('.battle-unit')];
 const enemies=cards.filter(c=>!c.classList.contains('is-player')&&!c.classList.contains('is-pet'));
 const allies=cards.filter(c=>c.classList.contains('is-player')||c.classList.contains('is-pet'));
 enemies.forEach((c,i)=>{const g=makeBattleFigure(c,i,enemies.length);g.position.z=-2.25;unitLayer.add(g);});
 allies.forEach((c,i)=>{const g=makeBattleFigure(c,i,allies.length);g.position.z=2.25;unitLayer.add(g);});
}
function applyBattleQuality(){
 const q=document.documentElement.dataset.qualityLevel||'high';if(q===qualityKey)return;qualityKey=q;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,q==='low'?.8:q==='high'?1.2:1.65));
 renderer.shadowMap.enabled=q!=='low';renderer.shadowMap.type=q==='extreme'?THREE.VSMShadowMap:THREE.PCFSoftShadowMap;
 scene.fog.density=q==='extreme'?.04:q==='high'?.018:.008;
}
function setupOverlay(overlay){
 if(overlay.dataset.threeReady==='1')return;
 const arenaEl=overlay.querySelector('.battle-scene');if(!arenaEl)return;
 try{
  scene=new THREE.Scene();scene.background=new THREE.Color(0x231a35);scene.fog=new THREE.FogExp2(0x231a35,.02);
  camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(0,7.5,11);camera.lookAt(0,.4,0);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.domElement.id='battle3DCanvas';arenaEl.insertBefore(renderer.domElement,arenaEl.firstChild);
  Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});
  scene.add(new THREE.HemisphereLight(0xcddfff,0x34243e,1.8));
  const key=new THREE.DirectionalLight(0xffd69a,3);key.position.set(-4,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  arena=new THREE.Group();scene.add(arena);
  const floor=part(arena,new THREE.CylinderGeometry(5.4,5.4,.28,48),mat(0x51416b),0,-.18,0);floor.receiveShadow=true;
  const ring=part(arena,new THREE.TorusGeometry(4.6,.055,8,64),new THREE.MeshStandardMaterial({color:0xd3a85d,metalness:.55,roughness:.35}),0,.0,0);ring.rotation.x=Math.PI/2;
  const rune=part(arena,new THREE.TorusGeometry(3.2,.025,6,64),new THREE.MeshBasicMaterial({color:0x8f79c8,transparent:true,opacity:.65}),0,.01,0);rune.rotation.x=Math.PI/2;
  unitLayer=new THREE.Group();scene.add(unitLayer);
  const resize=()=>{const w=Math.max(1,arenaEl.clientWidth),h=Math.max(1,arenaEl.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(arenaEl);resize();
  overlay.dataset.threeReady='1';overlay.classList.add('battle3d-ready');
  const rows=new MutationObserver(()=>syncBattleUnits(overlay));
  rows.observe(overlay,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  syncBattleUnits(overlay);
  const clock=new THREE.Clock();
  function frame(){requestAnimationFrame(frame);if(!overlay.isConnected)return;const t=clock.getElapsedTime();unitLayer.children.forEach((g,i)=>{g.position.y=.035+Math.sin(t*2.8+g.userData.phase)*.045;g.rotation.y=Math.sin(t*.7+g.userData.phase)*.08;if(g.userData.acting)g.scale.setScalar(1.08);else g.scale.setScalar(1);});applyBattleQuality();if(overlay.classList.contains('show'))renderer.render(scene,camera);}
  frame();
 }catch(e){console.error('3D battle scene failed',e);renderer?.domElement.remove();}
}
async function start(){
 try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');mat=createMaterialFactory(THREE);}
 catch(e){console.warn('Battle 3D engine unavailable',e);return;}
 const observer=new MutationObserver(()=>{const overlay=document.getElementById('battleOverlay');if(overlay)setupOverlay(overlay);});
 observer.observe(stage,{childList:true,subtree:true});
 const existing=document.getElementById('battleOverlay');if(existing)setupOverlay(existing);
}
start();
