/* ============================================================
   梦幻西游 · Q版像素单机  —— 第 7 批
   回合制战斗系统 / 坊市商店系统
   ============================================================ */

/* ==================== 战斗系统 CSS 注入 ==================== */
(function injectBattleStyle(){
  const style = document.createElement('style');
  style.textContent = `
    /* 战斗覆盖层 */
    #battleOverlay{
      position:absolute;inset:0;z-index:200;
      background:
        radial-gradient(circle at 50% 20%,rgba(60,20,80,.6),transparent 60%),
        linear-gradient(180deg,#1a0a26 0%,#2a0f45 45%,#0d0418 100%);
      display:none;flex-direction:column;
      padding:8px;gap:6px;
      opacity:0;transition:opacity .3s;
    }
    #battleOverlay.show{display:flex;opacity:1}
    #battleOverlay.fading{opacity:0}

    /* 战斗场景框 */
    .battle-scene{
      flex:1;display:flex;flex-direction:column;gap:6px;
      min-height:0;
      position:relative;
    }

    /* 敌我方阵型 */
    .battle-row{
      display:flex;flex-wrap:wrap;justify-content:center;
      align-content:flex-start;gap:6px;
      min-height:auto;padding:4px 0;
    }
    .battle-row.enemy{align-items:flex-start}
    .battle-row.player{align-items:flex-end}

    /* 单位卡片 */
    .battle-unit{
      position:relative;
      width:calc(33.333% - 5px);min-width:92px;max-width:150px;
      background:linear-gradient(180deg,#3a1a5a,#1a0a2e);
      border:2px solid #000;
      padding:6px 8px 7px;
      border-radius:4px;
      box-shadow:2px 2px 0 rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1);
      transition:all .2s;
      animation:unitIn .3s cubic-bezier(.25,1.4,.5,1);
    }
    @keyframes unitIn{
      from{opacity:0;transform:scale(.6) translateY(-12px)}
      to{opacity:1;transform:scale(1) translateY(0)}
    }
    .battle-unit.is-player{
      background:linear-gradient(180deg,#204a80,#0e2040);
      box-shadow:2px 2px 0 rgba(0,0,0,.5),inset 0 0 0 1px rgba(120,200,255,.4);
    }
    .battle-unit.is-pet{
      background:linear-gradient(180deg,#2a6a3a,#0e2a18);
      box-shadow:2px 2px 0 rgba(0,0,0,.5),inset 0 0 0 1px rgba(120,255,160,.4);
    }
    .battle-unit.dead{
      opacity:.28;filter:grayscale(1);
    }
    .battle-unit.damaged{
      animation:shake .3s;
    }
    @keyframes shake{
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-4px)}
      75%{transform:translateX(4px)}
    }
    .battle-unit.acting{
      box-shadow:2px 2px 0 rgba(0,0,0,.5),0 0 0 3px var(--gold),0 0 16px rgba(240,200,96,.7);
      transform:scale(1.05);
      z-index:5;
    }

    /* 单位头像+名字 */
    .bu-head{
      display:flex;align-items:center;gap:5px;margin-bottom:4px;
    }
    .bu-icon{
      width:26px;height:26px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      background:radial-gradient(circle at 50% 35%,rgba(255,220,160,.3),transparent 70%);
      border:1px solid rgba(0,0,0,.5);
      border-radius:4px;
    }
    .bu-name{
      font-size:11px;font-weight:bold;color:#f0e0ff;
      text-shadow:1px 1px 0 #000;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      flex:1;min-width:0;
    }
    .bu-name small{color:#c0a0e8;font-size:9.5px;font-weight:normal;margin-left:2px}
    .bu-lv{
      font-size:9px;color:#ffd060;
      text-shadow:1px 1px 0 #000;
      flex-shrink:0;
    }

    /* 血条 */
    .bu-hp{
      height:7px;background:#0d0418;
      border:1px solid #000;border-radius:4px;
      overflow:hidden;
      box-shadow:inset 0 1px 2px rgba(0,0,0,.8);
      position:relative;
    }
    .bu-hp .fill{
      height:100%;width:100%;
      background:linear-gradient(90deg,#a02040,#ff5070);
      transition:width .35s ease;
      border-radius:3px;
    }
    .battle-unit.is-player .bu-hp .fill{
      background:linear-gradient(90deg,#2080a0,#60d0ff);
    }
    .battle-unit.is-pet .bu-hp .fill{
      background:linear-gradient(90deg,#208040,#60ff90);
    }
    .bu-hp-text{
      font-size:8.5px;color:#c0a0e8;
      text-align:right;margin-top:2px;
      text-shadow:1px 1px 0 #000;
    }

    /* 状态图标 */
    .bu-status{
      display:flex;gap:3px;margin-top:3px;
      font-size:9px;
    }
    .bu-status span{
      padding:1px 4px;background:rgba(0,0,0,.4);
      border:1px solid #000;border-radius:3px;
    }

    /* 伤害飘字 */
    .dmg-float{
      position:absolute;left:50%;top:0;
      transform:translateX(-50%);
      font-size:16px;font-weight:bold;
      color:#ff4040;
      text-shadow:1px 1px 0 #000,0 0 8px rgba(255,64,64,.8);
      pointer-events:none;
      animation:dmgFloat 1s ease-out forwards;
      z-index:100;
      white-space:nowrap;
    }
    .dmg-float.heal{color:#80ff90;text-shadow:1px 1px 0 #000,0 0 8px rgba(128,255,144,.8)}
    .dmg-float.crit{font-size:22px;color:#ffd060;text-shadow:2px 2px 0 #000,0 0 12px rgba(255,208,96,.9)}
    @keyframes dmgFloat{
      0%{opacity:0;transform:translateX(-50%) translateY(0) scale(.6)}
      20%{opacity:1;transform:translateX(-50%) translateY(-12px) scale(1.1)}
      100%{opacity:0;transform:translateX(-50%) translateY(-40px) scale(1)}
    }

    /* 战斗日志 */
    #battleLog{
      flex:1;min-height:80px;max-height:200px;
      overflow-y:auto;padding:8px 10px;
      font-size:12px;line-height:1.7;
      background:rgba(0,0,0,.5);
      border:2px solid #000;border-radius:4px;
      box-shadow:inset 0 2px 4px rgba(0,0,0,.6);
      scrollbar-width:thin;
      scrollbar-color:rgba(240,200,96,.45) rgba(0,0,0,.3);
    }
    #battleLog::-webkit-scrollbar{width:5px}
    #battleLog::-webkit-scrollbar-track{background:#0d0418}
    #battleLog::-webkit-scrollbar-thumb{
      background:linear-gradient(180deg,var(--gold),var(--gold-dk));
      border-radius:3px;
    }
    .blog{
      margin-bottom:2px;
      animation:blogIn .22s ease;
    }
    @keyframes blogIn{from{opacity:0;transform:translateY(3px)}to{opacity:1}}
    .blog.good{color:#88ffa8}
    .blog.bad{color:#ff7090}
    .blog.warn{color:#ffd060}
    .blog.dim{color:#8a7aa8}
    .blog.round{
      color:#b080ff;text-align:center;
      margin:6px 0;font-size:11px;letter-spacing:3px;
      padding:2px 0;
      border-top:1px solid rgba(176,128,255,.25);
      border-bottom:1px solid rgba(176,128,255,.25);
    }
    .blog b{color:var(--gold);text-shadow:0 0 6px rgba(240,200,96,.5)}
    .blog i{font-style:normal;color:#80d0ff}

    /* 操作栏 */
    #battleActions{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:5px;flex-shrink:0;
    }
    .battle-skill{
      padding:9px 3px;
      font-family:inherit;font-size:11.5px;font-weight:bold;
      letter-spacing:1px;
      color:#f0e0ff;
      background:
        linear-gradient(180deg,#5a30a0,#3a1a70);
      border:2px solid #000;border-radius:3px;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;gap:2px;
      box-shadow:2px 2px 0 rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.15);
      transition:all .08s;user-select:none;
      text-shadow:1px 1px 0 #000;
      position:relative;
      overflow:hidden;
    }
    .battle-skill .bs-name{
      font-size:11.5px;white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis;
      max-width:100%;
    }
    .battle-skill .bs-mp{
      font-size:9px;color:#c8b0e8;font-weight:normal;
      text-shadow:1px 1px 0 #000;
    }
    .battle-skill small{
      font-size:9px;color:#c8b0e8;font-weight:normal;
      text-shadow:1px 1px 0 #000;
    }
    .battle-skill:active:not(.disabled){
      transform:translate(2px,2px);
      box-shadow:0 0 0 rgba(0,0,0,.5);
    }
    .battle-skill.basic{
      background:linear-gradient(180deg,#4a4a5a,#2a2a3a);
    }
    .battle-skill.defend{
      background:linear-gradient(180deg,#3a5a80,#1a3050);
    }
    .battle-skill.flee{
      background:linear-gradient(180deg,#a03050,#601020);
    }
    .battle-skill.item{
      background:linear-gradient(180deg,#806020,#503810);
    }
    .battle-skill.disabled{
      opacity:.35;cursor:not-allowed;
      filter:grayscale(.5);
    }
    .battle-skill .bs-type{
      position:absolute;top:1px;right:2px;
      font-size:8px;color:#ffd060;
      text-shadow:1px 1px 0 #000;
    }

    /* 战斗回合提示 */
    .turn-banner{
      position:absolute;left:50%;top:45%;
      transform:translate(-50%,-50%) scale(.8);
      font-size:28px;font-weight:bold;
      letter-spacing:8px;
      color:#ffd060;
      text-shadow:2px 2px 0 #000,0 0 24px rgba(255,208,96,.8);
      pointer-events:none;
      opacity:0;
      z-index:150;
      white-space:nowrap;
    }
    .turn-banner.show{
      animation:turnBanner 1.2s ease-out;
    }
    @keyframes turnBanner{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}
      30%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}
      70%{opacity:1;transform:translate(-50%,-50%) scale(1)}
      100%{opacity:0;transform:translate(-50%,-50%) scale(1.05)}
    }

    /* 胜利/失败覆盖 */
    .result-banner{
      position:absolute;inset:0;
      display:none;flex-direction:column;
      align-items:center;justify-content:center;
      gap:12px;z-index:220;
      overflow-y:auto;overscroll-behavior:contain;
      padding:18px 12px max(24px,env(safe-area-inset-bottom));
      -webkit-overflow-scrolling:touch;
      background:radial-gradient(circle at 50% 50%,rgba(0,0,0,.7),rgba(0,0,0,.9));
      backdrop-filter:blur(3px);
    }
    .result-banner.show{display:flex}
    .rb-title{
      font-size:38px;font-weight:bold;
      letter-spacing:12px;
      text-shadow:3px 3px 0 #000;
      animation:rbIn .5s cubic-bezier(.25,1.4,.5,1);
    }
    .rb-title.win{color:#ffd060;text-shadow:3px 3px 0 #000,0 0 30px rgba(255,208,96,.9)}
    .rb-title.lose{color:#ff5060;text-shadow:3px 3px 0 #000,0 0 30px rgba(255,80,96,.9)}
    @keyframes rbIn{
      from{opacity:0;transform:scale(.4) rotate(-8deg)}
      to{opacity:1;transform:scale(1) rotate(0)}
    }
    .rb-info{
      font-size:13px;color:#f0e0ff;
      text-align:center;line-height:2;
      text-shadow:1px 1px 0 #000;
      padding:14px 20px;
      background:linear-gradient(180deg,rgba(60,30,110,.8),rgba(30,15,60,.8));
      border:2px solid var(--gold-dk);
      border-radius:8px;
      box-shadow:inset 0 0 0 1px rgba(240,200,96,.4),0 4px 16px rgba(0,0,0,.6);
      min-width:220px;
    }
    .rb-info b{color:#ffd060;font-size:15px}
    .rb-loot-title{margin-top:10px;padding-top:8px;border-top:1px solid rgba(240,200,96,.45);color:#ffe29a;font-weight:bold;letter-spacing:2px}
    .rb-loot-item{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:3px 6px;margin-top:3px;border-radius:4px;background:rgba(255,255,255,.06);text-align:left}
    .rb-loot-item small{font-size:10px;color:#d5baff;white-space:nowrap}
    .rb-btn{
      padding:11px 40px;flex:0 0 auto;min-height:44px;
      font-family:inherit;font-size:14px;font-weight:bold;
      letter-spacing:4px;
      color:#3a1f0e;
      background:linear-gradient(180deg,#ffe8a0,#f0c860 45%,#c89020);
      border:2px solid #6a4810;border-radius:6px;cursor:pointer;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.7),
        inset 0 -3px 5px rgba(120,80,20,.4),
        0 3px 0 #5a4010,
        0 4px 8px rgba(0,0,0,.5);
      transition:all .07s;
      text-shadow:0 1px 0 rgba(255,255,255,.5);
    }
    .rb-btn:active{
      transform:translateY(3px);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.7),
        inset 0 -1px 3px rgba(120,80,20,.4),
        0 0 0 #5a4010,
        0 1px 3px rgba(0,0,0,.5);
    }

    /* 技能选择返回按钮 */
    .skill-back{
      grid-column:1/-1;
      padding:8px;
      font-family:inherit;font-size:12px;font-weight:bold;
      letter-spacing:2px;color:#c8b0e8;
      background:linear-gradient(180deg,#3a2a5a,#1a1028);
      border:2px solid #000;border-radius:3px;cursor:pointer;
      box-shadow:2px 2px 0 rgba(0,0,0,.5);
      text-shadow:1px 1px 0 #000;
    }
    .skill-back:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(0,0,0,.5)}
  `;
  document.head.appendChild(style);
})();

