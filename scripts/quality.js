const GRAPHICS_MODE_KEY='wzhgame_graphics_mode_v1';
function getGraphicsMode(){
 try{return localStorage.getItem(GRAPHICS_MODE_KEY)==='2d'?'2d':'3d';}
 catch(_){return '3d';}
}
function setGraphicsMode(mode,announce=true){
 const next=mode==='2d'?'2d':'3d';
 document.body.classList.toggle('graphics-3d',next==='3d');
 document.documentElement.dataset.graphicsMode=next;
 const btn=document.getElementById('graphicsToggle');
 if(btn){
  btn.textContent=next==='3d'?'3D模式：开':'2D模式：开';
  btn.setAttribute('aria-pressed',String(next==='3d'));
  btn.setAttribute('aria-label',next==='3d'?'当前为3D显示模式，点击切换到2D':'当前为2D显示模式，点击切换到3D');
  btn.title=next==='3d'?'切换到2D显示':'切换到3D显示';
 }
 try{localStorage.setItem(GRAPHICS_MODE_KEY,next);}catch(_){}
 if(announce&&typeof toast==='function')toast(next==='3d'?'已切换到3D显示模式':'已切换到2D显示模式');
 window.renderWorld3D?.();
 return next;
}
function toggleGraphicsMode(){return setGraphicsMode(getGraphicsMode()==='3d'?'2d':'3d');}
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
 if(btn){btn.textContent='画质：'+QUALITY_LABELS[next];btn.setAttribute('aria-label','当前画质：'+QUALITY_LABELS[next]+'，点击切换');btn.title=next==='low'?'低画质：简化阴影与效果':next==='high'?'高画质：增强光影与天气效果':'极致画质：动态天气与精细光影';}
 try{localStorage.setItem(QUALITY_KEY,next);}catch(_){}
 if(announce&&typeof toast==='function')toast('画质已切换：'+QUALITY_LABELS[next]);
 window.renderWorld3D?.();
 return next;
}
function cycleQualityLevel(){const i=QUALITY_LEVELS.indexOf(getQualityLevel());return setQualityLevel(QUALITY_LEVELS[(i+1)%QUALITY_LEVELS.length]);}
function initQualityLevel(){const btn=document.getElementById('qualityToggle');if(btn){btn.onclick=cycleQualityLevel;btn.disabled=false;}setQualityLevel(getQualityLevel(),false);}
function initGraphicsMode(){const btn=document.getElementById('graphicsToggle');if(btn){btn.onclick=toggleGraphicsMode;btn.disabled=false;btn.style.pointerEvents='auto';}setGraphicsMode(getGraphicsMode(),false);}
initGraphicsMode();
initQualityLevel();
