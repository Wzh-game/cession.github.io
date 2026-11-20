/* ============================================================
   梦幻西游 · Q版像素单机  —— 第 5 批
   背包面板 / 技能面板 / 召唤兽面板 / 任务面板
   ============================================================ */

/* ============================================================
   背包面板
   ============================================================ */
let bagFilter = 'all'; // all / potion / gem / exp / special

function openBagPanel(){
  renderBagPanel();
  openModal('modalBag');
}

function renderBagPanel(){
  const body = $('bagBody');
  const keys = Object.keys(P.bag).filter(k => P.bag[k] > 0);
  
  // 计算容量
  const used = keys.length;
  const cap = 20;
  
  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:6px 10px;background:linear-gradient(180deg,rgba(240,200,96,.12),transparent);border:1.5px solid rgba(240,200,96,.3);border-radius:6px">
      <span style="font-size:11px;color:#c0a870">🎒 背包容量</span>
      <span style="font-size:12px;color:#ffe8a0;font-weight:bold;text-shadow:0 1px 0 #000">${used} / ${cap}</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn small ${bagFilter==='all'?'primary':''}" data-filter="all">全部</button>
      <button class="btn small ${bagFilter==='potion'?'primary':''}" data-filter="potion">药品</button>
      <button class="btn small ${bagFilter==='gem'?'primary':''}" data-filter="gem">宝石</button>
      <button class="btn small ${bagFilter==='exp'?'primary':''}" data-filter="exp">修炼</button>
      <button class="btn small ${bagFilter==='special'?'primary':''}" data-filter="special">特殊</button>
    </div>
  `;
  
  // 过滤
  let displayKeys = keys;
  if (bagFilter !== 'all'){
    displayKeys = keys.filter(k => ITEMS[k] && ITEMS[k].type === bagFilter);
  }
  
  if (!displayKeys.length){
    html += `<div class="empty-tip"><span class="ei">🎒</span>${keys.length?'此分类下暂无物品':'背包空空如也'}</div>`;
  } else {
    html += '<div id="bagItems"></div>';
  }
  
  body.innerHTML = html;
  
  // 绑定过滤按钮
  body.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      bagFilter = btn.dataset.filter;
      renderBagPanel();
    });
  });
  
  // 渲染物品
  if (displayKeys.length){
    const list = body.querySelector('#bagItems');
    displayKeys.forEach(id => {
      const it = ITEMS[id];
      if (!it) return;
      const rare = it.rare || 0;
      const itEl = document.createElement('div');
      itEl.className = 'list-item' + (rare>=1?` rare-${rare}`:'');
      itEl.innerHTML = `
        <div class="li-icon" style="font-size:22px">${it.icon}</div>
        <div class="li-body">
          <div class="li-name">${it.name}<span class="li-count">×${P.bag[id]}</span></div>
          <div class="li-desc">${it.desc}</div>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'li-btn';
      btn.textContent = it.type === 'gem' ? '镶嵌' : '使用';
      btn.addEventListener('click', () => {
        useItem(id);
        renderBagPanel();
      });
      itEl.appendChild(btn);
      list.appendChild(itEl);
    });
  }
}

/* 使用物品 */
function useItem(id){
  if (!P.bag[id] || P.bag[id] <= 0) return;
  const it = ITEMS[id];
  if (!it || !it.use) return;
  
  const result = it.use();
  P.bag[id]--;
  if (P.bag[id] <= 0) delete P.bag[id];
  
  toast(`${it.icon} ${it.name}：${result}`);
  addLog(`【使用】${it.name} · ${result}`, 'good');
  updateHUD();
  renderWorld();
}

/* ============================================================
   技能面板
   ============================================================ */