/* ==================== 战斗状态 ==================== */
const battle = {
  active: false,
  units: [],       // 所有单位
  round: 0,
  over: false,
  victory: false,
  fled: false,
  overlay: null,
  scene: null,
  loopRunning: false,
  token: 0,
  musicBuffUntilRound: 0,
  jiangjunStacks: 0,
  previousRoundDamage:0, incomingRoundDamage:0,
};

/* 创建战斗界面 DOM */
function createBattleUI(){
  if (battle.overlay) return battle.overlay;
  
  const overlay = document.createElement('div');
  overlay.id = 'battleOverlay';
  overlay.innerHTML = `
    <div class="battle-layout">
      <div class="battle-scene">
        <div class="battle-scene-title">◆ 回合制战斗 ◆</div>
        <div class="battle-row enemy" id="enemyRow"></div>
        <div class="battle-row player" id="playerRow"></div>
        <div class="turn-banner" id="turnBanner"></div>
      </div>
      <aside class="battle-log-panel">
        <div class="battle-log-title">战 斗 记 录</div>
        <div id="battleLog"></div>
      </aside>
    </div>
    <div class="result-banner" id="resultBanner"></div>
    <div class="battle-footer">
      <div id="battleActions"></div>
      <div class="battle-tip">经典回合制战斗：普通攻击、技能、物品、防御、逃跑、自动战斗，策略自由搭配。</div>
    </div>
    <div id="duoSkillDock" class="duo-skill-dock" hidden></div>
  `;
  if (!document.getElementById('battleRetroStyle')){
    const retroStyle = document.createElement('style');
    retroStyle.id = 'battleRetroStyle';
    retroStyle.textContent = `
      #battleOverlay{padding:14px 3.5% 12px;gap:10px;overflow:hidden;background:
        radial-gradient(ellipse at 50% 45%,rgba(103,48,145,.38),transparent 58%),
        radial-gradient(circle at 20% 15%,rgba(255,255,255,.07) 0 1px,transparent 2px),
        radial-gradient(circle at 80% 30%,rgba(255,255,255,.08) 0 1px,transparent 2px),
        linear-gradient(160deg,#16091f 0%,#2b1044 52%,#10071d 100%);}
      .battle-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,26%);gap:14px;flex:1;min-height:0;}
      .battle-scene{min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:8px 4px 12px;position:relative;}
      .battle-scene:before,.battle-scene:after{content:'';position:absolute;left:5%;width:90%;height:20%;border-radius:50%;border:2px solid rgba(193,151,255,.34);background:rgba(97,57,143,.2);pointer-events:none;}
      .battle-scene:before{top:24%;}.battle-scene:after{bottom:8%;border-color:rgba(90,166,255,.35);background:rgba(49,103,159,.2);}
      .battle-scene-title{align-self:flex-start;padding:5px 16px;border:3px solid #9c7130;border-radius:22px;background:linear-gradient(#f5d98a,#b88a3d);color:#4b2d16;font-weight:900;letter-spacing:3px;text-shadow:1px 1px #fff0b5;box-shadow:0 3px #4a2a16;z-index:2;}
      .battle-row{position:relative;z-index:2;display:flex;flex-wrap:wrap;align-content:center;gap:12px;min-height:0;padding:4px;}
      /* 敌方阵容整体靠战场右侧；玩家与宠物阵容整体靠左侧。 */
      .battle-row.enemy{flex:1;align-items:flex-start;justify-content:flex-end;margin-left:8%;}
      .battle-row.player{align-items:flex-end;justify-content:flex-start;min-height:122px;margin-right:8%;}
      .battle-unit{width:clamp(105px,18%,160px);min-width:94px;max-width:160px;padding:6px 8px 7px;background:linear-gradient(180deg,rgba(48,25,75,.96),rgba(20,10,37,.96));border:2px solid #08040d;border-radius:7px;box-shadow:3px 4px 0 rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.13);}
      .battle-unit.is-player{background:linear-gradient(180deg,#315b8d,#102b51);border-color:#050b16;}
      .battle-unit.is-pet{background:linear-gradient(180deg,#397c4c,#143c25);}
      .bu-head{flex-direction:column;gap:2px;margin-bottom:5px;}
      .bu-icon{width:100%;height:clamp(54px,10vh,92px);font-size:clamp(42px,7vw,72px);line-height:1;background:transparent;border:0;border-radius:0;image-rendering:pixelated;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.55));}
      .bu-icon .battle-sprite{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.55));}
      .bu-name{width:100%;text-align:center;font-size:12px;}
      .bu-name small{color:#ffd56c;font-size:10px;}
      .bu-hp{height:9px;border:1px solid #08040d;}
      .bu-hp .fill{background:linear-gradient(90deg,#39c879,#91f1a2);}
      .bu-hp-text{text-align:right;font-size:10px;color:#e7d8ff;}
      .battle-log-panel{display:flex;flex-direction:column;min-height:0;padding:12px;border:2px solid #80613b;border-radius:8px;background:rgba(7,4,13,.88);box-shadow:inset 0 0 0 2px rgba(255,255,255,.05);}
      .battle-log-title{text-align:center;color:#e6c77c;font-size:15px;font-weight:bold;letter-spacing:7px;padding:2px 0 10px;border-bottom:1px solid rgba(230,199,124,.3);}
      #battleLog{flex:1;min-height:0;max-height:none;margin-top:8px;border:0;border-radius:0;background:transparent;padding:0 2px;font-size:12px;line-height:1.8;}
      .battle-footer{display:flex;flex-direction:column;gap:10px;flex-shrink:0;}
      #battleActions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;max-width:74%;padding:0;}
      .battle-skill{min-height:48px;padding:8px 4px;border:3px solid #09050f;border-radius:5px;font-size:12px;box-shadow:2px 3px 0 rgba(0,0,0,.5);}
      .battle-skill .bs-name{font-size:12px;}
      .battle-tip{width:100%;padding:10px 14px;border:2px solid #927044;border-radius:9px;background:rgba(12,5,10,.9);color:#f5e8c8;text-align:center;font-size:clamp(12px,2vw,21px);font-weight:bold;line-height:1.45;text-shadow:1px 2px #000;}
      #battleOverlay .turn-banner{z-index:8;}
      #battleOverlay .result-banner{z-index:9;}
      @media(max-width:700px){
        #battleOverlay{padding:8px;gap:7px;}
        .battle-layout{grid-template-columns:minmax(0,1fr) minmax(112px,31%);gap:6px;}
        .battle-log-panel{padding:7px 6px;}
        .battle-log-title{font-size:11px;letter-spacing:2px;padding-bottom:6px;}
        #battleLog{font-size:10px;line-height:1.55;}
        .battle-scene-title{font-size:11px;padding:4px 9px;letter-spacing:1px;}
        .battle-row{gap:5px;}
        .battle-row.player{min-height:95px;}
        .battle-unit{width:calc(50% - 5px);min-width:0;padding:4px;}
        .bu-icon{height:clamp(38px,8vh,65px);font-size:clamp(32px,9vw,52px);}
        .bu-name{font-size:10px;}
        .bu-hp-text{font-size:9px;}
        #battleActions{max-width:100%;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;}
        .battle-skill{min-height:42px;font-size:10px;padding:6px 2px;}
        .battle-skill .bs-name{font-size:10px;}
        .battle-tip{font-size:11px;padding:7px 8px;}
        .duo-skill-dock{right:7px;bottom:88px;width:116px;}
      }
      @media(max-height:520px) and (orientation:landscape){
        #battleOverlay{padding:5px 10px;gap:5px;}
        .battle-row.player{min-height:70px;}
        .bu-icon{height:42px;font-size:36px;}
        .battle-tip{display:none;}
        .battle-skill{min-height:36px;}
      }
    `;
    document.head.appendChild(retroStyle);
  }
  document.getElementById('stage').appendChild(overlay);
  battle.overlay = overlay;
  return overlay;
}

