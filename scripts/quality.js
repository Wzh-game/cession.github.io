const GRAPHICS_MODE_KEY='wzhgame_graphics_mode_v1';
function getGraphicsMode(){return '3d';}
function setGraphicsMode(mode,announce=true){
 document.body.classList.add('graphics-3d');document.documentElement.dataset.graphicsMode='3d';
 try{localStorage.setItem(GRAPHICS_MODE_KEY,'3d');}catch(_){}
 if(announce&&typeof toast==='function')toast('🌐 3D立体场景已启用');window.renderWorld3D?.();return '3d';
}
function toggleGraphicsMode(){return setGraphicsMode('3d');}
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
 if(btn){btn.textContent='画质：'+QUALITY_LABELS[next];btn.setAttribute('aria-label','当前画质：'+QUALITY_LABELS[next]+'，点击切换');btn.title=next==='low'?'低画质：晴朗天气、简化阴影与粗像素':next==='high'?'高画质：云层氛围、细腻阴影与清晰像素':'极致画质：动态暴雨、浓郁光影与精细像素';}
 try{localStorage.setItem(QUALITY_KEY,next);}catch(_){}
 if(announce&&typeof toast==='function')toast('画质已切换：'+QUALITY_LABELS[next]);
 return next;
}
function cycleQualityLevel(){const i=QUALITY_LEVELS.indexOf(getQualityLevel());return setQualityLevel(QUALITY_LEVELS[(i+1)%QUALITY_LEVELS.length]);}
function initQualityLevel(){const btn=document.getElementById('qualityToggle');if(btn){btn.onclick=cycleQualityLevel;btn.disabled=false;}setQualityLevel(getQualityLevel(),false);}

function initGraphicsMode(){const btn=document.getElementById('graphicsToggle');if(btn){btn.onclick=toggleGraphicsMode;btn.disabled=false;btn.style.pointerEvents='auto';}setGraphicsMode(getGraphicsMode(),false);}

initGraphicsMode();
initQualityLevel();
