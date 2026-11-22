import {
  createMaterialFactory,
  createMeshAdder,
  createGeometryMerger,
  createInstanceAdder,
  applyHazeFog,
} from './three-shared.js';

/* ============================================================
   凡界 3D 地图（Three.js）
   目标：
   1. 地图上所有可见区域全部渲染成真实 3D 地形（不再只画玩家周围一小块）。
   2. 树木、岩石、花草、城墙、建筑、石碑、主角、怪物全部使用有体积的实体模型，
      不再使用任何 2D 贴图精灵。
   ============================================================ */

let THREE, mat, add, mergeParts, addInstances;
const stage = document.getElementById('stage');
const legacy = document.getElementById('world');
const SKY_COLOR = 0xa9c6d6;

let renderer, scene, camera, worldGroup, player, heroGhost, clouds, rain, ray, pointer, sunLight, clock;
let currentState = { x: 0, y: 0 };
let lastKey = '';
let lastQuality = '';
const groundHits = [];
const prototypeCache = new Map();

/* ---------------- 基础工具 ---------------- */

function hash2(x, y, seed = 0) {
  let n = Math.imul((x | 0) + seed, 374761393) ^ Math.imul((y | 0) - seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function terrainHeight(x, z) {
  return (
    0.3 * Math.sin(x * 0.19) * Math.cos(z * 0.17) +
    0.14 * Math.sin((x + z) * 0.31) +
    0.07 * Math.cos(z * 0.57 - x * 0.23)
  );
}

function isMobile() {
  return matchMedia('(max-width: 700px)').matches;
}

function isLowEnd() {
  return (document.documentElement.dataset.qualityLevel || 'high') === 'low';
}

/* 可视距离以“相机距离”为单位：球员固定在原点，相机在其后上方。
   渲染窗口 = 相机视锥内、相机距离 < cull 的所有地块，雾的远端正好落在
   cull 之后，因此视口里每一处可见地面都是真实渲染出来的地形。 */
function visibility() {
  const q = document.documentElement.dataset.qualityLevel || 'high';
  const camDist = Math.hypot(camera ? camera.position.y : 0, camera ? camera.position.z : 0) || 16;
  const base = isMobile() ? 27 : 35;
  const scale = q === 'low' ? 0.84 : q === 'extreme' ? 1.18 : 1;
  const far = Math.max(base * scale, camDist + 13);
  const near = Math.min(far - 6, camDist + 3);
  return { far, near, cull: far * 0.95, camDist };
}

function tileProp(name, build) {
  if (!prototypeCache.has(name)) {
    const geometry = build();
    geometry.userData.prototype = true;
    prototypeCache.set(name, geometry);
  }
  return prototypeCache.get(name);
}

function solidMaterial(roughness = 0.92, metalness = 0) {
  const key = 'solid:' + roughness + ':' + metalness;
  if (!prototypeCache.has(key)) {
    prototypeCache.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness }));
  }
  return prototypeCache.get(key);
}

/* ---------------- 地形配色 ---------------- */

const TILE_COLORS = {
  grass: 0x5aa044,
  grass2: 0x468234,
  path: 0xb99a69,
  floor: 0xc8a878,
  'floor-center': 0xd2b183,
  wall: 0x9a8060,
  water: 0x2c6491,
  water2: 0x275a86,
  tree: 0x4c8f3c,
  rock: 0x6d7a5f,
  sand: 0xe5cd9b,
  snow: 0xdfedf7,
  lava: 0xb8350f,
  bridge: 0x8a5f3c,
  'teleport-stone': 0x8d9880,
  'build-memorial': 0xc0a478,
  'build-stall': 0xc0a478,
  'build-house': 0xc0a478,
  'build-shop': 0xc0a478,
  flower: 0x549b44,
};

function groundColorFor(tile, wx, wy) {
  const base = TILE_COLORS[tile] === undefined ? 0x557c4a : TILE_COLORS[tile];
  const n = hash2(wx, wy, 17);
  const color = new THREE.Color(base);
  const shift = (n - 0.5) * 0.14;
  color.offsetHSL(0, 0, shift);
  return color;
}

/* ---------------- 实体模型（顶点着色合并成单网格） ---------------- */

/* 树：树干 + 三层锥形树冠 + 树根 */
function buildTreeGeometry(round) {
  const parts = [
    { geometry: new THREE.CylinderGeometry(0.075, 0.13, 0.8, 7), color: 0x6b4a2f, position: [0, 0.4, 0] },
    { geometry: new THREE.CylinderGeometry(0.11, 0.17, 0.16, 7), color: 0x5a3d26, position: [0, 0.08, 0] },
  ];
  if (round) {
    parts.push(
      { geometry: new THREE.SphereGeometry(0.48, 9, 7), color: 0x2f7836, position: [0, 1.12, 0], scale: [1, 0.86, 1] },
      { geometry: new THREE.SphereGeometry(0.36, 9, 7), color: 0x3d8c40, position: [0.16, 1.42, -0.1], scale: [1, 0.82, 1] },
      { geometry: new THREE.SphereGeometry(0.26, 8, 6), color: 0x4c9943, position: [-0.16, 1.36, 0.12], scale: [1, 0.8, 1] },
    );
  } else {
    parts.push(
      { geometry: new THREE.ConeGeometry(0.6, 0.85, 8), color: 0x2f7836, position: [0, 1.0, 0] },
      { geometry: new THREE.ConeGeometry(0.46, 0.72, 8), color: 0x3a8a41, position: [0, 1.44, 0] },
      { geometry: new THREE.ConeGeometry(0.3, 0.56, 8), color: 0x4c9943, position: [0, 1.8, 0] },
    );
  }
  return mergeParts(parts);
}

/* 岩石：三块多面体堆叠成有体积的岩堆 */
function buildRockGeometry() {
  return mergeParts([
    { geometry: new THREE.DodecahedronGeometry(0.34), color: 0x7d8789, position: [0, 0.2, 0], scale: [1, 0.8, 0.92] },
    { geometry: new THREE.DodecahedronGeometry(0.2), color: 0x6b7577, position: [0.24, 0.12, 0.12], scale: [1, 0.7, 0.9] },
    { geometry: new THREE.DodecahedronGeometry(0.15), color: 0x8b9598, position: [-0.2, 0.1, -0.14], scale: [1, 0.75, 1] },
  ]);
}