/* ==================== 战斗日志 ==================== */
function blog(text, cls = ''){
  const el = $('battleLog');
  if (!el) return;
  const d = document.createElement('div');
  d.className = 'blog ' + cls;
  d.innerHTML = text;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 80) el.removeChild(el.firstChild);
}

/* ==================== 伤害计算 ==================== */
function calcDamage(attacker, defender, power, type){
  // 攻击方主属性
  const atkStat = (type === 'magic') ? (attacker.magic || attacker.atk) : attacker.atk;
  // 防御减免系数（物理被防御更多减免）
  const defFactor = (type === 'magic') ? 0.4 : 0.7;
  
  const musicBoost = attacker.isPlayer && battle.round <= battle.musicBuffUntilRound ? 1.25 : 1;
  const base = atkStat * power * (0.9 + Math.random() * 0.2) * musicBoost;
  const reduction = defender.def * defFactor;
  let dmg = Math.max(1, base - reduction);
  
  // 暴击
  const crit = Math.random() < 0.12;
  if (crit) dmg *= 1.6;
  
  // 防御姿态减伤50%
  if (defender.guard){
    dmg *= 0.5;
  }

  // 多邻宗【将军】：每层使玩家最终攻击伤害翻倍，最多4层（16倍）。
  const jiangjunMultiplier = attacker.isPlayer && P.sect === 'duolingo'
    ? Math.pow(2, Math.min(4, battle.jiangjunStacks || 0))
    : 1;
  dmg *= jiangjunMultiplier;
  
  return { dmg: Math.floor(dmg), crit };
}

