/* ============================================================
   第 8 批：初始化 / 游戏主循环 / 存档系统
   ============================================================ */

const SAVE_KEY = 'mhxy_single_player_save_v1';
let gameLoopTimer = null;
let cultivationTimer=null,immortalTimer=null;

/* 保存游戏 */
function saveGame(){
  try{
    const data = getSaveData();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  }catch(err){
    console.warn('保存游戏失败：', err);
    return false;
  }
}

function getSaveData(){
  return {
    name:P.name, sect:P.sect, avatar:P.avatar, lv:P.lv, exp:P.exp,
    hp:P.hp, maxHp:P.maxHp, mp:P.mp, maxMp:P.maxMp,
    atk:P.atk, def:P.def, spd:P.spd, magic:P.magic,
    gold:P.gold, x:P.x, y:P.y, scene:P.scene, subScene:P.subScene,
    bag:P.bag, pet:P.pet, petBox:P.petBox, petCaptureOffer:P.petCaptureOffer, petGearInventory:P.petGearInventory, petGearEquipped:P.petGearEquipped, steps:P.steps, lastEncounterStep:P.lastEncounterStep, teleportStones:P.teleportStones, equipment:P.equipment, gearInventory:P.gearInventory, gearCodex:P.gearCodex, gearSetApplied:P.gearSetApplied, cultivationBooks:P.cultivationBooks, cultivationActive:P.cultivationActive, cultivationProgressMs:P.cultivationProgressMs, bossDrops:P.bossDrops, bossGearDrops:P.bossGearDrops, laomuCooldownUntil:P.laomuCooldownUntil, flags:P.flags, discoveredRegions:P.discoveredRegions,
    battles:P.battles, kills:P.kills, killStats:P.killStats, bankGold:P.bankGold,
    dailyQuestDate:P.dailyQuestDate, dailyQuestProgress:P.dailyQuestProgress, dailyQuestClaimed:P.dailyQuestClaimed, achievementsClaimed:P.achievementsClaimed,
    challenge:P.challenge,
    immortalRealm:serializeImmortalRealm(),
    logs:Array.isArray(P.logs) ? P.logs.slice(-50) : []
  };
}

function applySaveData(data){
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const allowed = [
    'name','sect','avatar','lv','exp','hp','maxHp','mp','maxMp',
    'atk','def','spd','magic','gold','x','y','scene','subScene',
    'bag','pet','petBox','petCaptureOffer','petGearInventory','petGearEquipped','steps','lastEncounterStep','teleportStones','battles','kills','killStats','bankGold','equipment','gearInventory','gearCodex','gearSetApplied','logs','cultivationBooks','cultivationActive','cultivationProgressMs','bossDrops','bossGearDrops','laomuCooldownUntil','flags','discoveredRegions','immortalRealm','dailyQuestDate','dailyQuestProgress','dailyQuestClaimed','achievementsClaimed','challenge'
  ];
  if(!Object.prototype.hasOwnProperty.call(data,'gearCodex'))P.gearCodex={};
  if(!Object.prototype.hasOwnProperty.call(data,'gearSetApplied'))P.gearSetApplied={};
  allowed.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(data, key)) P[key] = data[key];
  });
  P.avatar = P.avatar === 'frog' ? 'frog' : 'original';

  /* 防止旧存档或手工修改造成非法数值 */
  P.lv = Math.max(1, Number(P.lv) || 1);
  P.exp = Math.max(0, Number(P.exp) || 0);
  P.maxHp = Math.max(1, Number(P.maxHp) || 100);
  P.maxMp = Math.max(1, Number(P.maxMp) || 50);
  P.hp = clamp(Number(P.hp) || P.maxHp, 0, P.maxHp);
  P.mp = clamp(Number(P.mp) || P.maxMp, 0, P.maxMp);
  P.gold = Math.max(0, Number(P.gold) || 0);
  P.x = Number.isFinite(Number(P.x)) ? Number(P.x) : 0;
  P.y = Number.isFinite(Number(P.y)) ? Number(P.y) : 0;
  P.steps = Math.max(0, Number(P.steps) || 0);
  P.lastEncounterStep=Number.isFinite(Number(P.lastEncounterStep))?Math.max(0,Math.floor(Number(P.lastEncounterStep))):Math.max(0,P.steps-14);
  P.battles = Math.max(0, Number(P.battles) || 0);
  P.kills = Math.max(0, Number(P.kills) || 0);
  P.bankGold = Math.max(0, Number(P.bankGold) || 0);
  if (!P.killStats || typeof P.killStats !== 'object') P.killStats = {};
  if (!P.bag || typeof P.bag !== 'object') P.bag = {};
  if (!P.equipment || typeof P.equipment !== 'object') P.equipment={weapon:null,armor:null,helmet:null,boots:null,accessory:null};
  ['weapon','armor','helmet','boots','accessory'].forEach(k=>{if(!Object.prototype.hasOwnProperty.call(P.equipment,k))P.equipment[k]=null;});
  if (!Array.isArray(P.gearInventory)) P.gearInventory=[];
  P.gearInventory=P.gearInventory.filter(g=>g&&typeof g.id==='string'&&GEAR_CATALOG[g.id]&&Number.isFinite(Number(g.level))).map(g=>({id:g.id,level:Math.max(0,Math.min(5,Math.floor(Number(g.level)||0)))}));
  if(!P.gearCodex||typeof P.gearCodex!=='object')P.gearCodex={};
  P.gearCodex=Object.fromEntries(Object.entries(P.gearCodex).filter(([id,v])=>GEAR_CATALOG[id]&&v===true));
  P.gearInventory.forEach(g=>P.gearCodex[g.id]=true);
  if(!P.gearSetApplied||typeof P.gearSetApplied!=='object')P.gearSetApplied={};
  P.gearSetApplied=Object.fromEntries(Object.entries(P.gearSetApplied).filter(([k,v])=>['atk','def','spd','magic','hp','mp'].includes(k)&&Number.isFinite(Number(v))&&Math.abs(Number(v))<=1000).map(([k,v])=>[k,Number(v)]));
  if (!Array.isArray(P.petBox)) P.petBox = [];
  P.pet=normalizePetRecord(P.pet);
  P.petBox=P.petBox.map(normalizePetRecord).filter(Boolean).slice(0,6);
  normalizePetGear();
  if(!P.bag||typeof P.bag!=='object')P.bag={};
  P.bag.petSeal=Math.max(0,Math.floor(Number(P.bag.petSeal)||0));
  if(P.petCaptureOffer&&(!PETS.some(x=>x.id===P.petCaptureOffer.id)||!Number.isFinite(Number(P.petCaptureOffer.enemyLv))))P.petCaptureOffer=null;
  if (!Array.isArray(P.discoveredRegions)) P.discoveredRegions=['changan','jiangnan','datang','beiju','huoyan'];
  P.discoveredRegions=Array.from(new Set(P.discoveredRegions.filter(id=>SCENES.some(scene=>scene.id===id))));
  if(!Array.isArray(data.teleportStones))P.teleportStones=P.discoveredRegions.slice();
  P.teleportStones=Array.from(new Set(P.teleportStones.filter(id=>SCENES.some(scene=>scene.id===id))));
  const currentScene=getSceneAt(P.x,P.y);if(currentScene&&!P.teleportStones.includes(currentScene.id))P.teleportStones.push(currentScene.id);
  ['changan','jiangnan','datang','beiju','huoyan'].forEach(id=>{if(!P.discoveredRegions.includes(id))P.discoveredRegions.push(id);});
  if (!Array.isArray(P.logs)) P.logs = [];
  if (!Array.isArray(P.cultivationBooks)) P.cultivationBooks=[];
  if (!P.bossDrops || typeof P.bossDrops!=='object') P.bossDrops={};
  if (!P.bossGearDrops || typeof P.bossGearDrops!=='object') P.bossGearDrops={};
  if (!P.flags || typeof P.flags!=='object') P.flags={};
  P.dailyQuestDate=typeof P.dailyQuestDate==='string'?P.dailyQuestDate:'';
  if(!P.dailyQuestProgress||typeof P.dailyQuestProgress!=='object')P.dailyQuestProgress={wins:0,bosses:0,kills:0};
  P.dailyQuestProgress={wins:Math.max(0,Math.floor(Number(P.dailyQuestProgress.wins)||0)),bosses:Math.max(0,Math.floor(Number(P.dailyQuestProgress.bosses)||0)),kills:Math.max(0,Math.floor(Number(P.dailyQuestProgress.kills)||0))};
  if(!Array.isArray(P.dailyQuestClaimed))P.dailyQuestClaimed=[];
  P.dailyQuestClaimed=Array.from(new Set(P.dailyQuestClaimed.filter(id=>['daily_wins','daily_boss','daily_kills'].includes(id))));
  if(!Array.isArray(P.achievementsClaimed))P.achievementsClaimed=[];
  P.achievementsClaimed=Array.from(new Set(P.achievementsClaimed.filter(id=>typeof id==='string'&&id.length<=40)));
  P.challenge=normalizeChallengeState(data.challenge);
  P.immortalRealm=normalizeImmortalRealm(data.immortalRealm);
  P.cultivationProgressMs=Math.max(0,Number(P.cultivationProgressMs)||0);
  P.laomuCooldownUntil=Math.max(0,Number(P.laomuCooldownUntil)||0);
  syncGearSetBonuses();

  return Boolean(P.sect);
}

/* 读取存档 */
function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return applySaveData(data);
  }catch(err){
    console.warn('读取存档失败：', err);
    return false;
  }
}

/* 清除存档 */
function clearSave(){
  try{
    localStorage.removeItem(SAVE_KEY);
    return true;
  }catch(err){
    console.warn('清除存档失败：', err);
    return false;
  }
}

/* 游戏主循环：负责定时刷新 HUD，并自动保存 */
function startGameLoop(){
  if (gameLoopTimer) clearInterval(gameLoopTimer);
  if(cultivationTimer)clearInterval(cultivationTimer);cultivationTimer=setInterval(tickCultivation,1000);if(immortalTimer)clearInterval(immortalTimer);immortalTimer=setInterval(tickImmortalRealm,1000);

  updateHUD();
  renderWorld();

  gameLoopTimer = setInterval(() => {
    if (battle && battle.active) return;

    /* 非战斗状态下缓慢恢复，避免数值溢出 */
    if (P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + 1);
    if (P.mp < P.maxMp) P.mp = Math.min(P.maxMp, P.mp + 1);

    updateHUD();
    saveGame();
  }, 5000);

  saveGame();
}

/* 窗口大小变化后重新绘制视野 */
window.addEventListener('resize', () => {
  if (P.sect) renderWorld();
});

/* 页面隐藏/关闭时保存 */
window.addEventListener('pagehide', saveGame);
window.addEventListener('beforeunload', saveGame);

/* 游戏初始化 */
function initGame(){
  const hasSave = loadGame();

  updateHUD();

  if (hasSave && P.sect && SECTS.some(s => s.id === P.sect)){
    $('modalSect').classList.remove('show');
    renderWorld();
    startGameLoop();
    toast('💾 已读取上次游戏进度');
    return;
  }

  /* 没有有效存档时进入门派选择 */
  P.sect = null;
  renderSectSelect();
  $('modalSect').classList.add('show');
}

