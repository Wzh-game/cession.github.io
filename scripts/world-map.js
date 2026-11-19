/* ============================================================
   梦幻西游 · Q版像素单机  —— 第 6 批
   世界生成 / 地形渲染 / 玩家移动 / 场景切换
   ============================================================ */

/* ================= 常量 ================= */
const TILE = 52;                 // 每个格子像素（放大地图显示）
const VIEW_PAD = 3;              // 视口外多渲染几格
const world = $('world');
const stage = $('stage');

/* ================= 场景定义（区域中心） ================= */
const SCENES = [
  { id:'changan',  name:'长安城',    cx:0,   cy:0,   radius:18, lv:1,  danger:0,
    biome:'town',    desc:'大唐国都，繁华似锦' },
  { id:'jiangnan', name:'江南野外',  cx:0,   cy:-55, radius:34, lv:5,  danger:3,
    biome:'plain',   desc:'鱼米之乡，草木葱茏' },
  { id:'datang',   name:'大唐境外',  cx:75,  cy:-40, radius:38, lv:11, danger:5,
    biome:'desert',  desc:'黄沙漫天，商旅难行' },
  { id:'beiju',    name:'北俱芦洲',  cx:-75, cy:-50, radius:42, lv:17, danger:7,
    biome:'snow',    desc:'冰雪覆盖的极北之地' },
  { id:'huoyan',   name:'火焰山',    cx:0,   cy:95,  radius:40, lv:26, danger:9,
    biome:'volcano', desc:'烈焰熊熊，寸草不生' },
  { id:'donghai',  name:'东海湾',    cx:105, cy:82,  radius:20, lv:34, danger:11,
    biome:'coast',   desc:'潮声不息，深海妖物出没', hidden:true },
  { id:'yougu',    name:'幽谷秘境',  cx:-108,cy:88,  radius:22, lv:42, danger:13,
    biome:'forest',  desc:'古木遮天，灵气与妖气交织', hidden:true },
];

/* ================= 地形缓存 ================= */
const tileCache = new Map();
const TILE_CACHE_LIMIT = 5000;

/* 判断某坐标属于哪个场景 */
function getSceneAt(x, y){
  let best = null, bestD = Infinity;
  for (const s of SCENES){
    const d = Math.hypot(x - s.cx, y - s.cy);
    if (d < s.radius && d < bestD){ best = s; bestD = d; }
  }
  return best;
}

/* 判断是否城镇（长安城） */
function isTown(x, y){
  const d = Math.hypot(x, y);
  return d < 10;
}

/* ================= 生成瓦片 ================= */
function getTile(x, y){
  const key = x + ',' + y;
  if (tileCache.has(key)) return tileCache.get(key);
  
  const scene = getSceneAt(x, y);
  const distOrigin = Math.hypot(x, y);
  let tile;
  
  if (isTown(x, y)){
    /* ---- 长安城 ---- */
    const dt = Math.hypot(x, y);
    if (dt < 4.5){
      // 中心广场
      tile = (Math.abs(x) < 1 && Math.abs(y) < 1) ? 'floor-center' : 'floor';
      // 中心石碑
      if (x === 0 && y === -2) tile = 'build-memorial';
      // 摊位
      if ((x === -3 && y === 1) || (x === 3 && y === 1)) tile = 'build-stall';
    } else if (dt < 8){
      // 内城街区
      const n = noise2(x*0.5, y*0.5, 11);
      if (n > 0.78) tile = 'build-house';
      else if (n > 0.7)  tile = 'build-shop';
      else if (n < 0.2)  tile = 'path';
      else tile = 'floor';
    } else {
      // 外城墙 + 城门
      if (dt < 10.5){
        const angle = Math.atan2(y, x);
        // 四座城门
        const gateAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];
        let isGate = false;
        for (const ga of gateAngles){
          if (Math.abs(angle - ga) < 0.18) { isGate = true; break; }
        }
        if (isGate) tile = 'path';
        else if (Math.abs(dt - 9.5) < 0.6) tile = 'wall';
        else tile = 'floor';
      } else {
        tile = 'grass';
      }
    }
  } else if (scene){
    /* ---- 野外场景 ---- */
    const biome = scene.biome;
    const n1 = noise2(x*0.18, y*0.18, 21);
    const n2 = noise2(x*0.32, y*0.32, 22);
    const n3 = noise2(x*0.09, y*0.09, 23);
    
    // 场景边缘淡出
    const d = Math.hypot(x - scene.cx, y - scene.cy);
    const edge = clamp(1 - (d - scene.radius*0.7) / (scene.radius*0.3), 0, 1);
    
    if (biome === 'plain'){
      if (n3 > 0.90) tile = 'water';
      else if (n1 > 0.80) tile = 'tree';
      else if (n1 < 0.12) tile = 'flower';
      else if (n2 > 0.88)  tile = 'rock';
      else tile = n2 > 0.5 ? 'grass' : 'grass2';
    } else if (biome === 'desert'){
      if (n1 > 0.90) tile = 'rock';
      else if (n1 < 0.05) tile = 'tree'; // 仙人掌用树代替
      else if (n3 > 0.94) tile = 'water';
      else tile = 'sand';
    } else if (biome === 'snow'){
      if (n1 > 0.86) tile = 'tree';
      else if (n2 > 0.91) tile = 'rock';
      else if (n3 > 0.95) tile = 'water';
      else tile = 'snow';
    } else if (biome === 'volcano'){
      if (n3 > 0.88) tile = 'lava';
      else if (n1 > 0.82) tile = 'rock';
      else tile = 'sand'; // 焦土
    } else if (biome === 'coast'){
      if (n3 > 0.82) tile = 'water';
      else if (n1 > 0.88) tile = 'rock';
      else if (n2 > 0.58) tile = 'sand';
      else tile = 'grass';
    } else if (biome === 'forest'){
      if (n1 > 0.68) tile = 'tree';
      else if (n2 > 0.91) tile = 'rock';
      else if (n3 > 0.93) tile = 'water';
      else tile = n2 > 0.45 ? 'grass2' : 'grass';
    }
    // 场景外圈淡出为草地
    if (edge < 1 && hash(x, y, 991) > 0.5) tile = 'grass';
  } else {
    /* ---- 荒野过渡区 ---- */
    const n1 = noise2(x*0.14, y*0.14, 31);
    const n2 = noise2(x*0.3, y*0.3, 32);
    if (n1 > 0.88) tile = 'tree';
    else if (n1 < 0.06) tile = 'water';
    else if (n2 > 0.88) tile = 'rock';
    else if (n2 < 0.2) tile = 'flower';
    else tile = (n2 > 0.5) ? 'grass' : 'grass2';
  }
  
  if(SCENES.some(scene=>x===Math.round(scene.cx)&&y===Math.round(scene.cy)+3))tile='teleport-stone';
  tileCache.set(key, tile);
  if (tileCache.size > TILE_CACHE_LIMIT){
    tileCache.delete(tileCache.keys().next().value);
  }
  return tile;
}