/* 花丛：花茎 + 叶片 + 花瓣 + 花蕊 */
function buildFlowerGeometry(petalColor) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const px = Math.cos(a) * 0.12;
    const pz = Math.sin(a) * 0.12;
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.012, 0.02, 0.24, 5), color: 0x3f8235, position: [px, 0.12, pz], rotation: [0, 0, Math.cos(a) * 0.22] },
      { geometry: new THREE.SphereGeometry(0.07, 6, 5), color: 0x4c9a42, position: [px * 1.6, 0.09, pz * 1.6], scale: [1, 0.34, 0.6] },
    );
  }
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    parts.push({
      geometry: new THREE.SphereGeometry(0.08, 7, 6),
      color: petalColor,
      position: [Math.cos(a) * 0.1, 0.26, Math.sin(a) * 0.1],
      scale: [1, 0.5, 0.8],
    });
  }
  parts.push({ geometry: new THREE.SphereGeometry(0.055, 7, 6), color: 0xffd34f, position: [0, 0.28, 0] });
  return mergeParts(parts);
}

/* 草丛：三根锥形草叶 */
function buildGrassGeometry() {
  return mergeParts([
    { geometry: new THREE.ConeGeometry(0.045, 0.26, 4), color: 0x69a94a, position: [0, 0.13, 0], rotation: [0, 0, 0.1] },
    { geometry: new THREE.ConeGeometry(0.04, 0.2, 4), color: 0x548f3a, position: [0.1, 0.1, 0.07], rotation: [0, 0, 0.35] },
    { geometry: new THREE.ConeGeometry(0.04, 0.23, 4), color: 0x74b555, position: [-0.1, 0.11, -0.06], rotation: [0, 0, -0.3] },
  ]);
}

/* 仙人掌 */
function buildCactusGeometry() {
  return mergeParts([
    { geometry: new THREE.CylinderGeometry(0.11, 0.13, 0.62, 8), color: 0x4e8f52, position: [0, 0.31, 0] },
    { geometry: new THREE.SphereGeometry(0.11, 8, 6), color: 0x5aa25c, position: [0, 0.62, 0], scale: [1, 0.7, 1] },
    { geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.24, 6), color: 0x4e8f52, position: [0.15, 0.42, 0], rotation: [0, 0, -0.5] },
    { geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.2, 6), color: 0x4e8f52, position: [-0.14, 0.34, 0], rotation: [0, 0, 0.55] },
  ]);
}

/* 城墙：实心墙体 + 压顶 + 垛口 */
function buildWallGeometry() {
  return mergeParts([
    { geometry: new THREE.BoxGeometry(1.0, 1.15, 0.94), color: 0x9a8060, position: [0, 0.575, 0] },
    { geometry: new THREE.BoxGeometry(1.04, 0.14, 1.0), color: 0xb19973, position: [0, 1.2, 0] },
    { geometry: new THREE.BoxGeometry(0.24, 0.22, 1.0), color: 0x8d7455, position: [-0.32, 1.36, 0] },
    { geometry: new THREE.BoxGeometry(0.24, 0.22, 1.0), color: 0x8d7455, position: [0.32, 1.36, 0] },
    { geometry: new THREE.BoxGeometry(0.9, 0.5, 0.06), color: 0x7f684b, position: [0, 0.32, 0.49] },
  ]);
}

/* 民宅：墙体 + 屋檐 + 锥顶 + 门窗 */
function buildHouseGeometry() {
  const parts = [
    { geometry: new THREE.BoxGeometry(0.74, 0.6, 0.74), color: 0xdfc396, position: [0, 0.3, 0] },
    { geometry: new THREE.BoxGeometry(0.8, 0.1, 0.8), color: 0xb08a5f, position: [0, 0.63, 0] },
    { geometry: new THREE.ConeGeometry(0.66, 0.46, 4), color: 0x94402f, position: [0, 0.9, 0], rotation: [0, Math.PI / 4, 0] },
    { geometry: new THREE.BoxGeometry(0.88, 0.06, 0.88), color: 0x6f3326, position: [0, 0.66, 0] },
    { geometry: new THREE.BoxGeometry(0.18, 0.3, 0.04), color: 0x5a3a24, position: [0, 0.16, 0.38] },
    { geometry: new THREE.BoxGeometry(0.14, 0.13, 0.04), color: 0xffe9a8, position: [-0.22, 0.4, 0.38] },
    { geometry: new THREE.BoxGeometry(0.14, 0.13, 0.04), color: 0xffe9a8, position: [0.22, 0.4, 0.38] },
  ];
  for (const [x, z] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) {
    parts.push({ geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.62, 6), color: 0x8d6a45, position: [x, 0.31, z] });
  }
  return mergeParts(parts);
}

/* 钱庄/商铺：石台基 + 柱廊 + 平顶 + 金饰 */
function buildShopGeometry() {
  const parts = [
    { geometry: new THREE.BoxGeometry(0.86, 0.12, 0.86), color: 0x9d8b6b, position: [0, 0.06, 0] },
    { geometry: new THREE.BoxGeometry(0.76, 0.52, 0.76), color: 0xc2ab86, position: [0, 0.38, 0] },
    { geometry: new THREE.BoxGeometry(0.92, 0.1, 0.92), color: 0x8d6f4a, position: [0, 0.69, 0] },
    { geometry: new THREE.BoxGeometry(0.78, 0.28, 0.78), color: 0xa98d64, position: [0, 0.87, 0] },
    { geometry: new THREE.BoxGeometry(0.94, 0.08, 0.94), color: 0xd8b75f, position: [0, 1.04, 0] },
    { geometry: new THREE.SphereGeometry(0.11, 8, 6), color: 0xe8c86c, position: [0, 1.14, 0] },
    { geometry: new THREE.BoxGeometry(0.2, 0.32, 0.04), color: 0x53381f, position: [0, 0.3, 0.39] },
  ];
  for (const [x, z] of [[-0.34, 0.34], [0.34, 0.34], [-0.34, -0.34], [0.34, -0.34]]) {
    parts.push({ geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.56, 7), color: 0x7d6547, position: [x, 0.42, z] });
  }
  return mergeParts(parts);
}

