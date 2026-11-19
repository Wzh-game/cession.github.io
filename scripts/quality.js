/* 2.0 混合画面策略：凡界世界地图与仙界探索地图保持真实 3D，其余界面固定 2D。 */
function initGraphicsMode(){
 const btn=document.getElementById('graphicsToggle');
 if(!btn)return;
 btn.textContent='地图3D：开';
 btn.disabled=false;
 btn.style.pointerEvents='none';
 btn.setAttribute('aria-pressed','true');
 btn.setAttribute('aria-label','世界地图与仙界地图使用3D，其余游戏界面使用2D');
 btn.title='地图使用3D；人物、战斗、召唤兽、装备和菜单保持2D';
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