/* ================= 建筑/NPC装饰图标 ================= */
const TILE_ICON = {
  'teleport-stone': { icon:'🪨', name:'传送石碑', type:'npc', action:'openTeleportStone' },
  'build-memorial': { icon:'🏛️', name:'长安石碑', type:'npc',  action:'readMemorial' },
  'build-stall':    { icon:'🏪', name:'杂货摊',   type:'shop',  action:'openShop' },
  'build-house':    { icon:'🏠', name:'民宅',     type:'build', action:null },
  'build-shop':     { icon:'🏦', name:'钱庄',     type:'build', action:null },
};

/* 场景装饰图标（随机散落） */
function getDecor(x, y, tile){
  if (tile === 'tree')   return '🌲';
  if (tile === 'rock')   return '🪨';
  if (tile === 'flower') return '🌺';
  if (tile === 'water')  return '';
  if (tile === 'sand' && hash(x,y,88) > 0.9) return '🌵';
  if (tile === 'lava')   return '🔥';
  if (tile === 'snow' && hash(x,y,89) > 0.92) return '❄️';
  return '';
}

/* ================= 判断是否可走 ================= */
function isWalkable(x, y){
  // 严格执行：只有水面不可走，其余所有地形都可走。
  return getTile(x, y) !== 'water';
}

/* ================= 区域中心 Boss =================
   每个场景中心固定生成一只专属 Boss；点击可挑战，不影响普通怪物刷新。
*/
const SCENE_BOSSES = {
  changan:  { id:'boss_changan',  name:'长安镇城妖将', icon:'👹' },
  jiangnan: { id:'boss_jiangnan', name:'碧波树皇',     icon:'🌳' },
  datang:   { id:'boss_datang',   name:'黄沙魔君',     icon:'🐲' },
  beiju:    { id:'boss_beiju',    name:'极寒雪魔',     icon:'🐻‍❄️' },
  huoyan:   { id:'boss_huoyan',   name:'熔岩炎帝',     icon:'🔥' },
};
function cBossSkillIds(){return Object.keys(SCENE_BOSSES).filter(id=>{const s=SCENES.find(x=>x.id===id);return !!(s&&getSceneBossAt(Math.round(s.cx),Math.round(s.cy)).bossSkill);});}
function getSceneBossAt(x, y){
  for (const scene of SCENES){
    const boss = SCENE_BOSSES[scene.id];
    if (boss && x === Math.round(scene.cx) && y === Math.round(scene.cy)){
      const lv = scene.lv + 5;
      const hp = 280 + lv * 48;
      const bossSkills={
    boss_changan:{name:'镇城怒吼',power:1.2,type:'magic',target:'all',effect:'stun',desc:'对全体造成法术伤害并有概率震慑'},
    boss_jiangnan:{name:'古木汲灵',power:1.15,type:'magic',target:'single',effect:'drain',desc:'造成伤害并恢复自身气血'},
    boss_datang:{name:'黄沙吞天',power:1.3,type:'magic',target:'all',effect:'slow',desc:'沙暴席卷全体，削弱速度'},
    boss_beiju:{name:'极寒封脉',power:1.35,type:'magic',target:'single',effect:'stun',desc:'重击单体并施加定身'},
    boss_huoyan:{name:'焚天炎爆',power:1.4,type:'magic',target:'all',effect:'burn',desc:'对全体造成高额火焰伤害'}
  };
  return { ...boss, lv, hp, maxHp:hp, atk:20 + lv * 3, def:9 + lv * 2,
        spd:10 + lv, exp:140 + lv * 32, gold:100 + lv * 24, skills:[], bossSkill:bossSkills[boss.id], isBoss:true };
    }
  }
  return null;
}
function challengeSceneBoss(sceneId){
  if (battle && battle.active) return;
  const scene = SCENES.find(s => s.id === sceneId);
  if (!scene) return;
  const boss = getSceneBossAt(Math.round(scene.cx), Math.round(scene.cy));
  if (!boss) return;
  if (Math.hypot(P.x - scene.cx, P.y - scene.cy) > 3.5){
    toast('⚔️ 请先靠近区域中心的 Boss（3 格以内）');
    return;
  }
  if (P.hp <= 0){ toast('气血不足，无法挑战'); return; }
  addLog(`【Boss挑战】你向 ${boss.name} 发起挑战！`, 'warn');
  battlePrepare([boss]);
}