function openSkillPanel(){
  const body = $('skillBody');
  const sect = SECTS.find(s => s.id === P.sect);
  
  if (!sect){
    body.innerHTML = '<div class="empty-tip"><span class="ei">✨</span>尚未拜入任何门派</div>';
    openModal('modalSkill');
    return;
  }
  
  let html = `
    <div style="text-align:center;margin-bottom:12px;padding:10px;background:linear-gradient(180deg,${sect.color}22,transparent);border:1.5px solid ${sect.color}55;border-radius:8px">
      <div style="font-size:22px">${sect.icon}</div>
      <div style="font-size:14px;color:${sect.color};font-weight:bold;letter-spacing:2px;margin-top:4px;text-shadow:0 1px 0 #000">${sect.name}</div>
      <div style="font-size:10.5px;color:#c0a870;margin-top:4px">${sect.longDesc}</div>
    </div>
    <div class="section-title"><span class="sti">✨</span>门派技能</div>
  `;
  
  sect.skills.forEach(sk => {
    const learned = sk.lv <= P.lv;
    const it = document.createElement('div');
    it.className = 'list-item';
    if (!learned){
      it.style.opacity = '0.45';
      it.style.filter = 'grayscale(.5)';
    } else if (sk.type === 'magic') it.classList.add('rare-1');
    else if (sk.type === 'heal') it.classList.add('rare-2');
    else if (sk.power >= 3) it.classList.add('rare-3');
    
    const typeIcon = sk.type==='magic'?'🔮':sk.type==='phys'?'⚔️':sk.type==='heal'?'💚':'🔒';
    const typeName = sk.type==='magic'?'法术':sk.type==='phys'?'物理':sk.type==='heal'?'治疗':'封印';
    
    it.innerHTML = `
      <div class="li-icon" style="font-size:20px">${learned?typeIcon:'🔒'}</div>
      <div class="li-body">
        <div class="li-name" style="color:${learned?(sk.type==='magic'?'#80c0ff':sk.type==='heal'?'#80ffa0':'#ffe8a0'):'#8a7050'}">
          ${sk.name}
          ${learned?'':`<span style="font-size:9.5px;color:#c08060;margin-left:5px">Lv.${sk.lv} 解锁</span>`}
        </div>
        <div class="li-desc">${sk.desc}</div>
        <div style="margin-top:4px;font-size:9.5px;color:#c0a870">
          <span style="color:#80d0ff">【${typeName}】</span>
          ${sk.target==='all'?' 群体':' 单体'}
        </div>
      </div>
      <div class="li-right" style="color:#80c0ff">${sk.mp}<small>法力</small></div>
    `;
    body.appendChild(it);
  });
  
  body.insertAdjacentHTML('afterbegin', html);
  
  // 属性加成说明
  const statTip = document.createElement('div');
  statTip.style.cssText = 'margin-top:12px;padding:10px;background:linear-gradient(180deg,rgba(240,200,96,.08),transparent);border:1.5px solid rgba(240,200,96,.25);border-radius:6px;font-size:10.5px;color:#c0a870;line-height:1.7';
  statTip.innerHTML = `
    <div style="color:#ffe8a0;font-weight:bold;letter-spacing:2px;margin-bottom:5px">📊 门派成长</div>
    每级成长：气血 +${Math.floor(sect.grow.hp)} · 法力 +${Math.floor(sect.grow.mp)} · 攻击 +${Math.floor(sect.grow.atk)} · 防御 +${Math.floor(sect.grow.def)} · 速度 +${Math.floor(sect.grow.spd)} · 灵力 +${Math.floor(sect.grow.magic)}
  `;
  body.appendChild(statTip);
  
  openModal('modalSkill');
}

/* ============================================================
   召唤兽面板
   ============================================================ */
let petTab = 'current'; // current / shop

function openPetPanel(){
  renderPetPanel();
  openModal('modalPet');
}

function petAptitudeGrade(value){
  const n=Math.max(80,Math.min(120,Math.floor(Number(value)||100)));
  return n>=115?'卓越':n>=108?'优秀':n>=100?'良好':n>=92?'普通':'偏低';
}
function renderPetAptitudeDetails(pet){
  normalizePetRecord(pet);
  const fields=[['hp','气血','❤️'],['atk','攻击','⚔️'],['def','防御','🛡️'],['spd','速度','👟']];
  return '<div style="margin-top:8px;padding:8px;border:1px solid rgba(210,170,255,.28);border-radius:6px;background:rgba(80,40,120,.10)"><b style="color:#e0c0ff">🎯 资质详情</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px">'+fields.map(([key,label,icon])=>{const value=pet.aptitude[key],pct=Math.max(0,Math.min(100,(value-80)/40*100));return '<div style="font-size:10px"><div style="display:flex;justify-content:space-between;color:#e8d8ff"><span>'+icon+' '+label+'</span><b>'+value+' · '+petAptitudeGrade(value)+'</b></div><div style="height:5px;margin-top:3px;border-radius:5px;background:#24172e;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#8050b0,#d0a0ff)"></div></div></div>';}).join('')+'</div><div style="margin-top:6px;color:#a98fbe;font-size:9.5px">资质范围 80–120；数值越高，对应属性升级成长越好。</div></div>';
}
function petSkillEffectText(skill,rank){
  if(!skill)return '暂无专属技能';
  if(skill.type==='heal')return '当前效果：每三次行动恢复最大气血的 '+Math.round(skill.power*rank*100)+'%';
  const multiplier=skill.power+(rank-1)*.18;
  let text='当前效果：每三次行动造成 '+multiplier.toFixed(2)+' 倍'+(skill.type==='magic'?'法术':'攻击')+'伤害';
  if(skill.effect==='stun')text+='；另有 20% 概率定身';
  if(skill.effect==='burn')text+='；追加灼烧伤害随技能等级提升';
  return text;
}
function studyPetSkill(pet){
  if(!pet||!(P.pet===pet||(Array.isArray(P.petBox)&&P.petBox.includes(pet))))return false;
  normalizePetRecord(pet);
  const skill=PET_SKILLS[pet.speciesId],rank=pet.skillRank||1,cost=500;
  if(!skill){toast('该召唤兽没有可研习的专属技能');return false;}
  if(rank>=3){toast('专属技能已经满级');return false;}
  if(!Number.isFinite(P.gold)||P.gold<cost){toast('银两不足，需要 500 两');return false;}
  P.gold-=cost;pet.skillRank=rank+1;
  saveGame();updateHUD();
  toast('📘 '+skill.name+' 提升至 '+pet.skillRank+' 级！');
  renderPetPanel();
  return true;
}