/* 杂货摊：四柱 + 柜台 + 帷帐 + 货物 */
function buildStallGeometry() {
  const parts = [
    { geometry: new THREE.BoxGeometry(0.86, 0.26, 0.7), color: 0xa8763f, position: [0, 0.13, 0] },
    { geometry: new THREE.BoxGeometry(0.9, 0.08, 0.74), color: 0xd8b75f, position: [0, 0.3, 0] },
    { geometry: new THREE.ConeGeometry(0.72, 0.34, 4), color: 0xd96b4a, position: [0, 0.86, 0], rotation: [0, Math.PI / 4, 0] },
    { geometry: new THREE.SphereGeometry(0.07, 7, 6), color: 0xe8c357, position: [-0.18, 0.38, 0.06] },
    { geometry: new THREE.SphereGeometry(0.06, 7, 6), color: 0xd85f5f, position: [0.02, 0.37, -0.08] },
    { geometry: new THREE.SphereGeometry(0.06, 7, 6), color: 0x6bbf6b, position: [0.2, 0.37, 0.08] },
  ];
  for (const [x, z] of [[-0.4, 0.33], [0.4, 0.33], [-0.4, -0.33], [0.4, -0.33]]) {
    parts.push({ geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.72, 6), color: 0x8b6236, position: [x, 0.36, z] });
  }
  return mergeParts(parts);
}

/* 长安石碑：石座 + 碑身 + 碑首 + 云纹 */
function buildMemorialGeometry() {
  return mergeParts([
    { geometry: new THREE.CylinderGeometry(0.44, 0.5, 0.16, 10), color: 0x8f928b, position: [0, 0.08, 0] },
    { geometry: new THREE.CylinderGeometry(0.32, 0.38, 0.12, 8), color: 0xa9aca4, position: [0, 0.2, 0] },
    { geometry: new THREE.BoxGeometry(0.42, 0.95, 0.3), color: 0xb8bbb2, position: [0, 0.72, 0] },
    { geometry: new THREE.BoxGeometry(0.34, 0.24, 0.24), color: 0xcabf9a, position: [0, 1.3, 0] },
    { geometry: new THREE.ConeGeometry(0.28, 0.24, 4), color: 0xd3b16c, position: [0, 1.53, 0], rotation: [0, Math.PI / 4, 0] },
    { geometry: new THREE.TorusGeometry(0.2, 0.028, 6, 20), color: 0xe2c778, position: [0, 0.95, 0.16] },
  ]);
}

/* 传送石碑：石座 + 碑身 + 发光符文环 + 悬浮晶石 */
function buildTeleportGeometry() {
  return mergeParts([
    { geometry: new THREE.CylinderGeometry(0.44, 0.54, 0.18, 12), color: 0x75634a, position: [0, 0.09, 0] },
    { geometry: new THREE.CylinderGeometry(0.32, 0.4, 0.14, 10), color: 0xb99b62, position: [0, 0.22, 0] },
    { geometry: new THREE.BoxGeometry(0.32, 1.0, 0.24), color: 0x8b927f, position: [0, 0.74, 0], rotation: [0, 0, -0.05] },
    { geometry: new THREE.ConeGeometry(0.26, 0.28, 4), color: 0xd3b16c, position: [0, 1.36, 0], rotation: [0, Math.PI / 4, 0] },
    { geometry: new THREE.TorusGeometry(0.36, 0.038, 7, 24), color: 0xffd77a, position: [0, 0.58, 0.03], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.OctahedronGeometry(0.13), color: 0xffe7a2, position: [0, 0.8, 0.18] },
    { geometry: new THREE.BoxGeometry(0.5, 0.05, 0.5), color: 0x6d5c44, position: [0, 0.02, 0] },
  ]);
}

/* 主角：完整的立体人物（发髻、脸、腰带、袍、护腕、靴、背后长剑） */
function buildHeroGeometry() {
  const parts = [];
  const robe = 0x3c8980;
  const robeDark = 0x255e59;
  const skin = 0xf2cba8;
  const hair = 0x241f2b;
  const gold = 0xd7b45e;
  // 靴与腿
  for (const side of [-1, 1]) {
    parts.push(
      { geometry: new THREE.BoxGeometry(0.16, 0.1, 0.28), color: 0x2f4155, position: [side * 0.11, 0.05, 0.04] },
      { geometry: new THREE.CylinderGeometry(0.075, 0.09, 0.32, 8), color: 0x35485f, position: [side * 0.11, 0.24, 0] },
    );
  }
  // 下摆 + 腰带 + 上身
  parts.push(
    { geometry: new THREE.CylinderGeometry(0.18, 0.36, 0.5, 10), color: robe, position: [0, 0.62, 0] },
    { geometry: new THREE.CylinderGeometry(0.19, 0.24, 0.12, 10), color: robeDark, position: [0, 0.87, 0] },
    { geometry: new THREE.TorusGeometry(0.2, 0.032, 6, 16), color: gold, position: [0, 0.92, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.CylinderGeometry(0.19, 0.21, 0.42, 10), color: robe, position: [0, 1.12, 0] },
    { geometry: new THREE.BoxGeometry(0.26, 0.3, 0.1), color: 0x4fa79c, position: [0, 1.14, 0.15] },
    { geometry: new THREE.BoxGeometry(0.16, 0.1, 0.06), color: gold, position: [0, 1.2, 0.2] },
  );
  // 手臂与手
  for (const side of [-1, 1]) {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.06, 0.075, 0.42, 8), color: robe, position: [side * 0.25, 1.06, 0], rotation: [0, 0, side * 0.36] },
      { geometry: new THREE.CylinderGeometry(0.075, 0.08, 0.12, 8), color: gold, position: [side * 0.32, 0.85, 0] },
      { geometry: new THREE.SphereGeometry(0.07, 8, 6), color: skin, position: [side * 0.35, 0.76, 0] },
    );
  }
  // 脖子、头、发髻、发带、眼睛
  parts.push(
    { geometry: new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), color: skin, position: [0, 1.36, 0] },
    { geometry: new THREE.SphereGeometry(0.19, 12, 10), color: skin, position: [0, 1.52, 0], scale: [1, 0.95, 0.92] },
    { geometry: new THREE.SphereGeometry(0.2, 12, 9), color: hair, position: [0, 1.6, -0.02], scale: [1, 0.66, 1] },
    { geometry: new THREE.SphereGeometry(0.09, 8, 7), color: hair, position: [0, 1.74, -0.1] },
    { geometry: new THREE.TorusGeometry(0.19, 0.022, 6, 16), color: robeDark, position: [0, 1.62, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.SphereGeometry(0.03, 6, 6), color: 0x1c1621, position: [-0.07, 1.54, 0.165] },
    { geometry: new THREE.SphereGeometry(0.03, 6, 6), color: 0x1c1621, position: [0.07, 1.54, 0.165] },
  );
  // 背后长剑
  parts.push(
    { geometry: new THREE.BoxGeometry(0.05, 0.82, 0.03), color: 0xcfd8e2, position: [-0.02, 1.16, -0.2], rotation: [0.15, 0, 0.42] },
    { geometry: new THREE.BoxGeometry(0.16, 0.05, 0.05), color: gold, position: [0.2, 1.5, -0.2], rotation: [0, 0, 0.42] },
    { geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), color: 0x4a3524, position: [0.25, 1.62, -0.2], rotation: [0, 0, 0.42] },
  );
  return mergeParts(parts);
}