/* ==================== 单位卡片渲染 ==================== */
/* 每个单位使用独立的本地像素网格立绘，不再把 Emoji 当角色图像。 */
const BATTLE_PIXEL_ART = {
hero:{rows:['....HHHH....','...HSSSSH...','...SSFFSS...','...SSFFSS...','....SSSS....','..BBBBBBBB..','..BWWWWWWB..','.BBWWWWWWBB.','.BBWWGGWWBB.','...WWGGWW...','...KK..KK...','..KKK..KKK..'],colors:{H:'#30202a',S:'#f2c69d',F:'#201c28',B:'#2e7b79',W:'#e8dfbd',G:'#c99a43',K:'#47302a'}},
wolf:{rows:['............','..GG....GG..','.GGGG..GGGG.','GGGGGGGGGGGG','GGGWWGGWWGGG','GGGGGGGGGGGG','.GGGGGGGGGG.','..GGGGGGGG..','..GGG..GGG..','.GGG....GGG.','GG..........','............'],colors:{G:'#737f91',W:'#f4eadc'}},
bandit:{rows:['....HHHH....','...HHHHHH...','...SSSSSS...','...SFFSFS...','....SSSS....','..RRRRRRRR..','..RKKKKKKR..','.RRKKKKKKRR.','.RRKKKKKKRR.','...KK..KK...','...KK..KK...','..KKK..KKK..'],colors:{H:'#38242a',S:'#e9b78d',F:'#211922',R:'#9b3542',K:'#4b3027'}},
tree:{rows:['....GGGG....','..GGGGGGGG..','.GGGGGGGGGG.','GGGGGGGGGGGG','GGGGGGGGGGGG','.GGGGGGGGGG.','...GGGGGG...','.....TT.....','.....TT.....','....TTTT....','....TTTT....','....TTTT....'],colors:{G:'#398d45',T:'#684126'}},
snake:{rows:['............','..GGG.......','.GWWGG......','..GGGGG.....','....GGGGG...','......GGGG..','.......GGGG.','......GGGG..','.....GGG....','....GG......','...GG.......','............'],colors:{G:'#b44a39',W:'#f4d78a'}},
fox:{rows:['..OO....OO..','.OOOO..OOOO.','OOOOOOOOOOOO','OOOWWOOOWWOO','OOOOOOOOOOOO','.OOOOOOOOOO.','..OOOOOOOO..','..OOO..OOO..','.OOO....OOO.','OO..........','............','............'],colors:{O:'#d77a32',W:'#fff0d8'}},
golem:{rows:['....RRRR....','..RRRRRRRR..','.RRRRRRRRRR.','RRRWWRRWWRRR','RRRRRRRRRRRR','RRRRRRRRRRRR','.RRRRRRRRRR.','..RRRRRRRR..','..RRR..RRR..','.RRR....RRR.','RR..........','............'],colors:{R:'#a77a50',W:'#ffd17a'}},
archer:{rows:['....HHHH....','...HHHHHH...','...SSSSSS...','...SFFSFS...','....SSSS....','..GGGGGGGG..','..GWWWWWWG..','.GGWWWWWWGG.','.GGWWWWWWGG.','...GG..GG...','...KK..KK...','..KKK..KKK..'],colors:{H:'#493222',S:'#e7b78d',F:'#211922',G:'#b18a43',W:'#416b43',K:'#493222'}},
fire:{rows:['.....RR.....','....RRRR....','...RRYYRR...','..RRYYYYRR..','.RRYYYYYYRR.','RRYYWWYYWWRR','RRYYYYYYYYRR','.RRYYYYYYRR.','..RRYYYYRR..','...RR..RR...','..RR....RR..','............'],colors:{R:'#bd3e28',Y:'#ff9b32',W:'#fff0a0'}},
ice:{rows:['.....CC.....','....CCCC....','...CCCCCC...','..CCWWWWCC..','.CCWWWWWWCC.','CCWWCCWWCCWW','CCWWWWWWWWCC','.CCWWWWWWCC.','..CCCCCCCC..','...CC..CC...','..CC....CC..','............'],colors:{C:'#5aaed1',W:'#e0f8ff'}},
snowwitch:{rows:['....VVVV....','...VVVVVV...','...SSSSSS...','...SFFSFS...','....SSSS....','..CCCCCCCC..','..CWWWWWWC..','.CCWWWWWWCC.','.CCWWWWWWCC.','...WW..WW...','...KK..KK...','..KKK..KKK..'],colors:{V:'#e9efff',S:'#f1d2bd',F:'#34304b',C:'#536eaa',W:'#e7f5ff',K:'#39405f'}},
crow:{rows:['.....YY.....','....YYYY....','...BBBBBB...','..BBBBBBBB..','.BBBWWBBBBB.','BBBBBBBBBBBB','BBBBBBBBBBBB','.BBBBBBBBBB.','..BBB..BBB..','..BB....BB..','............','............'],colors:{Y:'#ffbb36',B:'#342c45',W:'#fff0a8'}},
lava:{rows:['....RRRR....','...RRYYRR...','..RRYYYYRR..','.RRYYYYYYRR.','RRYYWWWWYYRR','RRYYYYYYYYRR','RRYYYYYYYYRR','.RRYYYYYYRR.','..RRRRRRRR..','...RR..RR...','..RR....RR..','............'],colors:{R:'#63332d',Y:'#ef713b',W:'#ffd36a'}},
demon:{rows:['.RR......RR.','RRRR....RRRR','RRRRRRRRRRRR','.RRRRRRRRRR.','..SSSSSSSS..','..SFFSSFFS..','...SSSSSS...','.RRRRRRRRRR.','RRRRRRRRRRRR','..RRR..RRR..','.RRR....RRR.','RR..........'],colors:{R:'#a52f35',S:'#bd6b54',F:'#21131d'}},
flowerpet:{rows:['....PPPP....','..PPPPPPPP..','.PPPPPPPPPP.','..PPWWPPWW..','...PPPPPP...','....GGGG....','..GGGGGGGG..','..GGGGGGGG..','...GG..GG...','...GG..GG...','..GGG..GGG..','............'],colors:{P:'#d96fa8',W:'#ffe9f4',G:'#4b9c57'}},
tigerpet:{rows:['..OO....OO..','.OOOO..OOOO.','OOOOOOOOOOOO','OOOWWOOOWWOO','OOOOOOOOOOOO','.OBOOOOOOBO.','..OOOOOOOO..','..OOO..OOO..','.OOO....OOO.','OO..........','............','............'],colors:{O:'#d68a32',W:'#fff0d0',B:'#35251e'}},
dragonpet:{rows:['...GG....GG.','..GGGG..GGGG','GGGGGGGGGGGG','GGWWGGGGWWGG','GGGGGGGGGGGG','.GGGGGGGGGG.','..GGGGGGGG..','..GGG..GGG..','.GGG....GGG.','GG..........','............','............'],colors:{G:'#5d9fc0',W:'#e8f7ff'}},
birdpet:{rows:['.....YY.....','....YYYY....','...YYYYYY...','..YYWWWWYY..','.YYYYYYYYYY.','YYYYYYYYYYYY','.YYYYYYYYYY.','..YYYYYYYY..','...YY..YY...','..YY....YY..','............','............'],colors:{Y:'#e5ae36',W:'#fff3a8'}}
};
function battleSpriteKey(u){
  if(u.isPlayer)return 'hero';
  if(u.isPet)return ({huahua:'flowerpet',linghu:'fox',hupo:'tigerpet',xiaolong:'dragonpet',jinwu:'birdpet'})[u.petId]||'flowerpet';
  const id=u.mobId||'';
  if(id==='boss_changan'||id==='boss_huoyan')return 'demon';
  if(id==='boss_jiangnan')return 'tree';
  if(id==='boss_datang')return 'golem';
  if(id==='boss_beiju')return 'ice';
  return ({lang:'wolf',shanzei:'bandit',liukou:'bandit',shuyao:'tree',chimang:'snake',linghu:'fox',shamo:'golem',shadao:'archer',xieyan:'fire',xuelang:'wolf',bingpo:'ice',xuenv:'snowwitch',huoya:'crow',rongyan:'lava',yanmo:'demon'})[id]||(u.isEnemy?'golem':'hero');
}
function makeBattleSprite(u){
  const art=BATTLE_PIXEL_ART[battleSpriteKey(u)]||BATTLE_PIXEL_ART.golem;
  const pixels=[];
  for(let y=0;y<art.rows.length;y++)for(let x=0;x<art.rows[y].length;x++){
    const color=art.colors[art.rows[y][x]];
    if(color)pixels.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 12 12" shape-rendering="crispEdges">${pixels.join('')}</svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}

function battleUnitCard(u){
  const hpPct = clamp(u.hp / u.maxHp * 100, 0, 100);
  const cls = ['battle-unit',u.isPlayer?'is-player':'',u.isPet?'is-pet':'',!u.alive?'dead':'',u.acting?'acting':''].filter(Boolean).join(' ');
  const statusIcons=[];
  if(u.stun&&u.stun>0)statusIcons.push(`<span>💫定身${u.stun}</span>`);
  if(u.guard)statusIcons.push(`<span>🛡️防御</span>`);
  return `
    <div class="${cls}" data-uid="${u.id}">
      <div class="bu-head">
        <div class="bu-icon"><img class="battle-sprite" src="${makeBattleSprite(u)}" alt="${u.name}像素立绘"></div>
        <div class="bu-name">${u.name}${u.lv?`<small>Lv.${u.lv}</small>`:''}</div>
      </div>
      <div class="bu-hp"><div class="fill" style="width:${hpPct}%"></div></div>
      <div class="bu-hp-text">${Math.max(0,Math.ceil(u.hp))}/${u.maxHp}</div>
      ${statusIcons.length?`<div class="bu-status">${statusIcons.join('')}</div>`:''}
    </div>
  `;
}

function renderBattleUnits(){
  const enemyRow = $('enemyRow');
  const playerRow = $('playerRow');
  if (!enemyRow || !playerRow) return;
  
  enemyRow.innerHTML = battle.units.filter(u => u.isEnemy).map(battleUnitCard).join('');
  playerRow.innerHTML = battle.units.filter(u => !u.isEnemy).map(battleUnitCard).join('');
}

/* 显示飘字 */
function showDamageFloat(uid, text, cls = ''){
  const card = document.querySelector(`.battle-unit[data-uid="${uid}"]`);
  if (!card) return;
  const f = document.createElement('div');
  f.className = 'dmg-float ' + cls;
  f.textContent = text;
  card.style.position = 'relative';
  card.appendChild(f);
  setTimeout(() => f.remove(), 1100);
}

/* 单位受击抖动 */
function shakeUnit(uid){
  const card = document.querySelector(`.battle-unit[data-uid="${uid}"]`);
  if (!card) return;
  card.classList.remove('damaged');
  void card.offsetWidth;
  card.classList.add('damaged');
  setTimeout(() => card.classList.remove('damaged'), 350);
}

/* ==================== 战斗准备 ==================== */
function battlePrepare(mobs){
  const overlay = createBattleUI();
  battle.active = true;
  document.getElementById('stage')?.classList.add('battle-active');
  battle.immortalBossId = null;
  battle.immortalEncounterId = null;
  battle.over = false;
  battle.victory = false;
  battle.fled = false;
  battle.round = 0;
  battle.musicBuffUntilRound = 0;
  battle.jiangjunStacks = 0;
  battle.previousRoundDamage=0; battle.incomingRoundDamage=0;
  battle.loopRunning = false;
  battle.token++;
  const battleToken = battle.token;
  
  // 收集场景信息
  battle.scene = getSceneAt(P.x, P.y);
  
  // 组装单位
  const units = [];
  
  // 玩家
  units.push({
    id: 'player',
    name: P.name,
    icon: '🧝',
    spriteId: 'hero',
    isPlayer: true,
    hp: P.hp, maxHp: P.maxHp,
    mp: P.mp, maxMp: P.maxMp,
    atk: P.atk, def: P.def, spd: P.spd, magic: P.magic,
    alive: true, stun: 0, guard: false, acting: false,
  });
  
  // 召唤兽
  if (P.pet){
    units.push({
      id: 'pet',
      name: P.pet.name,
      icon: P.pet.icon,
      petId: P.pet.id,
      isPet: true,
      hp: Math.min(P.pet.hp+petGearStats().hp,P.pet.maxHp+petGearStats().hp), maxHp: P.pet.maxHp+petGearStats().hp,
      mp: 0, maxMp: 0,
      atk: P.pet.atk+petGearStats().atk, def: P.pet.def+petGearStats().def, spd: P.pet.spd+petGearStats().spd,
      petSkill:PET_SKILLS[petBaseSpecies(P.pet)]||null,petSkillRank:P.pet.skillRank||1,petActionCount:0,
      alive: true, stun: 0, guard: false, acting: false,
    });
  }
  
  // 怪物
  mobs.forEach((m, i) => {
    units.push({
      id: 'e' + i,
      mobId: m.id,
      name: m.name,
      icon: m.icon,
      isEnemy: true,
      lv: m.lv,
      hp: m.hp, maxHp: m.maxHp,
      mp: 0, maxMp: 0,
      atk: m.atk, def: m.def, spd: m.spd, magic: m.atk,
      skills: m.skills || [],
      isBoss: !!m.isBoss, bossSkill: m.bossSkill || null, bossEnraged: false, bossActionCount: 0, bossSlowUntilRound: 0,
      exp: m.exp || 30, gold: m.gold || 15,
      alive: true, stun: 0, guard: false, acting: false,
    });
  });
  
  battle.units = units;
  
  // 显示战斗界面
  overlay.classList.toggle('has-duo', P.sect === 'duolingo');
  overlay.classList.remove('fading');
  overlay.classList.add('show');
  $('battleLog').innerHTML = '';
  $('battleActions').innerHTML = '';
  $('resultBanner').classList.remove('show');
       document.getElementById('stage')?.classList.remove('battle-active');
  
  renderBattleUnits();
  
  // 战斗开场提示
  const mobNames = mobs.map(m => `${m.icon}${m.name}`).join(' ');
  blog(`⚔️ 遭遇 <b>${mobNames}</b>！`, 'warn');
  
  // 短暂延迟后开始
  setTimeout(() => {
    if (battle.active && battle.token === battleToken && !battle.loopRunning){
      battleLoop(battleToken);
    }
  }, 500);
}

/* ==================== 战斗主循环 ==================== */
async function battleLoop(token = battle.token){
  if (battle.loopRunning) return;
  battle.loopRunning = true;
  try {
    while (battle.active && token === battle.token && !battle.over && battle.round < 30){
    battle.round++;
    battle.previousRoundDamage=battle.incomingRoundDamage||0; battle.incomingRoundDamage=0;
    
    // 回合提示
    showTurnBanner(`第 ${battle.round} 回合`);
    blog(`—— 第 ${battle.round} 回合 ——`, 'round');
    await sleep(700);
    
    // 清除回合开始状态
    battle.units.forEach(u => u.guard = false);
    
    // 按速度排序
    const order = battle.units
      .filter(u => u.alive)
      .sort((a, b) => (b.spd - a.spd) + (Math.random() - 0.5) * 3);
    
    for (const u of order){
      if (!u.alive || battle.over) continue;
      
      // 定身检查
      if (u.stun > 0){
        u.stun--;
        u.acting = true;
        renderBattleUnits();
        blog(`💫 <b>${u.name}</b> 被定身，无法行动。`, 'dim');
        await sleep(450);
        u.acting = false;
        renderBattleUnits();
        continue;
      }
      
      u.acting = true;
      renderBattleUnits();
      await sleep(200);
      
      if (u.isPlayer){
        await playerTurn(u);
      } else if (u.isPet){
        await petTurn(u);
      } else {
        await monsterTurn(u);
      }
      
      u.acting = false;
      renderBattleUnits();
      checkBattleEnd();
      
      if (battle.over) break;
      await sleep(300);
    }
  }
  
    // 战斗结束后必须进入结算界面
    if (token !== battle.token) return;
    if (battle.over){
      if (battle.fled) finishBattle('flee');
      else if (battle.victory) finishBattle('victory');
      else finishBattle('defeat');
    } else if (battle.active){
      // 超过30回合，平局
      blog('⏳ 战斗超时，双方各自收手。', 'dim');
      battle.over = true;
      finishBattle('draw');
    }
  } finally {
    if (token === battle.token) battle.loopRunning = false;
  }
}

/* ==================== 玩家回合 ==================== */
function playerTurn(unit){
  return new Promise(resolve => {
    if (!battle.active || battle.over || !unit || !unit.alive){
      resolve();
      return;
    }
    const actions = $('battleActions');
    actions.innerHTML = '';
    const duoDock = $('duoSkillDock');
    if (duoDock){
      duoDock.hidden = P.sect !== 'duolingo';
      duoDock.innerHTML = '';
    }

    // 主菜单：攻击 / 技能 / 防御 / 逃跑 / 物品
    const mainMenu = [
      { key:'attack',  name:'普通攻击', icon:'⚔️', cls:'basic' },
      { key:'skill',   name:'施放技能', icon:'✨', cls:'' },
      { key:'item',    name:'使用物品', icon:'🧪', cls:'item' },
      { key:'defend',  name:'防御',     icon:'🛡️', cls:'defend' },
      { key:'flee',    name:'逃跑',     icon:'💨', cls:'flee' },
      { key:'auto',    name:'自动战斗', icon:'🤖', cls:'basic' },
    ];
    
    mainMenu.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'battle-skill ' + m.cls;
      btn.innerHTML = `<span class="bs-name">${m.icon} ${m.name}</span>`;
      btn.addEventListener('click', () => {
        actions.innerHTML = '';
        if (duoDock) duoDock.hidden = true;
        handlePlayerAction(unit, m.key, resolve);
      });
      actions.appendChild(btn);
    });

    if (duoDock && P.sect === 'laomu') renderLaomuSkills(unit,resolve,duoDock);

    // 多邻宗专属的两个战斗快捷键：只在玩家行动阶段出现。
    if (duoDock && P.sect === 'duolingo'){
      const english = document.createElement('button');
      english.className = 'duo-skill-btn';
      english.innerHTML = '<span>📚 学英语</span><small>硬控敌人 1 回合 · 8 法力</small>';
      english.disabled = unit.mp < 8;
      english.addEventListener('click', () => {
        duoDock.hidden = true;
        actions.innerHTML = '';
        useDuolingoShortcut(unit, 'english', resolve);
      });

      const music = document.createElement('button');
      music.className = 'duo-skill-btn music';
      music.innerHTML = '<span>🎵 音乐共鸣</span><small>Lv.5 解锁 · 20 法力</small>';
      music.disabled = P.lv < 5 || unit.mp < 20;
      music.addEventListener('click', () => {
        duoDock.hidden = true;
        actions.innerHTML = '';
        useDuolingoShortcut(unit, 'music', resolve);
      });

      const jiangjun = document.createElement('button');
      jiangjun.className = 'duo-skill-btn jiangjun';
      jiangjun.innerHTML = '<span>⚔️ 将军 ×' + Math.pow(2, battle.jiangjunStacks) + '</span><small>Lv.1 · 10 法力 · 已叠加 ' + battle.jiangjunStacks + '/4 层</small>';
      jiangjun.disabled = unit.mp < 10 || battle.jiangjunStacks >= 4;
      jiangjun.addEventListener('click', () => {
        duoDock.hidden = true;
        actions.innerHTML = '';
        useDuolingoShortcut(unit, 'jiangjun', resolve);
      });
      duoDock.append(english, music, jiangjun);
    }
  });
}