/* ================= 野外地图怪物 =================
   怪物直接显示在地图上，不占用碰撞格。
   使用固定哈希，让同一坐标在重绘后仍显示同一种怪物。
*/
function getMapMonster(x, y){
  if (isTown(x, y)) return null;
  if (getTile(x, y) === 'water') return null;

  // 降低野外普通怪物的地图显示密度
  const h = hash(x, y, 701);
  if (h < 0.94) return null;

  const scene = getSceneAt(x, y);
  let pool;
  if (!scene){
    pool = ['lang','shanzei','liukou'];
  } else if (scene.id === 'jiangnan'){
    pool = ['shuyao','chimang','linghu'];
  } else if (scene.id === 'datang'){
    pool = ['shamo','shadao','xieyan'];
  } else if (scene.id === 'beiju'){
    pool = ['xuelang','bingpo','xuenv'];
  } else if (scene.id === 'huoyan'){
    pool = ['huoya','rongyan','yanmo'];
  } else if (scene.id === 'donghai'){
    pool = ['haisha','chaoxi','jiaolong'];
  } else if (scene.id === 'yougu'){
    pool = ['youlu','guteng','guguai'];
  } else {
    pool = ['lang'];
  }

  const index = Math.floor(hash(x, y, 702) * pool.length) % pool.length;
  return MOBS[pool[index]] || null;
}

/* ================= 怪物地图图片 ================= */
function makeMonsterImage(mob){
 if(makeMonsterImage.cache.has(mob.id))return makeMonsterImage.cache.get(mob.id);
 const shapes={
 boss_changan:'<rect x="12" y="4" width="24" height="7" fill="#ffd65b"/><rect x="8" y="11" width="32" height="24" fill="#a52b32"/><rect x="5" y="15" width="7" height="18" fill="#e6b84c"/><rect x="36" y="15" width="7" height="18" fill="#e6b84c"/><rect x="14" y="17" width="7" height="5" fill="#fff0a0"/><rect x="27" y="17" width="7" height="5" fill="#fff0a0"/><rect x="17" y="27" width="14" height="4" fill="#260d13"/><rect x="17" y="35" width="5" height="9" fill="#54202a"/><rect x="27" y="35" width="5" height="9" fill="#54202a"/>',
 boss_jiangnan:'<rect x="19" y="3" width="10" height="9" fill="#a7ed72"/><rect x="8" y="9" width="32" height="22" fill="#347b3c"/><rect x="3" y="17" width="9" height="13" fill="#62b84b"/><rect x="36" y="17" width="9" height="13" fill="#62b84b"/><rect x="15" y="18" width="6" height="5" fill="#eaffae"/><rect x="28" y="18" width="6" height="5" fill="#eaffae"/><rect x="20" y="26" width="9" height="4" fill="#173d24"/><rect x="20" y="31" width="8" height="13" fill="#80502c"/>',
 boss_datang:'<rect x="18" y="3" width="12" height="8" fill="#f5c36b"/><rect x="10" y="11" width="28" height="26" fill="#a96329"/><rect x="4" y="18" width="8" height="15" fill="#d18b3d"/><rect x="36" y="18" width="8" height="15" fill="#d18b3d"/><rect x="15" y="17" width="7" height="6" fill="#fff0a0"/><rect x="27" y="17" width="7" height="6" fill="#fff0a0"/><rect x="18" y="28" width="13" height="5" fill="#432318"/>',
 boss_beiju:'<rect x="18" y="3" width="12" height="8" fill="#d9f8ff"/><rect x="9" y="11" width="30" height="27" fill="#477ca9"/><rect x="4" y="16" width="8" height="17" fill="#9deaff"/><rect x="36" y="16" width="8" height="17" fill="#9deaff"/><rect x="14" y="17" width="7" height="6" fill="#fff"/><rect x="28" y="17" width="7" height="6" fill="#fff"/><rect x="17" y="28" width="14" height="4" fill="#16395c"/>',
 boss_huoyan:'<rect x="18" y="2" width="12" height="10" fill="#ffdf54"/><rect x="10" y="11" width="28" height="27" fill="#b93620"/><rect x="4" y="18" width="8" height="14" fill="#ff7b2f"/><rect x="36" y="18" width="8" height="14" fill="#ff7b2f"/><rect x="15" y="17" width="7" height="6" fill="#fff1a0"/><rect x="27" y="17" width="7" height="6" fill="#fff1a0"/><rect x="18" y="28" width="13" height="5" fill="#48151a"/>'
 };
 const colors={lang:'#d7a36b',shanzei:'#c88a4a',liukou:'#9b5960',shuyao:'#7fbe58',chimang:'#e26b57',linghu:'#ffd18a',shamo:'#d6ad6b',shadao:'#d79b58',xieyan:'#ff7a45',xuelang:'#dcecff',bingpo:'#a9eaff',xuenv:'#e6edff',huoya:'#ffb13b',rongyan:'#ff6b3d',yanmo:'#ff4f4f'};
 const art=shapes[mob.id],svg='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges"><rect x="1" y="1" width="46" height="46" fill="#21150e" stroke="#090605" stroke-width="2"/>'+(art||'<rect x="8" y="8" width="32" height="32" fill="'+(colors[mob.id]||'#aaa')+'"/><text x="24" y="32" text-anchor="middle" font-size="22">'+(mob.icon||'👾')+'</text>')+'</svg>';
 const url='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);makeMonsterImage.cache.set(mob.id,url);return url;
}
makeMonsterImage.cache=new Map();