/* 普通怪物：有体积的躯干 + 头 + 角 + 手脚 + 尾巴（颜色由实例色统一染色） */
function buildMonsterGeometry() {
  const parts = [
    { geometry: new THREE.SphereGeometry(0.29, 12, 10), color: 0xffffff, position: [0, 0.5, 0], scale: [1, 0.94, 0.88] },
    { geometry: new THREE.SphereGeometry(0.2, 10, 8), color: 0xe8eef4, position: [0, 0.44, 0.16], scale: [1, 0.9, 0.7] },
    { geometry: new THREE.SphereGeometry(0.21, 12, 10), color: 0xf2f6fa, position: [0, 0.88, 0.02], scale: [1, 0.94, 0.92] },
    { geometry: new THREE.SphereGeometry(0.045, 8, 6), color: 0x1d1620, position: [-0.08, 0.9, 0.18] },
    { geometry: new THREE.SphereGeometry(0.045, 8, 6), color: 0x1d1620, position: [0.08, 0.9, 0.18] },
    { geometry: new THREE.SphereGeometry(0.055, 8, 6), color: 0x2b2028, position: [0, 0.8, 0.2], scale: [1.6, 0.7, 0.6] },
    { geometry: new THREE.ConeGeometry(0.055, 0.2, 6), color: 0xf5e2b0, position: [-0.12, 1.06, -0.02], rotation: [0, 0, 0.3] },
    { geometry: new THREE.ConeGeometry(0.055, 0.2, 6), color: 0xf5e2b0, position: [0.12, 1.06, -0.02], rotation: [0, 0, -0.3] },
    { geometry: new THREE.ConeGeometry(0.08, 0.24, 6), color: 0xffffff, position: [0, 0.46, -0.3], rotation: [-1.15, 0, 0] },
    { geometry: new THREE.SphereGeometry(0.09, 8, 6), color: 0xffffff, position: [-0.11, 0.1, 0.04], scale: [1, 0.7, 1.3] },
    { geometry: new THREE.SphereGeometry(0.09, 8, 6), color: 0xffffff, position: [0.11, 0.1, 0.04], scale: [1, 0.7, 1.3] },
  ];
  for (const side of [-1, 1]) {
    parts.push({
      geometry: new THREE.CylinderGeometry(0.055, 0.065, 0.26, 7),
      color: 0xffffff,
      position: [side * 0.27, 0.52, 0],
      rotation: [0, 0, side * 0.5],
    });
  }
  return mergeParts(parts);
}

/* 区域 Boss：更大的躯干、肩甲、头冠与符文环 */
function buildBossGeometry() {
  const parts = [
    { geometry: new THREE.SphereGeometry(0.42, 16, 12), color: 0x9e3444, position: [0, 0.62, 0], scale: [1, 1.02, 0.9] },
    { geometry: new THREE.BoxGeometry(0.62, 0.36, 0.36), color: 0x542631, position: [0, 0.7, 0.02], rotation: [0, 0, -0.06] },
    { geometry: new THREE.SphereGeometry(0.27, 14, 10), color: 0xd4a15b, position: [0, 1.14, 0.02] },
    { geometry: new THREE.SphereGeometry(0.06, 8, 6), color: 0xffe58a, position: [-0.1, 1.16, 0.24] },
    { geometry: new THREE.SphereGeometry(0.06, 8, 6), color: 0xffe58a, position: [0.1, 1.16, 0.24] },
    { geometry: new THREE.BoxGeometry(0.22, 0.07, 0.06), color: 0x3a1a20, position: [0, 1.04, 0.25] },
    { geometry: new THREE.ConeGeometry(0.13, 0.42, 7), color: 0xe5c77e, position: [-0.22, 1.46, -0.02], rotation: [0, 0, 0.34] },
    { geometry: new THREE.ConeGeometry(0.13, 0.42, 7), color: 0xe5c77e, position: [0.22, 1.46, -0.02], rotation: [0, 0, -0.34] },
    { geometry: new THREE.ConeGeometry(0.22, 0.3, 6), color: 0xf3c45e, position: [0, 1.68, -0.02] },
    { geometry: new THREE.TorusGeometry(0.5, 0.045, 7, 24), color: 0xffc45d, position: [0, 0.55, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.BoxGeometry(0.5, 0.04, 0.06), color: 0xf3c45e, position: [0, 0.42, 0.38] },
  ];
  for (const side of [-1, 1]) {
    parts.push(
      { geometry: new THREE.SphereGeometry(0.19, 9, 7), color: 0x6c2938, position: [side * 0.42, 0.86, 0], scale: [1, 0.72, 1] },
      { geometry: new THREE.CylinderGeometry(0.09, 0.11, 0.44, 8), color: 0x9e3444, position: [side * 0.46, 0.5, 0], rotation: [0, 0, side * 0.4] },
      { geometry: new THREE.SphereGeometry(0.13, 8, 7), color: 0x542631, position: [side * 0.18, 0.1, 0.02], scale: [1, 0.72, 1.2] },
    );
  }
  return mergeParts(parts);
}

/* ---------------- 地图构建 ---------------- */

function visibleBounds(range) {
  let minX = -5, maxX = 5, minZ = -5, maxZ = 5;
  const point = new THREE.Vector3();
  const probes = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
    [0, -1], [0, 1], [-1, 0], [1, 0],
    [-0.5, -1], [0.5, -1], [-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5],
  ];
  const include = (x, z) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  };
  for (const [nx, ny] of probes) {
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const dir = ray.ray.direction;
    if (dir.y > -0.015) continue;
    const tGround = -ray.ray.origin.y / dir.y;
    if (!isFinite(tGround) || tGround <= 0) continue;
    const t = Math.min(tGround, range.cull);
    point.copy(ray.ray.origin).addScaledVector(dir, t);
    include(point.x, point.z);
  }
  include(0, 0);
  const pad = 1.2;
  return {
    minX: Math.floor(minX - pad),
    maxX: Math.ceil(maxX + pad),
    minZ: Math.floor(minZ - pad),
    maxZ: Math.ceil(maxZ + pad),
  };
}