/* 多邻宗快捷技能 */
function renderLaomuSkills(unit,resolve,dock){
 dock.hidden=false;dock.innerHTML='';
 const defs=[{id:'roll',name:'🪵 滚木',detail:'Lv.1 · 10法力 · 无敌60秒 · 冷却60分钟',lv:1,mp:10},{id:'sigma',name:'👊 西格玛滚木拳',detail:'Lv.3 · 67法力 · 固定伤害67',lv:3,mp:67},{id:'eye',name:'👁️ 滚木之眼',detail:'Lv.5 · 20法力 · 上轮受伤×2',lv:5,mp:20},{id:'vanish',name:'🌲 浮木消失术',detail:'Lv.10 · 100法力 · 仅对等级不高于自身的普通敌人有效，Boss免疫',lv:10,mp:100}];
 defs.filter(s=>P.lv>=s.lv).forEach(s=>{const btn=document.createElement('button');btn.className='duo-skill-btn';const remain=Math.max(0,P.laomuCooldownUntil-Date.now());btn.innerHTML='<span>'+s.name+'</span><small>'+s.detail+(s.id==='roll'&&remain?' · 冷却 '+Math.ceil(remain/60000)+'分钟':'')+'</small>';btn.disabled=unit.mp<s.mp||(s.id==='roll'&&remain>0);btn.onclick=()=>{dock.hidden=true;dock.innerHTML='';useLaomuSkill(unit,s.id,resolve);};dock.appendChild(btn);});
}
function useLaomuSkill(unit,id,resolve){
 const cost={roll:10,sigma:67,eye:20,vanish:100}[id];
 if(!battle.active||battle.over||!unit||!unit.alive){resolve();return;}
 if(unit.mp<cost){blog('法力不足，无法施展此技能。','bad');resolve();return;}
 if(id==='roll'&&Date.now()<P.laomuCooldownUntil){blog('【滚木】仍在冷却中。','dim');resolve();return;}
 const allEnemies=battle.units.filter(u=>u.alive&&u.isEnemy);
 const enemies=id==='vanish'?allEnemies.filter(u=>!u.isBoss&&Number(u.lv||1)<=Number(P.lv||1)):allEnemies;
 if(id==='vanish'&&!enemies.length){blog('🌲【浮木消失术】只能对等级不高于自己的普通敌人使用，Boss与高等级敌人免疫。','warn');resolve();return;}
 if(!enemies.length){resolve();return;}
 const cast=target=>{
  if(id==='vanish'&&(target.isBoss||Number(target.lv||1)>Number(P.lv||1))){blog('目标等级过高或属于 Boss，【浮木消失术】无效！','warn');resolve();return;}
  if(!target||!target.alive){resolve();return;}
  unit.mp-=cost;if(unit.isPlayer)P.mp=unit.mp;
  if(id==='roll'){P.laomuCooldownUntil=Date.now()+3600000;unit.invulnerableUntil=Date.now()+60000;saveGame();blog('🪵【滚木】护体发动！60秒内免疫敌方伤害，冷却60分钟。','good');showDamageFloat(unit.id,'无敌60秒','crit');}
  else if(id==='sigma'){target.hp=Math.max(0,target.hp-67);if(target.hp<=0)target.alive=false;showDamageFloat(target.id,'-67','crit');blog('👊【西格玛滚木拳】造成固定67点伤害！','good');}
  else if(id==='eye'){const dmg=Math.max(0,(battle.previousRoundDamage||0)*2);target.hp=Math.max(0,target.hp-dmg);if(target.hp<=0)target.alive=false;showDamageFloat(target.id,'-'+dmg,'crit');blog('👁️【滚木之眼】上一轮承受伤害×2，造成'+dmg+'点伤害！','good');}
  else if(id==='vanish'){battle.units=battle.units.filter(u=>u!==target);blog('🌲【浮木消失术】使'+target.name+'消失，未计入击杀奖励。','good');}
  renderBattleUnits();updateHUD();setTimeout(resolve,450);
 };
 if(id==='roll')cast(enemies[0]);else if(enemies.length===1)cast(enemies[0]);else showTargetSelect(enemies,resolve,cast);
}
function useDuolingoShortcut(unit, skill, resolve){
  if (!battle.active || battle.over || !unit || !unit.alive) { resolve(); return; }

  if (skill === 'english'){
    if (unit.mp < 8){ blog('法力不足，无法施展【学英语】。','bad'); resolve(); return; }
    const enemies = battle.units.filter(u => u.alive && u.isEnemy);
    if (!enemies.length){ resolve(); return; }
    const cast = target => {
      if (!target || !target.alive){ resolve(); return; }
      unit.mp -= 8;
      if (unit.isPlayer) P.mp = unit.mp;
      // stun=1：目标下一次行动时跳过本回合，随后自动解除。
      target.stun = Math.max(target.stun || 0, 1);
      blog(`📚 <b>${unit.name}</b> 大喊 “Study English!” 施展【学英语】，<b>${target.name}</b> 被硬控 1 回合！`,'warn');
      showDamageFloat(target.id,'STUN','crit');
      renderBattleUnits();
      updateHUD();
      setTimeout(resolve,450);
    };
    if (enemies.length === 1) cast(enemies[0]);
    else showTargetSelect(enemies,resolve,cast);
    return;
  }

  if (skill === 'jiangjun'){
    if (P.lv < 1){ blog('【将军】需要达到 Lv.1。','dim'); resolve(); return; }
    if (unit.mp < 10){ blog('法力不足，无法施展【将军】。','bad'); resolve(); return; }
    if (battle.jiangjunStacks >= 4){ blog('【将军】已经叠满4层，伤害倍率达到16倍！','good'); resolve(); return; }
    unit.mp -= 10;
    if (unit.isPlayer) P.mp = unit.mp;
    battle.jiangjunStacks++;
    const multiplier = Math.pow(2, battle.jiangjunStacks);
    blog('⚔️ <b>' + unit.name + '</b> 施展【将军】！攻击伤害提升至 <b>' + multiplier + '倍</b>（' + battle.jiangjunStacks + '/4层），持续本场战斗！','good');
    showDamageFloat(unit.id, '伤害×' + multiplier, 'crit');
    renderBattleUnits();
    updateHUD();
    setTimeout(resolve,450);
    return;
  }

  if (skill === 'music'){
    if (P.lv < 5){ blog('【音乐共鸣】需要达到 Lv.5。','dim'); resolve(); return; }
    if (unit.mp < 20){ blog('法力不足，无法奏响【音乐共鸣】。','bad'); resolve(); return; }
    unit.mp -= 20;
    if (unit.isPlayer) P.mp = unit.mp;
    const enemies = battle.units.filter(u => u.alive && u.isEnemy);
    enemies.forEach(target => {
      const result = calcDamage(unit,target,1.35,'magic');
      target.hp = Math.max(0,target.hp-result.dmg);
      if (target.hp <= 0) target.alive = false;
      shakeUnit(target.id);
      showDamageFloat(target.id,`-${result.dmg}`,result.crit?'crit':'');
      blog(`🎵 【音乐共鸣】的音浪击中 <b>${target.name}</b>，造成 <b>${result.dmg}</b> 点法术伤害。`,'good');
    });
    battle.musicBuffUntilRound = battle.round + 2;
    blog('🎼 灵韵节拍回荡：接下来 2 回合造成的伤害提高 25%！','good');
    renderBattleUnits();
    updateHUD();
    setTimeout(resolve,500);
  }
}