/* ================= 渲染世界 ================= */
let lastRenderX = null, lastRenderY = null;
let cameraX = 0, cameraY = 0;

function renderWorld(){
 if(typeof window.renderWorld3D==='function'){window.renderWorld3D();return;}
  const vw = stage.clientWidth;
  const vh = stage.clientHeight;
  if (!vw || !vh) return;
  
  // 玩家居中：以玩家为中心渲染
  const cols = Math.ceil(vw / TILE) + VIEW_PAD * 2;
  const rows = Math.ceil(vh / TILE) + VIEW_PAD * 2;
  const startX = P.x - Math.floor(cols / 2);
  const startY = P.y - Math.floor(rows / 2);
  
  // 关键修复：让“逻辑坐标”与“屏幕上的格子”严格对齐。
  // 之前格子直接从 0,0 排列，玩家虽然固定在屏幕正中央，但 P.x/P.y 对应的格子
  // 实际并不在玩家脚下，导致画面看着是草地，程序却判断目标格是水。
  const gridLeft = Math.round(vw / 2 - (P.x - startX + 0.5) * TILE);
  const gridTop  = Math.round(vh / 2 - (P.y - startY + 0.5) * TILE);
  
  const frag = document.createDocumentFragment();
  
  for (let dy = 0; dy < rows; dy++){
    for (let dx = 0; dx < cols; dx++){
      const wx = startX + dx;
      const wy = startY + dy;
      const tile = getTile(wx, wy);
      
      const el = document.createElement('div');
      el.className = 'tile t-' + tile;
      el.style.left = (gridLeft + dx * TILE) + 'px';
      el.style.top  = (gridTop + dy * TILE) + 'px';
      el.style.width  = TILE + 'px';
      el.style.height = TILE + 'px';
      
      // 建筑装饰图标
      if (TILE_ICON[tile]){
        const span = document.createElement('span');
        span.className = TILE_ICON[tile].type === 'npc' || TILE_ICON[tile].type === 'shop' ? 'npc' : 'build';
        span.textContent = TILE_ICON[tile].icon;
        el.appendChild(span);
        el.dataset.tileType = tile;
        el.dataset.wx = wx;
        el.dataset.wy = wy;
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onTileClick(wx, wy, tile);
        });
      } else {
        const deco = getDecor(wx, wy, tile);
        if (deco){
          const span = document.createElement('span');
          span.className = 'deco';
          span.textContent = deco;
          el.appendChild(span);
        }
      }

      // 区域中心 Boss 优先显示；其他位置继续显示原有普通怪物。
      const bossMob = getSceneBossAt(wx, wy);
      const mapMob = bossMob || (tile==='teleport-stone'?null:getMapMonster(wx, wy));
      if (mapMob && (bossMob || !(wx === P.x && wy === P.y))){
        const mobEl = document.createElement('div');
        mobEl.className = bossMob ? 'map-monster map-boss' : 'map-monster';
        mobEl.title = bossMob ? `👑 ${mapMob.name} Lv.${mapMob.lv} · 点击挑战` : `${mapMob.name} Lv.${mapMob.lv}`;
        if (bossMob){
          mobEl.style.pointerEvents = 'auto';
          mobEl.style.cursor = 'pointer';
          mobEl.setAttribute('role','button');
          mobEl.setAttribute('aria-label',`挑战${mapMob.name}`);
          mobEl.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const targetScene = SCENES.find(s => Math.round(s.cx) === wx && Math.round(s.cy) === wy);
            if (targetScene) challengeSceneBoss(targetScene.id);
          });
        }
        const img = document.createElement('img');
        img.className = 'map-monster-img';
        img.alt = mapMob.name;
        img.src = makeMonsterImage(mapMob);
        const name = document.createElement('span');
        name.className = 'map-monster-name';
        name.textContent = bossMob ? `👑 ${mapMob.name} Lv.${mapMob.lv}` : `${mapMob.name} Lv.${mapMob.lv}`;
        if (bossMob){
          name.style.color = '#ffe08a';
          name.style.borderColor = '#ffbd45';
          name.style.background = 'rgba(75,12,8,.94)';
        }
        mobEl.appendChild(img);
        mobEl.appendChild(name);
        el.appendChild(mobEl);
      }
      
      frag.appendChild(el);
    }
  }
  
  world.innerHTML = '';
  world.appendChild(frag);
  
  // 玩家角色
  renderPlayer(vw, vh);
  
  // 更新场景标题
  updateSceneTitle();
  
  lastRenderX = P.x;
  lastRenderY = P.y;
}