const SEG = 2;
const SUB_POINTS = [];
for (let iz = 0; iz <= SEG; iz++) {
  for (let ix = 0; ix <= SEG; ix++) SUB_POINTS.push([-0.5 + ix / SEG, -0.5 + iz / SEG]);
}
const TILE_INDEX_PATTERN = [];
for (let iz = 0; iz < SEG; iz++) {
  for (let ix = 0; ix < SEG; ix++) {
    const a = iz * (SEG + 1) + ix;
    const b = a + 1;
    const c = a + SEG + 1;
    const d = c + 1;
    TILE_INDEX_PATTERN.push(a, c, b, b, c, d);
  }
}
/* 每格的地表高度与顶点颜色按世界坐标缓存，玩家每走一步只需要重新拼装
   已经算好的数据，保证“整屏渲染”不会拖慢移动。 */
const infoCache = new Map();
const INFO_CACHE_LIMIT = 12000;
function tileInfo(wx, wy) {
  const key = wx + ',' + wy;
  let info = infoCache.get(key);
  if (info === undefined) {
    info = window.getGame3DInfo?.(wx, wy) || { tile: 'grass' };
    infoCache.set(key, info);
    if (infoCache.size > INFO_CACHE_LIMIT) infoCache.delete(infoCache.keys().next().value);
  }
  return info;
}

const surfaceCache = new Map();
const SURFACE_CACHE_LIMIT = 6000;

function surfaceChunk(wx, wy, info) {
  const key = wx + ',' + wy;
  const cached = surfaceCache.get(key);
  if (cached) return cached;
  const heights = new Float32Array(SUB_POINTS.length);
  const colors = new Float32Array(SUB_POINTS.length * 3);
  const base = groundColorFor(info.tile || 'grass', wx, wy);
  const color = new THREE.Color().copy(base).offsetHSL(0, 0, (hash2(wx, wy, 91) - 0.5) * 0.045);
  SUB_POINTS.forEach(([lx, lz], i) => {
    heights[i] = terrainHeight(wx + lx, wy + lz);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  });
  const chunk = { heights, colors };
  surfaceCache.set(key, chunk);
  if (surfaceCache.size > SURFACE_CACHE_LIMIT) surfaceCache.delete(surfaceCache.keys().next().value);
  return chunk;
}