function handlePlayerAction(unit, action, resolve){
  const actions = $('battleActions');
  
  if (action === 'attack'){
    // 选择目标（多个时）
    const enemies = battle.units.filter(u => u.alive && u.isEnemy);
    if (enemies.length === 1){
      performAttack(unit, enemies[0], 1.0, 'phys', resolve);
    } else {
      showTargetSelect(enemies, resolve, (target) => {
        performAttack(unit, target, 1.0, 'phys', resolve);
      });
    }
  } else if (action === 'skill'){
    showSkillMenu(unit, resolve);
  } else if (action === 'item'){
    showItemMenu(unit, resolve);
  } else if (action === 'defend'){
    // 防御必须明确结束当前玩家回合；使用微任务交接，避免首次战斗时
    // 同步 resolve 与 battleLoop 的渲染/输入状态发生竞争而卡住。
    unit.guard = true;
    blog(`🛡️ <b>${unit.name}</b> 凝神戒备，进入防御姿态。`, 'good');
    renderBattleUnits();
    setTimeout(() => {
      if (battle.active && !battle.over) resolve();
      else resolve();
    }, 0);
  } else if (action === 'flee'){
    if (Math.random() < 0.6){
      battle.over = true;
      battle.fled = true;
      blog('💨 你施展身法，成功脱离了战斗！', 'warn');
    } else {
      blog('❌ 逃跑失败！', 'bad');
    }
    resolve();
  } else if (action === 'auto'){
    // 自动战斗：选最低血敌人普攻
    const enemies = battle.units.filter(u => u.alive && u.isEnemy);
    if (!enemies.length) { resolve(); return; }
    const target = enemies.reduce((a, b) => a.hp < b.hp ? a : b);
    performAttack(unit, target, 1.0, 'phys', resolve);
  }
}

function showTargetSelect(enemies, resolve, onSelect){
  const actions = $('battleActions');
  actions.innerHTML = '';
  
  const back = document.createElement('button');
  back.className = 'skill-back';
  back.textContent = '← 返回';
  back.addEventListener('click', () => {
    actions.innerHTML = '';
    // 重新进入玩家回合
    if (typeof playerTurn === 'function'){
      playerTurn(battle.units.find(u => u.isPlayer)).then(resolve);
    }
  });
  actions.appendChild(back);
  
  enemies.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'battle-skill basic';
    btn.innerHTML = `
      <span class="bs-name">${e.icon}${e.name}</span>
      <span class="bs-mp">HP ${Math.ceil(e.hp)}/${e.maxHp}</span>
    `;
    btn.addEventListener('click', () => {
      actions.innerHTML = '';
      onSelect(e);
    });
    actions.appendChild(btn);
  });
}

function showSkillMenu(unit, resolve){
  const actions = $('battleActions');
  actions.innerHTML = '';
  
  const skills = getSectSkills();
  
  if (!skills.length){
    blog('你尚未习得任何技能。', 'dim');
    // 重新进入玩家回合
    playerTurn(unit).then(resolve);
    return;
  }
  
  skills.forEach(sk => {
    const canUse = unit.mp >= sk.mp;
    const btn = document.createElement('button');
    btn.className = 'battle-skill' + (canUse ? '' : ' disabled');
    btn.innerHTML = `
      <span class="bs-type">${sk.type === 'magic' ? '法' : sk.type === 'phys' ? '武' : sk.type === 'heal' ? '疗' : '封'}</span>
      <span class="bs-name">${sk.name}</span>
      <span class="bs-mp">${sk.mp} 法力</span>
    `;
    if (canUse){
      btn.addEventListener('click', () => {
        actions.innerHTML = '';
        // 群体技能直接释放
        if (sk.target === 'all' || sk.type === 'heal'){
          unit.mp -= sk.mp;
          applySkill(unit, sk);
          resolve();
        } else {
          // 单体技能选目标
          const enemies = battle.units.filter(u => u.alive && u.isEnemy);
          if (enemies.length === 1){
            unit.mp -= sk.mp;
            applySkill(unit, sk, enemies[0]);
            resolve();
          } else {
            showTargetSelect(enemies, resolve, (t) => {
              unit.mp -= sk.mp;
              applySkill(unit, sk, t);
              resolve();
            });
          }
        }
      });
    }
    actions.appendChild(btn);
  });
  
  const back = document.createElement('button');
  back.className = 'skill-back';
  back.textContent = '← 返回';
  back.addEventListener('click', () => {
    actions.innerHTML = '';
    playerTurn(unit).then(resolve);
  });
  actions.appendChild(back);
}

function showItemMenu(unit, resolve){
  const actions = $('battleActions');
  actions.innerHTML = '';
  
  const bagItems = Object.keys(P.bag).filter(k => P.bag[k] > 0 && ITEMS[k] && ITEMS[k].type === 'potion');
  
  if (!bagItems.length){
    blog('你没有可用的药品。', 'dim');
    playerTurn(unit).then(resolve);
    return;
  }
  
  bagItems.forEach(id => {
    const it = ITEMS[id];
    const btn = document.createElement('button');
    btn.className = 'battle-skill item';
    btn.innerHTML = `
      <span class="bs-name">${it.icon}${it.name}</span>
      <span class="bs-mp">×${P.bag[id]}</span>
    `;
    btn.addEventListener('click', () => {
      actions.innerHTML = '';
      // 使用物品
      const result = it.use();
      P.bag[id]--;
      if (P.bag[id] <= 0) delete P.bag[id];
      blog(`🧪 <b>${unit.name}</b> 使用了 ${it.icon}${it.name}，${result}`, 'good');
      // 同步战斗单位数据
      unit.hp = P.hp;
      unit.mp = P.mp;
      renderBattleUnits();
      resolve();
    });
    actions.appendChild(btn);
  });
  
  const back = document.createElement('button');
  back.className = 'skill-back';
  back.textContent = '← 返回';
  back.addEventListener('click', () => {
    actions.innerHTML = '';
    playerTurn(unit).then(resolve);
  });
  actions.appendChild(back);
}

/* ==================== 执行攻击 ==================== */
function performAttack(caster, target, power, type, resolve){
  const { dmg, crit } = calcDamage(caster, target, power, type);
  target.hp = Math.max(0, target.hp - dmg);
  
  if (target.hp <= 0){
    target.alive = false;
  }
  
  // 动画
  shakeUnit(target.id);
  showDamageFloat(target.id, `-${dmg}`, crit ? 'crit' : '');
  
  const isAlly = caster.isPlayer || caster.isPet;
  const cls = isAlly ? 'good' : 'bad';
  blog(
    `${crit ? '💥' : '⚔️'} <b>${caster.name}</b> 攻击 <b>${target.name}</b>，造成 <b>${dmg}</b> 点伤害${crit ? '（暴击！）' : ''}`,
    cls
  );
  
  if (!target.alive){
    blog(`☠️ <b>${target.name}</b> 倒下了！`, 'warn');
  }
  
  renderBattleUnits();
  setTimeout(resolve, 350);
}

