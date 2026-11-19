/* ============================================================
   坊市商店系统
   ============================================================ */
let shopTab = 'buy';
let shopSelectedItem = null;

function openShopPanel(){
  // 检查是否在长安城范围内
  if (!isTown(P.x, P.y)){
    toast('坊市只在长安城内开放');
    return;
  }
  
  // 动态创建商店弹窗
  let modal = $('modalShop');
  if (!modal){
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modalShop';
    modal.innerHTML = `
      <div class="dialog">
        <div class="dialog-head">
          <div class="dialog-title">坊 市</div>
          <button class="dialog-close" data-close="modalShop">✕</button>
        </div>
        <div class="dialog-body" id="shopBody"></div>
        <div class="dialog-foot">
          <button class="btn primary" data-close="modalShop">离 开</button>
        </div>
      </div>
    `;
    document.getElementById('game').appendChild(modal);
    
    // 绑定关闭
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('show');
    });
    modal.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => modal.classList.remove('show'));
    });
  }
  
  renderShopPanel();
  modal.classList.add('show');
}

function renderShopPanel(){
  const body = $('shopBody');
  if (!body) return;
  
  body.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:12px">
      <button class="btn small ${shopTab==='buy'?'primary':''}" data-stab="buy" style="flex:1">购 买</button>
      <button class="btn small ${shopTab==='sell'?'primary':''}" data-stab="sell" style="flex:1">出 售</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:6px 10px;background:linear-gradient(180deg,rgba(240,200,96,.12),transparent);border:1.5px solid rgba(240,200,96,.3);border-radius:6px">
      <span style="font-size:11px;color:#c0a870">💰 你的银两</span>
      <span style="font-size:13px;color:#ffd060;font-weight:bold;text-shadow:0 1px 0 #000">${fmt(P.gold)} 两</span>
    </div>
    <div id="shopItems"></div>
  `;
  
  body.querySelectorAll('[data-stab]').forEach(btn => {
    btn.addEventListener('click', () => {
      shopTab = btn.dataset.stab;
      renderShopPanel();
    });
  });
  
  const list = body.querySelector('#shopItems');
  
  if (shopTab === 'buy'){
    renderBuyList(list);
  } else {
    renderSellList(list);
  }
}

function renderBuyList(list){
  // 商店出售的药品
  const buyables = ['hp1', 'hp2', 'hp3', 'mp1', 'mp2', 'exp1', 'exp2', 'stone1', 'stone2', 'stone3'];
  
  buyables.forEach(id => {
    const it = ITEMS[id];
    if (!it) return;
    const rare = it.rare || 0;
    const itEl = document.createElement('div');
    itEl.className = 'list-item' + (rare>=1?` rare-${rare}`:'');
    itEl.innerHTML = `
      <div class="li-icon" style="font-size:22px">${it.icon}</div>
      <div class="li-body">
        <div class="li-name">${it.name}</div>
        <div class="li-desc">${it.desc}</div>
      </div>
      <div class="li-right" style="color:#ffd060">${fmt(it.price)}<small>两</small></div>
    `;
    const btn = document.createElement('button');
    btn.className = 'li-btn';
    btn.textContent = '购买';
    btn.disabled = P.gold < it.price;
    btn.addEventListener('click', () => {
      if (P.gold < it.price) return;
      // 检查背包空间
      const keys = Object.keys(P.bag).filter(k => P.bag[k] > 0);
      if (keys.length >= 20 && !P.bag[id]){
        toast('背包已满');
        return;
      }
      P.gold -= it.price;
      P.bag[id] = (P.bag[id] || 0) + 1;
      toast(`🛒 购入 ${it.icon}${it.name}`);
      addLog(`【购买】${it.name} 花费 ${it.price} 两`, 'good');
      updateHUD();
      renderShopPanel();
    });
    itEl.appendChild(btn);
    list.appendChild(itEl);
  });
}

function renderSellList(list){
  const keys = Object.keys(P.bag).filter(k => P.bag[k] > 0);
  
  if (!keys.length){
    list.innerHTML = '<div class="empty-tip"><span class="ei">🎒</span>背包中没有可出售的物品</div>';
    return;
  }
  
  keys.forEach(id => {
    const it = ITEMS[id];
    if (!it) return;
    // 出售价为原价 50%
    const sellPrice = Math.floor((it.price || 0) * 0.5);
    const rare = it.rare || 0;
    
    const itEl = document.createElement('div');
    itEl.className = 'list-item' + (rare>=1?` rare-${rare}`:'');
    itEl.innerHTML = `
      <div class="li-icon" style="font-size:22px">${it.icon}</div>
      <div class="li-body">
        <div class="li-name">${it.name}<span class="li-count">×${P.bag[id]}</span></div>
        <div class="li-desc">${it.desc}</div>
      </div>
      <div class="li-right" style="color:#80ffa0">+${fmt(sellPrice)}<small>两</small></div>
    `;
    const btn = document.createElement('button');
    btn.className = 'li-btn';
    btn.textContent = '出售';
    btn.disabled = sellPrice <= 0;
    btn.addEventListener('click', () => {
      if (sellPrice <= 0) return;
      P.gold += sellPrice;
      P.bag[id]--;
      if (P.bag[id] <= 0) delete P.bag[id];
      toast(`💰 出售 ${it.icon}${it.name}，获得 ${sellPrice} 两`);
      addLog(`【出售】${it.name} 获得 ${sellPrice} 两`, 'good');
      updateHUD();
      renderShopPanel();
    });
    itEl.appendChild(btn);
    list.appendChild(itEl);
  });
}

const CULTIVATION_BOOKS=[
{id:'jingang',boss:'boss_changan',name:'金刚护体诀',minutes:10,desc:'气血上限+80，防御+8',effect:{maxHp:80,def:8}},
{id:'qingmu',boss:'boss_jiangnan',name:'青木长生经',minutes:30,desc:'气血上限+180',effect:{maxHp:180}},
{id:'liusha',boss:'boss_datang',name:'流沙裂岳功',minutes:60,desc:'攻击+18，速度+5',effect:{atk:18,spd:5}},
{id:'xuanbing',boss:'boss_beiju',name:'玄冰心法',minutes:120,desc:'防御+25，法力上限+100',effect:{def:25,maxMp:100}},
{id:'jiuyang',boss:'boss_huoyan',name:'九阳焚天诀',minutes:240,desc:'攻击+40，法术+35，气血上限+300',effect:{atk:40,magic:35,maxHp:300}}
];
function applyCultivationEffect(b){for(const k of ['atk','def','spd','magic'])P[k]+=b.effect[k]||0;if(b.effect.maxHp){P.maxHp+=b.effect.maxHp;P.hp+=b.effect.maxHp;}if(b.effect.maxMp){P.maxMp+=b.effect.maxMp;P.mp+=b.effect.maxMp;}}
function renderCultivation(){
 const body=$('cultivationBody');if(!body)return;const active=CULTIVATION_BOOKS.find(b=>b.id===P.cultivationActive);
 let h='<p style="font-size:11px;color:#d9c38d">在线且页面处于前台时累计修炼；离线或切到后台不计时。每本功法修成概率为50%。</p>';
 if(active){h+='<div class="list-item"><div class="li-body"><b>正在修炼：'+active.name+'</b><div class="li-desc">'+Math.floor(P.cultivationProgressMs/60000)+' / '+active.minutes+' 分钟</div><div style="height:7px;background:#21160c"><div style="height:7px;width:'+Math.min(100,P.cultivationProgressMs/(active.minutes*60000)*100)+'%;background:#e6b84c"></div></div></div><button class="li-btn" id="cultivationCancel">停止</button></div>';}
 CULTIVATION_BOOKS.forEach((b,i)=>{const owned=P.cultivationBooks.includes(b.id),done=P.flags['cult_done_'+b.id];h+='<div class="list-item"><div class="li-icon">📖</div><div class="li-body"><div class="li-name">'+(i+1)+'. '+b.name+(done?' ✓已修成':owned?'':' · 未获得')+'</div><div class="li-desc">'+b.minutes+'分钟 · '+b.desc+'</div></div>'+(owned&&!done&&!active?'<button class="li-btn" data-cultivate="'+b.id+'">开始</button>':'<span style="font-size:10px">'+(done?'已完成':owned?'修炼中':'未解锁')+'</span>')+'</div>';});
 h+=renderAscensionSection();
 body.innerHTML=h;renderAscensionNavigation();const cancel=$('cultivationCancel');if(cancel)cancel.onclick=()=>{P.cultivationActive=null;P.cultivationProgressMs=0;saveGame();renderCultivation();};
 body.querySelectorAll('[data-cultivate]').forEach(x=>x.onclick=()=>{P.cultivationActive=x.dataset.cultivate;P.cultivationProgressMs=0;saveGame();renderCultivation();toast('开始在线修炼');});
}
function tickCultivation(){if(!P.cultivationActive||document.visibilityState!=='visible')return;const b=CULTIVATION_BOOKS.find(x=>x.id===P.cultivationActive);if(!b){P.cultivationActive=null;return;}P.cultivationProgressMs+=1000;if(P.cultivationProgressMs>=b.minutes*60000){P.cultivationActive=null;P.cultivationProgressMs=0;if(Math.random()<.5){P.flags['cult_done_'+b.id]=true;applyCultivationEffect(b);toast('修炼成功：'+b.name);addLog('修成 '+b.name,'good');}else{toast('修炼失败，功法已消耗');addLog('修炼失败：'+b.name,'bad');}saveGame();renderCultivation();updateHUD();}else if($('modalCultivation')?.classList.contains('show'))renderCultivation();}