function buildGround(state, tiles) {
  const count = tiles.length;
  const vertsPerTile = SUB_POINTS.length;
  const positions = new Float32Array(count * vertsPerTile * 3);
  const colors = new Float32Array(count * vertsPerTile * 3);
  const indices = new Uint32Array(count * TILE_INDEX_PATTERN.length);
  const waterPositions = [];
  const waterColors = [];

  for (let t = 0; t < count; t++) {
    const { wx, wy, dx, dz, info } = tiles[t];
    const chunk = surfaceChunk(wx, wy, info);
    const pBase = t * vertsPerTile * 3;
    for (let i = 0; i < vertsPerTile; i++) {
      const [lx, lz] = SUB_POINTS[i];
      positions[pBase + i * 3] = dx + lx;
      positions[pBase + i * 3 + 1] = chunk.heights[i];
      positions[pBase + i * 3 + 2] = dz + lz;
      colors[pBase + i * 3] = chunk.colors[i * 3];
      colors[pBase + i * 3 + 1] = chunk.colors[i * 3 + 1];
      colors[pBase + i * 3 + 2] = chunk.colors[i * 3 + 2];
    }
    const iBase = t * TILE_INDEX_PATTERN.length;
    const vOffset = t * vertsPerTile;
    for (let k = 0; k < TILE_INDEX_PATTERN.length; k++) indices[iBase + k] = vOffset + TILE_INDEX_PATTERN[k];

    if (info.tile === 'water' || info.tile === 'water2') {
      const y00 = terrainHeight(wx - 0.5, wy - 0.5) + 0.045;
      const y10 = terrainHeight(wx + 0.5, wy - 0.5) + 0.045;
      const y11 = terrainHeight(wx + 0.5, wy + 0.5) + 0.045;
      const y01 = terrainHeight(wx - 0.5, wy + 0.5) + 0.045;
      const quad = [
        [dx - 0.5, y00, dz - 0.5], [dx + 0.5, y10, dz - 0.5], [dx + 0.5, y11, dz + 0.5],
        [dx - 0.5, y00, dz - 0.5], [dx + 0.5, y11, dz + 0.5], [dx - 0.5, y01, dz + 0.5],
      ];
      for (const [x, y, z] of quad) {
        waterPositions.push(x, y, z);
        waterColors.push(0.14, 0.36, 0.62);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const ground = new THREE.Mesh(geo, solidMaterial(0.96, 0));
  ground.receiveShadow = true;

  if (!prototypeCache.has('waterMaterial')) {
    prototypeCache.set('waterMaterial', new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      roughness: 0.14,
      metalness: 0.18,
    }));
  }
  if (waterPositions.length) {
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
    waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
    waterGeo.computeVertexNormals();
    const water = new THREE.Mesh(waterGeo, prototypeCache.get('waterMaterial'));
    water.receiveShadow = true;
    worldGroup.add(water);
  }
  return ground;
}

function disposeGroup(group) {
  if (!group) return;
  group.traverse((o) => {
    if (o.isInstancedMesh) {
      o.dispose?.();
      return;
    }
    if (o.geometry && o.geometry.userData?.prototype !== true) o.geometry.dispose();
  });
  scene.remove(group);
}

function rebuild() {
  const raw = window.getGame3DState?.() || {};
  const sx = Number(raw.x);
  const sy = Number(raw.y);
  const state = { ...raw, x: Number.isFinite(sx) ? sx : 0, y: Number.isFinite(sy) ? sy : 0 };
  currentState = state;
  const quality = document.documentElement.dataset.qualityLevel || 'high';
  const key = [state.x, state.y, quality, Math.round(stage.clientWidth / 40), Math.round(stage.clientHeight / 40)].join('|');
  if (key === lastKey) return;
  lastKey = key;

  disposeGroup(worldGroup);
  worldGroup = new THREE.Group();
  scene.add(worldGroup);
  groundHits.length = 0;

  const range = visibility();
  applyHazeFog(THREE, scene, SKY_COLOR, range);
  if (sunLight) {
    const half = Math.min(18, range.camDist);
    sunLight.shadow.camera.left = -half;
    sunLight.shadow.camera.right = half;
    sunLight.shadow.camera.top = half;
    sunLight.shadow.camera.bottom = -half;
    sunLight.shadow.camera.updateProjectionMatrix();
  }

  const bounds = visibleBounds(range);
  const camY = camera.position.y;
  const camZ = camera.position.z;
  const tiles = [];
  for (let wy = bounds.minZ + state.y; wy <= bounds.maxZ + state.y; wy++) {
    for (let wx = bounds.minX + state.x; wx <= bounds.maxX + state.x; wx++) {
      const dx = wx - state.x;
      const dz = wy - state.y;
      const dy = camY - terrainHeight(wx, wy);
      const camDistance = Math.sqrt(dx * dx + dy * dy + (dz - camZ) * (dz - camZ));
      if (camDistance > range.cull) continue;
      tiles.push({ wx, wy, dx, dz, camDistance, info: tileInfo(wx, wy) });
    }
  }
  const ground = buildGround(state, tiles);
  worldGroup.add(ground);
  groundHits.push(ground);

  const lists = {
    wall: [], treeA: [], treeB: [], rock: [], flowerPink: [], flowerGold: [], flowerWhite: [],
    grass: [], cactus: [], house: [], shop: [], stall: [], memorial: [], teleport: [],
    monster: [], lavaRock: [], snowTuft: [],
  };
  const mobile = isMobile();
  const lowEnd = isLowEnd();
  let monsters = 0;
  const monsterCap = mobile ? 18 : 34;
  let bossPlaced = false;

  for (const tile of tiles) {
    {
      const { wx, wy, dx, dz, camDistance, info } = tile;
      const type = info.tile || 'grass';
      const y = terrainHeight(wx, wy);
      const rot = hash2(wx, wy, 5) * Math.PI * 2;

      if (type === 'wall') {
        lists.wall.push({ x: dx, y, z: dz, ry: 0, sy: 1 });
        continue;
      }
      if (type === 'tree' || info.decor === '🌲') {
        const round = hash2(wx, wy, 3) > 0.62;
        (round ? lists.treeB : lists.treeA).push({ x: dx, y, z: dz, ry: rot, scale: 0.92 + hash2(wx, wy, 9) * 0.32 });
      } else if (type === 'rock') {
        lists.rock.push({ x: dx, y, z: dz, ry: rot, scale: 0.8 + hash2(wx, wy, 12) * 0.4 });
      } else if (type === 'flower' || info.decor === '🌺') {
        const pick = hash2(wx, wy, 21);
        const list = pick > 0.66 ? lists.flowerPink : pick > 0.33 ? lists.flowerGold : lists.flowerWhite;
        list.push({ x: dx + (hash2(wx, wy, 31) - 0.5) * 0.3, y, z: dz + (hash2(wx, wy, 32) - 0.5) * 0.3, ry: rot });
      } else if (info.decor === '🌵') {
        lists.cactus.push({ x: dx, y, z: dz, ry: rot, scale: 0.9 + hash2(wx, wy, 14) * 0.2 });
      } else if (type === 'lava') {
        lists.lavaRock.push({ x: dx, y, z: dz, ry: rot, scale: 0.7 + hash2(wx, wy, 18) * 0.5 });
      } else if (type === 'teleport-stone') {
        lists.teleport.push({ x: dx, y, z: dz, ry: 0 });
      } else if (type === 'build-house') {
        lists.house.push({ x: dx, y, z: dz, ry: Math.round(rot / (Math.PI / 2)) * (Math.PI / 2) });
      } else if (type === 'build-shop') {
        lists.shop.push({ x: dx, y, z: dz, ry: Math.round(rot / (Math.PI / 2)) * (Math.PI / 2) });
      } else if (type === 'build-stall') {
        lists.stall.push({ x: dx, y, z: dz, ry: 0 });
      } else if (type === 'build-memorial') {
        lists.memorial.push({ x: dx, y, z: dz, ry: 0 });
      } else if (!lowEnd && camDistance < range.cull * 0.78) {
        // 草丛与野花点缀：只铺有实体地形的自然地面
        if ((type === 'grass' || type === 'grass2' || type === 'flower') && hash2(wx, wy, 44) > (mobile ? 0.72 : 0.55)) {
          lists.grass.push({ x: dx + (hash2(wx, wy, 45) - 0.5) * 0.5, y, z: dz + (hash2(wx, wy, 46) - 0.5) * 0.5, ry: rot, scale: 0.85 + hash2(wx, wy, 47) * 0.4 });
        }
        if (type === 'snow' && hash2(wx, wy, 48) > 0.9) lists.snowTuft.push({ x: dx, y, z: dz, ry: rot });
      }

      const underPlayer = dx === 0 && dz === 0;
      if (info.boss && !bossPlaced && !underPlayer && camDistance < range.cull * 0.82) {
        bossPlaced = true;
        const boss = new THREE.Mesh(tileProp('boss', buildBossGeometry), solidMaterial(0.86, 0.04));
        boss.position.set(dx, y, dz);
        boss.castShadow = true;
        boss.receiveShadow = true;
        worldGroup.add(boss);
      } else if (info.mob && !underPlayer && monsters < monsterCap && camDistance < range.cull * (mobile ? 0.45 : 0.6)) {
        monsters++;
        lists.monster.push({
          x: dx, y, z: dz, ry: hash2(wx, wy, 61) * Math.PI * 2,
          scale: 0.9 + hash2(wx, wy, 62) * 0.25,
          color: monsterTint(info.mob),
        });
      }
    }
  }

  const addProto = (name, geometry, items, opts = {}) => {
    if (!items.length) return;
    addInstances(worldGroup, tileProp(name, geometry), solidMaterial(opts.roughness ?? 0.92, opts.metalness ?? 0), items, {
      castShadow: opts.castShadow !== false,
    });
  };

  addProto('treeA', () => buildTreeGeometry(false), lists.treeA);
  addProto('treeB', () => buildTreeGeometry(true), lists.treeB);
  addProto('rock', buildRockGeometry, lists.rock);
  addProto('flowerPink', () => buildFlowerGeometry(0xf06caa), lists.flowerPink, { castShadow: false });
  addProto('flowerGold', () => buildFlowerGeometry(0xffd45c), lists.flowerGold, { castShadow: false });
  addProto('flowerWhite', () => buildFlowerGeometry(0xe9f1ff), lists.flowerWhite, { castShadow: false });
  addProto('grass', buildGrassGeometry, lists.grass, { castShadow: false });
  addProto('cactus', buildCactusGeometry, lists.cactus);
  addProto('house', buildHouseGeometry, lists.house);
  addProto('shop', buildShopGeometry, lists.shop);
  addProto('stall', buildStallGeometry, lists.stall);
  addProto('memorial', buildMemorialGeometry, lists.memorial);
  addProto('teleport', buildTeleportGeometry, lists.teleport);
  addProto('wall', buildWallGeometry, lists.wall);
  addProto('monster', buildMonsterGeometry, lists.monster);
  addProto('lavaRock', () => mergeParts([
    { geometry: new THREE.DodecahedronGeometry(0.24), color: 0x6b2a18, position: [0, 0.14, 0], scale: [1, 0.7, 1] },
    { geometry: new THREE.DodecahedronGeometry(0.14), color: 0xff7a3c, position: [0.14, 0.1, 0.08] },
  ]), lists.lavaRock, { roughness: 0.6, metalness: 0.1 });
  addProto('snowTuft', () => mergeParts([
    { geometry: new THREE.ConeGeometry(0.1, 0.2, 5), color: 0xf2fbff, position: [0, 0.1, 0] },
    { geometry: new THREE.SphereGeometry(0.09, 6, 5), color: 0xc9e6f7, position: [0.1, 0.07, 0.06], scale: [1, 0.5, 1] },
  ]), lists.snowTuft, { roughness: 0.7 });

  window.__world3dStats = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.length]));
  if (player) {
    player.position.set(0, terrainHeight(state.x, state.y) + 0.02, 0);
    player.rotation.y = 0;
  }
  window.updateSceneTitle?.();
}