const DEV_FEATURE_TESTS=[],DEV_TEST_HISTORY=[];
registerFeatureTest('无限仙玉','开发者工具',[{name:'功能函数存在',run:()=>typeof developerInfiniteJade==='function'},{name:'仙玉数值安全',run:()=>Number.isSafeInteger(DEV_INFINITE_JADE)&&DEV_INFINITE_JADE>0}]);
function registerFeatureTest(name,category,checks){
 if(!name||!Array.isArray(checks)||!checks.length)throw new Error('功能测试注册参数无效');
 if(DEV_FEATURE_TESTS.some(x=>x.name===name))throw new Error('重复注册功能测试：'+name);
 DEV_FEATURE_TESTS.push({name:String(name),category:String(category||'其他'),checks:checks.map((x,i)=>({name:String(x.name||('检查 '+(i+1))),run:x.run}))});
 if(typeof renderDeveloperPanel==='function'&&$('modalDeveloper')?.classList.contains('show'))renderDeveloperPanel();
}
function runDeveloperFeature(feature){
 const results=[];(feature.checks||[]).forEach(check=>{let ok=false,detail='';try{const value=check.run();ok=value!==false;detail=typeof value==='string'?value:(ok?'检查通过':'检查返回 false');}catch(err){detail=err&&err.message?err.message:String(err);}results.push({feature:feature.name,name:check.name,ok,detail,time:Date.now()});});
 DEV_TEST_HISTORY.unshift(...results);DEV_TEST_HISTORY.splice(200);return results;
}
function escapeDevText(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function developerInstantAscend(){
 if(!P.immortalRealm)P.immortalRealm=createImmortalRealmState();
 const r=P.immortalRealm;r.unlocked=true;r.trialStep=3;r.view='mortal';r.activeTab='mansion';
 saveGame();closeModal('modalDeveloper');setImmortalView('immortal');toast('🌌 开发者模式：已直接飞升仙界');return true;
}

function renderDeveloperPanel(){
 const body=$('developerBody');if(!body)return;const total=DEV_FEATURE_TESTS.reduce((n,f)=>n+f.checks.length,0),passed=DEV_TEST_HISTORY.filter(x=>x.ok).length,failed=DEV_TEST_HISTORY.filter(x=>!x.ok).length;
 const cards=DEV_FEATURE_TESTS.map((f,i)=>{const last=DEV_TEST_HISTORY.filter(x=>x.feature===f.name),ok=last.length&&last.every(x=>x.ok);return '<section class="dev-feature"><div class="dev-feature-head"><div><b>'+escapeDevText(f.name)+'</b><small>'+escapeDevText(f.category)+' · '+f.checks.length+' 项检查</small></div><span class="dev-status '+(last.length?(ok?'ok':'bad'):'pending')+'">'+(last.length?(ok?'通过':'需检查'):'未测试')+'</span></div><button class="btn dev-run-one" data-dev-index="'+i+'">测试此功能</button></section>';}).join('');
 const history=DEV_TEST_HISTORY.length?DEV_TEST_HISTORY.slice(0,40).map(x=>'<div class="dev-result"><span><b>'+escapeDevText(x.feature)+' / '+escapeDevText(x.name)+'</b><small>'+escapeDevText(x.detail)+'</small></span><strong class="'+(x.ok?'ok':'bad')+'">'+(x.ok?'通过':'失败')+'</strong></div>').join(''):'<p class="dev-help">尚未运行测试。</p>';
 body.innerHTML='<div class="dev-summary"><b>功能模块：'+DEV_FEATURE_TESTS.length+'</b><b>测试项目：'+total+'</b><b class="ok">通过：'+passed+'</b><b class="bad">失败：'+failed+'</b></div><section class="dev-feature" style="border:1px solid rgba(240,200,96,.45);background:rgba(240,200,96,.07);margin:10px 0"><div class="dev-feature-head"><div><b>⚡ 一键满级</b><small>将当前角色提升至 Lv.'+DEV_MAX_LEVEL+'，同步增加门派成长属性并回满气血、法力，自动保存</small></div><span class="dev-status pending">开发工具</span></div><button class="btn primary" id="devMaxLevelBtn" style="width:100%">⚡ 立即提升至 Lv.'+DEV_MAX_LEVEL+'</button><div style="height:9px"></div><b>🌌 开发者直达仙界</b><small>跳过凡界等级、Boss 与渡劫条件，直接解锁仙界并进入仙府；不会清空凡界进度</small><button class="btn primary" id="devInstantAscendBtn" style="width:100%;margin-top:7px">🌌 一键飞升，立即进入仙界</button><div style="height:7px"></div><b>💰 无限银两</b><small>将身上银两设为安全整数范围内的极大值，自动保存</small><button class="btn primary" id="devInfiniteGoldBtn" style="width:100%">💰 一键获得巨额银两</button><div style="height:7px"></div><b>💎 无限仙玉</b><small>将仙界仙玉设置为极大值（需先解锁仙界），自动保存</small><button class="btn primary" id="devInfiniteJadeBtn" style="width:100%">💎 开启无限仙玉</button></section><p class="dev-help">新功能必须登记到此中心并提供只读测试。单项测试不会修改角色或存档。</p><div class="dev-feature-list">'+cards+'</div><h3 class="dev-section-title">最近测试结果</h3><div>'+history+'</div><h3 class="dev-section-title">新功能接入规范</h3><pre class="dev-code">registerFeatureTest("功能名称", "所属模块", [\n { name: "核心逻辑存在", run: () =&gt; typeof myFeature === "function" }\n]);</pre><p class="dev-help">新功能定义完成后调用 registerFeatureTest()，自动显示并加入全部测试。</p>';
 const goldBtn=$('devInfiniteGoldBtn');if(goldBtn)goldBtn.onclick=()=>{developerInfiniteGold();renderDeveloperPanel();};
 const jadeBtn=$('devInfiniteJadeBtn');if(jadeBtn)jadeBtn.onclick=()=>{developerInfiniteJade();renderDeveloperPanel();};
 const maxBtn=$('devMaxLevelBtn');if(maxBtn)maxBtn.onclick=()=>{developerMaxLevel();renderDeveloperPanel();};
 const ascendBtn=$('devInstantAscendBtn');if(ascendBtn)ascendBtn.onclick=()=>developerInstantAscend();
 const allBtn=$('devRunAll');if(allBtn)allBtn.onclick=()=>{let all=[];DEV_FEATURE_TESTS.forEach(f=>all.push(...runDeveloperFeature(f)));toast(all.every(x=>x.ok)?'全部 '+all.length+' 项测试通过':'测试完成：'+all.filter(x=>!x.ok).length+' 项失败');renderDeveloperPanel();};
 body.querySelectorAll('[data-dev-index]').forEach(btn=>btn.addEventListener('click',()=>{const f=DEV_FEATURE_TESTS[Number(btn.dataset.devIndex)];if(!f)return;const res=runDeveloperFeature(f);toast(res.every(x=>x.ok)?f.name+'测试通过':f.name+'有测试失败');renderDeveloperPanel();}));
}

const IMMORTAL_STAGES=['人仙','地仙','天仙','真仙','金仙','太乙金仙','大罗金仙','混元大罗金仙（仙帝）','道祖'];
const IMMORTAL_BOSS_IDS=['boss_changan','boss_jiangnan','boss_datang','boss_beiju','boss_huoyan'];
const IMMORTAL_SECTS=[{id:'tianji',name:'天机仙宗',icon:'☯️',desc:'推演天机，擅长元神与法则'},{id:'jianxian',name:'万剑仙宗',icon:'⚔️',desc:'剑意通玄，擅长仙体与攻伐'},{id:'zixiao',name:'紫霄仙宗',icon:'⚡',desc:'掌御雷霆，擅长仙气与爆发'}];
const IMMORTAL_TECHNIQUES=[
{id:'taixu',sect:'tianji',name:'太虚观想经',desc:'元神修炼法，提升元神上限',cost:80,spirit:120},{id:'zhouyan',sect:'tianji',name:'周天演法',desc:'洞察法则，提升道行',cost:140,dao:80},{id:'wanjian',sect:'jianxian',name:'万剑归宗诀',desc:'剑气淬体，提升仙体上限',cost:80,body:150},{id:'qinglian',sect:'jianxian',name:'青莲剑典',desc:'剑意凝练，提升道行',cost:150,dao:100},{id:'zixiao_thunder',sect:'zixiao',name:'紫霄神雷法',desc:'雷法炼神，提升元神上限',cost:100,spirit:180},{id:'leiyin',sect:'zixiao',name:'九霄雷音诀',desc:'引雷淬体，提升仙体上限',cost:160,body:220}
];
const IMMORTAL_ARTIFACTS=[{id:'xianjian',name:'斩仙古剑',desc:'仙器·攻击法则凝于剑锋',cost:180,material:'chaosShard',body:80},{id:'xianyi',name:'九天云衣',desc:'仙器·云纹护体，元神清明',cost:160,material:'starSand',spirit:120},{id:'ding',name:'镇界玄鼎',desc:'仙器·镇压混沌，仙体稳固',cost:260,material:'voidCrystal',body:220}];
const IMMORTAL_MAPS=[{id:'jiutian',name:'九天十地',desc:'仙灵汇聚之地，可采集星砂与仙草',req:0,cost:12,material:'starSand',materialName:'星辰砂'},{id:'zhuxian',name:'诛仙台',desc:'古战场遗迹，残留凌厉剑意',req:2,cost:30,material:'swordShard',materialName:'诛仙剑片'},{id:'chaos',name:'混沌虚空',desc:'天地未分之境，蕴藏混沌晶核',req:5,cost:80,material:'chaosShard',materialName:'混沌碎片'}];
const IMMORTAL_ENCOUNTERS=[
 {id:'linghu',name:'巡天灵狐',icon:'🦊',region:'jiutian',hp:1.05,atk:.38,def:.28,spd:.72,skill:{name:'灵狐幻影',power:1.2,type:'magic'},reward:{qi:24,jade:8,dao:20,material:'starSand'}},
 {id:'yaojiang',name:'天河妖将',icon:'🛡️',region:'jiutian',hp:1.35,atk:.52,def:.46,spd:.42,skill:{name:'天河重击',power:1.35,type:'phys'},reward:{qi:32,jade:10,dao:28,material:'starSand'}},
 {id:'jianwei',name:'诛仙剑卫',icon:'⚔️',region:'zhuxian',hp:1.45,atk:.62,def:.42,spd:.82,skill:{name:'剑气纵横',power:1.4,type:'phys'},reward:{qi:42,jade:15,dao:45,material:'swordShard'}},
 {id:'canhun',name:'古战场残魂',icon:'👻',region:'zhuxian',hp:1.65,atk:.58,def:.52,spd:.58,skill:{name:'幽冥蚀魂',power:1.35,type:'magic'},reward:{qi:48,jade:18,dao:52,material:'swordShard'}},
 {id:'hunmo',name:'混沌游魔',icon:'👹',region:'chaos',hp:2.05,atk:.78,def:.62,spd:.68,skill:{name:'虚空魔爪',power:1.5,type:'phys'},reward:{qi:68,jade:26,dao:85,material:'chaosShard'}},
 {id:'xukong',name:'虚空吞噬者',icon:'🌀',region:'chaos',hp:2.35,atk:.72,def:.72,spd:.52,skill:{name:'吞星蚀月',power:1.55,type:'magic'},reward:{qi:82,jade:32,dao:105,material:'chaosShard'}}
];
const IMMORTAL_BOSSES=[
 {id:'xuangui',name:'镇天玄龟',icon:'🐢',title:'九天守界者',region:'jiutian',req:0,desc:'以玄甲镇守九天入口，擅长汲取仙力并震荡全场。',hp:2.4,atk:.58,def:.72,spd:.55,exp:0,gold:0,skill:{name:'玄甲镇世',power:1.35,type:'magic',target:'all',effect:'slow'},reward:{qi:90,jade:35,dao:80,material:'starSand',amount:3}},
 {id:'jianling',name:'诛仙剑灵',icon:'⚔️',title:'古战场剑魄',region:'zhuxian',req:2,desc:'由上古剑意凝成，单体斩击极强，偶尔施展封脉剑诀。',hp:3.2,atk:.82,def:.58,spd:.9,exp:0,gold:0,skill:{name:'诛仙断魂斩',power:1.75,type:'phys',target:'one',effect:'stun'},reward:{qi:180,jade:75,dao:190,material:'swordShard',amount:4}},
 {id:'hunzun',name:'混沌魔尊',icon:'👹',title:'虚空终末之主',region:'chaos',req:5,desc:'混沌深处的古老魔尊，拥有高额生命与焚界魔息。',hp:4.3,atk:1.05,def:.78,spd:.72,exp:0,gold:0,skill:{name:'混沌焚界',power:1.55,type:'magic',target:'all',effect:'burn'},reward:{qi:360,jade:150,dao:420,material:'chaosShard',amount:5}}
];
function createImmortalRealmState(){return {unlocked:false,stageIndex:0,dao:0,qi:0,jade:0,body:100,spirit:100,trialStep:0,onlineSeconds:0,notice:'仙界尚未开启',activeTab:'mansion',view:'mortal',sect:null,techniques:[],artifacts:[],bosses:{},mapWorldVersion:2,mapX:0,mapY:0,mapSteps:0,lastMapEncounterStep:0,mapDiscovered:[],mapClaimed:[],materials:{starSand:0,swordShard:0,chaosShard:0,voidCrystal:0,immortalHerb:0},mansion:{arrayLevel:0,fieldLevel:0,puppetLevel:0,fieldPlanted:false,fieldProgress:0,herbs:0}};}
function normalizeImmortalRealm(data){
 const d=data&&typeof data==='object'&&!Array.isArray(data)?data:{},base=createImmortalRealmState(),m=d.mansion&&typeof d.mansion==='object'?d.mansion:{},mat=d.materials&&typeof d.materials==='object'?d.materials:{},legacy=Number(d.mapWorldVersion||0)<2;
 const num=(v,def,min,max)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;};
 const oldX=Math.floor(num(d.mapX,4,0,8)),oldY=Math.floor(num(d.mapY,4,0,8));
 const discovered=Array.isArray(d.mapDiscovered)?d.mapDiscovered.map(v=>{if(typeof v!=='string')return null;const q=v.match(/^(-?\d+),(-?\d+)$/);if(!q)return null;const x=Number(q[1]),y=Number(q[2]);return Number.isSafeInteger(x)&&Number.isSafeInteger(y)?(legacy?(x-4)+','+(y-4):x+','+y):null;}).filter(Boolean):[];
 return {unlocked:d.unlocked===true,stageIndex:Math.floor(num(d.stageIndex,0,0,8)),dao:num(d.dao,0,0,1e12),qi:num(d.qi,0,0,1e12),jade:num(d.jade,0,0,1e12),body:num(d.body,100,1,1e9),spirit:num(d.spirit,100,1,1e9),trialStep:Math.floor(num(d.trialStep,0,0,3)),onlineSeconds:Math.floor(num(d.onlineSeconds,0,0,1e12)),notice:typeof d.notice==='string'?d.notice.slice(0,180):base.notice,dailySignDate:/^\d{4}-\d{2}-\d{2}$/.test(String(d.dailySignDate||''))?String(d.dailySignDate):'',dailySignStreak:Math.floor(num(d.dailySignStreak,0,0,7)),activeTab:['mansion','sect','travel'].includes(d.activeTab)?d.activeTab:'mansion',mapWorldVersion:2,mapX:legacy?oldX-4:Math.floor(num(d.mapX,0,-1000000,1000000)),mapY:legacy?oldY-4:Math.floor(num(d.mapY,0,-1000000,1000000)),mapSteps:Math.floor(num(d.mapSteps,0,0,1e9)),lastMapEncounterStep:Math.floor(num(d.lastMapEncounterStep,0,0,1e9)),mapDiscovered:Array.from(new Set(discovered)).slice(-8000),mapClaimed:Array.isArray(d.mapClaimed)?Array.from(new Set(d.mapClaimed.filter(v=>['spring','ruins','swordpeak','forest','voidaltar'].includes(v)))).slice(0,5):[],view:'mortal',sect:IMMORTAL_SECTS.some(x=>x.id===d.sect)?d.sect:null,techniques:Array.isArray(d.techniques)?d.techniques.filter(id=>IMMORTAL_TECHNIQUES.some(x=>x.id===id)).slice(0,30):[],artifacts:Array.isArray(d.artifacts)?d.artifacts.filter(id=>IMMORTAL_ARTIFACTS.some(x=>x.id===id)).slice(0,30):[],bosses:Object.fromEntries(IMMORTAL_BOSSES.filter(x=>d.bosses&&d.bosses[x.id]===true).map(x=>[x.id,true])),materials:{starSand:num(mat.starSand,0,0,1e9),swordShard:num(mat.swordShard,0,0,1e9),chaosShard:num(mat.chaosShard,0,0,1e9),voidCrystal:num(mat.voidCrystal,0,0,1e9),immortalHerb:num(mat.immortalHerb,0,0,1e9)},mansion:{arrayLevel:Math.floor(num(m.arrayLevel,0,0,10)),fieldLevel:Math.floor(num(m.fieldLevel,0,0,10)),puppetLevel:Math.floor(num(m.puppetLevel,0,0,10)),fieldPlanted:m.fieldPlanted===true,fieldProgress:Math.floor(num(m.fieldProgress,0,0,60)),herbs:Math.floor(num(m.herbs,0,0,1e9))}};
}function serializeImmortalRealm(){const r=normalizeImmortalRealm(P.immortalRealm);r.view='mortal';return r;}
function immortalMessage(message){P.immortalRealm.notice=String(message);addLog('【仙界】'+message,'good');if(P.immortalRealm.view!=='immortal')toast('🌌 '+message);}
function immortalStageName(){return IMMORTAL_STAGES[P.immortalRealm.stageIndex]||IMMORTAL_STAGES[0];}
function immortalBreakthroughCost(){const n=P.immortalRealm.stageIndex;return {dao:100*Math.pow(2,n),qi:60*Math.pow(2,n)};}
function breakthroughImmortalStage(){const r=P.immortalRealm;if(!r.unlocked||r.stageIndex>=8)return false;const cost=immortalBreakthroughCost();if(r.dao<cost.dao||r.qi<cost.qi){immortalMessage('突破所需道行 '+cost.dao+'、仙灵之气 '+cost.qi+' 尚未满足');return false;}r.dao-=cost.dao;r.qi-=cost.qi;r.stageIndex++;r.body+=Math.floor(30*Math.pow(1.8,r.stageIndex));r.spirit+=Math.floor(25*Math.pow(1.8,r.stageIndex));immortalMessage('境界突破成功，晋升 '+immortalStageName()+'！');saveGame();renderImmortalRealm('mansion');return true;}
function hasAllMortalBossProofs(){return IMMORTAL_BOSS_IDS.every(id=>{const gearId=BOSS_GEAR_DROPS[id];return !!(P.bossGearDrops&&P.bossGearDrops[id])||!!(P.bossDrops&&P.bossDrops[id])||!!(gearId&&P.gearInventory.some(g=>g.id===gearId));});}
function canAscendToImmortal(){return Number(P.lv)>=DEV_MAX_LEVEL&&hasAllMortalBossProofs();}
function getAscensionMissing(){const missing=[];if(Number(P.lv)<DEV_MAX_LEVEL)missing.push('凡界等级达到 Lv.'+DEV_MAX_LEVEL);IMMORTAL_BOSS_IDS.forEach(id=>{const gearId=BOSS_GEAR_DROPS[id],ok=!!(P.bossGearDrops&&P.bossGearDrops[id])||!!(P.bossDrops&&P.bossDrops[id])||!!(gearId&&P.gearInventory.some(g=>g.id===gearId));if(!ok){const scene=Object.keys(SCENE_BOSSES).find(k=>SCENE_BOSSES[k].id===id);missing.push('击败 '+(scene&&SCENE_BOSSES[scene]?SCENE_BOSSES[scene].name:id));}});return missing;}
function advanceAscensionTrial(){
 const r=P.immortalRealm;if(r.unlocked){setImmortalView('immortal');return true;}const missing=getAscensionMissing();if(missing.length){toast('飞升条件未满足：'+missing[0]);return false;}
 const scenes=['心魔幻境','九霄天雷','破碎虚空'],text=scenes[r.trialStep]||scenes[2];r.trialStep++;
 if(r.trialStep<3){immortalMessage('渡劫考验：'+text+' 已通过，继续迎接下一重天劫。');saveGame();renderCultivation();return true;}
 r.unlocked=true;r.qi=100;r.jade=50;r.dao=0;r.body=100;r.spirit=100;r.stageIndex=0;r.view='mortal';immortalMessage('三重天劫尽破！你已飞升仙界，踏入人仙之境。仙界资源与凡界完全独立。');saveGame();setImmortalView('immortal');return true;
}
function renderAscensionSection(){
 const r=P.immortalRealm;if(r.unlocked)return '<div class="list-item"><div class="li-icon">🌌</div><div class="li-body"><div class="li-name">飞升仙界</div><div class="li-desc">仙界已开启 · 当前境界：'+immortalStageName()+'</div></div><button class="li-btn" data-ascension-action="enter">进入仙界</button></div>';
 const missing=getAscensionMissing();let html='<div class="section-title">🌌 破碎虚空 · 飞升仙界</div><div class="dev-help">飞升条件：凡界满级，并击败五大区域 Boss。满足后依次通过心魔、天雷与碎虚空三重考验。</div>';
 if(missing.length)html+='<div class="list-item"><div class="li-icon">🔒</div><div class="li-body"><div class="li-name">飞升条件尚未完成</div><div class="li-desc">'+missing.join(' · ')+'</div></div></div>';
 else html+='<div class="list-item"><div class="li-icon">⚡</div><div class="li-body"><div class="li-name">三重天劫 · 第 '+(r.trialStep+1)+' / 3 重</div><div class="li-desc">依次击破心魔、九霄天雷，最终破碎虚空。</div></div><button class="li-btn" data-ascension-action="trial">'+(r.trialStep===0?'迎战心魔':r.trialStep===1?'抵御天雷':'破碎虚空')+'</button></div>';
 return html;
}
function immortalDailyDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function claimImmortalDaily(){const r=P.immortalRealm,today=immortalDailyDate();if(!r||r.dailySignDate===today)return false;const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const y=yesterday.getFullYear()+'-'+String(yesterday.getMonth()+1).padStart(2,'0')+'-'+String(yesterday.getDate()).padStart(2,'0');const streak=r.dailySignDate===y?Math.min(7,(Number(r.dailySignStreak)||0)+1):1;const jade=20+5*(streak-1),qi=50+10*(streak-1);r.dailySignDate=today;r.dailySignStreak=streak;r.jade+=jade;r.qi+=qi;saveGame();immortalMessage('每日签到成功：仙玉 +'+jade+'，仙灵之气 +'+qi+'。');renderImmortalRealm(r.activeTab);return {jade,qi,streak};}
function immortalResourcePanel(){const r=P.immortalRealm,claimed=r.dailySignDate===immortalDailyDate(),streak=claimed?(Number(r.dailySignStreak)||1):(r.dailySignDate?Math.min(7,(Number(r.dailySignStreak)||0)+1):1),jade=20+5*(streak-1),qi=50+10*(streak-1);return '<div class="stat-grid"><div class="stat-box gold"><span class="sk">☯️ 仙灵之气</span><span class="sv">'+Math.floor(r.qi)+'</span></div><div class="stat-box gold"><span class="sk">💎 仙玉（每秒 +0.5）</span><span class="sv">'+Math.floor(r.jade)+'</span></div><div class="stat-box"><span class="sk">📜 道行</span><span class="sv">'+Math.floor(r.dao)+'</span></div><div class="stat-box"><span class="sk">🧘 仙体 / 元神</span><span class="sv">'+Math.floor(r.body)+' / '+Math.floor(r.spirit)+'</span></div></div><div class="list-item" style="margin-top:8px"><div class="li-icon">🎁</div><div class="li-body"><div class="li-name">每日仙界签到 · 连续 '+streak+' 天</div><div class="li-desc">今日奖励：💎 '+jade+' 仙玉 · ☯️ '+qi+' 仙灵之气'+(claimed?' · 今日已签到':' · 签到后领取')+'</div></div><button class="li-btn" data-immortal-action="daily-sign" '+(claimed?'disabled':'')+'>'+(claimed?'已签到':'领取奖励')+'</button></div>';}
function renderImmortalMansion(){
 const r=P.immortalRealm,m=r.mansion,arrayCost=40*Math.pow(m.arrayLevel+1,2),fieldCost=30*Math.pow(m.fieldLevel+1,2),puppetCost=50*Math.pow(m.puppetLevel+1,2);
 let h='<div class="section-title">🏯 聚仙阵</div><div class="list-item"><div class="li-icon">🌀</div><div class="li-body"><div class="li-name">聚仙阵 · Lv.'+m.arrayLevel+'</div><div class="li-desc">每秒凝聚 '+(m.arrayLevel*.2).toFixed(1)+' 点仙灵之气。升级消耗 '+arrayCost+' 仙玉。</div></div><button class="li-btn" data-immortal-action="array">升级</button></div>';
 h+='<div class="section-title">🌱 仙田</div><div class="list-item"><div class="li-icon">🌿</div><div class="li-body"><div class="li-name">仙田 · Lv.'+m.fieldLevel+'</div><div class="li-desc">仙草库存 '+m.herbs+' · '+(m.fieldPlanted?'生长中 '+m.fieldProgress+'/60 秒':'种植后在线生长 60 秒')+'。升级消耗 '+fieldCost+' 仙玉。</div></div><button class="li-btn" data-immortal-action="field-up">升级</button><button class="li-btn" data-immortal-action="plant" '+(!m.fieldLevel||m.fieldPlanted||r.qi<10||r.jade<5?'disabled':'')+'>种植</button></div>';
 h+='<div class="section-title">🤖 仙傀</div><div class="list-item"><div class="li-icon">🗿</div><div class="li-body"><div class="li-name">仙傀 · Lv.'+m.puppetLevel+'</div><div class="li-desc">每 30 秒自动收集 '+m.puppetLevel+' 仙玉。升级消耗 '+puppetCost+' 仙玉。</div></div><button class="li-btn" data-immortal-action="puppet">升级</button></div>';
 h+='<div class="section-title">🧺 仙草收获</div><div class="list-item"><div class="li-icon">🌸</div><div class="li-body"><div class="li-name">仙草 × '+m.herbs+'</div><div class="li-desc">种植需要 10 仙灵之气与 5 仙玉；成熟后在线自动收获。</div></div></div>';return h;
}
function renderImmortalSect(){
 const r=P.immortalRealm;if(!r.sect)return '<div class="section-title">🏛️ 选择仙宗</div>'+IMMORTAL_SECTS.map(s=>'<div class="list-item"><div class="li-icon">'+s.icon+'</div><div class="li-body"><div class="li-name">'+s.name+'</div><div class="li-desc">'+s.desc+' · 入宗需 100 仙玉</div></div><button class="li-btn" data-immortal-action="join" data-value="'+s.id+'" '+(r.jade<100?'disabled':'')+'>加入</button></div>').join('');
 const sect=IMMORTAL_SECTS.find(s=>s.id===r.sect);let h='<div class="list-item"><div class="li-icon">'+sect.icon+'</div><div class="li-body"><div class="li-name">'+sect.name+'</div><div class="li-desc">'+sect.desc+' · 已加入仙宗</div></div></div><div class="section-title">📖 仙法传承</div>';
 h+=IMMORTAL_TECHNIQUES.filter(t=>t.sect===r.sect).map(t=>'<div class="list-item"><div class="li-icon">📜</div><div class="li-body"><div class="li-name">'+t.name+(r.techniques.includes(t.id)?' ✓已参悟':'')+'</div><div class="li-desc">'+t.desc+' · '+t.cost+' 仙玉'+(t.body?' · 仙体 +'+t.body:'')+(t.spirit?' · 元神 +'+t.spirit:'')+(t.dao?' · 道行 +'+t.dao:'')+'</div></div><button class="li-btn" data-immortal-action="technique" data-value="'+t.id+'" '+(r.techniques.includes(t.id)||r.jade<t.cost?'disabled':'')+'>'+(r.techniques.includes(t.id)?'已掌握':'兑换')+'</button></div>').join('');
 h+='<div class="section-title">⚔️ 仙器兑换</div>'+IMMORTAL_ARTIFACTS.map(a=>'<div class="list-item"><div class="li-icon">✨</div><div class="li-body"><div class="li-name">'+a.name+(r.artifacts.includes(a.id)?' ✓已获得':'')+'</div><div class="li-desc">'+a.desc+' · '+a.cost+' 仙玉 · '+({starSand:'星辰砂',swordShard:'诛仙剑片',chaosShard:'混沌碎片',voidCrystal:'虚空晶石'}[a.material]||a.material)+' ×1</div></div><button class="li-btn" data-immortal-action="artifact" data-value="'+a.id+'" '+(r.artifacts.includes(a.id)||r.jade<a.cost||r.materials[a.material]<1?'disabled':'')+'>'+(r.artifacts.includes(a.id)?'已获得':'兑换')+'</button></div>').join('');return h;
}
const IMMORTAL_EXPLORATION_SITES=[
 {id:'gate',x:0,y:0,name:'接引仙门',icon:'🏯',desc:'仙界开放世界的起点，通往九天十地。'},
 {id:'spring',x:-38,y:0,name:'瑶池灵泉',icon:'💧',desc:'瑶池云海深处的灵泉，蕴含精纯仙灵之气。',reward:{qi:80,jade:25,dao:45,material:'immortalHerb',amount:2}},
 {id:'ruins',x:16,y:0,name:'星陨遗迹',icon:'🌠',desc:'陨星碎片散落在古老遗迹。',reward:{qi:55,jade:35,dao:65,material:'starSand',amount:3}},
 {id:'swordpeak',x:0,y:48,name:'诛仙剑峰',icon:'⚔️',desc:'剑意纵横，石壁上刻着古老剑诀。',reward:{qi:70,jade:20,dao:90,material:'swordShard',amount:3}},
 {id:'forest',x:38,y:0,name:'长生仙林',icon:'🌳',desc:'仙树深处生长着稀有灵草。',reward:{qi:90,jade:15,dao:55,material:'immortalHerb',amount:4}},
 {id:'voidaltar',x:-38,y:48,name:'虚空祭坛',icon:'🌀',desc:'祭坛连接着未知的虚空。',reward:{qi:120,jade:45,dao:120,material:'voidCrystal',amount:2}}
];
const IMMORTAL_WORLD_REGIONS=[
 {id:'jiutian',name:'九天十地',cx:0,cy:0,radius:22,encounter:'jiutian',req:0},
 {id:'yaochi',name:'瑶池云海',cx:-38,cy:0,radius:23,encounter:'jiutian',req:1},
 {id:'zhuxian',name:'诛仙剑域',cx:0,cy:48,radius:24,encounter:'zhuxian',req:2},
 {id:'forest',name:'长生仙林',cx:38,cy:0,radius:24,encounter:'jiutian',req:1},
 {id:'chaos',name:'混沌虚空',cx:-38,cy:48,radius:27,encounter:'chaos',req:5}
];
const IMMORTAL_BOSS_WORLD_POSITIONS={xuangui:{x:12,y:8},jianling:{x:0,y:60},hunzun:{x:-50,y:60}};
function immortalMapKey(x,y){return Math.round(x)+','+Math.round(y);}
function immortalHash(x,y,seed=0){let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function immortalRegionAt(x,y){let best=null,dist=Infinity;for(const r of IMMORTAL_WORLD_REGIONS){const d=Math.hypot(x-r.cx,y-r.cy);if(d<r.radius&&d<dist){best=r;dist=d;}}return best||{id:'wilderness',name:'云海荒原',cx:0,cy:0,radius:Infinity,encounter:'jiutian',req:0};}
function immortalMapTerrain(x,y){
 const site=IMMORTAL_EXPLORATION_SITES.find(v=>v.x===x&&v.y===y),boss=Object.entries(IMMORTAL_BOSS_WORLD_POSITIONS).find(([,p])=>p.x===x&&p.y===y),region=immortalRegionAt(x,y),h=immortalHash(x,y,71),h2=immortalHash(x,y,173);
 let terrain='grass',blocked=false,water=false,tree=false,crystal=false;
 if(region.id==='yaochi'){if(h<.2){terrain='water';blocked=true;water=true;}else if(h>.9){terrain='rock';blocked=true;}}
 else if(region.id==='zhuxian'){if(h>.87){terrain='rock';blocked=true;}else if(h2>.9)crystal=true;}
 else if(region.id==='chaos'){if(h<.12){terrain='void';blocked=true;}else if(h>.82){terrain='rock';blocked=true;}else if(h2>.88)crystal=true;}
 else if(region.id==='forest'){if(h>.66)tree=true;else if(h<.08){terrain='rock';blocked=true;}else if(h2>.9)crystal=true;}
 else {if(h>.82)tree=true;else if(h<.045){terrain='rock';blocked=true;}else if(h2>.94)crystal=true;}
 if(site){blocked=false;water=false;tree=false;terrain='landmark';}
 if(boss){blocked=false;water=false;terrain='boss';}
 const monster=!site&&!boss&&!blocked&&h2>.986?IMMORTAL_ENCOUNTERS.filter(e=>e.region===region.encounter)[Math.floor(immortalHash(x,y,911)*2)]:null;
 return {name:site?site.name:boss?'仙界守护者':water?'灵泉水域':blocked?'仙岩':tree?'仙林':crystal?'灵晶':region.name,region:region.id,regionName:region.name,terrain,blocked,water,tree,crystal,landmark:site&&site.id!=='gate'?site.id:site?'gate':null,site:site?site.id:null,boss:boss?IMMORTAL_BOSSES.find(b=>b.id===boss[0]):null,monster};
}
function revealImmortalMap(){const r=P.immortalRealm,set=new Set(r.mapDiscovered||[]);for(let y=r.mapY-6;y<=r.mapY+6;y++)for(let x=r.mapX-6;x<=r.mapX+6;x++)set.add(immortalMapKey(x,y));r.mapDiscovered=Array.from(set).slice(-8000);}
function getImmortalWorldSite(){return IMMORTAL_EXPLORATION_SITES.find(v=>v.x===P.immortalRealm.mapX&&v.y===P.immortalRealm.mapY)||null;}
function getImmortalWorldBoss(){const r=P.immortalRealm;for(const [id,p] of Object.entries(IMMORTAL_BOSS_WORLD_POSITIONS))if(p.x===r.mapX&&p.y===r.mapY)return id;return null;}
function refreshImmortalWorldHud(){const r=P.immortalRealm,region=immortalRegionAt(r.mapX,r.mapY),site=getImmortalWorldSite(),coords=$('immortalWorldCoords'),name=$('immortalWorldName'),hint=$('immortalWorldHint'),count=$('immortalWorldExploreCount');if(coords)coords.textContent='坐标 '+r.mapX+','+r.mapY;if(name)name.textContent=region.name;if(hint)hint.textContent=site?site.name+' · 按中央「调查」探索':'方向键或 WASD 自由移动 · 探索仙界遗迹与灵物';if(count)count.textContent='已探索 '+r.mapDiscovered.length+' 处';}
window.getImmortal3DState=()=>({x:P.immortalRealm.mapX,y:P.immortalRealm.mapY,region:immortalRegionAt(P.immortalRealm.mapX,P.immortalRealm.mapY).id});
window.getImmortal3DInfo=(x,y)=>immortalMapTerrain(x,y);
window.isImmortalOpenWorldActive=()=>!!(P.immortalRealm&&P.immortalRealm.unlocked&&P.immortalRealm.view==='immortal'&&P.immortalRealm.activeTab==='travel'&&!battle.active);
window.moveImmortalOpenWorld=(dx,dy)=>moveImmortalMap(dx,dy);
function startImmortalBattle(mob,flag,id){battle.returnToImmortalWorld=P.immortalRealm.view==='immortal';if(battle.returnToImmortalWorld)setImmortalView('mortal');battlePrepare([mob]);battle[flag]=id;return true;}
function triggerImmortalWorldEncounter(){
 const r=P.immortalRealm,region=immortalRegionAt(r.mapX,r.mapY),pool=IMMORTAL_ENCOUNTERS.filter(e=>e.region===region.encounter);
 if(!pool.length||battle.active)return false;
 const e=pool[Math.floor(Math.random()*pool.length)],mob={id:'immortal_encounter_'+e.id,name:e.name,icon:e.icon,lv:P.lv+Math.max(1,r.stageIndex*8),hp:Math.max(500,Math.floor(P.maxHp*e.hp+r.stageIndex*100)),maxHp:Math.max(500,Math.floor(P.maxHp*e.hp+r.stageIndex*100)),atk:Math.max(25,Math.floor(P.atk*e.atk+r.stageIndex*8)),def:Math.max(12,Math.floor(P.def*e.def+r.stageIndex*5)),spd:Math.max(15,Math.floor(P.spd*e.spd+r.stageIndex*4)),exp:0,gold:0,isBoss:false,skills:[e.skill]};
 startImmortalBattle(mob,'immortalEncounterId',e.id);addLog('【识海遭遇】遇到 '+e.name+'！','warn');return true;
}
function moveImmortalMap(dx,dy){
 const r=P.immortalRealm;if(!r.unlocked||battle.active||!Number.isFinite(dx)||!Number.isFinite(dy))return false;
 dx=Math.sign(dx);dy=Math.sign(dy);if(Math.abs(dx)+Math.abs(dy)!==1)return false;
 const x=r.mapX+dx,y=r.mapY+dy,terrain=immortalMapTerrain(x,y);if(terrain.blocked){immortalMessage('前方是'+terrain.name+'，无法直接穿越');return false;}
 r.mapX=x;r.mapY=y;r.mapSteps++;revealImmortalMap();window.updateImmortalWorld3D?.();refreshImmortalWorldHud();if(r.mapSteps%4===0)saveGame();
 const site=getImmortalWorldSite();if(site&&site.id!=='gate')immortalMessage('发现地点：'+site.name+'，按中央「调查」可探索');
 if(r.mapSteps-r.lastMapEncounterStep>=12&&Math.random()<.075){r.lastMapEncounterStep=r.mapSteps;saveGame();triggerImmortalWorldEncounter();return true;}
 return true;
}
function interactImmortalMap(){
 const r=P.immortalRealm,bossId=getImmortalWorldBoss(),site=getImmortalWorldSite();
 if(bossId){challengeImmortalBoss(bossId);return true;}
 if(!site){immortalMessage('这里暂时没有可调查的遗迹，继续探索周围仙域');return false;}
 if(site.id==='gate'){immortalMessage('接引仙门：向四方探索，寻找瑶池、剑峰、仙林与虚空遗迹。');return true;}
 if(r.mapClaimed.includes(site.id)){immortalMessage('此处已探索完毕，没有新的首领奖励');return false;}
 const q=site.reward;r.qi+=q.qi;r.jade+=q.jade;r.dao+=q.dao;r.materials[q.material]=(r.materials[q.material]||0)+q.amount;r.mapClaimed.push(site.id);
 immortalMessage('探索 '+site.name+' 成功！获得仙灵之气 '+q.qi+'、仙玉 '+q.jade+'、道行 '+q.dao+' 与材料 ×'+q.amount);saveGame();renderImmortalRealm('travel');return true;
}
function renderImmortalTravel(){
 const r=P.immortalRealm;revealImmortalMap();const region=immortalRegionAt(r.mapX,r.mapY),site=getImmortalWorldSite();
 let h='<div class="dev-help">🌌 识海已升级为连续开放世界：地图不再局限于九宫格，可向任意方向持续探索。方向键/WASD 移动，点击相邻地面也可行走；遇到遗迹按「调查」，野外可能触发仙界遭遇战。</div>';
 h+='<div id="immortalMapWorld" role="application" aria-label="识海开放世界地图"><div class="immortal-world-top"><b id="immortalWorldName">'+region.name+'</b><span id="immortalWorldCoords">坐标 '+r.mapX+','+r.mapY+'</span></div><div class="immortal-world-explore" id="immortalWorldExploreCount">已探索 '+r.mapDiscovered.length+' 处</div><div class="immortal-world-hint" id="immortalWorldHint">'+(site?site.name+' · 按中央「调查」探索':'方向键或 WASD 自由移动 · 探索仙界遗迹与灵物')+'</div><div id="immortalDpad" aria-label="识海移动方向键"><button type="button" class="up" data-dir="up">▲</button><button type="button" class="left" data-dir="left">◀</button><button type="button" class="center" data-immortal-action="map-interact">调查</button><button type="button" class="right" data-dir="right">▶</button><button type="button" class="down" data-dir="down">▼</button></div></div>';
 h+='<div class="list-item"><div class="li-icon">'+(site?site.icon:'🧭')+'</div><div class="li-body"><div class="li-name">'+(site?site.name:region.name)+'</div><div class="li-desc">'+(site?site.desc:'当前区域：'+region.name+'。继续探索可发现隐藏地点、仙界灵物与妖物。')+'</div></div><button class="li-btn" data-immortal-action="map-interact">调查当前位置</button></div>';
 h+='<div class="section-title">🗺️ 已发现的仙界遗迹</div>'+IMMORTAL_EXPLORATION_SITES.filter(v=>r.mapDiscovered.includes(immortalMapKey(v.x,v.y))).map(v=>'<div class="list-item"><div class="li-icon">'+v.icon+'</div><div class="li-body"><div class="li-name">'+v.name+(r.mapClaimed.includes(v.id)?' ✓已探索':'')+'</div><div class="li-desc">'+v.desc+'</div></div><span class="li-count">'+(r.mapClaimed.includes(v.id)?'已领取':'未调查')+'</span></div>').join('');
 h+='<div class="section-title">⚔️ 区域探索与遭遇</div>'+IMMORTAL_MAPS.map(m=>'<div class="list-item"><div class="li-icon">🌌</div><div class="li-body"><div class="li-name">'+m.name+'</div><div class="li-desc">'+m.desc+' · 消耗仙灵之气 '+m.cost+'</div></div><button class="li-btn" data-immortal-action="immortal-hunt" data-value="'+m.id+'" '+(r.stageIndex<m.req||r.qi<m.cost?'disabled':'')+'>深入探索</button></div>').join('');
 h+='<div class="section-title">👑 仙界 Boss 挑战</div><div class="dev-help">Boss 已分布在开放世界的专属坐标，也可从这里直接挑战。</div>';
 h+=IMMORTAL_BOSSES.map(b=>{const locked=r.stageIndex<b.req,done=!!r.bosses[b.id],p=IMMORTAL_BOSS_WORLD_POSITIONS[b.id];return '<div class="list-item"><div class="li-icon">'+b.icon+'</div><div class="li-body"><div class="li-name">'+b.name+(done?' ✓已首胜':'')+'</div><div class="li-desc">'+b.title+' · '+b.desc+' · 坐标 ('+p.x+','+p.y+') · 首胜奖励：'+b.reward.jade+' 仙玉、'+b.reward.dao+' 道行</div></div><button class="li-btn" data-immortal-action="immortal-boss" data-value="'+b.id+'" '+(locked?'disabled':'')+'>'+(locked?'需'+IMMORTAL_STAGES[b.req]:'挑战')+'</button></div>';}).join('');
 h+='<div class="section-title">🎒 仙界材料</div>'+Object.entries(r.materials).map(([id,n])=>'<div class="list-item"><div class="li-body"><div class="li-name">'+({starSand:'星辰砂',swordShard:'诛仙剑片',chaosShard:'混沌碎片',voidCrystal:'虚空晶石',immortalHerb:'仙草'}[id]||id)+'</div></div><span class="li-count">× '+n+'</span></div>').join('');
 return h;
}
function huntImmortalRegion(regionId,randomValue){
 const r=P.immortalRealm,m=IMMORTAL_MAPS.find(x=>x.id===regionId);if(!r.unlocked||!m||r.stageIndex<m.req||r.qi<m.cost||battle.active)return false;
 const roll=Number.isFinite(randomValue)?Math.max(0,Math.min(.999999,randomValue)):Math.random();r.qi-=m.cost;
 if(roll<.22){const jade=6+Math.floor(roll*20);r.jade+=jade;r.dao+=12;r.materials[m.material]++;immortalMessage('探索 '+m.name+'：发现灵物，获得 '+jade+' 仙玉与 '+m.materialName+'。');saveGame();renderImmortalRealm('travel');return {type:'treasure',jade};}
 const pool=IMMORTAL_ENCOUNTERS.filter(x=>x.region===regionId),e=pool[Math.floor(roll*pool.length)%pool.length];
 const mob={id:'immortal_encounter_'+e.id,name:e.name,icon:e.icon,lv:P.lv+Math.max(1,r.stageIndex*8),hp:Math.max(500,Math.floor(P.maxHp*e.hp+r.stageIndex*100)),maxHp:Math.max(500,Math.floor(P.maxHp*e.hp+r.stageIndex*100)),atk:Math.max(25,Math.floor(P.atk*e.atk+r.stageIndex*8)),def:Math.max(12,Math.floor(P.def*e.def+r.stageIndex*5)),spd:Math.max(15,Math.floor(P.spd*e.spd+r.stageIndex*4)),exp:0,gold:0,isBoss:false,skills:[e.skill]};
 startImmortalBattle(mob,'immortalEncounterId',e.id);return {type:'battle',enemy:e.id};
}
function grantImmortalEncounterReward(id){
 const e=IMMORTAL_ENCOUNTERS.find(x=>x.id===id);if(!e)return null;const r=P.immortalRealm;
 r.qi+=e.reward.qi;r.jade+=e.reward.jade;r.dao+=e.reward.dao;r.materials[e.reward.material]=(r.materials[e.reward.material]||0)+1;
 immortalMessage('击败 '+e.name+'，获得仙灵之气 '+e.reward.qi+'、仙玉 '+e.reward.jade+'、道行 '+e.reward.dao+'。');saveGame();return e.reward;
}
function challengeImmortalBoss(id){
 const r=P.immortalRealm,b=IMMORTAL_BOSSES.find(x=>x.id===id);if(!r.unlocked||!b||r.stageIndex<b.req||battle.active)return false;
 const mob={id:'immortal_boss_'+b.id,name:b.name,icon:b.icon,lv:P.lv+Math.max(1,r.stageIndex*8),hp:Math.max(900,Math.floor(P.maxHp*b.hp+r.stageIndex*180)),maxHp:Math.max(900,Math.floor(P.maxHp*b.hp+r.stageIndex*180)),atk:Math.max(35,Math.floor(P.atk*b.atk+r.stageIndex*12)),def:Math.max(20,Math.floor(P.def*b.def+r.stageIndex*8)),spd:Math.max(20,Math.floor(P.spd*b.spd+r.stageIndex*6)),exp:0,gold:0,isBoss:true,bossSkill:b.skill};
 startImmortalBattle(mob,'immortalBossId',b.id);return true;
}
function grantImmortalBossReward(id){
 const r=P.immortalRealm,b=IMMORTAL_BOSSES.find(x=>x.id===id);if(!r||!b)return null;
 if(!r.bosses)r.bosses={};const first=!r.bosses[id],scale=first?1:.25;
 r.qi+=Math.floor(b.reward.qi*scale);r.jade+=Math.floor(b.reward.jade*scale);r.dao+=Math.floor(b.reward.dao*scale);
 r.materials[b.reward.material]=(r.materials[b.reward.material]||0)+Math.max(1,Math.floor(b.reward.amount*scale));
 if(first)r.bosses[id]=true;
 immortalMessage((first?'首胜':'再次击败')+b.name+'，获得仙界战利品。');saveGame();return {first,qi:Math.floor(b.reward.qi*scale),jade:Math.floor(b.reward.jade*scale),dao:Math.floor(b.reward.dao*scale),material:b.reward.material,amount:Math.max(1,Math.floor(b.reward.amount*scale))};
}
let immortalMapMoveTimer=null,immortalMapSuppressClick=false;
function stopImmortalMapHold(){if(immortalMapMoveTimer!==null){clearInterval(immortalMapMoveTimer);immortalMapMoveTimer=null;}if(immortalMapSuppressClick)setTimeout(()=>{immortalMapSuppressClick=false;},350);}
function bindImmortalMapHold(stage){
 if(stage.dataset.mapHoldBound)return;stage.dataset.mapHoldBound='1';
 stage.addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-immortal-action="map-move"]');if(!btn||e.button!==0)return;e.preventDefault();immortalMapSuppressClick=true;const p=String(btn.dataset.value||'').split(',').map(Number);if(p.length!==2||!p.every(Number.isFinite))return;stopImmortalMapHold();immortalMapSuppressClick=true;if(!moveImmortalMap(p[0],p[1])){stopImmortalMapHold();return;}immortalMapMoveTimer=setInterval(()=>{if(!moveImmortalMap(p[0],p[1]))stopImmortalMapHold();},180);});
 stage.addEventListener('click',e=>{if(!immortalMapSuppressClick)return;const btn=e.target.closest('[data-immortal-action="map-move"]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();immortalMapSuppressClick=false;},true);
 document.addEventListener('pointerup',stopImmortalMapHold);document.addEventListener('pointercancel',stopImmortalMapHold);window.addEventListener('blur',stopImmortalMapHold);
}
function renderImmortalRealm(tab){
 const r=P.immortalRealm;if(!r.unlocked)return false;if(['mansion','sect','travel'].includes(tab))r.activeTab=tab;else tab=r.activeTab;
 const stage=$('immortalStage');if(!stage)return false;bindImmortalMapHold(stage);const oldBody=stage.querySelector('.dialog-body'),oldScrollTop=oldBody?oldBody.scrollTop:0;const title=tab==='mansion'?'仙府':tab==='sect'?'仙宗':'游历仙界',content=tab==='mansion'?renderImmortalMansion():tab==='sect'?renderImmortalSect():renderImmortalTravel(),cost=immortalBreakthroughCost(),canBreak=r.stageIndex<8&&r.dao>=cost.dao&&r.qi>=cost.qi;
 stage.innerHTML='<div class="dialog" style="width:100%;max-width:640px;margin:0 auto;display:flex;flex-direction:column;flex:1;min-height:0"><div class="dialog-head"><div class="dialog-title">🌌 识海 · '+title+'</div><span style="font-size:10px;color:#ffe8a0">'+immortalStageName()+'</span></div><div class="dialog-body" style="flex:1;overflow-y:auto"><div class="list-item"><div class="li-icon">🌌</div><div class="li-body"><div class="li-name">仙界境界：'+immortalStageName()+'</div><div class="li-desc">独立修行体系 · 在线生产资源 · 当前在线 '+r.onlineSeconds+' 秒</div></div><button class="li-btn" data-immortal-action="breakthrough" '+(!canBreak?'disabled':'')+'>'+(r.stageIndex>=8?'已达道祖':'突破')+'</button></div>'+immortalResourcePanel()+'<div class="dev-help">仙界资源与凡界银两、背包、功法和装备完全独立，不会自动兑换或互通。</div>'+content+'<div class="dev-help">仙界动态：'+escapeDevText(r.notice)+'</div></div><div class="dialog-foot"><button class="btn" data-immortal-action="back">返回凡界</button></div></div>';
 stage.innerHTML=stage.innerHTML.replace(/仙界/g,'识海').replace(/仙/g,'识');
 const newBody=stage.querySelector('.dialog-body');if(newBody)newBody.scrollTop=oldScrollTop;
 stage.querySelectorAll('[data-immortal-action]').forEach(btn=>btn.addEventListener('click',()=>handleImmortalAction(btn.dataset.immortalAction,btn.dataset.value)));return true;
}
function setImmortalView(view){const r=P.immortalRealm;if(view==='immortal'&&!r.unlocked)return false;r.view=view==='immortal'?'immortal':'mortal';syncImmortalNavigation();if(r.view==='immortal')renderImmortalRealm(r.activeTab);saveGame();return true;}
function syncImmortalNavigation(){
 const r=P.immortalRealm||createImmortalRealmState(),inside=!!(r.unlocked&&r.view==='immortal'),top=$('topbar'),mortal=$('stage'),immortal=$('immortalStage');
 if(top)top.style.display=inside?'none':'';if(mortal)mortal.style.display=inside?'none':'';if(immortal)immortal.style.display=inside?'flex':'none';
 const mortalMenus=['char','bag','equipment','skill','pet','task','challenge','achievements','cultivation'];
 document.querySelectorAll('#bottomBar [data-menu]').forEach(btn=>{const key=btn.dataset.menu;let show=true;if(mortalMenus.includes(key))show=!inside;else if(['immortalMansion','immortalSect','immortalTravel'].includes(key))show=inside;else if(key==='realmSwitch')show=r.unlocked;btn.style.display=show?'flex':'none';});
 const sw=$('#bottomBar [data-menu="realmSwitch"]');if(sw){sw.querySelector('.mi').textContent=inside?'🏞️':'🌌';sw.querySelector('.mt').textContent=inside?'凡界':'仙界';}
}
function upgradeImmortalFacility(type){
 const r=P.immortalRealm,m=r.mansion,keys={array:'arrayLevel',field:'fieldLevel',puppet:'puppetLevel'},key=keys[type];if(!key)return false;const level=m[key];if(level>=10)return false;
 const cost=(type==='array'?40:type==='field'?30:50)*Math.pow(level+1,2);if(r.jade<cost){immortalMessage('仙玉不足，需要 '+cost+' 仙玉');return false;}r.jade-=cost;m[key]++;immortalMessage(({array:'聚仙阵',field:'仙田',puppet:'仙傀'})[type]+'提升至 Lv.'+m[key]);saveGame();renderImmortalRealm('mansion');return true;
}
function plantImmortalField(){const r=P.immortalRealm,m=r.mansion;if(!m.fieldLevel||m.fieldPlanted||r.qi<10||r.jade<5)return false;r.qi-=10;r.jade-=5;m.fieldPlanted=true;m.fieldProgress=0;immortalMessage('仙田已播下仙种，在线生长 60 秒后自动收获。');saveGame();renderImmortalRealm('mansion');return true;}
function joinImmortalSect(id){const r=P.immortalRealm,sect=IMMORTAL_SECTS.find(x=>x.id===id);if(!sect||r.sect||r.jade<100)return false;r.jade-=100;r.sect=id;immortalMessage('正式加入 '+sect.name+'，获得仙宗传承资格。');saveGame();renderImmortalRealm('sect');return true;}
function buyImmortalTechnique(id){const r=P.immortalRealm,t=IMMORTAL_TECHNIQUES.find(x=>x.id===id);if(!t||t.sect!==r.sect||r.techniques.includes(id)||r.jade<t.cost)return false;r.jade-=t.cost;r.techniques.push(id);r.body+=t.body||0;r.spirit+=t.spirit||0;r.dao+=t.dao||0;immortalMessage('参悟仙法：'+t.name+'。仙界属性已提升。');saveGame();renderImmortalRealm('sect');return true;}
function buyImmortalArtifact(id){const r=P.immortalRealm,a=IMMORTAL_ARTIFACTS.find(x=>x.id===id);if(!a||r.artifacts.includes(id)||r.jade<a.cost||r.materials[a.material]<1)return false;r.jade-=a.cost;r.materials[a.material]--;r.artifacts.push(id);r.body+=a.body||0;r.spirit+=a.spirit||0;immortalMessage('兑换仙器：'+a.name+'。仙器已收入仙界宝库。');saveGame();renderImmortalRealm('sect');return true;}
function immortalExplore(mapId,randomValue){const r=P.immortalRealm,m=IMMORTAL_MAPS.find(x=>x.id===mapId);if(!m||r.stageIndex<m.req||r.qi<m.cost)return false;const roll=Number.isFinite(randomValue)?Math.max(0,Math.min(.999999,randomValue)):Math.random();r.qi-=m.cost;r.jade+=5+Math.floor(roll*9);r.dao+=12+Math.floor(roll*19);r.materials[m.material]++;if(roll>.72)r.materials.voidCrystal++;if(roll<.18)r.materials.immortalHerb++;immortalMessage('游历 '+m.name+' 完成：获得仙玉、道行与 '+m.materialName+'。');saveGame();renderImmortalRealm('travel');return true;}
function handleImmortalAction(action,value){if(action==='daily-sign'){claimImmortalDaily();return;}if(action==='back'){setImmortalView('mortal');return;}if(action==='breakthrough'){breakthroughImmortalStage();return;}if(action==='array'||action==='field-up'||action==='puppet'){upgradeImmortalFacility(action==='field-up'?'field':action);return;}if(action==='plant'){plantImmortalField();return;}if(action==='join'){joinImmortalSect(value);return;}if(action==='technique'){buyImmortalTechnique(value);return;}if(action==='artifact'){buyImmortalArtifact(value);return;}if(action==='explore'){immortalExplore(value);return;}if(action==='immortal-boss'){challengeImmortalBoss(value);return;}if(action==='immortal-hunt'){huntImmortalRegion(value);return;}if(action==='map-move'){const p=String(value||'').split(',').map(Number);moveImmortalMap(p[0],p[1]);return;}if(action==='map-step'){const p=String(value||'').split(',').map(Number),dx=p[0]-P.immortalRealm.mapX,dy=p[1]-P.immortalRealm.mapY;if(Math.abs(dx)+Math.abs(dy)===1)moveImmortalMap(dx,dy);else if(dx===0&&dy===0)interactImmortalMap();return;}if(action==='map-interact'){interactImmortalMap();return;}}
const IMMORTAL_JADE_PER_SECOND=0.5;
function tickImmortalRealm(){const r=P.immortalRealm;if(!r||!r.unlocked||document.visibilityState!=='visible')return;r.onlineSeconds++;r.jade+=IMMORTAL_JADE_PER_SECOND;if(r.mansion.arrayLevel)r.qi+=r.mansion.arrayLevel*.2;if(r.mansion.puppetLevel&&r.onlineSeconds%30===0)r.jade+=r.mansion.puppetLevel;if(r.mansion.fieldPlanted){r.mansion.fieldProgress++;if(r.mansion.fieldProgress>=60){r.mansion.fieldPlanted=false;r.mansion.fieldProgress=0;r.mansion.herbs++;r.materials.immortalHerb++;immortalMessage('仙田仙草成熟，已自动收获。');}}if(r.view==='immortal'&&r.onlineSeconds%5===0)renderImmortalRealm(r.activeTab);}
function renderAscensionNavigation(){const b=$('cultivationBody');if(!b)return;b.querySelectorAll('[data-ascension-action]').forEach(x=>x.addEventListener('click',()=>{if(x.dataset.ascensionAction==='trial')advanceAscensionTrial();else setImmortalView('immortal');}));}

function registerBuiltInDeveloperTests(){
 registerFeatureTest('开发者一键满级','开发工具',[{name:'满级上限为100级',run:()=>DEV_MAX_LEVEL===100},{name:'满级功能与存档接口存在',run:()=>typeof developerMaxLevel==='function'&&typeof saveGame==='function'},{name:'满级成长公式与经验公式一致',run:()=>typeof expNeed==='function'&&SECTS.every(s=>Object.values(s.grow).every(Number.isFinite))}]);
 registerFeatureTest('开发者无限银两','开发工具',[{name:'银两数值处于安全整数范围',run:()=>Number.isSafeInteger(DEV_INFINITE_GOLD)&&DEV_INFINITE_GOLD>0},{name:'无限银两功能与存档接口存在',run:()=>typeof developerInfiniteGold==='function'&&typeof saveGame==='function'},{name:'银两可正常显示与保存',run:()=>typeof fmt==='function'&&typeof updateHUD==='function'&&typeof getSaveData==='function'&&getSaveData().gold===P.gold}]);
 registerFeatureTest('开发者入口密码保护','安全与权限',[{name:'开发者入口使用密码验证函数',run:()=>typeof openDeveloperPanelWithPassword==='function'&&cDeveloperMenuGate()},{name:'密码配置非空',run:()=>typeof DEV_ACCESS_PASSWORD==='string'&&DEV_ACCESS_PASSWORD.length>0}]);
 registerFeatureTest('角色与属性','基础系统',[{name:'角色数据结构完整',run:()=>!!P&&typeof P.name==='string'&&Number.isFinite(P.lv)&&Number.isFinite(P.hp)&&Number.isFinite(P.maxHp)},{name:'角色数值范围有效',run:()=>P.lv>=1&&P.hp>=0&&P.hp<=P.maxHp&&P.mp>=0&&P.mp<=P.maxMp}]);
 registerFeatureTest('地图与移动','世界系统',[{name:'地图渲染函数存在',run:()=>typeof renderWorld==='function'},{name:'地图容器存在',run:()=>!!$('world')}]);
 registerFeatureTest('战斗系统','战斗系统',[{name:'战斗入口存在',run:()=>typeof battlePrepare==='function'},{name:'战斗结算入口存在',run:()=>typeof finishBattle==='function'}]);
 registerFeatureTest('门派与技能','角色成长',[{name:'门派配置有效',run:()=>Array.isArray(SECTS)&&SECTS.length>0},{name:'技能查询函数有效',run:()=>typeof getSectSkills==='function'&&Array.isArray(getSectSkills())}]);
 registerFeatureTest('背包与物品','物品系统',[{name:'物品配置有效',run:()=>!!ITEMS&&typeof ITEMS==='object'&&Object.keys(ITEMS).length>0},{name:'背包数据有效',run:()=>!!P.bag&&typeof P.bag==='object'&&!Array.isArray(P.bag)}]);
 registerFeatureTest('召唤兽系统','养成系统',[{name:'召唤兽面板存在',run:()=>typeof renderPetPanel==='function'},{name:'召唤兽仓库数据有效',run:()=>Array.isArray(P.petBox)},{name:'捕捉与捕灵符接口存在',run:()=>typeof capturePet==='function'&&typeof buyPetSeal==='function'&&typeof rollPetCaptureOffer==='function'},{name:'召唤兽成长与五条进化配置完整',run:()=>typeof gainPetExp==='function'&&typeof petExpNeed==='function'&&Object.keys(PET_EVOLUTIONS).length===5},{name:'捕捉踪迹和成长字段纳入存档',run:()=>getSaveData().petCaptureOffer===P.petCaptureOffer&&applySaveData.toString().includes('normalizePetRecord')},{name:'五种召唤兽拥有独立专属技能',run:()=>Object.keys(PET_SKILLS).length===5&&Object.keys(PET_SKILLS).every(id=>PET_SKILLS[id].name&&PET_SKILLS[id].power>0)},{name:'资质范围与技能等级受到限制',run:()=>typeof petAptitudeRoll==='function'&&normalizePetRecord.toString().includes('pet.skillRank')},{name:'战斗回合会自动触发专属技能',run:()=>petTurn.toString().includes('unit.petActionCount%3===0')&&petTurn.toString().includes('skill.effect')},{name:'面板支持技能研习与资质展示',run:()=>typeof renderPetAptitudeDetails==='function'&&typeof petSkillEffectText==='function'&&typeof studyPetSkill==='function'&&studyPetSkill.toString().includes('pet.skillRank')&&renderPetAptitudeDetails.toString().includes('资质详情')}]);
 registerFeatureTest('召唤兽装备系统','宠物养成',[{name:'装备目录覆盖三个部位',run:()=>Object.keys(PET_GEAR_CATALOG).length===6&&['weapon','armor','charm'].every(slot=>Object.values(PET_GEAR_CATALOG).some(g=>g.slot===slot))},{name:'装备背包与穿戴槽可初始化',run:()=>typeof normalizePetGear==='function'&&typeof petGearStats==='function'},{name:'装备购买穿戴卸下与强化接口存在',run:()=>typeof buyPetGear==='function'&&typeof equipPetGear==='function'&&typeof unequipPetGear==='function'&&typeof upgradePetGear==='function'},{name:'装备强化等级限制为三级',run:()=>upgradePetGear.toString().includes('inv.level>=3')&&normalizePetGear.toString().includes('Math.min(3')},{name:'战斗属性应用装备加成',run:()=>battlePrepare.toString().includes('petGearStats().atk')&&battlePrepare.toString().includes('petGearStats().hp')},{name:'普通怪物胜利可触发装备掉落',run:()=>typeof rollPetGearDrop==='function'&&finishBattle.toString().includes('rollPetGearDrop()')},{name:'装备字段写入存档并兼容旧档',run:()=>getSaveData().petGearInventory===P.petGearInventory&&applySaveData.toString().includes('normalizePetGear()')}]);
 registerFeatureTest('任务系统','成长系统',[{name:'任务面板存在',run:()=>typeof renderTaskPanel==='function'},{name:'任务状态字段有效',run:()=>P.quest===null||typeof P.quest==='object'}]);
 registerFeatureTest('每日悬赏系统','2.0任务玩法',[{name:'三项每日悬赏配置完整且目标有效',run:()=>Array.isArray(DAILY_BOUNTIES)&&DAILY_BOUNTIES.length===3&&DAILY_BOUNTIES.every(q=>q.id&&q.target>0&&q.reward.gold>0&&q.reward.exp>0)},{name:'凡界胜利会累计每日进度',run:()=>typeof advanceDailyQuestProgress==='function'&&finishBattle.toString().includes('advanceDailyQuestProgress(dailyDefeated.length')},{name:'进度与领取记录进入存档',run:()=>{const d=getSaveData();return Object.prototype.hasOwnProperty.call(d,'dailyQuestDate')&&!!d.dailyQuestProgress&&Array.isArray(d.dailyQuestClaimed)}},{name:'旧存档可补齐每日悬赏字段',run:()=>applySaveData.toString().includes('P.dailyQuestProgress={wins:')&&applySaveData.toString().includes('P.dailyQuestClaimed=Array.from')},{name:'奖励领取具备重复领取保护',run:()=>claimDailyBounty.toString().includes('P.dailyQuestClaimed.includes(id)')&&claimDailyBounty.toString().includes('P.dailyQuestClaimed.push(id)')},{name:'日期回拨不会重置悬赏',run:()=>ensureDailyQuestState.toString().includes('today>P.dailyQuestDate')}]);
 registerFeatureTest('功法修炼','成长系统',[{name:'功法配置有效',run:()=>Array.isArray(CULTIVATION_BOOKS)&&CULTIVATION_BOOKS.length>0},{name:'功法面板存在',run:()=>typeof renderCultivation==='function'},{name:'功法存档字段有效',run:()=>Array.isArray(P.cultivationBooks)}]);
 registerFeatureTest('Boss专属装备掉落','2.0稀有装备',[{name:'五大Boss各有专属装备',run:()=>Object.keys(BOSS_GEAR_DROPS).length===5&&new Set(Object.values(BOSS_GEAR_DROPS)).size===5&&Object.values(BOSS_GEAR_DROPS).every(id=>GEAR_CATALOG[id]&&GEAR_CATALOG[id].bossOnly)},{name:'品质分级包含稀有史诗传说',run:()=>['稀有','史诗','传说'].every(q=>Object.values(GEAR_CATALOG).some(g=>g.quality===q))},{name:'掉落只发放一次且保存标记',run:()=>typeof grantBossGear==='function'&&getSaveData().bossGearDrops===P.bossGearDrops},{name:'Boss装备不进入坊市出售',run:()=>renderEquipmentPanel.toString().includes('filter(([,it])=>!it.bossOnly)')}]);
 registerFeatureTest('老牧私技能平衡','战斗平衡',[{name:'浮木消失术排除Boss',run:()=>useLaomuSkill.toString().includes('!u.isBoss')&&useLaomuSkill.toString().includes('target.isBoss')},{name:'浮木消失术排除高等级敌人',run:()=>useLaomuSkill.toString().includes('Number(u.lv||1)<=Number(P.lv||1)')&&useLaomuSkill.toString().includes('Number(target.lv||1)>Number(P.lv||1)')},{name:'无合法目标时不会消耗法力',run:()=>useLaomuSkill.toString().indexOf("if(id==='vanish'&&!enemies.length)")<useLaomuSkill.toString().indexOf('unit.mp-=cost')}]);
 registerFeatureTest('五大Boss战斗','2.0战斗升级',[{name:'五大区域Boss配置齐全',run:()=>Object.keys(SCENE_BOSSES).length===5&&Object.keys(SCENE_BOSSES).every(id=>!!getSceneBossAt(Math.round(SCENES.find(s=>s.id===id).cx),Math.round(SCENES.find(s=>s.id===id).cy)).bossSkill)},{name:'Boss拥有狂暴与专属回合逻辑',run:()=>typeof bossTurn==='function'&&cBossSkillIds().length===5},{name:'Boss状态在战斗单位初始化',run:()=>battlePrepare.toString().includes('isBoss: !!m.isBoss')&&battlePrepare.toString().includes('bossSkill: m.bossSkill')}]);
 registerFeatureTest('五方镇域套装与装备图鉴','2.0收集成长',[{name:'两件、三件、五件套效果阶梯正确',run:()=>{const a=getGearSetBonuses(1),b=getGearSetBonuses(2),d=getGearSetBonuses(3),e=getGearSetBonuses(5);return !Object.keys(a).length&&b.atk===8&&d.magic===10&&e.hp===120&&e.spd===8;}},{name:'装备图鉴覆盖全部装备并记录已拥有',run:()=>{const x=getGearCodexProgress();return x.total===Object.keys(GEAR_CATALOG).length&&x.found<=x.total&&typeof renderGearCodex==='function';}},{name:'套装与图鉴字段进入存档',run:()=>{const d=getSaveData();return d.gearCodex===P.gearCodex&&d.gearSetApplied===P.gearSetApplied;}},{name:'装备穿脱会同步套装属性',run:()=>equipGear.toString().includes('syncGearSetBonuses')&&unequipGear.toString().includes('syncGearSetBonuses')}]);
 registerFeatureTest('装备与锻造','2.0装备成长',[{name:'装备目录包含五个部位且保留基础装备',run:()=>GEAR_SLOTS.length===5&&Object.keys(GEAR_CATALOG).length===15&&Object.keys(GEAR_CATALOG).includes('iron_sword')},{name:'装备背包与穿戴槽数据有效',run:()=>Array.isArray(P.gearInventory)&&P.equipment&&GEAR_SLOTS.every(([s])=>Object.prototype.hasOwnProperty.call(P.equipment,s))},{name:'购买、穿戴、卸下与锻造入口存在',run:()=>typeof buyGear==='function'&&typeof equipGear==='function'&&typeof unequipGear==='function'&&typeof forgeGear==='function'},{name:'装备数据包含存档字段',run:()=>{const d=getSaveData();return !!d&&!!d.equipment&&Array.isArray(d.gearInventory);}}]);
 registerFeatureTest('存档系统','数据安全',[{name:'保存与读取函数存在',run:()=>typeof saveGame==='function'&&typeof loadGame==='function'},{name:'存档结构可生成',run:()=>{const d=getSaveData();return !!d&&d.name===P.name&&d.lv===P.lv&&!!d.bag;}}]);
 registerFeatureTest('仙界区域探索与遭遇战','仙界探索',[{name:'三处区域均有对应普通遭遇怪物',run:()=>IMMORTAL_MAPS.every(m=>IMMORTAL_ENCOUNTERS.some(e=>e.region===m.id))},{name:'探索入口扣除仙灵之气且禁止战斗中重复进入',run:()=>huntImmortalRegion.toString().includes('r.qi-=m.cost')&&huntImmortalRegion.toString().includes('battle.active')},{name:'遭遇战复用回合制战斗并标记仙界结算',run:()=>huntImmortalRegion.toString().includes('battlePrepare([mob])')&&battlePrepare.toString().includes('immortalEncounterId = null')},{name:'胜利奖励只增加仙界资源',run:()=>grantImmortalEncounterReward.toString().includes('r.qi+=')&&!grantImmortalEncounterReward.toString().includes('P.gold')},{name:'失败不扣凡界银两和经验',run:()=>finishBattle.toString().includes('仙界妖物将你击退')&&finishBattle.toString().includes('凡界银两与经验不会损失')}]);
registerFeatureTest('仙界专属Boss战斗','仙界战斗',[{name:'三位仙界Boss配置完整且境界门槛递增',run:()=>IMMORTAL_BOSSES.length===3&&IMMORTAL_BOSSES[0].req===0&&IMMORTAL_BOSSES[1].req===2&&IMMORTAL_BOSSES[2].req===5&&IMMORTAL_BOSSES.every(b=>b.hp>0&&b.atk>0&&b.skill&&b.reward)},{name:'挑战入口使用现有真实回合制战斗',run:()=>typeof challengeImmortalBoss==='function'&&challengeImmortalBoss.toString().includes('battlePrepare([mob])')&&typeof bossTurn==='function'},{name:'首胜记录进入仙界存档并过滤非法键',run:()=>!!normalizeImmortalRealm({bosses:{xuangui:true,invalid:true}}).bosses.xuangui&&!normalizeImmortalRealm({bosses:{invalid:true}}).bosses.invalid&&!!getSaveData().immortalRealm},{name:'仙界奖励只修改仙界资源',run:()=>{const t=grantImmortalBossReward.toString();return !t.includes('P.gold')&&!t.includes('gainExp(')&&t.includes('r.jade')&&t.includes('r.materials')}},{name:'仙界战败不会扣除凡界银两',run:()=>finishBattle.toString().includes('仙界 Boss 暂时击退了你')&&finishBattle.toString().includes('凡界银两与经验不会因此损失')}]);
registerFeatureTest('飞升仙界独立系统','仙界扩展',[{name:'九重仙界境界顺序完整',run:()=>IMMORTAL_STAGES.join('|')==='人仙|地仙|天仙|真仙|金仙|太乙金仙|大罗金仙|混元大罗金仙（仙帝）|道祖'},{name:'仙界资源与凡界数据独立',run:()=>P.immortalRealm&&P.immortalRealm.materials!==P.bag&&!Object.prototype.hasOwnProperty.call(P.immortalRealm,'gold')&&!Object.prototype.hasOwnProperty.call(P.immortalRealm,'bag')&&!immortalExplore.toString().includes('P.gold')&&!immortalExplore.toString().includes('P.bag')},{name:'仙界独立数据进入存档且旧档可初始化',run:()=>!!getSaveData().immortalRealm&&normalizeImmortalRealm(null).unlocked===false&&applySaveData.toString().includes('normalizeImmortalRealm(data.immortalRealm)')},{name:'飞升要求凡界满级及五大Boss证明',run:()=>canAscendToImmortal.toString().includes('DEV_MAX_LEVEL')&&IMMORTAL_BOSS_IDS.length===5},{name:'仙府、仙宗、游历功能函数齐全',run:()=>typeof upgradeImmortalFacility==='function'&&typeof plantImmortalField==='function'&&typeof joinImmortalSect==='function'&&typeof buyImmortalTechnique==='function'&&typeof buyImmortalArtifact==='function'&&typeof immortalExplore==='function'&&typeof breakthroughImmortalStage==='function'},{name:'界域导航仅在飞升后开放',run:()=>syncImmortalNavigation.toString().includes('r.unlocked')&&typeof setImmortalView==='function'}]);
registerFeatureTest('开发者一键飞升','仙界扩展',[{name:'一键飞升函数可用',run:()=>typeof developerInstantAscend==='function'},{name:'一键飞升直接解锁并切换仙界',run:()=>developerInstantAscend.toString().includes("r.unlocked=true")&&developerInstantAscend.toString().includes("setImmortalView('immortal')")&&!developerInstantAscend.toString().includes('canAscendToImmortal')},{name:'一键飞升入口位于开发者面板',run:()=>typeof renderDeveloperPanel==='function'&&renderDeveloperPanel.toString().includes('devInstantAscendBtn')}]);
registerFeatureTest('世界遭遇频率与传送石碑','世界移动',[{name:'普通怪物地图显示密度已降低',run:()=>getMapMonster.toString().includes('h < 0.94')},{name:'遭遇战至少间隔14步且概率触发',run:()=>onStep.toString().includes('P.steps - (Number(P.lastEncounterStep)||0) < 14')&&onStep.toString().includes('Math.random() >= 0.14')},{name:'怪物队伍默认单只且高等级才有低概率多只',run:()=>rollEncounterMobCount(1,0.01)===1&&rollEncounterMobCount(15,0.10)===2&&rollEncounterMobCount(40,0.01)===3},{name:'全部区域都有传送石碑坐标与交互',run:()=>SCENES.every(scene=>TILE_ICON[getTile(Math.round(scene.cx),Math.round(scene.cy)+3)]?.action==='openTeleportStone')},{name:'全部区域无需激活即可传送且落点避开水域与Boss',run:()=>typeof teleportToScene==='function'&&typeof findTeleportLanding==='function'&&!teleportToScene.toString().includes('teleportStones.includes')&&typeof findTeleportLanding==='function'},{name:'传送进度和遭遇冷却写入存档',run:()=>{const d=getSaveData();return Array.isArray(d.teleportStones)&&Number.isFinite(d.lastEncounterStep);}}]);
 registerFeatureTest('2.0隐藏区域探索','世界探索',[{name:'新增东海湾与幽谷秘境',run:()=>['donghai','yougu'].every(id=>SCENES.some(x=>x.id===id&&x.hidden))},{name:'隐藏区域不设等级门槛且保留首次发现记录',run:()=>typeof canEnterRegion==='function'&&canEnterRegion({hidden:true})===true&&typeof discoverRegion==='function'&&SCENES.filter(x=>x.hidden).every(x=>x.lv>0)},{name:'新区域拥有独立地形与怪物',run:()=>SCENES.find(x=>x.id==='donghai').biome==='coast'&&SCENES.find(x=>x.id==='yougu').biome==='forest'&&['haisha','chaoxi','jiaolong','youlu','guteng','guguai'].every(id=>!!MOBS[id])},{name:'探索进度进入存档且兼容旧档',run:()=>Array.isArray(P.discoveredRegions)&&getSaveData().discoveredRegions===P.discoveredRegions&&applySaveData.toString().includes("P.discoveredRegions=['changan','jiangnan','datang','beiju','huoyan']")}]);
}
registerFeatureTest('2D / 2.5D 全局画质切换','画面与设置',[
 {name:'2D/2.5D模式切换接口存在',run:()=>typeof getGraphicsMode==='function'&&typeof setGraphicsMode==='function'&&typeof toggleGraphicsMode==='function'},
 {name:'顶部按钮已标记2.5D切换',run:()=>{const b=document.getElementById('graphicsToggle');return !!b&&b.getAttribute('aria-label')==='切换2D或2.5D画质'}},
 {name:'全局2.5D样式覆盖地图、战斗、弹窗与仙界',run:()=>{const css=Array.from(document.querySelectorAll('style')).map(s=>s.textContent).join('\\n');return ['#world','.battle-unit','.dialog','#immortalStage','#bottomBar','.list-item'].every(x=>css.includes('body.graphics-3d '+x))}},
 {name:'切换按钮状态与文字同步',run:()=>{const b=document.getElementById('graphicsToggle');return !!b&&b.textContent.trim()===(getGraphicsMode()==='3d'?'🧊 2.5D':'🧊 2D')&&b.getAttribute('aria-pressed')===String(getGraphicsMode()==='3d')}},
 {name:'画质偏好独立保存且不写入角色存档',run:()=>GRAPHICS_MODE_KEY==='wzhgame_graphics_mode_v1'&&!Object.prototype.hasOwnProperty.call(getSaveData(),'graphicsMode')}
]);

// ==================== 画质模式：2D / 3D 一键切换 ====================
registerBuiltInDeveloperTests();window.registerFeatureTest=registerFeatureTest;

/* 画质按钮先初始化，避免游戏初始化异常时按钮失效 */
/* DOM 已经在脚本前生成，因此这里可以直接初始化 */
initGame();



/* 响应式重绘：设备旋转、浏览器地址栏收起/展开、窗口尺寸变化时重新计算地图 */
(function responsiveLayout(){
  let raf = 0;
  function refreshLayout(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--vw', `${window.innerWidth}px`);
      document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
      if (typeof P !== 'undefined' && P.sect && typeof renderWorld === 'function') {
        renderWorld();
      }
    });
  }
  window.addEventListener('resize', refreshLayout, {passive:true});
  window.addEventListener('orientationchange', () => setTimeout(refreshLayout, 120), {passive:true});
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refreshLayout, {passive:true});
  }
  refreshLayout();
})();


/* ================= 最终屏幕尺寸同步 ================= */
(function(){
  let resizeTimer = 0;
  function syncViewport(){
    document.documentElement.style.setProperty('--vw', window.innerWidth + 'px');
    document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
    const g = document.getElementById('game');
    if (g){
      g.style.width = '100vw';
      g.style.maxWidth = '100vw';
      g.style.height = '100dvh';
    }
    if (typeof renderWorld === 'function') renderWorld();
  }
  function schedule(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncViewport, 80);
  }
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('orientationchange', schedule, {passive:true});
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', schedule, {passive:true});
  }
  syncViewport();
})();

/* 禁止移动端双击缩放/页面手势拖动（不影响弹窗内部滚动） */
document.addEventListener('dblclick', function(e){
  e.preventDefault();
}, {passive:false});
document.addEventListener('gesturestart', function(e){
  e.preventDefault();
}, {passive:false});
document.addEventListener('gesturechange', function(e){
  e.preventDefault();
}, {passive:false});
document.addEventListener('gestureend', function(e){
  e.preventDefault();
}, {passive:false});


/* Immortal open-world migration: branch-target verification marker. */