/* ==================== 应用技能 ==================== */
function applySkill(caster, skill, target){
  // 治疗技能
  if (skill.type === 'heal'){
    const power = skill.power;
    const stat = caster.magic || caster.atk;
    const amount = Math.floor(stat * power * 1.5);
    const before = caster.hp;
    caster.hp = Math.min(caster.maxHp, caster.hp + amount);
    const actual = caster.hp - before;
    if (skill.id === 'jin') caster.guard = true;
    
    // 同步玩家血量
    if (caster.isPlayer){ P.hp = caster.hp; P.mp = caster.mp; }
    
    showDamageFloat(caster.id, `+${actual}`, 'heal');
    blog(`✨ <b>${caster.name}</b> 施展【${skill.name}】，恢复 <b>${actual}</b> 点气血！`, 'good');
    renderBattleUnits();
    return;
  }
  
  // 封印/定身
  if (skill.type === 'debuff'){
    if (!target) return;
    target.stun = (target.stun || 0) + 2;
    blog(`🔒 <b>${caster.name}</b> 施展【${skill.name}】，<b>${target.name}</b> 被定身 2 回合！`, 'warn');
    renderBattleUnits();
    return;
  }
  
  // 攻击技能
  let targets;
  if (skill.target === 'all'){
    targets = battle.units.filter(u => u.alive && (caster.isEnemy ? !u.isEnemy : u.isEnemy));
  } else {
    targets = [target];
  }
  
  targets.forEach(t => {
    if (!t || !t.alive) return;
    const { dmg, crit } = calcDamage(caster, t, skill.power, skill.type);
    t.hp = Math.max(0, t.hp - dmg);
    if (t.hp <= 0) t.alive = false;
    
    shakeUnit(t.id);
    showDamageFloat(t.id, `-${dmg}`, crit ? 'crit' : '');
    
    const isAlly = caster.isPlayer || caster.isPet;
    blog(
      `${crit ? '💥' : '✨'} <b>${caster.name}</b> 施展【${skill.name}】，对 <b>${t.name}</b> 造成 <b>${dmg}</b> 点伤害${crit ? '（暴击！）' : ''}`,
      isAlly ? 'good' : 'bad'
    );
    
    if (!t.alive){
      blog(`☠️ <b>${t.name}</b> 倒下了！`, 'warn');
    }
  });
  
  // 普度众生：攻击同时回血
  if (skill.id === 'pu'){
    const healAmt = Math.floor((caster.magic || caster.atk) * 0.8);
    caster.hp = Math.min(caster.maxHp, caster.hp + healAmt);
    if (caster.isPlayer){ P.hp = caster.hp; }
    showDamageFloat(caster.id, `+${healAmt}`, 'heal');
    blog(`💚 <b>${caster.name}</b> 同时恢复了 <b>${healAmt}</b> 点气血。`, 'good');
  }
  
  // 破釜沉舟：自损
  if (skill.id === 'po'){
    const selfDmg = Math.floor(caster.hp * 0.1);
    caster.hp = Math.max(1, caster.hp - selfDmg);
    if (caster.isPlayer){ P.hp = caster.hp; }
    showDamageFloat(caster.id, `-${selfDmg}`, '');
    blog(`💔 <b>${caster.name}</b> 燃烧气血，自损 <b>${selfDmg}</b> 点。`, 'dim');
  }
  
  renderBattleUnits();
}

/* ==================== 召唤兽回合 ==================== */
async function petTurn(unit){
  const enemies = battle.units.filter(u => u.alive && u.isEnemy);
  if (!enemies.length) return;
  const target = enemies.reduce((a, b) => a.hp < b.hp ? a : b);
  unit.petActionCount=(unit.petActionCount||0)+1;
  const skill=unit.petSkill;
  if(skill&&unit.petActionCount%3===0){
    const rank=Math.max(1,Math.min(3,unit.petSkillRank||1));
    if(skill.type==='heal'){
      const amount=Math.max(1,Math.floor(unit.maxHp*skill.power*rank));
      const actual=Math.min(unit.maxHp-unit.hp,amount);unit.hp+=actual;
      showDamageFloat(unit.id,'+'+actual,'heal');
      blog('🌸 <b>'+unit.name+'</b> 施展【'+skill.name+'】，恢复 '+actual+' 点气血！','good');
    }else{
      blog('✨ <b>'+unit.name+'</b> 施展【'+skill.name+'】！','good');await sleep(250);
      const {dmg,crit}=calcDamage(unit,target,skill.power+(rank-1)*.18,skill.type);
      target.hp=Math.max(0,target.hp-dmg);if(target.hp<=0)target.alive=false;
      shakeUnit(target.id);showDamageFloat(target.id,'-'+dmg,crit?'crit':'');
      blog('🐾 技能命中 <b>'+target.name+'</b>，造成 <b>'+dmg+'</b> 点伤害'+(crit?'（暴击）':''),'good');
      if(skill.effect==='stun'&&target.alive&&Math.random()<.2){target.stun=Math.max(target.stun||0,1);blog('❄️ '+target.name+' 被寒霜定身！','good');}
      if(skill.effect==='burn'&&target.alive){const burn=Math.max(1,Math.floor(unit.atk*.15*rank));target.hp=Math.max(0,target.hp-burn);if(target.hp<=0)target.alive=false;showDamageFloat(target.id,'灼烧 -'+burn,'');blog('🔥 日曜余焰追加 '+burn+' 点伤害！','good');}
    }
    renderBattleUnits();await sleep(300);return;
  }
  blog(`🐾 <b>${unit.name}</b> 扑向 <b>${target.name}</b>！`);
  await sleep(250);
  const { dmg, crit } = calcDamage(unit, target, 1.0, 'phys');
  target.hp = Math.max(0, target.hp - dmg);
  if (target.hp <= 0) target.alive = false;
  
  shakeUnit(target.id);
  showDamageFloat(target.id, `-${dmg}`, crit ? 'crit' : '');
  
  blog(
    `${crit ? '💥' : '🐾'} 造成 <b>${dmg}</b> 点伤害${crit ? '（暴击！）' : ''}`,
    'good'
  );
  
  if (!target.alive){
    blog(`☠️ <b>${target.name}</b> 倒下了！`, 'warn');
  }
  
  renderBattleUnits();
  await sleep(300);
}

/* ==================== 怪物回合 ==================== */
/* ==================== 五大 Boss 专属战斗机制 ==================== */
async function bossTurn(unit){
 const allies=battle.units.filter(u=>u.alive&&!u.isEnemy);
 if(!allies.length)return;
 const vulnerable=allies.filter(a=>!(a.isPlayer&&a.invulnerableUntil>Date.now()));
 if(!vulnerable.length){blog('🪵【滚木】护体生效，Boss攻击无法伤害你！','good');await sleep(250);return;}
 const target=vulnerable.reduce((a,b)=>a.hp<b.hp?a:b);
 if(!unit.bossEnraged&&unit.hp<=unit.maxHp*.5){
  unit.bossEnraged=true;unit.atk=Math.floor(unit.atk*1.25);unit.spd=Math.floor(unit.spd*1.15);
  blog('🔥 <b>'+unit.name+'</b> 进入狂暴状态！攻击与速度提升！','bad');
  showDamageFloat(unit.id,'狂暴！','crit');renderBattleUnits();await sleep(300);
 }
 unit.bossActionCount=(unit.bossActionCount||0)+1;
 const skill=unit.bossSkill;
 const useSkill=skill&&unit.bossActionCount%3===0;
 if(useSkill){
  const targets=skill.target==='all'?vulnerable:[target];
  blog('⚠️ <b>'+unit.name+'</b> 正在施展【'+skill.name+'】！','warn');
  await sleep(300);
  let total=0;
  targets.forEach(t=>{
   if(!t.alive)return;
   const {dmg,crit}=calcDamage(unit,t,skill.power,skill.type);
   t.hp=Math.max(0,t.hp-dmg);if(t.hp<=0)t.alive=false;
   if(t.isPlayer){battle.incomingRoundDamage=(battle.incomingRoundDamage||0)+dmg;}
   if(skill.effect==='stun'&&t.alive&&Math.random()<.45)t.stun=Math.max(t.stun||0,1);
   if(skill.effect==='slow'&&t.alive){t.spd=Math.max(1,Math.floor(t.spd*.85));t.bossSlowed=true;}
   shakeUnit(t.id);showDamageFloat(t.id,'-'+dmg,crit?'crit':'');total+=dmg;
   blog('💥【'+skill.name+'】命中 <b>'+t.name+'</b>，造成 <b>'+dmg+'</b> 点伤害'+(crit?'（暴击）':''),'bad');
   if(!t.alive)blog('☠️ <b>'+t.name+'</b> 倒下了！','bad');
  });
  if(skill.effect==='drain'){const heal=Math.min(unit.maxHp-unit.hp,Math.max(1,Math.floor(total*.35)));unit.hp+=heal;showDamageFloat(unit.id,'+'+heal,'heal');blog('🌿 古木汲取生命，恢复 '+heal+' 点气血！','good');}
  if(skill.effect==='burn')targets.filter(t=>t.alive).forEach(t=>{const burn=Math.max(1,Math.floor(unit.atk*.12));t.hp=Math.max(0,t.hp-burn);if(t.hp<=0)t.alive=false;if(t.isPlayer)battle.incomingRoundDamage+=burn;showDamageFloat(t.id,'灼烧 -'+burn,'');blog('🔥 烈焰持续灼烧 '+t.name+'，追加 '+burn+' 点伤害。','bad');});
 }else{
  const {dmg,crit}=calcDamage(unit,target,1,'phys');
  target.hp=Math.max(0,target.hp-dmg);if(target.hp<=0)target.alive=false;
  if(target.isPlayer)battle.incomingRoundDamage=(battle.incomingRoundDamage||0)+dmg;
  shakeUnit(target.id);showDamageFloat(target.id,'-'+dmg,crit?'crit':'');
  blog('👹 <b>'+unit.name+'</b> 发动重击，对 <b>'+target.name+'</b> 造成 <b>'+dmg+'</b> 点伤害'+(crit?'（暴击）':''),'bad');
  if(!target.alive)blog('☠️ <b>'+target.name+'</b> 倒下了！','bad');
 }
 renderBattleUnits();await sleep(400);
}