const MONSTER_TINTS = [0x4d8e9a, 0x7d6bb0, 0x9a6b48, 0x6f9a5a, 0xa85f5f, 0x4f7fb0, 0xb0873f, 0x6b8f8f];
function monsterTint(mob) {
  const id = (mob && (mob.id || mob.name)) || 'mob';
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return MONSTER_TINTS[n % MONSTER_TINTS.length];
}

/* ---------------- 天气与云 ---------------- */

function cloud(x, z, scale) {
  const q = new THREE.Group();
  q.position.set(x, 15.5, z);
  for (let i = 0; i < 4; i++) {
    const s = add(q, new THREE.SphereGeometry(0.9, 9, 7), new THREE.MeshStandardMaterial({ color: 0xeaf2f8, roughness: 1 }), (i - 1.5) * 0.55, Math.sin(i) * 0.12, 0, false, false);
    s.scale.set(1.3, 0.55, 0.8);
  }
  q.scale.setScalar(scale);
  clouds.add(q);
}

function weather(level) {
  if (clouds) {
    clouds.traverse((o) => o.geometry?.dispose());
    scene.remove(clouds);
  }
  if (rain) {
    scene.remove(rain);
    rain.geometry.dispose();
    rain.material.dispose();
  }
  clouds = null;
  rain = null;
  if (level === 'low') return;
  clouds = new THREE.Group();
  clouds.name = 'clouds';
  scene.add(clouds);
  cloud(-16, -26, 3.2);
  cloud(8, -32, 4.0);
  cloud(24, -10, 2.6);
  if (level === 'extreme') {
    const n = isMobile() ? 90 : 220;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (Math.random() - 0.5) * 30;
      a[i * 3 + 1] = Math.random() * 12 + 1;
      a[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
    rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc6d9ed, size: 0.06, transparent: true, opacity: 0.7 }));
    scene.add(rain);
  }
}

function quality() {
  const q = document.documentElement.dataset.qualityLevel || 'high';
  if (q === lastQuality) return;
  lastQuality = q;
  const mobile = isMobile();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'low' ? 0.8 : q === 'high' ? (mobile ? 1.15 : 1.25) : mobile ? 1.35 : 1.6));
  renderer.shadowMap.enabled = !mobile && q !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = q === 'extreme' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = q === 'extreme' ? 1.06 : 1;
  if (sunLight) {
    const mapSize = q === 'extreme' ? (mobile ? 1536 : 2048) : 1024;
    sunLight.shadow.mapSize.set(mapSize, mapSize);
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.normalBias = 0.03;
    sunLight.shadow.radius = q === 'extreme' ? 3 : 2;
  }
  weather(q);
  renderer.setSize(Math.max(1, stage.clientWidth), Math.max(1, stage.clientHeight), false);
}

/* ---------------- 点击（任意可见地块都可以点） ---------------- */

