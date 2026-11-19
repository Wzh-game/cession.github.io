/* ============================================================
   每日挑战赛 · 五关连续挑战
   ============================================================ */
function challengeLocalDate(){
 const d=new Date(),p=n=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function normalizeChallengeState(data){
 const d=data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 return {
  date:/^\d{4}-\d{2}-\d{2}$/.test(String(d.date||''))?String(d.date):'',
  entered:d.entered===true,
  active:d.active===true,
  stage:Math.max(0,Math.min(5,Math.floor(Number(d.stage)||0))),
  bestStage:Math.max(0,Math.min(5,Math.floor(Number(d.bestStage)||0))),
  totalWins:Math.max(0,Math.floor(Number(d.totalWins)||0)),
  totalCompletions:Math.max(0,Math.floor(Number(d.totalCompletions)||0))
 };
}
function ensureChallengeState(){
 P.challenge=normalizeChallengeState(P.challenge);
 const today=challengeLocalDate();
 if(!P.challenge.date||today>P.challenge.date){
  P.challenge.date=today;P.challenge.entered=false;P.challenge.active=false;P.challenge.stage=0;
  saveGame();return true;
 }
 return false;
}
function challengeEnemyForStage(stage){
 const pool=Object.values(MOBS||{}).filter(m=>m&&Number.isFinite(Number(m.lv)));
 if(!pool.length)return [];
 const target=Math.max(1,Number(P.lv)||1);
 const ordered=pool.slice().sort((a,b)=>Math.abs(a.lv-target)-Math.abs(b.lv-target));
 const base=ordered[Math.min(ordered.length-1,Math.floor((stage-1)/2))]||ordered[0];
 const scale=Math.max(.8,Math.pow(target/Math.max(1,base.lv),.72))*(1+(stage-1)*.24);
 const make=(source,index)=>({
  ...JSON.parse(JSON.stringify(source)),
  id:'arena_'+source.id+'_'+stage+'_'+index,
  name:stage===5&&index===0?'擂台冠军·'+source.name:source.name,
  lv:Math.max(1,Math.floor(target+stage*2)),
  hp:Math.max(30,Math.floor(source.hp*scale*(stage===5?2.15:1))),
  maxHp:Math.max(30,Math.floor(source.hp*scale*(stage===5?2.15:1))),
  atk:Math.max(5,Math.floor(source.atk*scale*(stage===5?1.35:1))),
  def:Math.max(1,Math.floor(source.def*scale)),
  spd:Math.max(1,Math.floor(source.spd*(1+(stage-1)*.06))),
  exp:0,gold:0,skills:source.skills||[],
  isBoss:stage===5,
  bossSkill:stage===5?{name:'冠军绝技',power:1.35,type:'phys',target:'one',effect:'stun'}:null
 });
 const count=stage===5?1:Math.min(3,1+Math.floor((stage-1)/2));
 return Array.from({length:count},(_,i)=>make(pool[(pool.indexOf(base)+i)%pool.length],i));
}
function startChallengeRound(){
 ensureChallengeState();
 if(!P.challenge.active||P.challenge.stage<1||P.challenge.stage>5||battle.active)return false;
 if(P.hp<=0){toast('气血不足，先恢复后再挑战');return false;}
 const stage=P.challenge.stage,mobs=challengeEnemyForStage(stage);
 if(!mobs.length){toast('挑战赛敌人数据暂不可用');return false;}
 window.challengeBattlePending=true;
 battlePrepare(mobs);
 blog('🏆 挑战赛第 '+stage+'/5 关：'+(stage===5?'最终冠军战':'连续擂台战'),'warn');
 return true;
}
function startChallengeTournament(){
 ensureChallengeState();
 if(P.challenge.active)return startChallengeRound();
 if(P.challenge.entered){toast('今日已经参加过挑战赛，请明日再来');return false;}
 if(battle.active){toast('战斗中无法报名挑战赛');return false;}
 if(P.hp<=0){toast('气血不足，无法报名');return false;}
 P.challenge.entered=true;P.challenge.active=true;P.challenge.stage=1;
 saveGame();renderChallengePanel();
 return startChallengeRound();
}
function completeChallengeRound(){
 if(!P.challenge||!P.challenge.active)return null;
 const stage=Math.max(1,Math.min(5,Number(P.challenge.stage)||1));
 const gold=100*stage+Math.max(1,Number(P.lv)||1)*10;
 const exp=65*stage+Math.max(1,Number(P.lv)||1)*7;
 P.gold+=gold;gainExp(exp);P.challenge.totalWins++;
 P.challenge.bestStage=Math.max(P.challenge.bestStage,stage);
 const finished=stage>=5;
 if(finished){
  const finalGold=1000,finalExp=600;P.gold+=finalGold;gainExp(finalExp);
  P.challenge.totalCompletions++;P.challenge.active=false;P.challenge.stage=5;
  saveGame();updateHUD();
  return {stage,gold:gold+finalGold,exp:exp+finalExp,finished:true};
 }
 P.challenge.stage=stage+1;saveGame();updateHUD();
 return {stage,gold,exp,finished:false};
}
function failChallengeRun(reason){
 if(!P.challenge||!P.challenge.active)return false;
 P.challenge.bestStage=Math.max(P.challenge.bestStage,Math.max(0,P.challenge.stage-1));
 P.challenge.active=false;P.challenge.stage=0;saveGame();
 addLog('【挑战赛】'+(reason||'挑战结束')+'，本日挑战机会已用完','bad');
 return true;
}
function openChallengePanel(){
 ensureChallengeState();renderChallengePanel();openModal('modalChallenge');
}
function renderChallengePanel(){
 const body=$('challengeBody');if(!body)return;
 ensureChallengeState();
 const c=P.challenge,entered=c.entered,active=c.active;
 const stateText=active?'进行中 · 第 '+c.stage+'/5 关':entered?'今日已结束':'今日尚未报名';
 const rewards='<div style="margin-top:8px;color:#d9c69c;font-size:11px;line-height:1.8">每关额外奖励：银两 '+(100*1+P.lv*10)+' 起、经验 '+(65*1+P.lv*7)+' 起，随关卡递增。<br>五关全胜额外获得：💰1000 两 · ⭐600 经验。<br>每天仅可报名一次；中途退出或失败会结束当天挑战。</div>';
 body.innerHTML='<div style="padding:10px;border:1px solid rgba(240,200,96,.35);border-radius:8px;background:linear-gradient(145deg,rgba(105,65,20,.22),rgba(30,18,45,.5))"><div style="font-size:20px;text-align:center;color:#ffe39b;font-weight:bold">🏆 五关连胜擂台</div><div style="margin-top:6px;text-align:center;color:#c8b080;font-size:11px">日期：'+c.date+' · '+stateText+'</div><div style="display:flex;justify-content:space-around;margin-top:12px;text-align:center"><div><b style="font-size:20px;color:#ffe39b">'+c.bestStage+'/5</b><div style="font-size:10px;color:#b9a080">历史最佳关卡</div></div><div><b style="font-size:20px;color:#ffe39b">'+c.totalWins+'</b><div style="font-size:10px;color:#b9a080">累计胜场</div></div><div><b style="font-size:20px;color:#ffe39b">'+c.totalCompletions+'</b><div style="font-size:10px;color:#b9a080">通关次数</div></div></div>'+rewards+'</div>';
 const btn=document.createElement('button');btn.className='btn primary';btn.style.cssText='width:100%;margin-top:12px;min-height:44px';
 btn.textContent=active?'▶ 继续挑战第 '+c.stage+' 关':entered?'今日挑战机会已用完':'🏁 报名挑战赛（每日一次）';
 btn.disabled=(!active&&entered)||battle.active;
 btn.onclick=()=>{if(startChallengeTournament()){closeModal('modalChallenge');}};
 body.appendChild(btn);
 const note=document.createElement('div');note.style.cssText='margin-top:10px;color:#9e8b73;font-size:10px;line-height:1.6';note.textContent='关卡敌人会根据角色等级动态强化。第 5 关为擂台冠军。挑战过程自动保存，刷新页面后可继续当前关卡。';body.appendChild(note);
}

/* 开发者测试中心：只读回归检查 */
document.addEventListener('DOMContentLoaded',()=>{
 if(typeof registerFeatureTest!=='function')return;
 registerFeatureTest('每日挑战赛','2.0战斗玩法',[
  {name:'五关挑战核心接口完整',run:()=>typeof startChallengeTournament==='function'&&typeof startChallengeRound==='function'&&typeof completeChallengeRound==='function'&&typeof failChallengeRun==='function'},
  {name:'旧存档可安全补齐挑战字段',run:()=>{const x=normalizeChallengeState(null);return x.entered===false&&x.active===false&&x.stage===0&&x.totalCompletions===0;}},
  {name:'挑战敌人随等级和关卡生成且最终关为Boss',run:()=>{const old=P.lv;try{P.lv=10;const a=challengeEnemyForStage(1),b=challengeEnemyForStage(5);return a.length===1&&b.length===1&&b[0].isBoss===true&&b[0].hp>a[0].hp;}finally{P.lv=old;}}},
  {name:'挑战进度纳入存档',run:()=>!!getSaveData().challenge&&getSaveData().challenge===P.challenge&&applySaveData.toString().includes('normalizeChallengeState(data.challenge)')},
  {name:'挑战胜利与失败均有单独结算钩子',run:()=>finishBattle.toString().includes('completeChallengeRound')&&finishBattle.toString().includes('failChallengeRun')}
 ]);
});
