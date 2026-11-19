/* 2.0 混合画面策略：凡界世界地图与仙界探索地图保持真实 3D，其余界面固定 2D。 */
const MAP_3D_KEY='wzhgame_map_3d_v1';
function isMap3DEnabled(){
 try{return localStorage.getItem(MAP_3D_KEY)!=='0';}catch(_){return true;}
}
function setMapGraphicsMode(enabled,announce=true){
 const on=!!enabled;
 window.map3DEnabled=on;
 const canvas=document.getElementById('world3dCanvas');
 const legacy=document.getElementById('world');
 const legacyPlayer=document.getElementById('player');
 if(canvas)canvas.style.display=on?'block':'none';
 if(legacy)legacy.style.display=on?'none':'';
 if(legacyPlayer)legacyPlayer.style.display=on?'none':'';
 const btn=document.getElementById('graphicsToggle');
 if(btn){
  btn.disabled=false;
  btn.style.pointerEvents='auto';
  btn.textContent=on?'地图3D：开':'地图2D：开';
  btn.setAttribute('aria-pressed',String(on));
  btn.setAttribute('aria-label',on?'当前为3D地图，点击切换到2D地图':'当前为2D地图，点击切换到3D地图');
  btn.title=on?'3D地图：Three.js立体地形与3D人物':'2D地图：经典像素地图与2D人物';
 }
 try{localStorage.setItem(MAP_3D_KEY,on?'1':'0');}catch(_){}
 if(on){
  if(typeof window.renderWorld3D==='function')window.renderWorld3D();
 }else if(typeof window.renderWorld==='function'){
  window.renderWorld();
 }
 if(announce&&typeof toast==='function')toast(on?'已切换为3D地图':'已切换为2D地图');
 return on;
}
function toggleMapGraphicsMode(){return setMapGraphicsMode(!window.map3DEnabled);}
function initGraphicsMode(){
 const btn=document.getElementById('graphicsToggle');
 if(!btn)return;
 window.map3DEnabled=isMap3DEnabled();
 btn.disabled=false;
 btn.style.pointerEvents='auto';
 btn.onclick=()=>toggleMapGraphicsMode();
 setMapGraphicsMode(window.map3DEnabled,false);
}
const QUALITY_LEVELS=['low','high','extreme'];
const QUALITY_LABELS={low:'低',high:'高',extreme:'极致'};
const QUALITY_KEY='wzhgame_quality_level_v1';
function getQualityLevel(){try{const v=localStorage.getItem(QUALITY_KEY);return QUALITY_LEVELS.includes(v)?v:'high';}catch(_){return 'high';}}
function setQualityLevel(level,announce=true){
 const next=QUALITY_LEVELS.includes(level)?level:'high';
 document.body.classList.remove('quality-low','quality-high','quality-extreme');
 document.body.classList.add('quality-'+next);
 document.documentElement.dataset.qualityLevel=next;
 const btn=document.getElementById('qualityToggle');
 if(btn){btn.textContent='画质：'+QUALITY_LABELS[next];btn.setAttribute('aria-label','当前画质：'+QUALITY_LABELS[next]+'，点击切换');btn.title=next==='low'?'低画质：降低地图阴影与特效':next==='high'?'高画质：增强地图光影与天气':'极致画质：地图动态天气与精细光影';}
 try{localStorage.setItem(QUALITY_KEY,next);}catch(_){}
 if(announce&&typeof toast==='function')toast('地图画质已切换：'+QUALITY_LABELS[next]);
 window.renderWorld3D?.();
 return next;
}
function cycleQualityLevel(){const i=QUALITY_LEVELS.indexOf(getQualityLevel());return setQualityLevel(QUALITY_LEVELS[(i+1)%QUALITY_LEVELS.length]);}
function initQualityLevel(){const btn=document.getElementById('qualityToggle');if(btn){btn.onclick=cycleQualityLevel;btn.disabled=false;}setQualityLevel(getQualityLevel(),false);}
initGraphicsMode();
initQualityLevel();