function click3D(e) {
  if (!renderer || !camera) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(groundHits, false)[0];
  if (!hit) return;
  const wx = Math.round(currentState.x + hit.point.x);
  const wy = Math.round(currentState.y + hit.point.z);
  const info = tileInfo(wx, wy);
  window.__world3dLastPick = { wx, wy, tile: info?.tile };
  if (info?.boss) {
    window.challengeSceneBoss3D?.(wx, wy);
    return;
  }
  window.onTileClick?.(wx, wy, info?.tile || 'grass');
}

/* 相机 -> 主角 之间是否被实体模型挡住 */
function isHeroOccluded() {
  if (!worldGroup || !camera || !player) return false;
  const target = new THREE.Vector3(player.position.x, player.position.y + 0.95, player.position.z);
  const origin = camera.position;
  const dir = target.clone().sub(origin);
  const distance = dir.length();
  dir.normalize();
  const heroRay = new THREE.Raycaster(origin, dir, 1, Math.max(0.5, distance - 0.6));
  const hits = heroRay.intersectObject(worldGroup, true);
  return hits.length > 0;
}

/* ---------------- 启动 ---------------- */

function boot() {
  if (!stage) {
    console.error('3D map stage #stage not found');
    return;
  }
  const topbar = document.getElementById('topbar');
  const layoutStage = () => {
    const top = topbar ? topbar.getBoundingClientRect().height : 0;
    Object.assign(stage.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: top + 'px',
      bottom: '0',
      width: '100%',
      height: 'auto',
      flex: 'none',
      minHeight: '0',
    });
  };
  layoutStage();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  applyHazeFog(THREE, scene, SKY_COLOR, visibility());

  camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
  camera.position.set(0, 9.6, 12.6);
  camera.lookAt(0, 0.15, -1.6);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.domElement.id = 'world3dCanvas';
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '1',
    display: 'block',
  });
  stage.appendChild(renderer.domElement);

  if (legacy) legacy.style.display = window.map3DEnabled === false ? '' : 'none';
  const legacyPlayer = document.getElementById('player');
  if (legacyPlayer) legacyPlayer.style.display = window.map3DEnabled === false ? '' : 'none';
  renderer.domElement.style.display = window.map3DEnabled === false ? 'none' : 'block';

  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x3d5033, 2.1));
  sunLight = new THREE.DirectionalLight(0xffe6bc, 3.1);
  sunLight.position.set(-9, 16, 11);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.bias = -0.0002;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);
  scene.add(sunLight.target);

  window.__world3d = { camera, scene, renderer };
  player = new THREE.Mesh(tileProp('hero', buildHeroGeometry), solidMaterial(0.86, 0.02));
  player.castShadow = true;
  player.receiveShadow = true;
  player.scale.setScalar(1.1);
  scene.add(player);
  /* 被树/建筑挡住时，用一层半透明残影保证主角永远可见 */
  heroGhost = new THREE.Mesh(
    player.geometry,
    new THREE.MeshBasicMaterial({ color: 0xb6ecff, transparent: true, opacity: 0.26, depthTest: false, depthWrite: false }),
  );
  heroGhost.renderOrder = 20;
  heroGhost.visible = false;
  heroGhost.scale.setScalar(1.1);
  scene.add(heroGhost);

  ray = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('click', click3D);

  const resize = () => {
    layoutStage();
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    lastKey = '';
    rebuild();
  };
  const stageObserver = new ResizeObserver(resize);
  stageObserver.observe(stage);
  if (topbar) stageObserver.observe(topbar);
  window.addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  resize();

  window.renderWorld3D = () => {
    if (renderer?.domElement) renderer.domElement.style.display = window.map3DEnabled === false ? 'none' : 'block';
    quality();
    rebuild();
  };
  new MutationObserver(() => {
    lastQuality = '';
    lastKey = '';
    window.renderWorld3D();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-quality-level'] });

  quality();
  rebuild();
  window.dispatchEvent(new Event('world3d-ready'));

  clock = new THREE.Clock();
  let lastFrameAt = 0;
  let lastOcclusionCheck = 0;
  function renderWorldFrame(now = 0) {
    requestAnimationFrame(renderWorldFrame);
    if (document.hidden || window.map3DEnabled === false || renderer.domElement.style.display === 'none') return;
    const interval = isMobile() ? 1000 / 30 : 1000 / 45;
    if (now - lastFrameAt < interval) return;
    lastFrameAt = now;
    const t = clock.getElapsedTime();
    if (player) {
      player.position.y = terrainHeight(currentState.x, currentState.y) + 0.02 + Math.sin(t * 3.1) * 0.02;
      player.rotation.y = Math.sin(t * 0.7) * 0.06;
    }
    if (heroGhost && player) {
      heroGhost.position.copy(player.position);
      heroGhost.rotation.copy(player.rotation);
      if (now - lastOcclusionCheck > 180) {
        lastOcclusionCheck = now;
        heroGhost.visible = isHeroOccluded();
      }
    }
    if (clouds) clouds.position.x = Math.sin(t * 0.03) * 1.2;
    if (rain) {
      const a = rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - 0.28;
        if (y < 0) y = 12;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  renderWorldFrame();
}

try {
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  } catch (primaryError) {
    console.warn('Three.js primary CDN failed; trying fallback CDN', primaryError);
    THREE = await import('https://unpkg.com/three@0.180.0/build/three.module.js');
  }
  mat = createMaterialFactory(THREE);
  add = createMeshAdder(THREE);
  mergeParts = createGeometryMerger(THREE);
  addInstances = createInstanceAdder(THREE);
  boot();
} catch (e) {
  console.error('3D engine boot failed', e);
  document.getElementById('world3dCanvas')?.remove();
  if (legacy) {
    legacy.style.display = 'block';
    legacy.style.visibility = 'visible';
    legacy.style.pointerEvents = 'auto';
  }
  const legacyPlayer = document.getElementById('player');
  if (legacyPlayer) legacyPlayer.style.display = '';
  window.map3DEnabled = false;
  document.body.classList.remove('graphics-3d');
  const btn = document.getElementById('graphicsToggle');
  if (btn) {
    btn.textContent = '地图2D：开';
    btn.setAttribute('aria-pressed', 'false');
  }
  window.toast?.('3D地图初始化失败，已自动恢复2D地图；请检查网络或设备WebGL支持');
}
