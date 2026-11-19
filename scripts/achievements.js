/* ============================================================
   2.0 成就系统：长期目标、一次性奖励、旧存档兼容
   ============================================================ */
const ACHIEVEMENTS = [
 {id:'lv5',icon:'🌱',name:'初出江湖',desc:'角色达到 Lv.5',field:'level',target:5,reward:{gold:300,exp:120}},
 {id:'lv20',icon:'⚔️',name:'渐入佳境',desc:'角色达到 Lv.20',field:'level',target:20,reward:{gold:1200,exp:600}},
 {id:'battle10',icon:'🛡️',name:'百炼成钢',desc:'累计完成 10 场战斗',field:'battles',target:10,reward:{gold:500,exp:250}},
 {id:'battle50',icon:'🏅',name:'身经百战',desc:'累计完成 50 场战斗',field:'battles',target:50,reward:{gold:2200,exp:1000}},
 {id:'kill100',icon:'👹',name:'百妖斩',desc:'累计击败 100 名敌人',field:'kills',target:100,reward:{gold:900,exp:450}},
 {id:'kill500',icon:'🔥',name:'妖魔克星',desc:'累计击败 500 名敌人',field:'kills',target:500,reward:{gold:3500,exp:1800}},
 {id:'regions5',icon:'🧭',name:'行走三界',desc:'发现全部 5 个凡界基础区域',field:'regions',target:5,reward:{gold:1000,exp:500}},
 {id:'regions7',icon:'🗺️',name:'踏遍山河',desc:'发现全部 7 个凡界区域',field:'regions',target:7,reward:{gold:2200,exp:1100}},
 {id:'boss3',icon:'👑',name:'镇域先锋',desc:'首次击败 3 个不同区域 Boss',field:'bosses',target:3,reward:{gold:1800,exp:900}},
 {id:'boss5',icon:'🐉',name:'五方镇守',desc:'首次击败全部 5 个区域 Boss',field:'bosses',target:5,reward:{gold:5000,exp:2500}},
 {id:'challenge1',icon:'🏆',name:'擂台新星',desc:'完成一次每日挑战赛',field:'challenge',target:1,reward:{gold:1000,exp:500}},
 {id:'pet1',icon:'🐾',name:'灵宠相伴',desc:'获得一只召唤兽',field:'pets',target:1,reward:{gold:500,exp:250}},
 {id:'gear5',icon:'💎',name:'收藏家',desc:'收集 5 种不同角色装备',field:'gear',target:5,reward:{gold:1200,exp:600}},
 {id:'immortal',icon:'🌌',name:'仙缘初现',desc:'解锁仙界',field:'immortal',target:1,reward:{gold:3000,exp:1500}}
];
function ensureAchievementState(){
 if(!Array.isArray(P.achievementsClaimed))P.achievementsClaimed=[];
 P.achievementsClaimed=Array.from(new Set(P.achievementsClaimed.filter(id=>ACHIEVEMENTS.some(a=>a.id===id))));
 return P.achievementsClaimed;
}
function getAchievementValue(field){
 switch(field){
  case 'level':return Math.max(0,Number(P.lv)||0);
  case 'battles':return Math.max(0,Number(P.battles)||0);
  case 'kills':return Math.max(0,Number(P.kills)||0);
  case 'regions':return Array.isArray(P.discoveredRegions)?new Set(P.discoveredRegions).size:0;
  case 'bosses':return P.bossDrops&&typeof P.bossDrops==='object'?Object.values(P.bossDrops).filter(Boolean).length:0;
  case 'challenge':return Math.max(0,Number(P.challenge&&P.challenge.totalCompletions)||0);
  case 'pets':return (P.pet?1:0)+(Array.isArray(P.petBox)?P.petBox.length:0)>0?1:0;
  case 'gear':return P.gearCodex&&typeof P.gearCodex==='object'?Object.values(P.gearCodex).filter(Boolean).length:0;
  case 'immortal':return P.immortalRealm&&P.immortalRealm.unlocked?1:0;
  default:return 0;
 }
}
function achievementSnapshot(a){
 const current=getAchievementValue(a.field);
 return {current:Math.min(a.target,current),target:a.target,complete:current>=a.target};
}
function claimAchievement(id){
 ensureAchievementState();
 const a=ACHIEVEMENTS.find(x=>x.id===id);
 if(!a||P.achievementsClaimed.includes(id))return false;
 if(!achievementSnapshot(a).complete){toast('成就条件尚未达成');return false;}
 P.achievementsClaimed.push(id);
 P.gold=Math.max(0,Number(P.gold)||0)+a.reward.gold;
 if(typeof gainExp==='function')gainExp(a.reward.exp);
 saveGame();updateHUD();
 addLog('【成就】领取 '+a.name+' 奖励','good');
 toast('🏅 成就达成：'+a.name+' · '+a.reward.gold+' 两 · '+a.reward.exp+' 经验');
 renderAchievementsPanel();
 return true;
}
function openAchievementsPanel(){
 ensureAchievementState();
 renderAchievementsPanel();
 openModal('modalAchievements');
}
function renderAchievementsPanel(){
 const body=$('achievementsBody');if(!body)return;
 ensureAchievementState();
 const claimed=P.achievementsClaimed;
 const done=ACHIEVEMENTS.filter(a=>claimed.includes(a.id)).length;
 const ready=ACHIEVEMENTS.filter(a=>!claimed.includes(a.id)&&achievementSnapshot(a).complete).length;
 const rows=ACHIEVEMENTS.map(a=>{
  const p=achievementSnapshot(a),isClaimed=claimed.includes(a.id);
  const pct=Math.min(100,p.current/a.target*100);
  const state=isClaimed?'已领取':p.complete?'可领取':'进行中';
  const color=isClaimed?'#80ffa0':p.complete?'#ffe080':'#78b9e8';
  return '<section class="list-item" style="align-items:center;'+(isClaimed?'opacity:.72':'')+'"><div class="li-icon" style="font-size:24px">'+a.icon+'</div><div class="li-body"><div class="li-name">'+a.name+' <small style="color:'+color+';font-size:10px">'+state+'</small></div><div class="li-desc">'+a.desc+'</div><div style="height:7px;margin-top:6px;background:#160d08;border:1px solid #080402;border-radius:5px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#a36b20,#f2cf69)"></div></div><div style="font-size:10px;color:#c0a878;margin-top:4px">进度 '+p.current+'/'+p.target+' · 奖励 💰'+a.reward.gold+' · ⭐'+a.reward.exp+'</div></div>'+(isClaimed?'<span class="li-right" style="color:#80ffa0">✓</span>':p.complete?'<button class="li-btn" data-achievement-claim="'+a.id+'">领取</button>':'')+'</section>';
 }).join('');
 body.innerHTML='<div style="padding:10px;margin-bottom:10px;border:1px solid rgba(240,200,96,.3);border-radius:8px;background:linear-gradient(145deg,rgba(105,65,20,.22),rgba(30,18,45,.5))"><div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#ffe39b">🏅 江湖成就</b><b style="color:#ffe39b">'+done+'/'+ACHIEVEMENTS.length+'</b></div><div style="height:8px;margin-top:8px;background:#160d08;border-radius:5px;overflow:hidden"><div style="height:100%;width:'+(done/ACHIEVEMENTS.length*100)+'%;background:linear-gradient(90deg,#a36b20,#f2cf69)"></div></div><div style="font-size:10px;color:#c0a878;margin-top:6px">已领取 '+done+' 项 · 当前可领取 '+ready+' 项 · 奖励只可领取一次</div></div><div id="achievementList">'+rows+'</div>';
 body.querySelectorAll('[data-achievement-claim]').forEach(btn=>btn.addEventListener('click',()=>claimAchievement(btn.dataset.achievementClaim)));
}