/* ================= 渲染玩家 ================= */
function renderPlayer(vw, vh){
  const px = vw/2 - 22;
  const py = vh/2 - 26;
  
  let pEl = $('player');
  if (!pEl){
    pEl = document.createElement('div');
    pEl.id = 'player';
    pEl.innerHTML = `
      <svg class="original-svg" viewBox="0 0 16 20" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
        <!-- 阴影由::after处理 -->
        <!-- 头发 -->
        <rect x="4" y="0" width="8" height="2" fill="#2a1620"/>
        <rect x="3" y="2" width="1" height="4" fill="#2a1620"/>
        <rect x="12" y="2" width="1" height="4" fill="#2a1620"/>
        <rect x="4" y="2" width="8" height="2" fill="#3a2630"/>
        <!-- 发带 -->
        <rect x="3" y="3" width="10" height="1" fill="#4a9a7a"/>
        <rect x="3" y="3" width="1" height="2" fill="#2a6a52"/>
        <rect x="12" y="3" width="1" height="2" fill="#2a6a52"/>
        <!-- 脸 -->
        <rect x="4" y="2" width="8" height="7" fill="#f5d8b8"/>
        <!-- 眼 -->
        <rect x="5" y="5" width="2" height="2" fill="#1a0e18"/>
        <rect x="9" y="5" width="2" height="2" fill="#1a0e18"/>
        <rect x="5" y="5" width="1" height="1" fill="#fff"/>
        <rect x="9" y="5" width="1" height="1" fill="#fff"/>
        <!-- 腮红 -->
        <rect x="4" y="7" width="1" height="1" fill="#f0a8a0"/>
        <rect x="11" y="7" width="1" height="1" fill="#f0a8a0"/>
        <!-- 嘴 -->
        <rect x="7" y="7" width="2" height="1" fill="#c87868"/>
        <!-- 脖子 -->
        <rect x="7" y="9" width="2" height="1" fill="#e8c0a0"/>
        <!-- 衣袍 -->
        <rect x="2" y="10" width="12" height="8" fill="#e8d8b0"/>
        <!-- 衣领 -->
        <rect x="6" y="10" width="4" height="1" fill="#4a9a7a"/>
        <rect x="5" y="11" width="1" height="1" fill="#4a9a7a"/>
        <rect x="10" y="11" width="1" height="1" fill="#4a9a7a"/>
        <!-- 外袖 -->
        <rect x="1" y="11" width="1" height="5" fill="#3a5a80"/>
        <rect x="14" y="11" width="1" height="5" fill="#3a5a80"/>
        <!-- 腰带 -->
        <rect x="3" y="15" width="10" height="1" fill="#3a5a80"/>
        <rect x="7" y="15" width="2" height="1" fill="#f0c860"/>
        <!-- 云纹 -->
        <rect x="3" y="12" width="2" height="1" fill="#c8a860"/>
        <rect x="11" y="12" width="2" height="1" fill="#c8a860"/>
        <!-- 腿 -->
        <rect x="4" y="18" width="3" height="2" fill="#3a5a80"/>
        <rect x="9" y="18" width="3" height="2" fill="#3a5a80"/>
        <!-- 靴 -->
        <rect x="3" y="19" width="4" height="1" fill="#2a1a10"/>
        <rect x="9" y="19" width="4" height="1" fill="#2a1a10"/>
      </svg>
      ${frogAvatarSvg()}
    `;
    stage.appendChild(pEl);
  }
  
  pEl.classList.toggle('avatar-frog', P.avatar === 'frog');
  pEl.style.left = px + 'px';
  pEl.style.top  = py + 'px';
}