function renderPetPanel(){
  const body = $('petBody');
  
  let html = `
    <div style="display:flex;gap:4px;margin-bottom:12px">
      <button class="btn small ${petTab==='current'?'primary':''}" data-ptab="current" style="flex:1">我的召唤兽</button>
      <button class="btn small ${petTab==='shop'?'primary':''}" data-ptab="shop" style="flex:1">灵兽园</button>
    </div>
  `;
  
  body.innerHTML = html;
  
  body.querySelectorAll('[data-ptab]').forEach(btn => {
    btn.addEventListener('click', () => {
      petTab = btn.dataset.ptab;
      renderPetPanel();
    });
  });
  
  const content = document.createElement('div');
  if(petTab==='current'&&P.petCaptureOffer){
    const offer=document.createElement('div');offer.className='list-item rare-3';offer.style.cssText='margin-bottom:10px;padding:10px;border:1px solid rgba(120,220,160,.55)';
    const t=PETS.find(x=>x.id===P.petCaptureOffer.id);
    offer.innerHTML='<div class="li-icon" style="font-size:26px">'+(t?t.icon:'🐾')+'</div><div class="li-body"><div class="li-name">发现灵宠踪迹：'+(t?t.name:'未知灵宠')+'</div><div class="li-desc">击败 '+P.petCaptureOffer.enemyName+' 后发现 · 需要捕灵符</div></div>';
    const cb=document.createElement('button');cb.className='li-btn';cb.textContent='🎴 捕捉';cb.disabled=(Number(P.bag.petSeal)||0)<1||(!!P.pet&&P.petBox.length>=6);cb.onclick=capturePet;offer.appendChild(cb);content.appendChild(offer);
  }
  
  if (petTab === 'current'){
    if (P.pet){
      const p = P.pet;
      // 当前出战宠物
      const cur = document.createElement('div');
      cur.className = 'list-item rare-3';
      cur.style.cssText = 'padding:12px;border-width:2px';
      cur.innerHTML = `
        <div class="li-icon" style="font-size:30px;width:52px;height:52px">${p.icon}</div>
        <div class="li-body">
          <div class="li-name" style="font-size:14px">
            ${p.name}
            <span style="font-size:10px;color:#80ffa0;margin-left:5px;font-weight:normal">出战中</span>
          </div>
          <div class="li-desc" style="margin-top:5px">${p.desc}</div>
          <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10.5px">
            <div style="color:#ff8060">❤️ 气血 ${Math.ceil(p.hp)}/${p.maxHp}</div>
            <div style="color:#ffd060">🗡️ 攻击 ${p.atk}</div>
            <div style="color:#80c0ff">🛡️ 防御 ${p.def}</div>
            <div style="color:#a0ffd0">👟 速度 ${p.spd}</div>
            <div style="color:#d8b0ff">⭐ 等级 Lv.${p.lv||1} · 经验 ${p.exp||0}/${petExpNeed(p.lv||1)}</div>
            <div style="color:#ffd080">✨ ${p.stage?'已进化':'待觉醒：'+(PET_EVOLUTIONS[p.speciesId]?'Lv.'+PET_EVOLUTIONS[p.speciesId].at:'暂无进化')}</div>
            ${renderPetAptitudeDetails(p)}
            <div style="color:#ffe8a0">✨ 专属技能：${(PET_SKILLS[p.speciesId]||{}).name||'无'} · 等级 ${p.skillRank||1}/3</div>
          </div>
        </div>
      `;
      content.appendChild(cur);
      
      // 操作按钮
      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:6px;margin-top:10px';
      
      const feedBtn = document.createElement('button');
      feedBtn.className = 'btn small primary';
      feedBtn.style.flex = '1';
      feedBtn.textContent = '🍖 喂食（100两）';
      feedBtn.disabled = P.gold < 100;
      feedBtn.addEventListener('click', () => {
        if (P.gold < 100) return;
        P.gold -= 100;
        p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp*0.5));
        toast(`🍖 ${p.name} 恢复了气血`);
        updateHUD();saveGame();
        renderPetPanel();
      });
      btns.appendChild(feedBtn);
      
      const trainBtn = document.createElement('button');
      trainBtn.className = 'btn small primary';
      trainBtn.style.flex = '1';
      trainBtn.textContent = '⚔️ 修炼（300两）';
      trainBtn.disabled = P.gold < 300;
      trainBtn.addEventListener('click', () => {
        if (P.gold < 300) return;
        P.gold -= 300;
        p.atk += 2;
        p.maxHp += 10;
        p.hp += 10;
        p.def += 1;
        toast(`⚔️ ${p.name} 属性提升了！`);
        updateHUD();saveGame();
        renderPetPanel();
      });
      btns.appendChild(trainBtn);

      const aptitudeBtn=document.createElement('button');
      aptitudeBtn.className='btn small';
      aptitudeBtn.style.flex='1';
      aptitudeBtn.textContent='🌟 资质培养（800两）';
      aptitudeBtn.disabled=P.gold<800||!p.aptitude||Object.values(p.aptitude).every(v=>Number(v)>=120);
      aptitudeBtn.onclick=()=>{
        if(P.gold<800||!p.aptitude)return;
        const keys=['hp','atk','def','spd'].filter(k=>Number(p.aptitude[k])<120);
        if(!keys.length){toast('召唤兽资质已经全部达到上限');return;}
        P.gold-=800;const key=keys[Math.floor(Math.random()*keys.length)];p.aptitude[key]=Math.min(120,Number(p.aptitude[key])+1);
        normalizePetRecord(p);saveGame();updateHUD();toast('🌟 '+p.name+' 的 '+({hp:'气血',atk:'攻击',def:'防御',spd:'速度'}[key])+'资质提升！');renderPetPanel();
      };
      btns.appendChild(aptitudeBtn);

      const breakthroughCosts=[5000,12000,25000];
      const breakthroughLevel=Math.max(0,Math.min(3,Number(p.breakthrough)||0));
      const breakthroughCost=breakthroughCosts[breakthroughLevel];
      const breakthroughBtn=document.createElement('button');
      breakthroughBtn.className='btn small primary';breakthroughBtn.style.width='100%';breakthroughBtn.style.marginTop='6px';
      breakthroughBtn.textContent=breakthroughLevel>=3?'🌌 已完成三重突破':'🌌 召唤兽突破 '+(breakthroughLevel+1)+'/3（'+(breakthroughCost||0)+'两）';
      breakthroughBtn.disabled=p.lv<100||breakthroughLevel>=3||P.gold<breakthroughCost;
      breakthroughBtn.title=p.lv<100?'召唤兽达到100级后开放突破':breakthroughLevel>=3?'已达到最高突破':'突破后永久提升召唤兽属性';
      breakthroughBtn.onclick=()=>{
        const tier=Math.max(0,Math.min(3,Number(p.breakthrough)||0));
        const costs=[5000,12000,25000];const cost=costs[tier];
        if(p.lv<100){toast('召唤兽需要达到100级才能突破');return;}
        if(tier>=3){toast('召唤兽已达到最高突破');return;}
        if(P.gold<cost){toast('银两不足，需要 '+cost+' 两');return;}
        if(!confirm('确定消耗 '+cost+' 两，为 '+p.name+' 进行第 '+(tier+1)+' 重突破吗？'))return;
        const hpRatio=p.maxHp>0?p.hp/p.maxHp:1;
        P.gold-=cost;p.breakthrough=tier+1;
        p.maxHp=Math.floor(p.maxHp*1.12);p.hp=Math.max(1,Math.floor(p.maxHp*hpRatio));
        p.atk=Math.floor(p.atk*1.10);p.def=Math.floor(p.def*1.10);p.spd+=2;
        normalizePetRecord(p);saveGame();updateHUD();
        toast('🌌 '+p.name+' 完成第 '+p.breakthrough+' 重突破！');
        addLog('【召唤兽】'+p.name+' 完成第 '+p.breakthrough+' 重突破','good');renderPetPanel();
      };
      content.appendChild(breakthroughBtn);
      
      const skillBox=document.createElement('div');
      skillBox.style.cssText='margin-top:9px;padding:9px;border:1px solid rgba(180,130,230,.35);border-radius:6px;background:rgba(80,40,120,.12);font-size:10.5px;line-height:1.6';
      const petSkill=PET_SKILLS[p.speciesId]||null;
      skillBox.innerHTML=petSkill?'<b style="color:#e0c0ff">✨ '+petSkill.name+'（技能 '+(p.skillRank||1)+'/3）</b><div style="color:#c0a8d8;margin:3px 0">'+petSkill.desc+'</div><div style="color:#ffe8a0">'+petSkillEffectText(petSkill,p.skillRank||1)+'</div><div style="color:#a98fbe">每三次召唤兽行动自动施放；每次研习消耗 500 两，最高 3 级。</div>':'尚无专属技能';
      const skillBtn=document.createElement('button');
      skillBtn.className='btn small';skillBtn.style.width='100%';skillBtn.style.marginTop='6px';
      skillBtn.textContent=(p.skillRank||1)>=3?'专属技能已满级':'📘 研习专属技能（500两）';
      skillBtn.disabled=!petSkill||(p.skillRank||1)>=3||P.gold<500;
      skillBtn.onclick=()=>studyPetSkill(p);
      skillBox.appendChild(skillBtn);content.appendChild(skillBox);
      normalizePetGear();
      const gearBox=document.createElement('div');gearBox.style.cssText='margin-top:10px;padding:10px;border:1px solid rgba(120,180,230,.35);border-radius:7px;background:rgba(20,60,100,.12)';
      const gs=petGearStats();
      gearBox.innerHTML='<b style="color:#a8d8ff">🛡️ 召唤兽装备</b><div style="font-size:10.5px;color:#b8c8d8;margin:4px 0 8px">装备加成：攻击 +'+gs.atk+' · 防御 +'+gs.def+' · 气血 +'+gs.hp+' · 速度 +'+gs.spd+'</div>';
      [['weapon','灵爪'],['armor','护甲'],['charm','灵饰']].forEach(([slot,label])=>{
        const id=P.petGearEquipped[slot],it=id&&PET_GEAR_CATALOG[id];
        const line=document.createElement('div');line.style.cssText='display:flex;align-items:center;gap:6px;margin:5px 0;font-size:11px';
        const name=document.createElement('span');name.style.flex='1';name.textContent=label+'：'+(it?it.icon+' '+it.name+' +'+(P.petGearInventory.find(g=>g.id===id)||{}).level:'未装备');line.appendChild(name);
        if(it){const b=document.createElement('button');b.className='btn small';b.textContent='卸下';b.onclick=()=>unequipPetGear(slot);line.appendChild(b);}
        gearBox.appendChild(line);
      });
      const gearTitle=document.createElement('div');gearTitle.style.cssText='margin-top:9px;color:#ffe0a0;font-size:11px';gearTitle.textContent='装备背包与灵兽锻造（最高 +3）';gearBox.appendChild(gearTitle);
      P.petGearInventory.forEach(g=>{
        const it=PET_GEAR_CATALOG[g.id];if(!it)return;
        const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:5px;margin-top:6px;font-size:10.5px';
        const label=document.createElement('span');label.style.flex='1';label.textContent=it.icon+' '+it.name+' +'+g.level+'（攻'+it.atk+' 防'+it.def+' 血'+it.hp+' 速'+it.spd+'）';row.appendChild(label);
        const equip=document.createElement('button');equip.className='btn small';equip.textContent=P.petGearEquipped[it.slot]===g.id?'已装备':'穿戴';equip.disabled=P.petGearEquipped[it.slot]===g.id;equip.onclick=()=>equipPetGear(g.id);row.appendChild(equip);
        const up=document.createElement('button');up.className='btn small';up.textContent=g.level>=3?'满级':'强化';up.disabled=g.level>=3||P.gold<500*(g.level+1);up.onclick=()=>upgradePetGear(g.id);row.appendChild(up);
        gearBox.appendChild(row);
      });
      content.appendChild(gearBox);
      const gearShop=document.createElement('div');gearShop.style.cssText='margin-top:8px;padding:9px;border:1px solid rgba(240,200,96,.25);border-radius:6px';
      gearShop.innerHTML='<b style="color:#ffe0a0;font-size:11px">🛒 灵兽装备坊</b>';
      Object.entries(PET_GEAR_CATALOG).forEach(([id,it])=>{
        const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:5px;margin-top:6px;font-size:10.5px';
        const label=document.createElement('span');label.style.flex='1';label.textContent=it.icon+' '+it.name+' · '+it.slotName+' · '+it.price+'两';row.appendChild(label);
        const buy=document.createElement('button');buy.className='btn small';buy.textContent=P.petGearInventory.some(g=>g.id===id)?'已拥有':'购买';buy.disabled=P.petGearInventory.some(g=>g.id===id)||P.gold<it.price;buy.onclick=()=>buyPetGear(id);row.appendChild(buy);gearShop.appendChild(row);
      });
      content.appendChild(gearShop);
      content.appendChild(btns);
      
      // 战斗参数说明
      const tip = document.createElement('div');
      tip.style.cssText = 'margin-top:12px;padding:10px;background:linear-gradient(180deg,rgba(240,200,96,.08),transparent);border:1.5px solid rgba(240,200,96,.25);border-radius:6px;font-size:10.5px;color:#c0a870;line-height:1.7';
      tip.innerHTML = `
        <div style="color:#ffe8a0;font-weight:bold;letter-spacing:2px;margin-bottom:5px">💡 召唤兽说明</div>
        出战时会自动协助战斗，优先攻击敌方单体目标。<br>
        召唤兽气血归零不会消失，战后自动恢复 20% 气血。
      `;
      content.appendChild(tip);
      
    } else {
      content.innerHTML = `
        <div class="empty-tip">
          <span class="ei">🐾</span>
          尚未拥有召唤兽<br>
          <span style="font-size:10.5px;color:#8a7050">前往灵兽园捕捉或购买</span>
        </div>
      `;
    }
  } else {
    // 灵兽园
    const sealBox=document.createElement('div');sealBox.style.cssText='padding:10px;margin-bottom:10px;border:1px solid rgba(240,200,96,.35);border-radius:6px;background:rgba(0,0,0,.14)';
    sealBox.innerHTML='<b>🎴 捕灵符</b><div style="font-size:11px;color:#c0a870;margin:5px 0">持有 '+(Number(P.bag.petSeal)||0)+' 张 · 300 两/张</div>';
    const sealBtn=document.createElement('button');sealBtn.className='btn small primary';sealBtn.textContent='购买捕灵符（300两）';sealBtn.disabled=P.gold<300;sealBtn.onclick=buyPetSeal;sealBox.appendChild(sealBtn);content.appendChild(sealBox);
    const tip = document.createElement('div');
    tip.style.cssText = 'text-align:center;font-size:11px;color:#ffd060;letter-spacing:2px;margin-bottom:10px;text-shadow:0 1px 0 #000';
    tip.textContent = '═ 灵 兽 园 ═';
    content.appendChild(tip);
    
    PETS.forEach(p => {
      const owned = (P.pet && petBaseSpecies(P.pet) === p.id) || P.petBox.some(x=>petBaseSpecies(x)===p.id);
      const it = document.createElement('div');
      it.className = 'list-item';
      if (owned) it.classList.add('rare-3');
      
      it.innerHTML = `
        <div class="li-icon" style="font-size:28px;width:48px;height:48px">${p.icon}</div>
        <div class="li-body">
          <div class="li-name">${p.name}</div>
          <div class="li-desc">${p.desc}</div>
          <div style="margin-top:4px;font-size:10px;color:#c0a870">
            ❤️${p.hp} · 🗡️${p.atk} · 🛡️${p.def} · 👟${p.spd}
          </div>
        </div>
        <div class="li-right" style="color:#ffd060">${fmt(p.price)}<small>两</small></div>
      `;
      
      const btn = document.createElement('button');
      btn.className = 'li-btn';
      if (owned){
        btn.textContent = '已拥有';
        btn.disabled = true;
      } else {
        btn.textContent = '购买';
        btn.disabled = P.gold < p.price;
        btn.addEventListener('click', () => {
          if (P.gold < p.price) return;
          P.gold -= p.price;
          P.pet = {
            id: p.id, name: p.name, icon: p.icon, desc: p.desc,
            hp: p.hp, maxHp: p.hp,
            atk: p.atk, def: p.def, spd: p.spd,
            lv: Math.max(1,Math.min(P.lv,10)), exp:0, stage:0,speciesId:p.id,aptitude:petAptitudeRoll(),skillRank:1,skillActions:0,
          };
          toast(`🐾 收服了 ${p.name}！`);
          addLog(`【召唤兽】收服 ${p.name}`, 'good');
          updateHUD();saveGame();
          renderPetPanel();
        });
      }
      it.appendChild(btn);
      content.appendChild(it);
    });
  }
  
  body.appendChild(content);
}

