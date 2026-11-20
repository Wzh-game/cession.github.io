
/* ============================================================
   梦幻西游 · Q版像素单机  —— 第 4 批
   工具函数 / 门派数据 / 物品数据 / 玩家状态 / 门派选择
   ============================================================ */

/* ================= 工具函数 ================= */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* 确定性随机（用于地图生成） */
function hash(c, r, salt){
  let h = (Math.imul(c|0, 73856093) ^ Math.imul(r|0, 19349663) ^ Math.imul(salt|0, 83492791)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h / 4294967296;
}
function noise2(x, y, salt){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash(xi, yi, salt);
  const b = hash(xi+1, yi, salt);
  const c = hash(xi, yi+1, salt);
  const d = hash(xi+1, yi+1, salt);
  const sx = xf * xf * (3 - 2*xf);
  const sy = yf * yf * (3 - 2*yf);
  return (a*(1-sx) + b*sx)*(1-sy) + (c*(1-sx) + d*sx)*sy;
}
/* 数字格式化 */
function fmt(n){
  n = Math.floor(n);
  if (n < 1e4) return String(n);
  if (n >= 1e44) return n.toExponential(2).replace('e+','e');
  const u = [[1e4,'万'],[1e8,'亿'],[1e12,'兆'],[1e16,'京'],[1e20,'垓'],
             [1e24,'秭'],[1e28,'穰'],[1e32,'沟'],[1e36,'涧'],[1e40,'正']];
  for (let i = u.length-1; i >= 0; i--){
    if (n >= u[i][0]){
      const v = n / u[i][0];
      return (v >= 1000 ? v.toFixed(0) : v.toFixed(1)) + u[i][1];
    }
  }
  return String(n);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============================================================
   门派数据（致敬梦幻西游十二门派，取其中五大经典）
   ============================================================ */
const SECTS = [
  {
    id: 'datang',
    name: '大唐官府',
    icon: '⚔️',
    color: '#c84040',
    desc: '三界武力第一，物理单体爆发，攻守兼备。',
    longDesc: '大唐官府弟子勤修武艺，以横扫千军之姿名震江湖。气血充沛，物理攻击极强，适合冲锋陷阵。',
    base: { hp: 140, mp: 30, atk: 22, def: 12, spd: 12, magic: 6 },
    grow: { hp: 18, mp: 3, atk: 4.5, def: 2.2, spd: 1, magic: 0.6 },
    skills: [
      { id:'heng', name:'横扫千军', lv:1, mp:8,  type:'phys',   power:1.85, target:'single', desc:'对单个目标造成185%物理伤害' },
      { id:'hou',  name:'后发制人', lv:5, mp:16, type:'phys',   power:2.6,  target:'single', desc:'蓄力一击，造成260%物理伤害' },
      { id:'jian', name:'剑气纵横', lv:10,mp:28, type:'phys',   power:1.55, target:'all',    desc:'对敌方全体造成155%物理伤害' },
      { id:'po',   name:'破釜沉舟', lv:20,mp:45, type:'phys',   power:3.5,  target:'single', desc:'舍命一击，350%物理伤害但自损10%气血' },
    ]
  },
  {
    id: 'fangcun',
    name: '方寸山',
    icon: '🔮',
    color: '#8060d0',
    desc: '法术控制流派，单体高伤，擅长封印。',
    longDesc: '方寸山弟子修习雷法与符箓，以五雷咒与定身术闻名。法术伤害极高，能限制敌人行动。',
    base: { hp: 110, mp: 70, atk: 12, def: 9, spd: 15, magic: 20 },
    grow: { hp: 13, mp: 8, atk: 2.2, def: 1.6, spd: 1.2, magic: 4.2 },
    skills: [
      { id:'lei',  name:'五雷咒',   lv:1, mp:10, type:'magic',  power:2.1, target:'single', desc:'对单个目标造成210%法术伤害' },
      { id:'ding', name:'定身术',   lv:5, mp:18, type:'debuff', power:0,   target:'single', desc:'使目标定身2回合，无法行动' },
      { id:'mie',  name:'神雷天降', lv:10,mp:34, type:'magic',  power:1.75,target:'all',    desc:'对敌方全体造成175%法术伤害' },
      { id:'feng', name:'天雷斩',   lv:20,mp:50, type:'magic',  power:4.0, target:'single', desc:'引天雷一击，400%法术伤害' },
    ]
  },
  {
    id: 'longgong',
    name: '龙宫',
    icon: '🐉',
    color: '#3a80d0',
    desc: '法术群攻流派，持续压制，法力深厚。',
    longDesc: '龙宫弟子承龙族血脉，御水行云，呼风唤雨。群体法术强大，法力值最为充沛。',
    base: { hp: 120, mp: 65, atk: 13, def: 10, spd: 11, magic: 18 },
    grow: { hp: 14, mp: 7, atk: 2.4, def: 1.8, spd: 0.9, magic: 3.8 },
    skills: [
      { id:'shui', name:'龙腾水击', lv:1, mp:9,  type:'magic',  power:1.9, target:'single', desc:'对单个目标造成190%法术伤害' },
      { id:'bing', name:'冰霜龙息', lv:5, mp:20, type:'magic',  power:1.45,target:'all',    desc:'对敌方全体造成145%法术伤害' },
      { id:'nu',   name:'怒海狂涛', lv:10,mp:36, type:'magic',  power:2.0, target:'all',    desc:'对敌方全体造成200%法术伤害' },
      { id:'long', name:'龙神降临', lv:20,mp:55, type:'magic',  power:4.5, target:'single', desc:'召唤龙神虚影，450%法术伤害' },
    ]
  },
  {
    id: 'putuo',
    name: '普陀山',
    icon: '🌸',
    color: '#d070b0',
    desc: '治疗辅助流派，持久生存，护佑队友。',
    longDesc: '普陀山弟子慈悲为怀，习得杨柳甘露与金刚护体。气血充沛，能恢复自身与队友气血。',
    base: { hp: 155, mp: 55, atk: 13, def: 13, spd: 10, magic: 14 },
    grow: { hp: 20, mp: 6, atk: 2.4, def: 2.4, spd: 0.8, magic: 3.0 },
    skills: [
      { id:'liao', name:'杨柳甘露', lv:1, mp:12, type:'heal',   power:2.2, target:'self',   desc:'恢复自身220%法术攻击的气血' },
      { id:'jin',  name:'金刚护体', lv:5, mp:18, type:'heal',   power:3.2, target:'self',   desc:'大幅恢复气血并临时提升防御' },
      { id:'pu',   name:'普度众生', lv:10,mp:32, type:'magic',  power:1.6, target:'all',    desc:'对敌方全体造成160%法术伤害，同时恢复自身气血' },
      { id:'fo',   name:'佛光普照', lv:20,mp:50, type:'heal',   power:6.0, target:'self',   desc:'佛光笼罩，恢复600%法术攻击的气血' },
    ]
  },
  {
    id: 'shituo',
    name: '狮驼岭',
    icon: '🦁',
    color: '#d09030',
    desc: '物理群攻流派，狂暴输出，越战越勇。',
    longDesc: '狮驼岭弟子以兽化之力著称，狂暴的攻击让敌人闻风丧胆。气血最厚，群体物理伤害极高。',
    base: { hp: 165, mp: 25, atk: 24, def: 11, spd: 13, magic: 5 },
    grow: { hp: 22, mp: 2.5, atk: 5.2, def: 2.0, spd: 1.1, magic: 0.5 },
    skills: [
      { id:'bo',   name:'裂石破',   lv:1, mp:7,  type:'phys',  power:1.75,target:'single', desc:'对单个目标造成175%物理伤害' },
      { id:'hou2', name:'狮搏',     lv:5, mp:16, type:'phys',  power:2.5, target:'single', desc:'猛扑撕咬，250%物理伤害' },
      { id:'kuang',name:'狂兽咆哮', lv:10,mp:30, type:'phys',  power:1.55,target:'all',    desc:'对敌方全体造成155%物理伤害' },
      { id:'xue',  name:'血战八方', lv:20,mp:48, type:'phys',  power:2.2, target:'all',    desc:'狂暴绞杀，对全体造成220%物理伤害' },
    ]
  },
  {
    id:'nver', name:'女儿村', icon:'🌺', color:'#e080b0',
    desc:'灵巧迅捷，擅长迷香与持续压制。',
    longDesc:'女儿村弟子身法轻灵，以花香迷阵扰乱敌人，兼具速度与控制。',
    base:{hp:125,mp:60,atk:16,def:10,spd:19,magic:15},
    grow:{hp:15,mp:6,atk:3.0,def:1.7,spd:1.8,magic:2.5},
    skills:[
      {id:'nvhua',name:'花舞刃',lv:1,mp:8,type:'phys',power:1.7,target:'single',desc:'迅捷出手，造成170%物理伤害'},
      {id:'mihun',name:'迷魂香',lv:5,mp:18,type:'debuff',power:0,target:'single',desc:'迷乱目标，使其无法行动2回合'},
      {id:'luoying',name:'落英缤纷',lv:10,mp:30,type:'magic',power:1.55,target:'all',desc:'花瓣化刃，对敌方全体造成155%法术伤害'}
    ]
  },
  {
    id:'wuzhuang', name:'五庄观', icon:'☯️', color:'#70b890',
    desc:'道法自然，攻守平衡，兼具恢复能力。',
    longDesc:'五庄观弟子参悟天地大道，以袖里乾坤制敌，以清风拂面调息。',
    base:{hp:145,mp:58,atk:17,def:14,spd:12,magic:16},
    grow:{hp:18,mp:5,atk:3.0,def:2.4,spd:1.0,magic:2.8},
    skills:[
      {id:'zhenyuan',name:'镇元诀',lv:1,mp:10,type:'magic',power:1.8,target:'single',desc:'凝聚道力，造成180%法术伤害'},
      {id:'qingfeng',name:'清风拂面',lv:5,mp:20,type:'heal',power:2.4,target:'self',desc:'恢复自身气血'},
      {id:'xiuli',name:'袖里乾坤',lv:10,mp:34,type:'magic',power:1.8,target:'all',desc:'乾坤之力席卷敌方全体'}
    ]
  },
  {
    id:'difu', name:'阴曹地府', icon:'💀', color:'#9b83c8',
    desc:'幽冥术法，诅咒削弱，擅长持续作战。',
    longDesc:'阴曹地府弟子行走幽冥，借九幽之力削弱对手，并以冥火追魂。',
    base:{hp:138,mp:62,atk:15,def:13,spd:13,magic:19},
    grow:{hp:17,mp:6,atk:2.7,def:2.2,spd:1.0,magic:3.4},
    skills:[
      {id:'minghuo',name:'幽冥鬼火',lv:1,mp:10,type:'magic',power:2.0,target:'single',desc:'释放幽冥鬼火，造成200%法术伤害'},
      {id:'suo',name:'拘魂锁',lv:5,mp:18,type:'debuff',power:0,target:'single',desc:'拘束目标，使其无法行动2回合'},
      {id:'jiuyou',name:'九幽冥风',lv:10,mp:32,type:'magic',power:1.65,target:'all',desc:'冥风席卷敌方全体'}
    ]
  },
  {
    id:'mowang', name:'魔王寨', icon:'🔥', color:'#e07840',
    desc:'烈焰法术，爆发强劲，擅长群体输出。',
    longDesc:'魔王寨弟子驾驭地脉真火，以烈焰焚敌，群体法术威力惊人。',
    base:{hp:132,mp:68,atk:14,def:10,spd:12,magic:21},
    grow:{hp:16,mp:7,atk:2.5,def:1.8,spd:1.0,magic:4.0},
    skills:[
      {id:'huoqiu',name:'三昧火',lv:1,mp:10,type:'magic',power:2.05,target:'single',desc:'三昧真火灼烧目标，造成205%法术伤害'},
      {id:'yanwu',name:'烈焰风暴',lv:5,mp:22,type:'magic',power:1.5,target:'all',desc:'烈焰风暴攻击敌方全体'},
      {id:'dihuo',name:'地火燎原',lv:10,mp:38,type:'magic',power:2.0,target:'all',desc:'地脉火焰吞没敌方全体'}
    ]
  },
  {
    id:'huasheng', name:'化生寺', icon:'📿', color:'#d6bd75',
    desc:'慈悲济世，恢复与守护能力出众。',
    longDesc:'化生寺弟子修持佛法，以佛光护体、禅音疗伤，擅长稳固战线。',
    base:{hp:158,mp:64,atk:13,def:15,spd:9,magic:18},
    grow:{hp:21,mp:7,atk:2.2,def:2.8,spd:0.7,magic:3.2},
    skills:[
      {id:'foyin',name:'佛音震心',lv:1,mp:9,type:'magic',power:1.65,target:'single',desc:'佛音化为冲击，造成165%法术伤害'},
      {id:'chunyang',name:'春风化雨',lv:5,mp:20,type:'heal',power:3.0,target:'self',desc:'春风化雨，恢复自身气血'},
      {id:'foguang',name:'佛光护佑',lv:10,mp:34,type:'heal',power:4.5,target:'self',desc:'佛光普照，大幅恢复自身气血'}
    ]
  },
  {
    id:'duolingo', name:'多邻宗', icon:'🦉', color:'#78c96b',
    desc:'以语言为法、以节奏为阵，控制与增益兼备。',
    longDesc:'多邻宗弟子研习万国语言与灵韵乐章。以【学英语】打断敌方行动，再以【音乐】唤起节奏共鸣。专属快捷技能会在战斗时出现在右下角。',
    base:{hp:128,mp:78,atk:14,def:11,spd:16,magic:20},
    grow:{hp:16,mp:9,atk:2.5,def:1.8,spd:1.3,magic:3.6},
    skills:[
      {id:'duo_english',name:'学英语',lv:1,mp:8,type:'debuff',power:0,target:'single',desc:'喊出英语咒语“Study English!”令一名敌人硬控1回合，跳过其行动'},
      {id:'duo_music',name:'音乐共鸣',lv:5,mp:20,type:'magic',power:1.35,target:'all',desc:'奏响灵韵乐章，对敌方全体造成135%法术伤害，并使自身后续2回合伤害提升25%'}
    ]
  },
  {id:'laomu',name:'老牧私',icon:'🪵',color:'#a87945',desc:'驾驭滚木之力，攻守兼备。',longDesc:'老牧私一派以滚木为本命法器，借山势、木势与神秘步法制敌。',base:{hp:135,mp:90,atk:17,def:12,spd:13,magic:17},grow:{hp:16,mp:8,atk:3,def:2,spd:1,magic:3},skills:[{id:'laomu_roll',name:'滚木',lv:1,mp:10,type:'special',desc:'自身无敌60秒；冷却60分钟。'},{id:'laomu_sigma',name:'西格玛滚木拳',lv:3,mp:67,type:'special',desc:'固定造成67点伤害。'},{id:'laomu_eye',name:'滚木之眼',lv:5,mp:20,type:'special',desc:'上一轮自身受到伤害总和×2。'},{id:'laomu_vanish',name:'浮木消失术',lv:10,mp:100,type:'special',desc:'令一名敌方单位消失。'}]},
];

/* ============================================================
   物品数据
   ============================================================ */
const ITEMS = {
  /* 药品 */
  hp1:   { id:'hp1',   name:'金疮药',     icon:'🧪', type:'potion', rare:0, price:60,   desc:'恢复30%气血',           use(){ const v=Math.floor(P.maxHp*0.3); P.hp=Math.min(P.maxHp,P.hp+v); return `恢复 ${v} 气血`; } },
  hp2:   { id:'hp2',   name:'九转还魂丹', icon:'⚗️', type:'potion', rare:1, price:400,  desc:'完全恢复气血',         use(){ P.hp=P.maxHp; return '气血全满'; } },
  mp1:   { id:'mp1',   name:'清心散',     icon:'💧', type:'potion', rare:0, price:80,   desc:'恢复50%法力',           use(){ const v=Math.floor(P.maxMp*0.5); P.mp=Math.min(P.maxMp,P.mp+v); return `恢复 ${v} 法力`; } },
  mp2:   { id:'mp2',   name:'龙涎香',     icon:'🫙', type:'potion', rare:1, price:350,  desc:'完全恢复法力',         use(){ P.mp=P.maxMp; return '法力全满'; } },
  hp3:   { id:'hp3',   name:'大还丹',     icon:'🍶', type:'potion', rare:2, price:1500, desc:'恢复60%气血与法力',     use(){ const v1=Math.floor(P.maxHp*0.6), v2=Math.floor(P.maxMp*0.6); P.hp=Math.min(P.maxHp,P.hp+v1); P.mp=Math.min(P.maxMp,P.mp+v2); return `恢复 ${v1} 气血 · ${v2} 法力`; } },
  /* 修炼 */
  exp1:  { id:'exp1',  name:'修炼心得',   icon:'📜', type:'exp',    rare:1, price:500,  desc:'获得当前等级50%经验',   use(){ const v=Math.floor(expNeed()*0.5); gainExp(v); return `获得 ${v} 经验`; } },
  exp2:  { id:'exp2',  name:'太上忘情录', icon:'📖', type:'exp',    rare:2, price:2000, desc:'获得当前等级150%经验',  use(){ const v=Math.floor(expNeed()*1.5); gainExp(v); return `获得 ${v} 经验`; } },
  /* 强化 */
  stone1:{ id:'stone1',name:'一级宝石',   icon:'💎', type:'gem',    rare:1, price:300,  desc:'攻击 +3',               use(){ P.atk+=3; return '攻击 +3'; } },
  stone2:{ id:'stone2',name:'二级宝石',   icon:'🔷', type:'gem',    rare:2, price:800,  desc:'防御 +3',               use(){ P.def+=3; return '防御 +3'; } },
  stone3:{ id:'stone3',name:'三级宝石',   icon:'🔶', type:'gem',    rare:3, price:2000, desc:'气血上限 +30',          use(){ P.maxHp+=30; P.hp+=30; return '气血上限 +30'; } },
  /* 特殊 */
  xuan:  { id:'xuan',  name:'玄天残卷',   icon:'📕', type:'special',rare:3, price:0,    desc:'随机获得2点属性',       use(){ P.atk+=1; P.def+=1; return '攻击 +1 · 防御 +1'; } },
};

/* ============================================================
   怪物数据
   ============================================================ */
const MOBS = {
  /* 长安城郊 */
  lang:    { id:'lang',   name:'野狼',   icon:'🐺', lv:1,  hp:60,  atk:10, def:3,  spd:10, exp:25,  gold:15, skills:[] },
  shanzei: { id:'shanzei',name:'山贼',   icon:'🗡️', lv:2,  hp:80,  atk:13, def:5,  spd:9,  exp:35,  gold:25, skills:[] },
  liukou:  { id:'liukou', name:'流寇',   icon:'🏴', lv:3,  hp:100, atk:16, def:6,  spd:11, exp:45,  gold:30, skills:[] },
  /* 江南野外 */
  shuyao:  { id:'shuyao', name:'树妖',   icon:'🌳', lv:5,  hp:160, atk:20, def:10, spd:8,  exp:70,  gold:45, skills:[] },
  chimang: { id:'chimang',name:'赤蟒',   icon:'🐍', lv:6,  hp:190, atk:24, def:8,  spd:12, exp:85,  gold:55, skills:[] },
  linghu:  { id:'linghu', name:'灵狐',   icon:'🦊', lv:7,  hp:170, atk:26, def:7,  spd:18, exp:95,  gold:60, skills:[] },
  /* 大唐境外 */
  shamo:   { id:'shamo',  name:'沙魔',   icon:'🪨', lv:10, hp:300, atk:35, def:18, spd:9,  exp:150, gold:100,skills:[] },
  shadao:  { id:'shadao', name:'沙盗',   icon:'🏹', lv:11, hp:280, atk:40, def:14, spd:14, exp:170, gold:120,skills:[] },
  xieyan:  { id:'xieyan', name:'邪炎兽', icon:'🔥', lv:13, hp:380, atk:50, def:16, spd:13, exp:230, gold:160,skills:[{name:'烈焰',type:'magic',power:1.3}] },
  /* 北俱芦洲 */
  xuelang: { id:'xuelang',name:'雪狼',   icon:'🐺', lv:16, hp:450, atk:60, def:22, spd:15, exp:300, gold:200,skills:[] },
  bingpo:  { id:'bingpo', name:'冰魄',   icon:'❄️', lv:18, hp:420, atk:70, def:20, spd:18, exp:350, gold:240,skills:[{name:'冰封',type:'magic',power:1.5}] },
  xuenv:   { id:'xuenv',  name:'雪女',   icon:'👻', lv:20, hp:400, atk:80, def:25, spd:20, exp:420, gold:300,skills:[{name:'寒霜',type:'magic',power:1.7}] },
  /* 火山 · 顶级 */
  huoya:   { id:'huoya',  name:'火鸦',   icon:'🔥', lv:25, hp:600, atk:110,def:30, spd:20, exp:650, gold:450,skills:[{name:'火羽',type:'magic',power:1.6}] },
  rongyan: { id:'rongyan',name:'熔岩兽', icon:'🌋', lv:28, hp:800, atk:130,def:45, spd:12, exp:800, gold:600,skills:[] },
  yanmo:   { id:'yanmo',  name:'炎魔',   icon:'😈', lv:32, hp:1100,atk:170,def:50, spd:16, exp:1200,gold:900,skills:[{name:'焚天',type:'magic',power:2.0}] },
  haisha:  { id:'haisha', name:'海砂妖', icon:'🦀', lv:34, hp:1250,atk:185,def:58,spd:22,exp:1350,gold:980,skills:[] },
  chaoxi:  { id:'chaoxi', name:'潮汐灵', icon:'🧜', lv:36, hp:1420,atk:205,def:62,spd:24,exp:1520,gold:1120,skills:[{name:'潮汐冲击',type:'magic',power:1.7}] },
  jiaolong:{ id:'jiaolong',name:'深海蛟龙',icon:'🐉',lv:38,hp:1680,atk:225,def:70,spd:20,exp:1780,gold:1350,skills:[{name:'海龙吐息',type:'magic',power:1.9}] },
  youlu:   { id:'youlu', name:'幽谷鹿灵', icon:'🦌', lv:42, hp:1900,atk:250,def:82,spd:28,exp:2050,gold:1550,skills:[] },
  guteng:  { id:'guteng',name:'古藤妖', icon:'🌿', lv:44, hp:2200,atk:270,def:92,spd:18,exp:2320,gold:1780,skills:[{name:'藤缚',type:'magic',power:1.8}] },
  guguai:  { id:'guguai',name:'幽谷守灵',icon:'👺',lv:46,hp:2550,atk:300,def:100,spd:24,exp:2650,gold:2050,skills:[{name:'幽冥震荡',type:'magic',power:2.0}] },
};

/* ============================================================
   召唤兽（灵宠）数据
   ============================================================ */
const PETS = [
  { id:'huahua',name:'小花仙',   icon:'🌸', price:500,  hp:120, atk:16, def:10, spd:14, desc:'温柔的百花仙子' },
  { id:'linghu',name:'九尾灵狐', icon:'🦊', price:2000, hp:200, atk:30, def:14, spd:20, desc:'机敏的九尾妖狐' },
  { id:'hupo',  name:'琥珀虎',   icon:'🐯', price:5000, hp:380, atk:52, def:28, spd:16, desc:'威猛的琥珀神虎' },
  { id:'xiaolong',name:'玄霜幼龙',icon:'🐲',price:12000,hp:600, atk:80, def:42, spd:18, desc:'血脉高贵的幼年霜龙' },
  { id:'jinwu', name:'金乌',     icon:'🐦', price:30000, hp:900, atk:130,def:60, spd:26, desc:'身负太阳真火的神鸟' },
];


/* ================= 2.0 召唤兽装备系统 ================= */
const PET_GEAR_CATALOG={
 pet_claw:{name:'灵兽利爪',icon:'🐾',slot:'weapon',slotName:'灵爪',price:800,atk:8,def:0,hp:0,spd:0,desc:'锋利灵爪，提升召唤兽攻击'},
 pet_fang:{name:'玄铁獠牙',icon:'🦷',slot:'weapon',slotName:'灵爪',price:2600,atk:18,def:0,hp:0,spd:2,desc:'玄铁淬炼的獠牙'},
 pet_armor:{name:'藤纹护甲',icon:'🛡️',slot:'armor',slotName:'护甲',price:900,atk:0,def:8,hp:40,spd:0,desc:'柔韧藤甲，增强防护'},
 pet_scale:{name:'龙鳞战甲',icon:'🐉',slot:'armor',slotName:'护甲',price:3200,atk:2,def:18,hp:100,spd:0,desc:'坚固龙鳞打造的战甲'},
 pet_bell:{name:'清心铃',icon:'🔔',slot:'charm',slotName:'灵饰',price:1200,atk:0,def:4,hp:30,spd:5,desc:'清音护心，提升身法'},
 pet_orb:{name:'聚灵宝珠',icon:'🔮',slot:'charm',slotName:'灵饰',price:3800,atk:12,def:8,hp:70,spd:8,desc:'汇聚灵气的珍贵宝珠'}
};
function normalizePetGear(){
 if(!Array.isArray(P.petGearInventory))P.petGearInventory=[];
 P.petGearInventory=P.petGearInventory.filter(g=>g&&PET_GEAR_CATALOG[g.id]&&Number.isFinite(Number(g.level))).map(g=>({id:g.id,level:Math.max(0,Math.min(3,Math.floor(Number(g.level)||0)))}));
 if(!P.petGearEquipped||typeof P.petGearEquipped!=='object')P.petGearEquipped={weapon:null,armor:null,charm:null};
 ['weapon','armor','charm'].forEach(slot=>{const id=P.petGearEquipped[slot];if(!id||!PET_GEAR_CATALOG[id]||PET_GEAR_CATALOG[id].slot!==slot||!P.petGearInventory.some(g=>g.id===id))P.petGearEquipped[slot]=null;});
}
function petGearStats(){
 normalizePetGear();const total={atk:0,def:0,hp:0,spd:0};
 ['weapon','armor','charm'].forEach(slot=>{const id=P.petGearEquipped[slot],item=PET_GEAR_CATALOG[id];if(!item)return;const inv=P.petGearInventory.find(g=>g.id===id),mul=1+(inv.level||0)*.25;['atk','def','hp','spd'].forEach(k=>total[k]+=Math.floor((item[k]||0)*mul));});
 return total;
}
function buyPetGear(id){
 normalizePetGear();const item=PET_GEAR_CATALOG[id];
 if(!item||P.petGearInventory.some(g=>g.id===id)||P.gold<item.price)return false;
 P.gold-=item.price;P.petGearInventory.push({id,level:0});saveGame();updateHUD();renderPetPanel();toast('🎁 获得召唤兽装备：'+item.name);return true;
}
function equipPetGear(id){
 normalizePetGear();const inv=P.petGearInventory.find(g=>g.id===id),item=PET_GEAR_CATALOG[id];if(!inv||!item||!P.pet)return false;
 const old=P.petGearEquipped[item.slot];P.petGearEquipped[item.slot]=id;
 saveGame();renderPetPanel();toast('🐾 已为 '+P.pet.name+' 装备 '+item.name+(old?'，原装备已收回背包':''));return true;
}
function unequipPetGear(slot){
 normalizePetGear();if(!['weapon','armor','charm'].includes(slot)||!P.petGearEquipped[slot])return false;
 P.petGearEquipped[slot]=null;saveGame();renderPetPanel();toast('已卸下召唤兽装备');return true;
}
function upgradePetGear(id){
 normalizePetGear();const inv=P.petGearInventory.find(g=>g.id===id);if(!inv||inv.level>=3)return false;
 const cost=500*(inv.level+1);if(P.gold<cost){toast('银两不足，需要 '+cost+' 两');return false;}
 P.gold-=cost;inv.level++;saveGame();updateHUD();renderPetPanel();toast('✨ 装备强化至 +'+inv.level);return true;
}
function rollPetGearDrop(){
 if(!P.pet||Math.random()>.12)return null;
 normalizePetGear();const available=Object.keys(PET_GEAR_CATALOG).filter(id=>!P.petGearInventory.some(g=>g.id===id));
 if(!available.length)return null;
 const defeated=battle.units.filter(u=>u.isEnemy&&!u.isBoss&&!u.alive);if(!defeated.length)return null;
 const maxLv=Math.max(...defeated.map(u=>Number(u.lv)||1));
 const pool=available.filter(id=>PET_GEAR_CATALOG[id].price<=(maxLv>=25?4000:maxLv>=10?3000:1500));
 const choices=pool.length?pool:available;const id=choices[Math.floor(Math.random()*choices.length)];
 P.petGearInventory.push({id,level:0});saveGame();return PET_GEAR_CATALOG[id];
}

/* ================= 2.0 召唤兽捕捉、成长与进化 ================= */
const PET_SKILLS={
 huahua:{id:'flower_heal',name:'花灵回春',type:'heal',power:0.24,desc:'每三次行动恢复自身最大气血的24%'},
 linghu:{id:'fox_combo',name:'九尾连袭',type:'phys',power:1.55,desc:'每三次行动发动迅捷连袭，造成1.55倍攻击伤害'},
 hupo:{id:'tiger_crush',name:'裂地猛扑',type:'phys',power:1.7,desc:'每三次行动发动重击，造成1.7倍攻击伤害'},
 xiaolong:{id:'frost_breath',name:'霜龙吐息',type:'magic',power:1.45,effect:'stun',desc:'每三次行动造成寒霜伤害，并有20%概率定身'},
 jinwu:{id:'sun_burn',name:'日曜焚羽',type:'magic',power:1.65,effect:'burn',desc:'每三次行动造成烈焰伤害，并追加灼烧'}
};
function petAptitudeRoll(){return {hp:90+Math.floor(Math.random()*21),atk:90+Math.floor(Math.random()*21),def:90+Math.floor(Math.random()*21),spd:90+Math.floor(Math.random()*21)};}
function petBaseSpecies(pet){return pet&&pet.speciesId||({baihuaxian:'huahua',jiuwei:'linghu',xuanhu:'hupo',binglong:'xiaolong',taiyangjinwu:'jinwu'}[pet&&pet.id]||pet&&pet.id);}
const PET_EVOLUTIONS={
 huahua:{at:15,id:'baihuaxian',name:'百花灵仙',icon:'🌺',desc:'百花灵气凝聚而成的仙灵'},
 linghu:{at:20,id:'jiuwei',name:'九尾天狐',icon:'🦊',desc:'觉醒远古天狐血脉的灵兽'},
 hupo:{at:25,id:'xuanhu',name:'玄甲神虎',icon:'🐅',desc:'突破血脉桎梏的玄甲神虎'},
 xiaolong:{at:30,id:'binglong',name:'霜穹神龙',icon:'🐉',desc:'掌控寒霜之力的神龙'},
 jinwu:{at:35,id:'taiyangjinwu',name:'太阳金乌',icon:'☀️',desc:'完全觉醒太阳真火的神鸟'}
};
function normalizePetRecord(pet){
 if(!pet||typeof pet!=='object')return null;
 const base=PETS.find(x=>x.id===pet.id);
 pet.lv=Math.max(1,Math.min(100,Math.floor(Number(pet.lv)||1)));
 pet.exp=Math.max(0,Math.floor(Number(pet.exp)||0));
 pet.stage=Math.max(0,Math.floor(Number(pet.stage)||0));
 pet.speciesId=petBaseSpecies(pet);
 if(!pet.aptitude||typeof pet.aptitude!=='object')pet.aptitude={hp:100,atk:100,def:100,spd:100};
 ['hp','atk','def','spd'].forEach(k=>{pet.aptitude[k]=Math.max(80,Math.min(120,Math.floor(Number(pet.aptitude[k])||100)));});
 pet.breakthrough=Math.max(0,Math.min(3,Math.floor(Number(pet.breakthrough)||0)));
 pet.skillRank=Math.max(1,Math.min(3,Math.floor(Number(pet.skillRank)||1)));
 pet.skillActions=Math.max(0,Math.floor(Number(pet.skillActions)||0));
 if(!Number.isFinite(Number(pet.maxHp))||Number(pet.maxHp)<=0)pet.maxHp=base?base.hp:100;
 ['hp','atk','def','spd'].forEach(k=>{const fallback=base&&base[k]||10;pet[k]=Math.max(k==='hp'?1:0,Math.floor(Number(pet[k])||fallback));});
 pet.maxHp=Math.max(1,Math.floor(Number(pet.maxHp)||pet.hp));pet.hp=clamp(pet.hp,0,pet.maxHp);
 return pet;
}
function petExpNeed(level){return Math.floor(35*Math.pow(Math.max(1,level),1.45));}
function gainPetExp(amount){
 const pet=normalizePetRecord(P.pet);if(!pet||!Number.isFinite(amount)||amount<=0)return 0;
 pet.exp+=Math.floor(amount);let levels=0;
 while(pet.lv<100&&pet.exp>=petExpNeed(pet.lv)){
  pet.exp-=petExpNeed(pet.lv);pet.lv++;levels++;
  const hpGain=Math.max(5,Math.floor(pet.maxHp*.035));const hpGrowth=Math.max(1,Math.floor(hpGain*pet.aptitude.hp/100));pet.maxHp+=hpGrowth;pet.hp=Math.min(pet.maxHp,pet.hp+hpGrowth);
  pet.atk+=Math.max(1,Math.floor(pet.atk*.025*pet.aptitude.atk/100));pet.def+=Math.max(1,Math.floor(pet.def*.025*pet.aptitude.def/100));if(pet.lv%5===0)pet.spd+=1+Math.max(0,Math.floor((pet.aptitude.spd-100)/10));
  const evo=PET_EVOLUTIONS[pet.id];
  if(evo&&pet.lv>=evo.at&&pet.stage===0){
   const ratio=pet.hp/pet.maxHp;pet.id=evo.id;pet.name=evo.name;pet.icon=evo.icon;pet.desc=evo.desc;pet.stage=1;
   pet.maxHp=Math.floor(pet.maxHp*1.35);pet.hp=Math.max(1,Math.floor(pet.maxHp*ratio));pet.atk=Math.floor(pet.atk*1.3);pet.def=Math.floor(pet.def*1.25);pet.spd=Math.floor(pet.spd*1.1);
   toast('✨ '+pet.name+' 进化成功！');addLog('【召唤兽】'+pet.name+' 完成血脉进化','good');
  }
 }
 if(levels){toast('🐾 '+pet.name+' 提升 '+levels+' 级');addLog('【召唤兽】'+pet.name+' 获得 '+Math.floor(amount)+' 点经验','good');}
 return levels;
}
function rollPetCaptureOffer(){
 if(P.petCaptureOffer||!Array.isArray(P.petBox)||P.petBox.length>=6)return false;
 const defeated=battle.units.filter(u=>u.isEnemy&&!u.isBoss&&!u.alive);
 if(!defeated.length||Math.random()>.22)return false;
 const enemy=defeated.reduce((a,b)=>(b.lv||1)>(a.lv||1)?b:a,defeated[0]);
 const id=(enemy.lv||1)<=10?'huahua':(enemy.lv||1)<=20?'linghu':(enemy.lv||1)<=30?'hupo':(enemy.lv||1)<=40?'xiaolong':'jinwu';
 if(!PETS.some(p=>p.id===id))return false;
 P.petCaptureOffer={id,enemyName:enemy.name,enemyLv:enemy.lv||1};saveGame();
 toast('🌿 发现灵宠踪迹！前往召唤兽面板尝试捕捉');return true;
}
function buyPetSeal(){
 if(P.gold<300){toast('银两不足，需要 300 两');return false;}
 P.gold-=300;P.bag.petSeal=Math.max(0,Number(P.bag.petSeal)||0)+1;
 updateHUD();saveGame();toast('🎴 获得一张捕灵符');renderPetPanel();return true;
}
function capturePet(){
 const offer=P.petCaptureOffer;if(!offer){toast('当前没有可捕捉的灵宠踪迹');return false;}
 if((Number(P.bag.petSeal)||0)<1){toast('需要捕灵符，可在灵兽园购买');return false;}
 if(!P.pet&&P.petBox.length>=6){toast('召唤兽仓库已满');return false;}
 const t=PETS.find(p=>p.id===offer.id);if(!t){P.petCaptureOffer=null;saveGame();return false;}
 P.bag.petSeal--;const chance=clamp(.72+(P.lv-(offer.enemyLv||1))*.025,.15,.95),success=Math.random()<chance;
 if(success){
  const lv=Math.max(1,Math.min(P.lv,offer.enemyLv||1)),scale=1+(lv-1)*.035;
  const aptitude=petAptitudeRoll();
  const pet={id:t.id,speciesId:t.id,name:t.name,icon:t.icon,desc:t.desc,hp:Math.floor(t.hp*scale),maxHp:Math.floor(t.hp*scale),atk:Math.floor(t.atk*scale),def:Math.floor(t.def*scale),spd:Math.floor(t.spd*scale),lv,exp:0,stage:0,aptitude,skillRank:1,skillActions:0};
  if(!P.pet)P.pet=pet;else P.petBox.push(pet);
  toast('🎉 成功捕捉 '+pet.name+'！');addLog('【召唤兽】野外捕捉 '+pet.name,'good');
 }else{toast('捕捉失败，灵宠挣脱了！');addLog('【召唤兽】捕捉失败','warn');}
 P.petCaptureOffer=null;updateHUD();saveGame();renderPetPanel();return success;
}

const GEAR_CATALOG={
 iron_sword:{name:'精铁长剑',icon:'⚔️',slot:'weapon',slotName:'武器',price:900,atk:12,magic:2,desc:'入门武器，提升攻击与法术'},
 flame_blade:{name:'赤焰刀',icon:'🗡️',slot:'weapon',slotName:'武器',price:4800,atk:32,magic:12,desc:'蕴含火灵之力的进阶兵刃'},
 cloud_armor:{name:'云纹甲',icon:'🛡️',slot:'armor',slotName:'护甲',price:1100,def:12,hp:60,desc:'轻便坚韧的护身甲胄'},
 basalt_armor:{name:'玄岩战铠',icon:'🛡️',slot:'armor',slotName:'护甲',price:5200,def:34,hp:180,desc:'以玄岩精铁锻造的重甲'},
 jade_helm:{name:'青玉冠',icon:'👑',slot:'helmet',slotName:'头盔',price:850,hp:45,mp:20,desc:'温润灵玉凝成的护额'},
 dragon_helm:{name:'蛟龙盔',icon:'🐉',slot:'helmet',slotName:'头盔',price:4200,hp:130,def:10,desc:'刻有蛟龙纹样的战盔'},
 swift_boots:{name:'追风靴',icon:'🥾',slot:'boots',slotName:'鞋履',price:1000,spd:8,def:3,desc:'轻盈灵巧，提升移动身法'},
 cloud_boots:{name:'踏云履',icon:'👟',slot:'boots',slotName:'鞋履',price:4600,spd:20,hp:70,desc:'踏云而行的珍稀鞋履'},
 spirit_pendant:{name:'聚灵坠',icon:'📿',slot:'accessory',slotName:'饰品',price:1300,magic:10,mp:45,desc:'凝聚天地灵气的护身坠'},
 phoenix_pendant:{name:'凤羽佩',icon:'🪶',slot:'accessory',slotName:'饰品',price:6000,atk:12,magic:25,hp:100,desc:'蕴含凤羽灵韵的珍贵饰品'},
 boss_guardian_blade:{name:'镇城斩妖剑',icon:'⚔️',slot:'weapon',slotName:'武器',price:0,atk:48,magic:18,desc:'击败长安镇城妖将所得，剑锋镇邪',bossOnly:true,quality:'稀有',qualityRank:2},
 boss_ancient_heart:{name:'古树灵心甲',icon:'🌿',slot:'armor',slotName:'护甲',price:0,def:42,hp:240,desc:'碧波树皇的生命精华凝成',bossOnly:true,quality:'史诗',qualityRank:3},
 boss_desert_crown:{name:'黄沙王冠',icon:'👑',slot:'helmet',slotName:'头盔',price:0,hp:170,mp:85,magic:22,desc:'黄沙魔君遗留的统御之冠',bossOnly:true,quality:'史诗',qualityRank:3},
 boss_frost_steps:{name:'霜封踏雪靴',icon:'❄️',slot:'boots',slotName:'鞋履',price:0,spd:28,def:15,hp:90,desc:'极寒雪魔的寒霜结晶所化',bossOnly:true,quality:'稀有',qualityRank:2},
 boss_flame_soul:{name:'炎帝焚心佩',icon:'🔥',slot:'accessory',slotName:'饰品',price:0,atk:24,magic:42,hp:180,desc:'熔岩炎帝核心凝结的传世宝佩',bossOnly:true,quality:'传说',qualityRank:4}
};
const BOSS_GEAR_DROPS={boss_changan:'boss_guardian_blade',boss_jiangnan:'boss_ancient_heart',boss_datang:'boss_desert_crown',boss_beiju:'boss_frost_steps',boss_huoyan:'boss_flame_soul'};
const GEAR_SLOTS=[['weapon','武器'],['armor','护甲'],['helmet','头盔'],['boots','鞋履'],['accessory','饰品']];
function getGearQuality(item){return item&&item.quality||'普通';}
function getEquippedBossGearCount(){return GEAR_SLOTS.reduce((n,[slot])=>{const id=P.equipment&&P.equipment[slot],it=id&&GEAR_CATALOG[id];return n+(it&&it.bossOnly?1:0);},0);}
function getGearSetBonuses(count=getEquippedBossGearCount()){if(count>=5)return {atk:24,def:24,magic:18,spd:8,hp:120,mp:60};if(count>=3)return {atk:12,def:12,magic:10};if(count>=2)return {atk:8,def:8};return {};}
function syncGearSetBonuses(){const old=P.gearSetApplied&&typeof P.gearSetApplied==='object'?P.gearSetApplied:{},next=getGearSetBonuses();const delta={};new Set([...Object.keys(old),...Object.keys(next)]).forEach(k=>{const d=(next[k]||0)-(old[k]||0);if(d)delta[k]=d;});applyGearDelta(delta,1);P.gearSetApplied={...next};return next;}
function getGearCodexProgress(){const total=Object.keys(GEAR_CATALOG).length,found=Object.keys(GEAR_CATALOG).filter(id=>P.gearCodex&&P.gearCodex[id]).length;return {found,total};}
function renderGearCodex(){const body=$('gearCodexBody');if(!body)return;const progress=getGearCodexProgress();const items=Object.entries(GEAR_CATALOG).map(([id,it])=>{const found=!!(P.gearCodex&&P.gearCodex[id]);return '<div class="list-item"><div class="li-icon">'+(found?it.icon:'❔')+'</div><div class="li-body"><div class="li-name" style="color:'+(found?({稀有:'#75bfff',史诗:'#c28aff',传说:'#ffb84d'}[getGearQuality(it)]||'#e7dfc8'):'#9a927f')+'">'+(found?it.name:'未发现装备')+'</div><div class="li-desc">'+(found?it.slotName+' · '+getGearQuality(it)+' · '+it.desc:(it.bossOnly?'Boss专属装备 · 尚未获得':'坊市装备 · 尚未获得'))+'</div></div><span class="li-count">'+(found?'已收集':'未收集')+'</span></div>';}).join('');body.innerHTML='<div class="dev-summary"><b>装备图鉴</b><b>'+progress.found+' / '+progress.total+'</b></div><div class="dev-help">收集过的装备会永久记录在图鉴中；旧存档会根据当前装备背包自动补录。</div><div class="dev-feature-list">'+items+'</div>';}
function grantBossGear(bossId){const id=BOSS_GEAR_DROPS[bossId],item=id&&GEAR_CATALOG[id];if(!item)return null;if(!P.bossGearDrops||typeof P.bossGearDrops!=='object')P.bossGearDrops={};if(P.bossGearDrops[bossId]||P.gearInventory.some(g=>g.id===id)){P.bossGearDrops[bossId]=true;return null;}P.bossGearDrops[bossId]=true;P.gearInventory.push({id,level:0});if(!P.gearCodex||typeof P.gearCodex!=='object')P.gearCodex={};P.gearCodex[id]=true;addLog('【Boss掉落】获得'+getGearQuality(item)+'装备 '+item.name,'good');return item;}
function gearStats(item,level=0){const out={};['atk','def','spd','magic','hp','mp'].forEach(k=>{if(item[k])out[k]=Math.floor(item[k]*(1+level*.2));});return out;}
function applyGearDelta(stats,sign){Object.keys(stats||{}).forEach(k=>{const key=k==='hp'?'maxHp':k==='mp'?'maxMp':k;if(Number.isFinite(P[key]))P[key]=Math.max(key==='maxHp'||key==='maxMp'?1:0,P[key]+stats[k]*sign);});P.hp=Math.min(P.hp,P.maxHp);P.mp=Math.min(P.mp,P.maxMp);}
function getEquippedGear(slot){const id=P.equipment&&P.equipment[slot];return id?P.gearInventory.find(g=>g.id===id)||null:null;}
function renderEquipmentPanel(){
 const body=$('equipmentBody');if(!body)return;
 const equipped=GEAR_SLOTS.map(([slot,label])=>{const g=getEquippedGear(slot),it=g&&GEAR_CATALOG[g.id];return '<div class="list-item"><div class="li-icon">'+(it?it.icon:'⬜')+'</div><div class="li-body"><div class="li-name">'+label+' · '+(it?it.name:'未装备')+'</div><div class="li-desc">'+(it?'锻造等级 +'+g.level+' · '+Object.entries(gearStats(it,g.level)).map(([k,v])=>({atk:'攻击',def:'防御',spd:'速度',magic:'法术',hp:'气血',mp:'法力'}[k])+' '+v).join(' / '):'此部位尚无装备')+'</div></div>'+(g?'<button class="li-btn" data-unequip="'+slot+'">卸下</button>':'')+'</div>';}).join('');
 const inventory=P.gearInventory.map((g,i)=>{const it=GEAR_CATALOG[g.id],isOn=P.equipment[it.slot]===g.id;return '<div class="list-item"><div class="li-icon">'+it.icon+'</div><div class="li-body"><div class="li-name" style="color:'+({普通:'#e7dfc8',稀有:'#75bfff',史诗:'#c28aff',传说:'#ffb84d'}[getGearQuality(it)]||'#e7dfc8')+'">'+it.name+' <span class="li-count">'+getGearQuality(it)+' · + '+g.level+'</span></div><div class="li-desc">'+it.slotName+' · '+it.desc+'</div></div><button class="li-btn" data-equip-index="'+i+'" '+(isOn?'disabled':'')+'>'+(isOn?'已装备':'装备')+'</button><button class="li-btn" data-forge-index="'+i+'">锻造</button></div>';}).join('');
 const shop=Object.entries(GEAR_CATALOG).filter(([,it])=>!it.bossOnly).map(([id,it])=>'<div class="list-item"><div class="li-icon">'+it.icon+'</div><div class="li-body"><div class="li-name">'+it.name+'</div><div class="li-desc">'+it.slotName+' · '+it.desc+'</div></div><div class="li-right" style="color:#ffd060">'+fmt(it.price)+'<small>两</small></div><button class="li-btn" data-buy-gear="'+id+'" '+(P.gold<it.price?'disabled':'')+'>购买</button></div>').join('');
 const setCount=getEquippedBossGearCount(),setBonus=getGearSetBonuses(setCount),setLabel=setCount>=5?'五件套：五方镇域（全属性强化）':setCount>=3?'三件套：镇域灵威（攻击、防御、法术）':setCount>=2?'两件套：镇域初成（攻击、防御）':'收集并装备至少 2 件 Boss 专属装备激活套装效果';
 body.innerHTML='<div class="dev-help">装备提供属性加成；每个部位只能装备一件。锻造最高 +5，每次消耗 1 颗一级宝石与银两。</div><button class="btn" id="btnOpenGearCodex">📖 查看装备图鉴</button><section class="dev-feature"><div class="dev-feature-head"><div><b>🛡️ 五方镇域套装</b><small>'+setCount+'/5 件 Boss 专属装备已穿戴</small></div><span class="dev-status '+(setCount>=2?'ok':'pending')+'">'+(setCount>=2?'效果已激活':'未激活')+'</span></div><p class="dev-help">'+setLabel+'</p><small>当前套装加成：'+(Object.entries(setBonus).map(([k,v])=>({atk:'攻击',def:'防御',magic:'法术',spd:'速度',hp:'气血上限',mp:'法力上限'}[k])+' +'+v).join(' / ')||'无')+'</small></section><h3 class="dev-section-title">当前装备</h3>'+equipped+'<h3 class="dev-section-title">装备背包 ('+P.gearInventory.length+')</h3>'+(inventory||'<p class="empty-tip">还没有装备，去装备商铺看看吧</p>')+'<h3 class="dev-section-title">装备商铺</h3>'+shop;
 const codexBtn=$('btnOpenGearCodex');if(codexBtn)codexBtn.onclick=()=>{renderGearCodex();openModal('modalGearCodex');};
 body.querySelectorAll('[data-buy-gear]').forEach(btn=>btn.onclick=()=>buyGear(btn.dataset.buyGear));
 body.querySelectorAll('[data-equip-index]').forEach(btn=>btn.onclick=()=>equipGear(Number(btn.dataset.equipIndex)));
 body.querySelectorAll('[data-unequip]').forEach(btn=>btn.onclick=()=>unequipGear(btn.dataset.unequip));
 body.querySelectorAll('[data-forge-index]').forEach(btn=>btn.onclick=()=>forgeGear(Number(btn.dataset.forgeIndex)));
}
function buyGear(id){const it=GEAR_CATALOG[id];if(!it||P.gold<it.price)return toast('银两不足');if(P.gearInventory.some(g=>g.id===id))return toast('已拥有这件装备');if(P.gearInventory.length>=30)return toast('装备背包已满');P.gold-=it.price;P.gearInventory.push({id,level:0});if(!P.gearCodex||typeof P.gearCodex!=='object')P.gearCodex={};P.gearCodex[id]=true;toast('购入 '+it.name);addLog('【装备】购入 '+it.name,'good');saveGame();updateHUD();renderEquipmentPanel();}
function equipGear(index){const g=P.gearInventory[index];if(!g)return;const it=GEAR_CATALOG[g.id],old=getEquippedGear(it.slot);if(old)applyGearDelta(gearStats(GEAR_CATALOG[old.id],old.level),-1);P.equipment[it.slot]=g.id;applyGearDelta(gearStats(it,g.level),1);syncGearSetBonuses();toast('已装备 '+it.name);addLog('【装备】装备 '+it.name,'good');saveGame();updateHUD();renderEquipmentPanel();}
function unequipGear(slot){const g=getEquippedGear(slot);if(!g)return;applyGearDelta(gearStats(GEAR_CATALOG[g.id],g.level),-1);P.equipment[slot]=null;syncGearSetBonuses();toast('已卸下装备');saveGame();updateHUD();renderEquipmentPanel();}
function forgeGear(index){const g=P.gearInventory[index];if(!g)return;const it=GEAR_CATALOG[g.id];if(g.level>=5)return toast('已达到最高锻造等级');if((P.bag.stone1||0)<1)return toast('需要 1 颗一级宝石');const cost=500*(g.level+1);if(P.gold<cost)return toast('银两不足，需要 '+cost+' 两');const active=P.equipment[it.slot]===g.id;if(active)applyGearDelta(gearStats(it,g.level),-1);P.bag.stone1--;P.gold-=cost;g.level++;if(active)applyGearDelta(gearStats(it,g.level),1);toast(it.name+' 锻造成功，当前 +'+g.level);addLog('【锻造】'+it.name+' 提升至 +'+g.level,'good');saveGame();updateHUD();renderEquipmentPanel();}

/* ============================================================
   玩家状态
   ============================================================ */
const P = {
  name: '无名侠客',
  sect: null,
  lv: 1,
  exp: 0,
  hp: 100, maxHp: 100,
  mp: 50,  maxMp: 50,
  atk: 15, def: 8, spd: 12, magic: 10,
  gold: 100,
  x: 0, y: 0,
  scene: '长安城',
  subScene: '中心广场',
  bag: {},
  pet: null,
  petBox: [],
  steps: 0,
  lastEncounterStep: 0,
  teleportStones: ['changan'],
  battles: 0,
  kills: 0,
  killStats: {},
  bankGold: 0,
  petCaptureOffer: null,
  equipment: {weapon:null,armor:null,helmet:null,boots:null,accessory:null},
  gearInventory: [], gearCodex:{}, gearSetApplied:{},
  quest: null,
  questDone: 0,
  dailyQuestDate: '', dailyQuestProgress: {wins:0,bosses:0,kills:0}, dailyQuestClaimed: [], achievementsClaimed: [],
  challenge:{date:'',entered:false,active:false,stage:0,bestStage:0,totalWins:0,totalCompletions:0},
  flags: {},
  avatar: 'original', cultivationBooks:[], cultivationActive:null, cultivationProgressMs:0, bossDrops:{}, bossGearDrops:{}, laomuCooldownUntil:0, discoveredRegions:['changan','jiangnan','datang','beiju','huoyan'],
  immortalRealm:{unlocked:false,stageIndex:0,dao:0,qi:0,jade:0,body:100,spirit:100,trialStep:0,onlineSeconds:0,notice:'仙界尚未开启',activeTab:'mansion',view:'mortal',sect:null,techniques:[],artifacts:[],bosses:{},mapWorldVersion:2,mapX:0,mapY:0,mapSteps:0,lastMapEncounterStep:0,mapDiscovered:[],mapClaimed:[],materials:{starSand:0,swordShard:0,chaosShard:0,voidCrystal:0,immortalHerb:0},mansion:{arrayLevel:0,fieldLevel:0,puppetLevel:0,fieldPlanted:false,fieldProgress:0,herbs:0}},
};

/* 经验公式 */
function expNeed(){
  return Math.floor(60 * Math.pow(P.lv, 1.65));
}

/* 开发者辅助：一键提升至满级（当前版本上限 100 级） */
const DEV_MAX_LEVEL = 100;
/* 开发者辅助：一键设置巨额银两（安全整数范围内） */
const DEV_INFINITE_GOLD = 999999999999999;
function developerInfiniteGold(){
  if(!P || !Number.isFinite(P.gold)){toast('角色银两数据无效');return false;}
  if(!confirm('确定将身上银两设置为 '+fmt(DEV_INFINITE_GOLD)+' 两？此操作会立即保存。'))return false;
  P.gold=DEV_INFINITE_GOLD;
  updateHUD();
  saveGame();
  addLog('【开发者】一键设置巨额银两','good');
  toast('💰 已获得巨额银两！');
  return P.gold;
}

/* 开发者辅助：无限仙玉 */
const DEV_INFINITE_JADE=999999999999999;
function developerInfiniteJade(){
 const r=P&&P.immortalRealm;
 if(!r||!r.unlocked){toast('请先解锁仙界，再使用无限仙玉');return false;}
 if(!confirm('确定将仙玉设置为无限数量？此操作会立即保存。'))return false;
 r.jade=DEV_INFINITE_JADE;saveGame();
 if(typeof renderImmortalRealm==='function')renderImmortalRealm(r.activeTab||'mansion');
 addLog('【开发者】开启无限仙玉','good');toast('💎 已获得无限仙玉！');return true;
}

function developerMaxLevel(){
  if(!P.sect || !SECTS.some(s=>s.id===P.sect)){toast('请先选择门派，再使用一键满级');return false;}
  if(P.lv>=DEV_MAX_LEVEL){toast('当前已经是满级 Lv.'+DEV_MAX_LEVEL);return false;}
  if(!confirm('确定将角色直接提升至 Lv.'+DEV_MAX_LEVEL+'？此操作会立即生效并自动保存。'))return false;
  const sect=SECTS.find(s=>s.id===P.sect);
  const gained=DEV_MAX_LEVEL-P.lv;
  for(let lv=P.lv+1;lv<=DEV_MAX_LEVEL;lv++){
    P.maxHp+=Math.floor(sect.grow.hp);
    P.maxMp+=Math.floor(sect.grow.mp);
    P.atk+=Math.floor(sect.grow.atk);
    P.def+=Math.floor(sect.grow.def);
    P.spd+=Math.floor(sect.grow.spd);
    P.magic+=Math.floor(sect.grow.magic);
  }
  P.lv=DEV_MAX_LEVEL;
  P.exp=0;
  P.hp=P.maxHp;
  P.mp=P.maxMp;
  updateHUD();
  saveGame();
  addLog('【开发者】一键满级：Lv.'+DEV_MAX_LEVEL,'good');
  toast('🌟 已提升至满级 Lv.'+DEV_MAX_LEVEL+'！');
  return gained;
}


/* 获得经验 */
function gainExp(amount){
  P.exp += amount;
  let leveled = false;
  while (P.exp >= expNeed()){
    P.exp -= expNeed();
    P.lv++;
    const s = SECTS.find(x => x.id === P.sect);
    if (s){
      P.maxHp += Math.floor(s.grow.hp);
      P.maxMp += Math.floor(s.grow.mp);
      P.atk   += Math.floor(s.grow.atk);
      P.def   += Math.floor(s.grow.def);
      P.spd   += Math.floor(s.grow.spd);
      P.magic += Math.floor(s.grow.magic);
      P.hp = P.maxHp;
      P.mp = P.maxMp;
    }
    leveled = true;
    // 检查新技能
    const skills = getSectSkills().filter(sk => sk.lv === P.lv);
    skills.forEach(sk => {
      toast(`📖 领悟了【${sk.name}】！`);
      addLog(`【升级】领悟新技能：${sk.name}`, 'good');
    });
  }
  if (leveled){
    toast(`🌟 等级提升！当前 Lv.${P.lv}`);
    updateHUD();
  }
}

/* 获取门派技能 */
function getSectSkills(){
  if (!P.sect) return [];
  const s = SECTS.find(x => x.id === P.sect);
  return s ? s.skills.filter(sk => sk.lv <= P.lv && sk.type !== 'special') : [];
}

/* ============================================================
   日志（主界面下方浮动，简化为 toast 队列）
   ============================================================ */
const logQueue = [];
function addLog(text, cls = ''){
  logQueue.push({ text, cls, time: Date.now() });
  // 保留最近20条
  if (logQueue.length > 20) logQueue.shift();
}

/* ============================================================
   门派选择
   ============================================================ */
let pendingSect = null;

function renderSectSelect(){
  const body = $('sectBody');
  body.innerHTML = '';
  const tip = document.createElement('div');
  tip.className = 'sect-tip';
  tip.textContent = changingSectMode ? '选择新的门派。确认后等级、经验与全部召唤兽将清零' : '少侠初入江湖，请择一门派投之';
  body.appendChild(tip);
  const list = document.createElement('div');
  list.className = 'sect-list';
  SECTS.forEach(s => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sect-card';
    card.dataset.sectId = s.id;
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = `<span class="sect-emblem" style="--sect-color:${s.color}"><span class="sect-emblem-glyph" aria-hidden="true">${s.icon}</span></span><span class="sect-content"><span class="sect-name" style="--sect-color:${s.color}">${s.name}</span><span class="sect-desc">${s.desc}</span><span class="sect-stats">气血 ${s.base.hp} · 法力 ${s.base.mp} · 攻击 ${s.base.atk} · 防御 ${s.base.def}</span><span class="sect-skills">${s.skills.map(k => `<span class="sect-skill">${k.name}</span>`).join('')}</span></span>`;
    card.addEventListener('click', () => {
      $$('#sectBody .sect-card').forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false'); });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      pendingSect = s.id;
      $('btnSectConfirm').disabled = false;
    });
    list.appendChild(card);
  });
  body.appendChild(list);
}
/* 确认选择门派 */
let changingSectMode = false;

// 初次进入游戏时，HTML 中的门派弹窗已显示，必须主动填充门派卡片
renderSectSelect();

$('btnSectConfirm').addEventListener('click', () => {
  if (!pendingSect) return;
  if (changingSectMode) convertSect(pendingSect);
  else chooseSect(pendingSect);
});

/* 自由转换门派：保留银两、背包、地图进度等；等级/经验/召唤兽清零 */
function convertSect(id){
  const next = SECTS.find(x => x.id === id);
  if (!next || id === P.sect) {
    if (id === P.sect) toast('你已经属于这个门派了');
    return;
  }
  if (typeof battle !== 'undefined' && battle.active) {
    toast('战斗中无法转换门派');
    return;
  }
  const old = SECTS.find(x => x.id === P.sect);
  const accepted = window.confirm(
    '确定转换为【' + next.name + '】吗？\n\n转换后将永久失去：\n• 当前等级与全部经验（重置为 Lv.1）\n• 当前召唤兽与仓库中的所有宠物\n\n银两、背包物品、任务、地图进度和角色外观会保留。'
  );
  if (!accepted) return;

  P.sect = id;
  P.lv = 1;
  P.exp = 0;
  P.pet = null;
  P.petBox = [];
  P.maxHp = next.base.hp;
  P.maxMp = next.base.mp;
  P.atk = next.base.atk;
  P.def = next.base.def;
  P.spd = next.base.spd;
  P.magic = next.base.magic;
  P.hp = P.maxHp;
  P.mp = P.maxMp;

  changingSectMode = false;
  pendingSect = null;
  $('modalSect').classList.remove('show');
  $('modalChar').classList.remove('show');
  updateHUD();
  renderWorld();
  saveGame();
  toast('🔄 已转入' + next.name + '，修为与召唤兽已清空');
  addLog('【转门派】' + (old ? old.name : '原门派') + ' → ' + next.name + '；等级、经验与召唤兽已重置', 'warn');
}

function chooseSect(id){
  const s = SECTS.find(x => x.id === id);
  if (!s) return;
  
  P.sect = id;
  P.maxHp = s.base.hp;
  P.maxMp = s.base.mp;
  P.atk   = s.base.atk;
  P.def   = s.base.def;
  P.spd   = s.base.spd;
  P.magic = s.base.magic;
  P.hp = P.maxHp;
  P.mp = P.maxMp;
  
  $('modalSect').classList.remove('show');
  $('pSect').textContent = s.name;
  
  toast(`🎋 你拜入了 ${s.name}，从此踏上修仙之路`);
  addLog(`【门派】拜入 ${s.name}`, 'good');
  addLog(`【提示】使用方向键在长安城中行走，前往野外历练。`, 'dim');
  
  updateHUD();
  renderWorld();
  startGameLoop();
}

/* ============================================================
   HUD 更新
   ============================================================ */
function updateHUD(){
  renderAvatar();
  $('pName').textContent = P.name;
  const sect = SECTS.find(s => s.id === P.sect);
  $('pSect').textContent = sect ? sect.name : '无门无派';
  $('pLv').innerHTML = `Lv.<b>${P.lv}</b>`;
  
  const hpP = clamp(P.hp / P.maxHp * 100, 0, 100);
  const mpP = clamp(P.mp / P.maxMp * 100, 0, 100);
  const exP = clamp(P.exp / expNeed() * 100, 0, 100);
  $('hpFill').style.width = hpP + '%';
  $('mpFill').style.width = mpP + '%';
  $('expFill').style.width = exP + '%';
  $('hpText').textContent = Math.ceil(P.hp);
  $('hpMax').textContent = P.maxHp;
  $('mpText').textContent = Math.ceil(P.mp);
  $('mpMax').textContent = P.maxMp;
  $('expText').textContent = P.exp;
  $('expMax').textContent = expNeed();
  
  $('goldVal').textContent = fmt(P.gold);
  const coordHud=$('playerCoordHud');if(coordHud)coordHud.textContent=`坐标 X:${P.x} Y:${P.y}`;
  if(typeof syncImmortalNavigation==='function')syncImmortalNavigation();
}

/* ============================================================
   toast 提示
   ============================================================ */
let toastTimer = null;
function toast(msg){
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ============================================================
   场景大字提示（切场景时）
   ============================================================ */
let bannerTimer = null;
function showBanner(text){
  const el = $('sceneBanner');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 1500);
}

/* ============================================================
   弹窗系统
   ============================================================ */
function openModal(id){ $(id).classList.add('show'); }
function closeModal(id){ $(id).classList.remove('show'); }

/* 绑定所有弹窗关闭按钮 */
document.addEventListener('click', e => {
  const closeTarget = e.target.closest('[data-close]');
  if (closeTarget){
    closeModal(closeTarget.dataset.close);
  }
});

/* 存档导入导出 */
function exportSave(){
  if (!saveGame()){
    toast('存档失败，无法下载');
    return;
  }

  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) throw new Error('没有可导出的存档');

    const blob = new Blob([raw], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `梦幻西游存档-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('💾 存档已下载');
  }catch(err){
    console.warn('下载存档失败：', err);
    toast('下载存档失败');
  }
}

async function importSaveFile(file){
  if (!file) return;

  try{
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || Array.isArray(data)){
      throw new Error('存档格式无效');
    }
    if (!SECTS.some(s => s.id === data.sect)){
      throw new Error('存档缺少有效门派');
    }
    if (!applySaveData(data)){
      throw new Error('存档内容无效');
    }

    if (!saveGame()){
      throw new Error('导入后保存失败');
    }
    updateHUD();
    renderWorld();
    startGameLoop();
    closeModal('modalChar');
    toast('📥 存档已上传并读取');
  }catch(err){
    console.warn('上传存档失败：', err);
    toast('上传存档失败，请选择有效的存档文件');
  }
}

$('btnExportSave').addEventListener('click', exportSave);
$('btnImportSave').addEventListener('click', () => $('saveFileInput').click());
$('saveFileInput').addEventListener('change', e => {
  const [file] = e.target.files;
  importSaveFile(file);
  e.target.value = '';
});

/* 点击遮罩关闭 */
$$('.modal').forEach(m => {
  m.addEventListener('click', e => {
    if (e.target === m && m.id !== 'modalSect'){
      m.classList.remove('show');
    }
  });
});

/* 人物形象选择 */
function renderAvatar(){
  const portrait = $('portrait');
  if (portrait) portrait.classList.toggle('avatar-frog', P.avatar === 'frog');
  const player = $('player');
  if (player) player.classList.toggle('avatar-frog', P.avatar === 'frog');
}

function setAvatar(avatar){
  P.avatar = avatar === 'frog' ? 'frog' : 'original';
  renderAvatar();
  saveGame();
  renderAvatarPanel();
  toast(P.avatar === 'frog' ? '🐸 已换上青蛙形象' : '🧝 已换回原本形象');
}

function frogAvatarSvg(){
  return `<svg class="frog-svg" viewBox="0 0 16 18" shape-rendering="crispEdges" role="img" aria-label="青蛙人物形象" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="0" width="4" height="2" fill="#28751e"/>
    <rect x="9" y="0" width="4" height="2" fill="#28751e"/>
    <rect x="2" y="2" width="12" height="3" fill="#3d9d20"/>
    <rect x="1" y="5" width="14" height="7" fill="#67d51e"/>
    <rect x="2" y="12" width="12" height="4" fill="#4ab51c"/>
    <rect x="4" y="16" width="3" height="2" fill="#f28a08"/>
    <rect x="9" y="16" width="3" height="2" fill="#f28a08"/>
    <rect x="3" y="4" width="4" height="4" fill="#dbe8e8"/>
    <rect x="9" y="4" width="4" height="4" fill="#dbe8e8"/>
    <rect x="4" y="5" width="2" height="3" fill="#000"/>
    <rect x="10" y="5" width="2" height="3" fill="#000"/>
    <rect x="6" y="8" width="4" height="2" fill="#ffb20b"/>
    <rect x="7" y="10" width="2" height="1" fill="#d86e08"/>
    <rect x="4" y="12" width="2" height="1" fill="#75e62b"/>
    <rect x="10" y="12" width="2" height="1" fill="#75e62b"/>
  </svg>`;
}

function renderAvatarPanel(){
  const body = $('avatarBody');
  if (!body) return;
  const originalSvg = $('portrait').querySelector('svg').outerHTML;
  body.innerHTML = `
    <div style="text-align:center;color:#c0a870;margin-bottom:12px">选择你的人物形象</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <button class="avatar-choice ${P.avatar === 'original' ? 'selected' : ''}" data-avatar="original">
        <span class="avatar-preview original">${originalSvg}</span>
        <span class="avatar-choice-name">原本形象</span>
      </button>
      <button class="avatar-choice ${P.avatar === 'frog' ? 'selected' : ''}" data-avatar="frog">
        <span class="avatar-preview">${frogAvatarSvg()}</span>
        <span class="avatar-choice-name">青蛙形象</span>
      </button>
    </div>
  `;
  body.querySelectorAll('[data-avatar]').forEach(btn => {
    btn.addEventListener('click', () => setAvatar(btn.dataset.avatar));
  });
}

$('portrait').addEventListener('click', () => {
  renderAvatarPanel();
  openModal('modalAvatar');
});

/* 开发者测试中心访问口令：仅作为前端入口保护，不等同于服务器级安全认证 */
const DEV_ACCESS_PASSWORD = '1¥1';
function cDeveloperMenuGate(){return /if\(menu==='developer'\)\{openDeveloperPanelWithPassword\(\);\}/.test(document.documentElement.innerHTML);}
function openDeveloperPanelWithPassword(){
  const entered = prompt('请输入开发者测试中心密码：');
  if(entered === null)return false;
  if(entered !== DEV_ACCESS_PASSWORD){toast('密码错误，无法进入开发者测试中心');return false;}
  renderDeveloperPanel();
  openModal('modalDeveloper');
  return true;
}

/* ============================================================
   底部菜单绑定
   ============================================================ */
$$('.menu-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const menu = btn.dataset.menu;
    if (menu === 'updates'){openModal('modalUpdates');return;}
    if (menu === 'char')  openCharPanel();
    if (menu === 'bag')   openBagPanel();
    if (menu === 'equipment'){renderEquipmentPanel();openModal('modalEquipment');}
    if (menu === 'skill') openSkillPanel();
    if (menu === 'pet')   openPetPanel();
    if (menu === 'task')  openTaskPanel();
    if (menu === 'challenge') openChallengePanel();
    if (menu === 'achievements') openAchievementsPanel();
    if (menu === 'cultivation'){ renderCultivation(); openModal('modalCultivation'); }
if(menu==='developer'){openDeveloperPanelWithPassword();}
    if(menu==='realmSwitch'){setImmortalView(P.immortalRealm.view==='immortal'?'mortal':'immortal');}
    if(menu==='immortalMansion'){renderImmortalRealm('mansion');}
    if(menu==='immortalSect'){renderImmortalRealm('sect');}
    if(menu==='immortalTravel'){renderImmortalRealm('travel');}
  });
});

/* ============================================================
   人物面板
   ============================================================ */
function openCharPanel(){
  const body = $('charBody');
  const sect = SECTS.find(s => s.id === P.sect);
  
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:12px;padding:10px;background:linear-gradient(180deg,rgba(240,200,96,.12),transparent);border:1.5px solid rgba(240,200,96,.3);border-radius:8px">
      <div style="font-size:20px;margin-bottom:4px">${sect ? sect.icon : '🧝'}</div>
      <div style="font-size:15px;color:#ffe8a0;font-weight:bold;letter-spacing:2px;text-shadow:0 1px 0 #000">${P.name}</div>
      <div style="margin-top:5px">
        <span style="font-size:11px;padding:2px 10px;background:linear-gradient(180deg,${sect?sect.color:'#6a4a28'},${sect?sect.color+'88':'#3a1f0e'});border:1px solid #1a0e04;border-radius:10px;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.4);box-shadow:0 1px 0 rgba(0,0,0,.5)">${sect?sect.name:'无门无派'}</span>
      </div>
      <div style="font-size:11px;color:#c0a870;margin-top:6px;letter-spacing:1px">等级 <b style="color:#ffe8a0;font-size:13px">Lv.${P.lv}</b>  ·  已走 <b style="color:#ffe8a0">${P.steps}</b> 步</div>
    </div>
    
    <div class="section-title"><span class="sti">⚔️</span>基础属性</div>
    <div class="stat-grid">
      <div class="stat-box hp">
        <span class="sk"><span class="ski">❤️</span>气血</span>
        <span class="sv">${Math.ceil(P.hp)}<small>/${P.maxHp}</small></span>
      </div>
      <div class="stat-box mp">
        <span class="sk"><span class="ski">💠</span>法力</span>
        <span class="sv">${Math.ceil(P.mp)}<small>/${P.maxMp}</small></span>
      </div>
      <div class="stat-box">
        <span class="sk"><span class="ski">🗡️</span>攻击</span>
        <span class="sv">${P.atk}</span>
      </div>
      <div class="stat-box">
        <span class="sk"><span class="ski">🛡️</span>防御</span>
        <span class="sv">${P.def}</span>
      </div>
      <div class="stat-box">
        <span class="sk"><span class="ski">👟</span>速度</span>
        <span class="sv">${P.spd}</span>
      </div>
      <div class="stat-box">
        <span class="sk"><span class="ski">✨</span>灵力</span>
        <span class="sv">${P.magic}</span>
      </div>
      <div class="stat-box gold">
        <span class="sk"><span class="ski">💰</span>银两</span>
        <span class="sv">${fmt(P.gold)}</span>
      </div>
      <div class="stat-box exp">
        <span class="sk"><span class="ski">⭐</span>经验</span>
        <span class="sv">${fmt(P.exp)}<small>/${fmt(expNeed())}</small></span>
      </div>
    </div>
    
    <div class="section-title"><span class="sti">✨</span>已学技能</div>
    <div id="charSkillList"></div>
  `;
  
  // 渲染已学技能
  const sl = body.querySelector('#charSkillList');
  const skills = getSectSkills();
  if (!skills.length){
    sl.innerHTML = '<div class="empty-tip"><span class="ei">✨</span>尚未习得任何技能</div>';
  } else {
    skills.forEach(sk => {
      const it = document.createElement('div');
      it.className = 'list-item';
      it.innerHTML = `
        <div class="li-icon" style="color:#ffe8a0;font-size:18px">${sk.type==='magic'?'🔮':sk.type==='phys'?'⚔️':sk.type==='heal'?'💚':'🔒'}</div>
        <div class="li-body">
          <div class="li-name">${sk.name}</div>
          <div class="li-desc">${sk.desc}</div>
        </div>
        <div class="li-right" style="color:#80c0ff">${sk.mp}<small>法力</small></div>
      `;
      sl.appendChild(it);
    });
  }
  
  const changeBtn = document.createElement('button');
  changeBtn.className = 'btn';
  changeBtn.style.cssText = 'width:100%;margin-top:12px;border:1px solid #c08040;background:linear-gradient(180deg,#8a3a20,#5a2010);color:#ffe8a0;font-weight:bold';
  changeBtn.textContent = '🔄 自由转换门派';
  changeBtn.addEventListener('click', () => {
    if (typeof battle !== 'undefined' && battle.active) {
      toast('战斗中无法转换门派');
      return;
    }
    changingSectMode = true;
    pendingSect = null;
    $('btnSectConfirm').disabled = true;
    renderSectSelect();
    openModal('modalSect');
  });
  body.appendChild(changeBtn);

  openModal('modalChar');
}

/* ============================================================
   ↓↓↓ 第 4 批结束，第 5 批将接续：背包 / 技能 / 召唤兽 / 任务面板
   ============================================================ */