/* ================= 更新场景标题 ================= */
function syncLocationState(){
  const scene = getSceneAt(P.x, P.y);
  if (isTown(P.x, P.y)){
    P.scene = '长安城';
    P.subScene = Math.hypot(P.x, P.y) < 4.5 ? '中心广场' : '长安城';
  } else if (scene){
    P.scene = scene.name;
    P.subScene = scene.desc;
  } else {
    P.scene = '荒野';
    P.subScene = '荒野过渡区';
  }
}

function updateSceneTitle(){
  syncLocationState();
  const scene = getSceneAt(P.x, P.y);
  const titleEl = $('sceneTitle');
  
  if (isTown(P.x, P.y)){
    const zone = Math.hypot(P.x, P.y) < 4.5 ? '中心广场' : '长安城';
    titleEl.innerHTML = `长安城 <b>·</b> <i>${zone}</i>`;
  } else if (scene){
    titleEl.innerHTML = `${scene.name} <b>·</b> <i>Lv.${scene.lv} 推荐</i>`;
  } else {
    titleEl.innerHTML = `荒野 <b>·</b> <i>无主之地</i>`;
  }
}

/* ================= 隐藏区域探索 ================= */
function canEnterRegion(scene){return true;}
function discoverRegion(scene){if(!scene || !scene.hidden || P.discoveredRegions.includes(scene.id))return false;P.discoveredRegions.push(scene.id);showBanner('发现 '+scene.name);addLog('【探索】发现隐藏区域：'+scene.name,'good');toast('🧭 新区域已解锁：'+scene.name);saveGame();return true;}
function unlockTeleportStone(scene){if(!scene||!SCENES.some(x=>x.id===scene.id))return false;if(!Array.isArray(P.teleportStones))P.teleportStones=[];if(P.teleportStones.includes(scene.id))return false;P.teleportStones.push(scene.id);saveGame();toast('🪨 已激活 '+scene.name+' 的传送石碑');addLog('【传送】激活 '+scene.name+' 传送石碑','good');return true;}
function findTeleportLanding(scene){if(!scene)return null;const candidates=[];for(let r=1;r<=6;r++){for(let dy=-r;dy<=r;dy++){for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=Math.round(scene.cx)+dx,y=Math.round(scene.cy)+dy;if(getSceneAt(x,y)!==scene||getTile(x,y)==='water'||getTile(x,y)==='teleport-stone'||getSceneBossAt(x,y))continue;candidates.push({x,y,d:Math.hypot(dx,dy)});}}if(candidates.length)break;}candidates.sort((a,b)=>a.d-b.d);return candidates[0]||null;}
function renderTeleportPanel(){const body=$('teleportBody');if(!body)return;body.innerHTML='<p style="color:#cbb58c;font-size:12px;margin:0 0 10px">所有区域均可直接免费传送，不受等级和探索进度限制。</p>'+SCENES.map(scene=>{const current=getSceneAt(P.x,P.y)===scene||scene.id==='changan'&&isTown(P.x,P.y);return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px;margin:6px 0;border:1px solid rgba(220,180,90,.5);border-radius:7px;background:rgba(90,60,25,.2)"><div><b style="color:#ffe3a0">🪨 '+scene.name+'</b><div style="font-size:10px;color:#a99a86;margin-top:3px">'+(current?'当前位置':'可直接传送 · 无等级限制')+'</div></div><button class="btn primary" data-teleport-scene="'+scene.id+'" '+(current?'disabled':'')+'>'+(current?'当前位置':'立即传送')+'</button></div>';}).join('');body.querySelectorAll('[data-teleport-scene]').forEach(btn=>btn.addEventListener('click',()=>teleportToScene(btn.dataset.teleportScene)));}
function openTeleportPanel(){if(battle&&battle.active){toast('战斗中无法传送');return;}renderTeleportPanel();openModal('modalTeleport');}
function teleportToScene(sceneId){if(battle&&battle.active){toast('战斗中无法传送');return false;}const scene=SCENES.find(x=>x.id===sceneId);if(!scene){toast('找不到该区域');return false;}const landing=findTeleportLanding(scene);if(!landing){toast('暂时找不到安全的传送落点');return false;}P.x=landing.x;P.y=landing.y;if(scene.hidden)discoverRegion(scene);unlockTeleportStone(scene);syncLocationState();renderWorld();updateHUD();saveGame();closeModal('modalTeleport');showBanner('传送至 '+scene.name);addLog('【传送】抵达 '+scene.name,'good');return true;}

/* ================= 移动系统 ================= */
let moveLock = false;

function tryMove(dx, dy){
  // 地图移动的唯一地形碰撞规则：水面。
  // 战斗界面显示时由战斗界面本身拦截输入；战斗结束后不再使用残留状态锁死地图。
  const battleOverlay = $('battleOverlay');
  if (battleOverlay && battleOverlay.classList.contains('show')) return;

  // 只允许四方向单格移动。
  dx = Math.sign(Number(dx) || 0);
  dy = Math.sign(Number(dy) || 0);
  if (dx === 0 && dy === 0) return;
  if (dx !== 0 && dy !== 0) return;

  const nx = P.x + dx;
  const ny = P.y + dy;
  const targetTile = getTile(nx, ny);
  const targetScene = getSceneAt(nx, ny);
  if(targetScene && targetScene.hidden && !canEnterRegion(targetScene)){toast('🔒 '+targetScene.name+' 尚未开放，需要达到 Lv.'+targetScene.lv+' 才能探索');return;}

  // 唯一碰撞规则：水。
  // grass / grass2 / flower / tree / rock / sand / snow / lava / 建筑等全部允许通行。
  if (targetTile === 'water'){
    toast('🌊 水面无法通行');
    return;
  }
  
  const prevScene = getSceneAt(P.x, P.y);
  
  P.x = nx;
  P.y = ny;
  P.steps++;
  if(targetScene && targetScene.hidden)discoverRegion(targetScene);
  
  // 行走动画
  const pEl = $('player');
  if (pEl){
    pEl.classList.add('walking');
    clearTimeout(pEl._walkTimer);
    pEl._walkTimer = setTimeout(() => pEl.classList.remove('walking'), 300);
  }
  
  renderWorld();
  updateHUD();
  
  // 检查场景切换
  const curScene = getSceneAt(P.x, P.y);
  if (curScene && curScene !== prevScene){
    unlockTeleportStone(curScene);
    showBanner(curScene.name);
    addLog(`【场景】进入 ${curScene.name}（Lv.${curScene.lv}）`, 'dim');
    toast(`📍 ${curScene.name} · ${curScene.desc}`);
  } else if (!curScene && prevScene){
    showBanner('荒野');
    addLog(`【场景】进入荒野地带`, 'dim');
  }
  
  // 步数事件
  onStep(nx, ny);
}

/* ================= 每一步的随机事件 ================= */
function onStep(x, y){
  const scene = getSceneAt(x, y);
  
  // 城镇内不遇敌
  if (isTown(x, y)) return;
  
  // 每 8 步自动回血回蓝
  if (P.steps % 8 === 0){
    if (P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + Math.floor(P.maxHp * 0.03));
    if (P.mp < P.maxMp) P.mp = Math.min(P.maxMp, P.mp + Math.floor(P.maxMp * 0.05));
    updateHUD();
  }
  
  // 遭遇战改为低频随机触发：至少间隔 14 步，每一步 14% 概率。
  if (P.steps - (Number(P.lastEncounterStep)||0) < 14) return;
  if (Math.random() >= 0.14) return;
  P.lastEncounterStep=P.steps;
  saveGame();
  startEncounter(scene);
}

/* ================= 触发遭遇战 ================= */
function rollEncounterMobCount(level,randomValue){const roll=Number.isFinite(randomValue)?randomValue:Math.random();return Number(level)>=30&&roll<0.06?3:Number(level)>=10&&roll<0.24?2:1;}
function startEncounter(scene){
  // 选择怪物
  let pool;
  if (!scene){
    pool = ['lang', 'shanzei', 'liukou'];
  } else if (scene.id === 'jiangnan'){
    pool = ['shuyao', 'chimang', 'linghu'];
  } else if (scene.id === 'datang'){
    pool = ['shamo', 'shadao', 'xieyan'];
  } else if (scene.id === 'beiju'){
    pool = ['xuelang', 'bingpo', 'xuenv'];
  } else if (scene.id === 'huoyan'){
    pool = ['huoya', 'rongyan', 'yanmo'];
  } else {
    pool = ['lang'];
  }
  
  // 默认单只怪物；中高等级区域才有较低概率出现双怪或三怪。
  const count = rollEncounterMobCount(P.lv);
  const mobs = [];
  for (let i = 0; i < count; i++){
    const id = pool[Math.floor(Math.random() * pool.length)];
    const mob = JSON.parse(JSON.stringify(MOBS[id]));
    // 等级浮动
    const lvOffset = Math.floor(Math.random() * 3) - 1;
    mob.lv = Math.max(1, mob.lv + lvOffset);
    // 属性缩放
    const scale = 1 + (lvOffset * 0.08);
    mob.hp = Math.floor(mob.hp * scale);
    mob.atk = Math.floor(mob.atk * scale);
    mob.maxHp = mob.hp;
    mobs.push(mob);
  }
  
  // 准备战斗
  if (typeof battlePrepare === 'function'){
    battlePrepare(mobs);
  } else {
    toast('⚔️ 遭遇敌人！');
  }
}

/* ================= 点击瓦片交互 ================= */
function onTileClick(wx, wy, tile){
  const info = TILE_ICON[tile];
  if (!info || !info.action) return;
  
  const dist = Math.hypot(wx - P.x, wy - P.y);
  if (dist > 2.2){
    toast('距离太远，请靠近一些');
    return;
  }
  
  // 走到附近
  if (info.action === 'readMemorial'){
    toast('📜 长安石碑：三界同心，共御妖魔');
    addLog('【石碑】三界同心，共御妖魔', 'dim');
  } else if (info.action === 'openShop'){
    openShopPanel();
  } else if(info.action==='openTeleportStone'){
    const scene=getSceneAt(wx,wy);
    if(scene){unlockTeleportStone(scene);openTeleportPanel();}
  }
}

/* ================= 方向键绑定：iPad/iPhone 触控 + 按住连续移动 ================= */
$('#dpad button[data-dir]').forEach(btn => {
  const dir = btn.dataset.dir;
  const delta = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];
  if (!delta) return;
  let repeatTimer = null, lastMoveAt = 0;
  const move = () => {
    const now = Date.now();
    if (now - lastMoveAt < 115) return;
    lastMoveAt = now;
    tryMove(delta[0], delta[1]);
  };
  const stop = () => {
    if (repeatTimer) clearInterval(repeatTimer);
    repeatTimer = null;
  };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    stop(); lastMoveAt = 0; move();
    repeatTimer = setInterval(move, 190);
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => btn.addEventListener(type, stop));
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
document.addEventListener('pointerup', () => {
  $('#dpad button[data-dir]').forEach(btn => {
    if (btn.releasePointerCapture && btn.hasPointerCapture?.()) {
      try { btn.releasePointerCapture([...[]][0]); } catch (_) {}
    }
  });
});


/* 中心按钮：原地休息 */
$('btnCenter').addEventListener('click', () => {
  if (typeof battle !== 'undefined' && battle && battle.active) return;
  const t = getTile(P.x, P.y);
  const inTown = isTown(P.x, P.y);
  const rate = inTown ? 0.08 : 0.04;
  P.hp = Math.min(P.maxHp, P.hp + Math.floor(P.maxHp * rate));
  P.mp = Math.min(P.maxMp, P.mp + Math.floor(P.maxMp * rate * 1.5));
  updateHUD();
  toast(inTown ? '🏠 客栈小憩，气血法力微复' : '· 原地调息');
});

/* 键盘移动 */
const keyMap = {
  'w':'up','W':'up','ArrowUp':'up',
  's':'down','S':'down','ArrowDown':'down',
  'a':'left','A':'left','ArrowLeft':'left',
  'd':'right','D':'right','ArrowRight':'right',
};
document.addEventListener('keydown', e => {
  // 弹窗打开时忽略
  if (document.querySelector('.modal.show')) return;
  if (typeof battle !== 'undefined' && battle && battle.active) return;
  const dir = keyMap[e.key];
  if (!dir) return;
  e.preventDefault();
  if (dir === 'up')    tryMove(0, -1);
  if (dir === 'down')  tryMove(0, 1);
  if (dir === 'left')  tryMove(-1, 0);
  if (dir === 'right') tryMove(1, 0);
});

/* 触摸滑动 */
let touchStartPt = null;
stage.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  touchStartPt = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
}, { passive:true });

stage.addEventListener('touchend', e => {
  if (!touchStartPt) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartPt.x;
  const dy = t.clientY - touchStartPt.y;
  const dist = Math.hypot(dx, dy);
  const dur = Date.now() - touchStartPt.t;
  touchStartPt = null;
  
  if (dist < 24 || dur > 800) return;
  if (typeof battle !== 'undefined' && battle && battle.active) return;
  if (document.querySelector('.modal.show')) return;
  
  if (Math.abs(dx) > Math.abs(dy)){
    tryMove(dx > 0 ? 1 : -1, 0);
  } else {
    tryMove(0, dy > 0 ? 1 : -1);
  }
}, { passive:true });

/* ================= 小地图（简化版） ================= */
$('miniMapBtn').addEventListener('click', () => {
  openMiniMap();
});
$('teleportBtn').addEventListener('click',openTeleportPanel);

function openMiniMap(){
  // 简单方式：在 toast 里显示当前场景位置
  const scene = getSceneAt(P.x, P.y);
  let text;
  if (isTown(P.x, P.y)){
    text = `🏰 长安城 · 坐标(${P.x},${P.y})`;
  } else if (scene){
    text = `${scene.biome==='plain'?'🌾':scene.biome==='desert'?'🏜️':scene.biome==='snow'?'❄️':scene.biome==='volcano'?'🌋':'🌲'} ${scene.name} · 坐标(${P.x},${P.y})`;
  } else {
    text = `🌿 荒野 · 坐标(${P.x},${P.y})`;
  }
  toast(text);
  addLog(`【位置】${text}`, 'dim');
}

/* ================= 场景重绘响应窗口变化 ================= */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (P.sect) renderWorld();
  }, 150);
});

/* ============================================================
   ↓↓↓ 第 6 批结束，第 7 批将接续：战斗系统 / 商店系统
   ============================================================ */