/* ============================================================
   任务面板
   ============================================================ */
const QUESTS = [
  { id:'q1', name:'初入江湖',   desc:'赢得3场战斗', target:3, type:'wins', reward:{gold:200, exp:100}, icon:'⚔️' },
  { id:'q2', name:'江湖历练',   desc:'击败10只怪物', target:10, type:'kills', reward:{gold:500, exp:300}, icon:'🗡️' },
  { id:'q3', name:'威震一方',   desc:'击败30只怪物', target:30, type:'kills', reward:{gold:1500, exp:1200}, icon:'👑' },
  { id:'q4', name:'名扬三界',   desc:'击败100只怪物', target:100, type:'kills', reward:{gold:5000, exp:5000}, icon:'🏆' },
];

function getQuestProgress(q, stats=P){
  const value=q&&q.type==='kills'?stats.kills:stats.battles;
  return Math.max(0,Math.floor(Number(value)||0));
}

const DAILY_BOUNTIES=[
 {id:'daily_wins',name:'巡山除妖',desc:'赢得 3 场凡界普通战斗',target:3,field:'wins',reward:{gold:500,exp:250},icon:'⚔️'},
 {id:'daily_boss',name:'斩妖除魔',desc:'击败 1 名凡界区域 Boss',target:1,field:'bosses',reward:{gold:1200,exp:600},icon:'👹'},
 {id:'daily_kills',name:'清剿妖患',desc:'累计击败 8 只凡界敌人',target:8,field:'kills',reward:{gold:800,exp:400},icon:'🏹'}
];

