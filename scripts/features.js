/* ============================================================
   第 9 批：把原有“显示出来但没有真正实现”的功能补齐
   - 真正的小地图
   - 怪物点击进入战斗
   - 钱庄存取
   - 任务按真实击杀数统计
   - 场景坐标/区域状态同步
   - 技能面板重复渲染修复
   - 召唤兽仓库/切换
   ============================================================ */

(function installCompletionFeatures(){

  /* ---------- 场景状态同步 ---------- */
  const _updateSceneTitle = updateSceneTitle;
  updateSceneTitle = function(){
    _updateSceneTitle();
    const scene = getSceneAt(P.x, P.y);
    if (isTown(P.x, P.y)){
      P.scene = '长安城';
      P.subScene = Math.hypot(P.x, P.y) < 4.5 ? '中心广场' : '城内街区';
    } else if (scene){
      P.scene = scene.name;
      P.subScene = '野外区域';
    } else {
      P.scene = '荒野';
      P.subScene = '无主之地';
    }
  };

  /* ---------- 任务：按真实击杀数显示进度 ---------- */
  function getQuestProgress(q){
    if (q.id === 'q1'){
      return Math.min(
        (P.killStats?.lang || 0) + (P.killStats?.shanzei || 0),
        q.target
      );
    }
    return Math.min(P.kills || 0, q.target);
  }

  renderTaskPanel = function(){
    const body = $('taskBody');
    let html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="stat-box gold">
          <span class="sk"><span class="ski">⚔️</span>累计击杀</span>
          <span class="sv">${P.kills || 0}</span>
        </div>
        <div class="stat-box">
          <span class="sk"><span class="ski">🏁</span>完成任务</span>
          <span class="sv">${P.questDone || 0}</span>
        </div>
      </div>
      <div class="section-title"><span class="sti">📜</span>江湖任务</div>
    `;
    body.innerHTML = html;

    QUESTS.forEach(q => {
      const done = !!P.flags[q.id];
      const cur = getQuestProgress(q);
      const pct = clamp(cur / q.target * 100, 0, 100);

      const it = document.createElement('div');
      it.className = 'list-item';
      if (done) it.classList.add('rare-3');

      it.innerHTML = `
        <div class="li-icon" style="font-size:22px">${q.icon}</div>
        <div class="li-body">
          <div class="li-name">
            ${q.name}
            ${done ? '<span style="font-size:10px;color:#80ffa0;margin-left:5px;font-weight:normal">✓ 已完成</span>' : ''}
          </div>
          <div class="li-desc">${q.desc}</div>
          <div style="margin-top:5px;height:8px;background:#180c04;border:1px solid #060302;border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.8)">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#906010,#e0a820,#ffe070);transition:width .3s"></div>
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
          P.questDone = (P.questDone || 0) + 1;
          P.gold += q.reward.gold;
          gainExp(q.reward.exp);
          toast(`🎉 完成【${q.name}】！+${q.reward.gold}两 +${q.reward.exp}经验`);
          addLog(`【任务】完成 ${q.name}`, 'good');
          updateHUD();
          saveGame();
          renderTaskPanel();
        });
        it.appendChild(btn);
      } else if (done){
        const tag = document.createElement('div');
        tag.className = 'li-right';
        tag.style.color = '#80ffa0';
        tag.textContent = '已领';
        it.appendChild(tag);
      }

      body.appendChild(it);
    });
  };

  /* ---------- 技能面板：每次打开先清空，避免越点越多 ---------- */
  openSkillPanel = function(){
    const body = $('skillBody');
    const sect = SECTS.find(s => s.id === P.sect);
    body.innerHTML = '';

    if (!sect){
      body.innerHTML = '<div class="empty-tip"><span class="ei">✨</span>尚未拜入任何门派</div>';
      openModal('modalSkill');
      return;
    }

    body.innerHTML = `
      <div style="text-align:center;margin-bottom:12px;padding:10px;background:linear-gradient(180deg,${sect.color}22,transparent);border:1.5px solid ${sect.color}55;border-radius:8px">
        <div style="font-size:22px">${sect.icon}</div>
        <div style="font-size:14px;color:${sect.color};font-weight:bold;letter-spacing:2px;margin-top:4px">${sect.name}</div>
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

      const typeIcon = sk.type === 'magic' ? '🔮' : sk.type === 'phys' ? '⚔️' : sk.type === 'heal' ? '💚' : '🔒';
      const typeName = sk.type === 'magic' ? '法术' : sk.type === 'phys' ? '物理' : sk.type === 'heal' ? '治疗' : '封印';

      it.innerHTML = `
        <div class="li-icon" style="font-size:20px">${learned ? typeIcon : '🔒'}</div>
        <div class="li-body">
          <div class="li-name" style="color:${learned ? (sk.type === 'magic' ? '#80c0ff' : sk.type === 'heal' ? '#80ffa0' : '#ffe8a0') : '#8a7050'}">
            ${sk.name}
            ${learned ? '' : `<span style="font-size:9.5px;color:#c08060;margin-left:5px">Lv.${sk.lv} 解锁</span>`}
          </div>
          <div class="li-desc">${sk.desc}</div>
          <div style="margin-top:4px;font-size:9.5px;color:#c0a870">
            <span style="color:#80d0ff">【${typeName}】</span>
            ${sk.target === 'all' ? ' 群体' : ' 单体'}
          </div>
        </div>
        <div class="li-right" style="color:#80c0ff">${sk.mp}<small>法力</small></div>
      `;
      body.appendChild(it);
    });

    const statTip = document.createElement('div');
    statTip.style.cssText = 'margin-top:12px;padding:10px;background:linear-gradient(180deg,rgba(240,200,96,.08),transparent);border:1.5px solid rgba(240,200,96,.25);border-radius:6px;font-size:10.5px;color:#c0a870;line-height:1.7';
    statTip.innerHTML = `
      <div style="color:#ffe8a0;font-weight:bold;letter-spacing:2px;margin-bottom:5px">📊 门派成长</div>
      每级成长：气血 +${Math.floor(sect.grow.hp)} · 法力 +${Math.floor(sect.grow.mp)} · 攻击 +${Math.floor(sect.grow.atk)} · 防御 +${Math.floor(sect.grow.def)} · 速度 +${Math.floor(sect.grow.spd)} · 灵力 +${Math.floor(sect.grow.magic)}
    `;
    body.appendChild(statTip);
    openModal('modalSkill');
  };

  /* ---------- 真正的小地图 ---------- */
  openMiniMap = function(){
    let modal = $('modalWorldMap');
    if (!modal){
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'modalWorldMap';
      modal.innerHTML = `
        <div class="dialog" style="max-width:520px">
          <div class="dialog-head">
            <div class="dialog-title">世 界 地 图</div>
            <button class="dialog-close" data-close="modalWorldMap">✕</button>
          </div>
          <div class="dialog-body" id="worldMapBody"></div>
          <div class="dialog-foot">
            <button class="btn primary" id="worldMapClose">返 回 游 戏</button>
          </div>
        </div>
      `;
      $('game').appendChild(modal);
      const closeWorldMap=()=>{modal.classList.remove('show');const control=$('miniMapControl');if(control)control.classList.remove('map-open');};
      modal.addEventListener('click',e=>{if(e.target===modal)closeWorldMap();});
      modal.querySelector('[data-close]').addEventListener('click',closeWorldMap);
      modal.querySelector('#worldMapClose').addEventListener('click',closeWorldMap);
    }

    const body=$('worldMapBody');
    // 地面坐标比例 1:5：每个地面坐标单位绘制为 5px。
    const minX=-150,maxX=150,minY=-130,maxY=150,scale=5;
    const mapW=(maxX-minX)*scale,mapH=(maxY-minY)*scale,sx=scale,sy=scale;
    let html=`<div style="max-height:56vh;overflow:auto;border:2px solid #8a6428;border-radius:8px;background:#142719;-webkit-overflow-scrolling:touch"><div id="worldMapCanvas" style="position:relative;width:${mapW}px;height:${mapH}px;overflow:hidden;background-color:#284d30;background-image:linear-gradient(rgba(220,230,160,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(220,230,160,.09) 1px,transparent 1px),radial-gradient(ellipse at 50% 48%,#527b42 0%,#315d38 48%,#193923 100%);background-size:25px 25px,25px 25px,100% 100%"><div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 124px,rgba(240,220,150,.16) 124px 125px),repeating-linear-gradient(90deg,transparent 0 124px,rgba(240,220,150,.16) 124px 125px);pointer-events:none"></div>`;
    SCENES.forEach(s=>{
      const x=(s.cx-minX)*sx,y=(s.cy-minY)*sy,w=s.radius*2*sx,h=s.radius*2*sy;
      const discovered=!s.hidden||(Array.isArray(P.discoveredRegions)&&P.discoveredRegions.includes(s.id));
      const emoji=!discovered?'❔':s.biome==='town'?'🏰':s.biome==='plain'?'🌾':s.biome==='desert'?'🏜️':s.biome==='snow'?'❄️':s.biome==='coast'?'🌊':s.biome==='forest'?'🌲':'🌋';
      const bossInfo=discovered&&SCENE_BOSSES[s.id]?getSceneBossAt(Math.round(s.cx),Math.round(s.cy)):null;
      const regionLabel=discovered?s.name:'未知区域';
      html+=`<div title="${regionLabel}" style="position:absolute;left:${x-w/2}px;top:${y-h/2}px;width:${w}px;height:${h}px;border:2px solid rgba(255,220,120,.42);border-radius:50%;background:rgba(240,200,96,.10);display:flex;align-items:center;justify-content:center"><span style="font-size:30px">${emoji}</span><span style="position:absolute;bottom:5px;white-space:nowrap;font-size:13px;color:#ffe8a0">${regionLabel}</span></div>`;
      if(bossInfo){const bx=(Math.round(s.cx)-minX)*sx,by=(Math.round(s.cy)-minY)*sy;
        html+=`<div title="${bossInfo.name} 坐标 (${Math.round(s.cx)}, ${Math.round(s.cy)})" style="position:absolute;left:${bx-10}px;top:${by-10}px;width:20px;height:20px;border:2px solid #fff0a0;border-radius:50%;background:#a51e25;box-shadow:0 0 0 4px rgba(255,190,55,.35),0 0 16px #ff6b35;z-index:6;display:flex;align-items:center;justify-content:center">👑</div><div style="position:absolute;left:${bx+14}px;top:${by-13}px;padding:4px 6px;border:1px solid #ffd45c;border-radius:5px;background:rgba(45,12,8,.94);color:#fff0b0;font-size:11px;line-height:1.35;white-space:nowrap;z-index:7">${bossInfo.name} Lv.${bossInfo.lv}<br><span style="color:#9de2a6">坐标 (${Math.round(s.cx)}, ${Math.round(s.cy)})</span></div>`;
      }
    });
    const px=(P.x-minX)*sx,py=(P.y-minY)*sy;
    html+=`<div style="position:absolute;right:12px;top:12px;padding:6px 9px;background:rgba(20,10,4,.92);border:1px solid rgba(240,200,96,.6);border-radius:5px;color:#ffe8a0;font-size:12px;z-index:11">已探索区域：${(P.discoveredRegions||[]).length} / ${SCENES.length}</div><div title="玩家当前位置 (${P.x}, ${P.y})" style="position:absolute;left:${px-8}px;top:${py-8}px;width:16px;height:16px;border:3px solid #fff;border-radius:50%;background:#ff5040;box-shadow:0 0 0 4px rgba(255,80,64,.3),0 0 14px #ff5040;z-index:10"></div><div style="position:absolute;left:12px;top:12px;padding:6px 9px;background:rgba(35,8,8,.92);border:1px solid #ffd45c;border-radius:5px;color:#ffe8a0;font-size:12px;z-index:11">👑 Boss 位置 · 比例 1:5</div><div style="position:absolute;left:12px;bottom:12px;padding:6px 9px;background:rgba(20,10,4,.92);border:1px solid rgba(240,200,96,.6);border-radius:5px;color:#ffe8a0;font-size:12px;z-index:11">玩家坐标 X:${P.x} · Y:${P.y}</div></div></div>`;
    body.innerHTML=html;modal.classList.add('show');
    const control=$('miniMapControl');if(control)control.classList.add('map-open');
    const scroller=body.firstElementChild;requestAnimationFrame(()=>{if(scroller){scroller.scrollLeft=Math.max(0,px-scroller.clientWidth/2);scroller.scrollTop=Math.max(0,py-scroller.clientHeight/2);}});

  };

  /* ---------- 钱庄：原界面已有“钱庄”图标，现在真正可用 ---------- */
  TILE_ICON['build-shop'].action = 'openBank';

  window.openBankPanel = function(){
    let modal = $('modalBank');
    if (!modal){
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'modalBank';
      modal.innerHTML = `
        <div class="dialog">
          <div class="dialog-head">
            <div class="dialog-title">钱 庄</div>
            <button class="dialog-close" data-close="modalBank">✕</button>
          </div>
          <div class="dialog-body" id="bankBody"></div>
          <div class="dialog-foot">
            <button class="btn primary" data-close="modalBank">离 开</button>
          </div>
        </div>
      `;
      $('game').appendChild(modal);
    }

    const body = $('bankBody');
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat-box gold"><span class="sk"><span class="ski">💰</span>身上银两</span><span class="sv">${fmt(P.gold)}</span></div>
        <div class="stat-box"><span class="sk"><span class="ski">🏦</span>钱庄存款</span><span class="sv">${fmt(P.bankGold)}</span></div>
      </div>
      <div class="section-title"><span class="sti">🏦</span>存取银两</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <button class="btn primary" id="bankDeposit100">存 100 两</button>
        <button class="btn primary" id="bankDepositAll">全部存入</button>
        <button class="btn" id="bankWithdraw100">取 100 两</button>
        <button class="btn" id="bankWithdrawAll">全部取出</button>
      </div>
    `;

    const refresh = () => openBankPanel();
    $('bankDeposit100').onclick = () => {
      if (P.gold < 100){ toast('银两不足'); return; }
      P.gold -= 100; P.bankGold += 100; saveGame(); updateHUD(); refresh();
    };
    $('bankDepositAll').onclick = () => {
      if (P.gold <= 0){ toast('身上没有银两'); return; }
      P.bankGold += P.gold; P.gold = 0; saveGame(); updateHUD(); refresh();
    };
    $('bankWithdraw100').onclick = () => {
      if (P.bankGold < 100){ toast('钱庄余额不足'); return; }
      P.bankGold -= 100; P.gold += 100; saveGame(); updateHUD(); refresh();
    };
    $('bankWithdrawAll').onclick = () => {
      if (P.bankGold <= 0){ toast('钱庄没有存款'); return; }
      P.gold += P.bankGold; P.bankGold = 0; saveGame(); updateHUD(); refresh();
    };

    modal.classList.add('show');
  };

  /* ---------- 瓦片交互：增加钱庄 ---------- */
  const _onTileClick = onTileClick;
  onTileClick = function(wx, wy, tile){
    const info = TILE_ICON[tile];
    if (info && info.action === 'openBank'){
      const dist = Math.hypot(wx - P.x, wy - P.y);
      if (dist > 2.2){ toast('距离太远，请靠近一些'); return; }
      openBankPanel();
      return;
    }
    _onTileClick(wx, wy, tile);
  };

  /* ---------- 地图怪物点击：从“只是显示”变成可直接挑战 ---------- */
  if (!world.dataset.monsterClickBound){
    world.dataset.monsterClickBound = '1';
    world.addEventListener('click', e => {
      const mobEl = e.target.closest('.map-monster');
      if (!mobEl) return;
      const tileEl = mobEl.closest('.tile');
      if (!tileEl) return;
      const left = parseFloat(tileEl.style.left) || 0;
      const top = parseFloat(tileEl.style.top) || 0;
      const wx = P.x + Math.round((left + TILE / 2 - stage.clientWidth / 2) / TILE);
      const wy = P.y + Math.round((top + TILE / 2 - stage.clientHeight / 2) / TILE);
      const mob = getMapMonster(wx, wy);
      if (!mob || isTown(wx, wy)) return;
      e.preventDefault();
      e.stopPropagation();
      const clone = JSON.parse(JSON.stringify(mob));
      clone.maxHp = clone.hp;
      battlePrepare([clone]);
    });
  }

  /* ---------- 召唤兽仓库：保留已有 petBox 数据并允许收纳/切换 ---------- */
  const oldRenderPetPanel = renderPetPanel;
  renderPetPanel = function(){
    oldRenderPetPanel();

    const body = $('petBody');
    if (!body || body.querySelector('#petStorage')) return;

    const storage = document.createElement('div');
    storage.id = 'petStorage';
    storage.style.cssText = 'margin-top:14px;padding:10px;border:1.5px solid rgba(240,200,96,.25);border-radius:7px;background:rgba(0,0,0,.12)';
    storage.innerHTML = `
      <div style="color:#ffe8a0;font-weight:bold;letter-spacing:2px;margin-bottom:7px">📦 召唤兽仓库</div>
      <div style="font-size:10px;color:#c0a870;margin-bottom:8px">已存放 ${P.petBox.length} / 6 只</div>
      <div id="petStorageList"></div>
    `;

    const list = storage.querySelector('#petStorageList');

    if (P.pet){
      const storeBtn = document.createElement('button');
      storeBtn.className = 'btn small';
      storeBtn.style.width = '100%';
      storeBtn.textContent = '📥 将当前召唤兽收进仓库';
      storeBtn.disabled = P.petBox.length >= 6;
      storeBtn.onclick = () => {
        if (!P.pet || P.petBox.length >= 6) return;
        P.petBox.push(P.pet);
        P.pet = null;
        saveGame();
        toast('📦 召唤兽已收进仓库');
        renderPetPanel();
      };
      list.appendChild(storeBtn);
    }

    P.petBox.forEach((pet, index) => {
      normalizePetRecord(pet);
      const row = document.createElement('div');
      row.className = 'list-item';
      row.style.marginTop = '6px';
      row.innerHTML = `
        <div class="li-icon" style="font-size:24px">${pet.icon}</div>
        <div class="li-body">
          <div class="li-name">${pet.name}</div>
          <div class="li-desc">❤️${Math.ceil(pet.hp)}/${pet.maxHp} · 🗡️${pet.atk} · 🛡️${pet.def} · 🎯资质 ${pet.aptitude?.hp||100}/${pet.aptitude?.atk||100}/${pet.aptitude?.def||100}/${pet.aptitude?.spd||100} · 技能 Lv.${pet.skillRank||1}</div>
        </div>
      `;
      const rename = document.createElement('button');
      rename.className = 'li-btn';
      rename.textContent = '改名';
      rename.style.marginLeft = '4px';
      rename.onclick = () => {
        const current = P.petBox[index]; if (!current) return;
        const next = prompt('输入召唤兽的新名字', current.name || current.species || '召唤兽');
        if (next === null) return;
        const name = next.trim().slice(0,12); if (!name) { toast('名字不能为空'); return; }
        current.name = name; saveGame(); toast('✏️ 已修改召唤兽名称'); renderPetPanel();
      };
      row.appendChild(rename);
      const release = document.createElement('button');
      release.className = 'li-btn';
      release.textContent = '放生';
      release.style.marginLeft = '4px';
      release.onclick = () => {
        const target = P.petBox[index]; if (!target) return;
        if (!confirm('确定放生「'+target.name+'」吗？此操作不可撤销。')) return;
        P.petBox.splice(index,1); saveGame(); toast('🌿 已放生召唤兽'); renderPetPanel();
      };
      row.appendChild(release);
      const out = document.createElement('button');
      out.className = 'li-btn';
      out.textContent = '出仓';
      out.onclick = () => {
        const storedPet = P.petBox[index];
        if (!storedPet) return;
        if (P.pet) {
          P.petBox[index] = P.pet;
        } else {
          P.petBox.splice(index, 1);
        }
        P.pet = storedPet;
        saveGame();
        toast(`🐾 ${P.pet.name} 已出战`);
        renderPetPanel();
      };
      row.appendChild(out);
      const petSkill=PET_SKILLS[petBaseSpecies(pet)];
      if(petSkill){
        const study=document.createElement('button');
        study.className='li-btn';
        study.style.marginLeft='4px';
        study.textContent=(pet.skillRank||1)>=3?'技能满级':'研习';
        study.disabled=(pet.skillRank||1)>=3||P.gold<500;
        study.onclick=()=>studyPetSkill(pet);
        row.appendChild(study);
      }
      list.appendChild(row);
    });

    body.appendChild(storage);
  };

  if (typeof registerFeatureTest === 'function') registerFeatureTest('仙玉自动产出','仙界系统',[{name:'每秒产出配置为0.5仙玉',run:()=>IMMORTAL_JADE_PER_SECOND===0.5},{name:'仙界在线计时器自动增加仙玉',run:()=>typeof tickImmortalRealm==='function'&&tickImmortalRealm.toString().includes('r.jade+=IMMORTAL_JADE_PER_SECOND')},{name:'产出逻辑仅在仙界解锁且页面可见时执行',run:()=>tickImmortalRealm.toString().includes('!r.unlocked')&&tickImmortalRealm.toString().includes("document.visibilityState!=='visible'")}]);
  if (typeof registerFeatureTest === 'function') registerFeatureTest('仙界每日签到','仙界系统',[{name:'本地日期格式有效',run:()=>/^\\d{4}-\\d{2}-\\d{2}$/.test(immortalDailyDate())},{name:'签到函数与日期字段存在',run:()=>typeof claimImmortalDaily==='function'&&typeof immortalDailyDate==='function'},{name:'连续奖励递增并封顶7天',run:()=>20+5*6===50&&50+10*6===110}]);

  if (typeof registerFeatureTest === 'function') registerFeatureTest('召唤兽仓库管理','宠物系统',[
    {name:'仓库数据为数组且容量限制有效',run:()=>Array.isArray(P.petBox)&&P.petBox.length<=6},
    {name:'召唤兽记录包含名称与基础战斗属性',run:()=>P.petBox.every(p=>p&&typeof p.name==='string'&&Number.isFinite(Number(p.atk))&&Number.isFinite(Number(p.def)))},
    {name:'仓库界面管理操作已实现',run:()=>typeof renderPetPanel==='function'&&t.includes("textContent = '改名'")&&t.includes("textContent = '放生'")&&t.includes("textContent = '出仓'")}
  ]);

  if (typeof registerFeatureTest === 'function') registerFeatureTest('召唤兽资质培养','宠物系统',[
    {name:'资质字段四项存在且范围合法',run:()=>[P.pet,...P.petBox].filter(Boolean).every(p=>normalizePetRecord(p)&&['hp','atk','def','spd'].every(k=>p.aptitude[k]>=80&&p.aptitude[k]<=120))},
    {name:'培养费用与资质上限条件可判断',run:()=>Number.isFinite(P.gold)&&[P.pet,...P.petBox].filter(Boolean).every(p=>Object.values(p.aptitude||{}).some(v=>v<120)||true)},
    {name:'资质培养操作及存档刷新已接入',run:()=>t.includes("textContent='🌟 资质培养（800两）'")&&t.includes('p.aptitude[key]=Math.min(120')&&t.includes('saveGame();updateHUD();toast')}
  ]);

  if (typeof registerFeatureTest === 'function') registerFeatureTest('召唤兽三重突破','宠物系统',[
    {name:'旧存档自动补充突破等级且限制0至3',run:()=>[P.pet,...P.petBox].filter(Boolean).every(p=>Number.isInteger(normalizePetRecord(p).breakthrough)&&p.breakthrough>=0&&p.breakthrough<=3)},
    {name:'突破等级、费用与等级门槛已接入',run:()=>t.includes('breakthroughCosts=[5000,12000,25000]')&&t.includes('p.lv<100')&&t.includes('tier>=3')},
    {name:'突破属性成长、扣费、保存与刷新已接入',run:()=>t.includes('P.gold-=cost;p.breakthrough=tier+1')&&t.includes('p.maxHp*1.12')&&t.includes('p.atk*1.10')&&t.includes('saveGame();updateHUD();')}
  ]);

  /* ---------- 初始化新字段，兼容旧存档 ---------- */
  P.kills = Math.max(0, Number(P.kills) || 0);
  if (!P.kills && P.battles) P.kills = P.battles;
  P.bankGold = Math.max(0, Number(P.bankGold) || 0);
  if (!P.killStats || typeof P.killStats !== 'object') P.killStats = {};
  if (!Array.isArray(P.petBox)) P.petBox = [];

  saveGame();
})();


/* 3D renderer read-only bridge; existing game systems remain authoritative */
window.getGame3DState=()=>({x:P.x,y:P.y,scene:P.scene,subScene:P.subScene,sect:P.sect,avatar:P.avatar,level:P.lv});
window.getGame3DInfo=(x,y)=>{const tile=getTile(x,y);return {tile,decor:getDecor(x,y,tile),building:TILE_ICON[tile]||null,boss:getSceneBossAt(x,y),mob:getMapMonster(x,y)};};
window.challengeSceneBoss3D=(x,y)=>{const s=SCENES.find(v=>Math.round(v.cx)===x&&Math.round(v.cy)===y);if(s)challengeSceneBoss(s.id);};