async function monsterTurn(unit){
  if(unit.isBoss){await bossTurn(unit);return;}
  const allies = battle.units.filter(u => u.alive && !u.isEnemy);
  if (!allies.length) return;
  
  const vulnerable=allies.filter(a=>!(a.isPlayer&&a.invulnerableUntil>Date.now()));
  if(!vulnerable.length){blog('🪵【滚木】护体生效，敌方攻击无法伤害你！','good');await sleep(250);return;}
  const target = vulnerable.reduce((a, b) => a.hp < b.hp ? a : b);
  
  // 怪物偶尔使用技能
  if (unit.skills && unit.skills.length && Math.random() < 0.3){
    const sk = unit.skills[Math.floor(Math.random() * unit.skills.length)];
    const { dmg } = calcDamage(unit, target, sk.power || 1.3, sk.type || 'magic');
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp <= 0) target.alive = false;
    
    if(target.isPlayer) battle.incomingRoundDamage+=dmg;
    shakeUnit(target.id);
    showDamageFloat(target.id, `-${dmg}`, '');
    blog(`😈 <b>${unit.name}</b> 施展【${sk.name}】，对 <b>${target.name}</b> 造成 <b>${dmg}</b> 点伤害`, 'bad');
  } else {
    const { dmg, crit } = calcDamage(unit, target, 1.0, 'phys');
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp <= 0) target.alive = false;
    
    if(target.isPlayer) battle.incomingRoundDamage+=dmg;
    shakeUnit(target.id);
    showDamageFloat(target.id, `-${dmg}`, crit ? 'crit' : '');
    blog(`👹 <b>${unit.name}</b> 攻击 <b>${target.name}</b>，造成 <b>${dmg}</b> 点伤害${crit ? '（暴击！）' : ''}`, 'bad');
  }
  
  if (!target.alive){
    blog(`☠️ <b>${target.name}</b> 倒下了！`, 'bad');
  }
  
  renderBattleUnits();
  await sleep(350);
}

/* ==================== 检查战斗结束 ==================== */
function checkBattleEnd(){
  const enemies = battle.units.filter(u => u.alive && u.isEnemy);
  const allies = battle.units.filter(u => u.alive && !u.isEnemy);
  
  if (enemies.length === 0){
    battle.over = true;
    battle.victory = true;
  } else if (allies.length === 0){
    battle.over = true;
    battle.victory = false;
  }
}

/* ==================== 战斗回合提示 ==================== */
function showTurnBanner(text){
  const el = $('turnBanner');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

/* ==================== 战斗结算 ==================== */
function finishBattle(result){
  // 先解除战斗状态，确保结算界面出现后地图不会被旧状态锁死。
  battle.active = false;
  battle.over = true;
  
  const playerUnit = battle.units.find(u => u.isPlayer);
  const petUnit = battle.units.find(u => u.isPet);
  
  // 同步玩家状态
  if (playerUnit){
    P.hp = Math.max(1, playerUnit.hp);
    P.mp = playerUnit.mp;
  }
  if (petUnit && P.pet){
    P.pet.hp = Math.max(1, Math.floor(P.pet.maxHp * 0.2));
  }
  
  const duoDock = $('duoSkillDock');
  if (duoDock) duoDock.hidden = true;
  const banner = $('resultBanner');
  banner.innerHTML = '';
  
  if (result === 'flee' || battle.fled){
    banner.innerHTML = `
      <div class="rb-title win" style="color:#80d0ff;text-shadow:3px 3px 0 #000,0 0 30px rgba(128,208,255,.9)">脱 离</div>
      <div class="rb-info">你成功脱离了战斗</div>
      <button class="rb-btn" id="rbOk">继 续</button>
    `;
  } else if (result === 'draw'){
    banner.innerHTML = `
      <div class="rb-title" style="color:#c0a0e8">平 局</div>
      <div class="rb-info">战斗超时，双方各自收手</div>
      <button class="rb-btn" id="rbOk">继 续</button>
    `;
  } else if (battle.victory){
    if (battle.immortalEncounterId){
      const enemy=IMMORTAL_ENCOUNTERS.find(x=>x.id===battle.immortalEncounterId),loot=grantImmortalEncounterReward(battle.immortalEncounterId);
      banner.innerHTML='<div class="rb-title win">仙界探索胜利</div><div class="rb-info">击败 <b>'+enemy.name+'</b><br>仙灵之气 <b>+'+loot.qi+'</b> · 仙玉 <b>+'+loot.jade+'</b><br>道行 <b>+'+loot.dao+'</b><br>获得对应区域材料 ×1</div><button class="rb-btn" id="rbOk">继续探索</button>';
    } else if (battle.immortalBossId){
      const boss=IMMORTAL_BOSSES.find(x=>x.id===battle.immortalBossId),loot=grantImmortalBossReward(battle.immortalBossId);
      banner.innerHTML='<div class="rb-title win">仙战胜利</div><div class="rb-info">击败 <b>'+boss.name+'</b><br>获得仙灵之气 <b>+'+loot.qi+'</b><br>获得仙玉 <b>+'+loot.jade+'</b><br>获得道行 <b>+'+loot.dao+'</b><br>获得 '+({starSand:'星辰砂',swordShard:'诛仙剑片',chaosShard:'混沌碎片',voidCrystal:'虚空晶石',immortalHerb:'仙草'}[loot.material]||loot.material)+' <b>×'+loot.amount+'</b><br><small>'+(loot.first?'首次击败奖励':'重复挑战奖励')+'</small></div><button class="rb-btn" id="rbOk">继续</button>';
      addLog('【仙界战斗】击败 '+boss.name+'，获得仙界资源','good');
    } else {
    // 计算奖励
    let exp = 0, gold = 0;
    battle.units.filter(u => u.isEnemy).forEach(m => {
      exp += m.exp || 30;
      gold += m.gold || 15;
    });
    
    // 加成
    const bonus = 1 + P.lv * 0.05;
    exp = Math.floor(exp * bonus);
    gold = Math.floor(gold * bonus);
    
    P.gold += gold;
    P.battles++;
    P.kills = (P.kills || 0) + battle.units.filter(u => u.isEnemy && !u.alive).length;
    if (!P.killStats || typeof P.killStats !== 'object') P.killStats = {};
    const bossLoot=[];
    battle.units.filter(u=>u.isEnemy&&!u.alive).forEach(u=>{
      P.killStats[u.mobId||u.name]=(P.killStats[u.mobId||u.name]||0)+1;
      if(u.mobId&&u.mobId.startsWith('boss_')){
        if(!P.bossDrops[u.mobId]){const book=CULTIVATION_BOOKS.find(x=>x.boss===u.mobId);if(book){P.cultivationBooks.push(book.id);P.bossDrops[u.mobId]=true;bossLoot.push({type:'功法',name:book.name,icon:'📜',quality:'珍稀'});toast('Boss掉落功法：'+book.name);addLog('获得功法 '+book.name,'good');}}
        const gear=grantBossGear(u.mobId);if(gear){bossLoot.push({type:'专属装备',name:gear.name,icon:gear.icon,quality:getGearQuality(gear)});toast('Boss掉落'+getGearQuality(gear)+'装备：'+gear.name);}
      }
    });
    gainExp(exp);
    if(P.pet)gainPetExp(Math.max(10,Math.floor(exp*.35)));
    rollPetCaptureOffer();
    const petGearLoot=rollPetGearDrop();if(petGearLoot)toast('🐾 召唤兽装备掉落：'+petGearLoot.name+'！');
    
    banner.innerHTML = `
      <div class="rb-title win">胜 利</div>
      <div class="rb-info">
        获得经验 <b>+${fmt(exp)}</b><br>
        获得银两 <b>+${fmt(gold)}</b>
        ${bossLoot.length?'<div class="rb-loot-title">🎁 战利品</div>'+bossLoot.map(x=>'<div class="rb-loot-item"><span>'+x.icon+' '+x.name+'</span><small>'+x.quality+' '+x.type+'</small></div>').join(''):''}
      </div>
      <button class="rb-btn" id="rbOk">继 续</button>
    `;
    
    addLog(`【战斗】胜利！经验 +${exp}，银两 +${gold}`, 'good');
    }
  } else if (battle.immortalBossId){
    P.hp=Math.max(1,Math.floor(P.maxHp*.25));P.mp=Math.max(0,Math.floor(P.maxMp*.3));
    banner.innerHTML='<div class="rb-title lose">仙战失利</div><div class="rb-info">仙界 Boss 暂时击退了你。凡界银两与经验不会因此损失。</div><button class="rb-btn" id="rbOk">继续</button>';
  } else if (battle.immortalEncounterId){
    P.hp=Math.max(1,Math.floor(P.maxHp*.35));P.mp=Math.max(0,Math.floor(P.maxMp*.35));
    banner.innerHTML='<div class="rb-title lose">探索受挫</div><div class="rb-info">仙界妖物将你击退。凡界银两与经验不会损失。</div><button class="rb-btn" id="rbOk">返回仙界</button>';
  } else {
    const lost = Math.floor(P.gold * 0.1);
    P.gold = Math.max(0, P.gold - lost);
    P.hp = Math.max(1, Math.floor(P.maxHp * 0.25));
    P.mp = Math.max(0, Math.floor(P.maxMp * 0.3));
    
    banner.innerHTML = `
      <div class="rb-title lose">战 败</div>
      <div class="rb-info">
        你被击倒在地……<br>
        损失银两 <b>${fmt(lost)}</b> 两
      </div>
      <button class="rb-btn" id="rbOk">继 续</button>
    `;
    
    addLog(`【战斗】战败，损失 ${lost} 两`, 'bad');
  }
  
  banner.classList.add('show');
  
  // 绑定继续按钮
  setTimeout(() => {
    const okBtn = $('rbOk');
    if (okBtn){
      okBtn.addEventListener('click', () => {
        closeBattleUI();
      });
    }
  }, 50);
  
  updateHUD();
}

function closeBattleUI(){
  // 彻底清理战斗锁与当前回合状态。
  battle.token++;
  battle.loopRunning = false;
  battle.active = false;
  battle.over = true;
  battle.victory = false;
  battle.fled = false;
  const overlay = battle.overlay;
  if (overlay){
    overlay.classList.add('fading');
    setTimeout(() => {
      overlay.classList.remove('show');
      overlay.classList.remove('fading');
      $('resultBanner').classList.remove('show');
    }, 300);
  }
  battle.units = [];
  battle.round = 0;
  if(P.immortalRealm&&P.immortalRealm.view==='immortal')renderImmortalRealm(P.immortalRealm.activeTab);else renderWorld();
}