const EXPLORATION_QUESTS=[
 {id:'explore_donghai',name:'潮声寻踪',desc:'发现隐藏区域「东海湾」',regions:['donghai'],reward:{gold:300,exp:180},icon:'🌊'},
 {id:'explore_yougu',name:'幽谷探秘',desc:'发现隐藏区域「幽谷秘境」',regions:['yougu'],reward:{gold:450,exp:260},icon:'🌲'},
 {id:'explore_both',name:'双境行者',desc:'同时发现东海湾与幽谷秘境',regions:['donghai','yougu'],reward:{gold:900,exp:600},icon:'🧭'}
];
function renderExplorationQuests(body){
 const section=document.createElement('section');
 section.style.cssText='margin-top:14px;padding-top:10px;border-top:1px solid rgba(240,200,96,.25)';
 section.innerHTML='<div class="section-title"><span class="sti">🧭</span>开放世界探索委托</div><div style="font-size:10px;color:#a98f70;margin:-4px 0 8px">探索并发现隐藏区域即可推进，奖励每项仅可领取一次。</div>';
 EXPLORATION_QUESTS.forEach(q=>{
  const done=!!P.flags[q.id],found=q.regions.filter(id=>Array.isArray(P.discoveredRegions)&&P.discoveredRegions.includes(id)).length;
  const cur=done?q.regions.length:found,pct=Math.min(100,cur/q.regions.length*100);
  const row=document.createElement('div');row.className='list-item';if(done)row.classList.add('rare-3');
  row.innerHTML='<div class="li-icon" style="font-size:22px">'+q.icon+'</div><div class="li-body"><div class="li-name">'+q.name+(done?'<span style="color:#80ffa0;font-size:10px;margin-left:5px">✓ 已领取</span>':'')+'</div><div class="li-desc">'+q.desc+'</div><div style="height:7px;margin-top:5px;background:#180c04;border:1px solid #060302;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#268b63,#72e6a0)"></div></div><div style="margin-top:4px;font-size:10px;color:#c0a870">探索进度 <b style="color:#ffe8a0">'+cur+'/'+q.regions.length+'</b> · 💰'+q.reward.gold+' · ⭐'+q.reward.exp+'</div></div>';
  if(!done&&cur>=q.regions.length){
   const btn=document.createElement('button');btn.className='li-btn';btn.textContent='领取';
   btn.addEventListener('click',()=>{
    if(P.flags[q.id])return;
    const stillFound=q.regions.every(id=>Array.isArray(P.discoveredRegions)&&P.discoveredRegions.includes(id));
    if(!stillFound)return;
    P.flags[q.id]=true;P.questDone=(Number(P.questDone)||0)+1;P.gold+=q.reward.gold;gainExp(q.reward.exp);saveGame();updateHUD();
    toast('🧭 探索委托完成：'+q.name+'，获得 '+q.reward.gold+' 两与 '+q.reward.exp+' 经验');addLog('【探索委托】完成 '+q.name,'good');renderTaskPanel();
   });
   row.appendChild(btn);
  }else if(done){const tag=document.createElement('span');tag.className='li-right';tag.style.color='#80ffa0';tag.textContent='已领';row.appendChild(tag);}
  section.appendChild(row);
 });
 body.appendChild(section);
}
function localQuestDate(){
 const d=new Date(),pad=n=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function ensureDailyQuestState(){
 const today=localQuestDate();
 if(!P.dailyQuestDate||today>P.dailyQuestDate){
  P.dailyQuestDate=today;
  P.dailyQuestProgress={wins:0,bosses:0,kills:0};
  P.dailyQuestClaimed=[];
  saveGame();
  return true;
 }
 if(!P.dailyQuestProgress||typeof P.dailyQuestProgress!=='object')P.dailyQuestProgress={wins:0,bosses:0,kills:0};
 if(!Array.isArray(P.dailyQuestClaimed))P.dailyQuestClaimed=[];
 return false;
}
function advanceDailyQuestProgress(kills=0,bosses=0,normalWins=1){
 ensureDailyQuestState();
 if(P.dailyQuestDate!==localQuestDate())return false;
 P.dailyQuestProgress.wins=Math.max(0,Number(P.dailyQuestProgress.wins)||0)+Math.max(0,normalWins);
 P.dailyQuestProgress.kills=Math.max(0,Number(P.dailyQuestProgress.kills)||0)+Math.max(0,kills);
 P.dailyQuestProgress.bosses=Math.max(0,Number(P.dailyQuestProgress.bosses)||0)+Math.max(0,bosses);
 saveGame();
 return true;
}
function claimDailyBounty(id){
 ensureDailyQuestState();
 const q=DAILY_BOUNTIES.find(x=>x.id===id);
 if(!q||P.dailyQuestClaimed.includes(id)||P.dailyQuestDate!==localQuestDate())return false;
 const cur=Math.min(q.target,Number(P.dailyQuestProgress[q.field])||0);
 if(cur<q.target)return false;
 P.dailyQuestClaimed.push(id);
 P.questDone=(Number(P.questDone)||0)+1;
 P.gold+=q.reward.gold;
 gainExp(q.reward.exp);
 saveGame();updateHUD();
 toast('🎁 每日悬赏完成：'+q.name+'，获得 '+q.reward.gold+' 两与 '+q.reward.exp+' 经验');
 addLog('【每日悬赏】领取 '+q.name+' 奖励','good');
 renderTaskPanel();
 return true;
}
function renderDailyBounties(body){
 ensureDailyQuestState();
 const section=document.createElement('section');
 section.style.cssText='margin-top:14px;padding-top:10px;border-top:1px solid rgba(240,200,96,.25)';
 section.innerHTML='<div class="section-title"><span class="sti">📅</span>每日悬赏 <small style="margin-left:auto;color:#a98f70;font-size:10px">'+P.dailyQuestDate+'</small></div><div style="font-size:10px;color:#a98f70;margin:-4px 0 8px">每日进度自动保存；日期向前推进时刷新，不会因重复刷新页面重复领取。</div>';
 DAILY_BOUNTIES.forEach(q=>{
  const cur=Math.min(q.target,Math.max(0,Number(P.dailyQuestProgress[q.field])||0));
  const claimed=P.dailyQuestClaimed.includes(q.id);
  const pct=Math.min(100,cur/q.target*100);
  const row=document.createElement('div');row.className='list-item';
  if(claimed)row.classList.add('rare-3');
  row.innerHTML='<div class="li-icon" style="font-size:22px">'+q.icon+'</div><div class="li-body"><div class="li-name">'+q.name+(claimed?'<span style="color:#80ffa0;font-size:10px;margin-left:5px">✓ 已领取</span>':'')+'</div><div class="li-desc">'+q.desc+'</div><div style="height:7px;margin-top:5px;background:#180c04;border:1px solid #060302;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#268b63,#72e6a0)"></div></div><div style="margin-top:4px;font-size:10px;color:#c0a870">进度 <b style="color:#ffe8a0">'+cur+'/'+q.target+'</b> · 💰'+q.reward.gold+' · ⭐'+q.reward.exp+'</div></div>';
  if(claimed){const tag=document.createElement('span');tag.className='li-right';tag.style.color='#80ffa0';tag.textContent='已领';row.appendChild(tag);}
  else if(cur>=q.target){const btn=document.createElement('button');btn.className='li-btn';btn.textContent='领取';btn.addEventListener('click',()=>claimDailyBounty(q.id));row.appendChild(btn);}
  section.appendChild(row);
 });
 body.appendChild(section);
}
function openTaskPanel(){
  ensureDailyQuestState();
  renderTaskPanel();
  openModal('modalTask');
}

function renderTaskPanel(){
  const body = $('taskBody');
  
  let html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="stat-box gold">
        <span class="sk"><span class="ski">⚔️</span>累计击杀</span>
        <span class="sv">${P.kills||0}</span>
      </div>
      <div class="stat-box">
        <span class="sk"><span class="ski">🏁</span>完成任务</span>
        <span class="sv">${P.questDone}</span>
      </div>
    </div>
    <div class="section-title"><span class="sti">📜</span>江湖任务</div>
  `;
  
  body.innerHTML = html;
  
  QUESTS.forEach(q => {
    const done = P.flags[q.id];
    const cur = Math.min(getQuestProgress(q), q.target);
    const pct = clamp(cur / q.target * 100, 0, 100);
    
    const it = document.createElement('div');
    it.className = 'list-item';
    if (done) it.classList.add('rare-3');
    
    it.innerHTML = `
      <div class="li-icon" style="font-size:22px">${q.icon}</div>
      <div class="li-body">
        <div class="li-name">
          ${q.name}
          ${done?`<span style="font-size:10px;color:#80ffa0;margin-left:5px;font-weight:normal">✓ 已完成</span>`:''}
        </div>
        <div class="li-desc">${q.desc}</div>
        <div style="margin-top:5px;height:8px;background:#180c04;border:1px solid #060302;border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.8)">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#906010,#e0a820,#ffe070);transition:width .3s;box-shadow:0 0 6px rgba(240,184,48,.5)"></div>
        </div>
        <div style="margin-top:4px;font-size:10px;color:#c0a870">
          进度 <b style="color:#ffe8a0">${cur}</b> / ${q.target}
          · 奖励 <span style="color:#ffd060">💰${q.reward.gold}</span>
          <span style="color:#f0c860">⭐${q.reward.exp}</span>
        </div>
      </div>
    `;
    
    if (!done && cur >= q.target){
      const btn = document.createElement('button');
      btn.className = 'li-btn';
      btn.textContent = '领取';
      btn.addEventListener('click', () => {
        P.flags[q.id] = true;
        P.questDone++;
        P.gold += q.reward.gold;
        gainExp(q.reward.exp);
        saveGame();
        toast(`🎉 完成【${q.name}】！+${q.reward.gold}两 +${q.reward.exp}经验`);
        addLog(`【任务】完成 ${q.name}`, 'good');
        updateHUD();
        renderTaskPanel();
      });
      it.appendChild(btn);
    } else if (done){
      const tag = document.createElement('div');
      tag.className = 'li-right';
      tag.style.color = '#80ffa0';
      tag.innerHTML = '已领';
      it.appendChild(tag);
    }
    
    body.appendChild(it);
  });
  renderDailyBounties(body);
  renderExplorationQuests(body);
}

/* ============================================================
   ↓↓↓ 第 5 批结束，第 6 批将接续：世界生成 / 渲染 / 移动系统
   ============================================================ */

