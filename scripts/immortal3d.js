import {
  createMaterialFactory,
  createMeshAdder,
  createGeometryMerger,
  createInstanceAdder,
  applyHazeFog,
} from './three-shared.js';

/* ============================================================
   识海（仙界）3D 地图
   与凡界一致：
   1. 主角、怪物、Boss 全部改为有体积的实体 3D 模型（不再用 2D 像素精灵）。
   2. 视口内能看见的每一格都会渲染，视线尽头用同色雾收边，不再出现黑边/空洞。
   ============================================================ */

let THREE, mat, add, mergeParts, addInstances;
let renderer, scene, camera, worldGroup, hero, heroGhost, clock, ray, pointer;
let host = null;
let resizeObserver = null;
let stageObserver = null;
let currentState = { x: 0, y: 0 };
let lastKey = '';
let lastQuality = '';
let sunLight;
const groundHits = [];
const prototypeCache = new Map();
const SKY_COLOR = 0x2c4364;

function hashView(x, y, seed = 0) {
  let n = Math.imul((x | 0) + seed, 374761393) ^ Math.imul((y | 0) - seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function isMobile() {
  return matchMedia('(max-width: 700px)').matches;
}

/* 与凡界一致：视锥内、相机距离 < cull 的地块全部渲染，雾在 cull 之后收边。 */
function visibility() {
  const q = document.documentElement.dataset.qualityLevel || 'high';
  const camDist = Math.hypot(camera ? camera.position.y : 0, camera ? camera.position.z : 0) || 14;
  const base = isMobile() ? 21 : 27;
  const scale = q === 'low' ? 0.84 : q === 'extreme' ? 1.2 : 1;
  const far = Math.max(base * scale, camDist + 11);
  const near = Math.min(far - 6, camDist + 2.5);
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

function solidMaterial(roughness = 0.9, metalness = 0, emissive = 0) {
  const key = 'solid:' + roughness + ':' + metalness + ':' + emissive;
  if (!prototypeCache.has(key)) {
    prototypeCache.set(key, new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness,
      metalness,
      emissive,
      emissiveIntensity: emissive ? 0.45 : 0,
    }));
  }
  return prototypeCache.get(key);
}

/* ---------------- 地表配色 ---------------- */

const PALETTES = {
  jiutian: [0x668f4e, 0x729d57, 0x5e8548, 0x7da45c, 0x587e49],
  yaochi: [0x559b91, 0x65aaa0, 0x47877f, 0x78b6a8],
  zhuxian: [0x88745d, 0x9b8065, 0x75634f, 0xa18b70],
  forest: [0x356d43, 0x417c4c, 0x2f613c, 0x508a54],
  chaos: [0x51415e, 0x615071, 0x44364f, 0x6a5878],
  wilderness: [0x648a5a, 0x739b61, 0x587c50],
};

function groundColor(info) {
  if (info.hidden) return 0x1b2b3f;
  if (info.water) return 0x2b5f86;
  if (info.blocked) return info.region === 'chaos' ? 0x4d4160 : 0x6a7984;
  const palette = PALETTES[info.region] || PALETTES.wilderness;
  const h = hashView(info.x || 0, info.y || 0, 19);
  let color = palette[Math.floor(h * palette.length) % palette.length];
  if (info.path) color = info.region === 'zhuxian' ? 0x9d8b78 : 0x9c8968;
  return color;
}

function terrainLift(x, y) {
  return (hashView(x, y, 83) - 0.5) * 0.12;
}

/* ---------------- 实体模型 ---------------- */

/* 仙树（长生仙林）：树干 + 三层冷色树冠 */
function buildImmortalTreeGeometry(kind) {
  const parts = [{ geometry: new THREE.CylinderGeometry(0.07, 0.12, 0.72, 7), color: 0x5c4632, position: [0, 0.36, 0] }];
  if (kind === 'forest') {
    parts.push(
      { geometry: new THREE.ConeGeometry(0.58, 0.92, 8), color: 0x2f6b43, position: [0, 1.0, 0] },
      { geometry: new THREE.ConeGeometry(0.44, 0.74, 8), color: 0x3c8153, position: [0, 1.42, 0] },
      { geometry: new THREE.ConeGeometry(0.28, 0.52, 8), color: 0x52a069, position: [0, 1.76, 0] },
      { geometry: new THREE.SphereGeometry(0.4, 8, 6), color: 0x2a5f3c, position: [0.2, 0.98, 0.12], scale: [1, 0.72, 1] },
    );
  } else {
    parts.push(
      { geometry: new THREE.ConeGeometry(0.5, 1.0, 7), color: 0x3f6fb0, position: [0, 1.02, 0] },
      { geometry: new THREE.ConeGeometry(0.36, 0.78, 7), color: 0x5f8dd0, position: [0, 1.46, 0] },
      { geometry: new THREE.SphereGeometry(0.2, 8, 6), color: 0x9fc3ea, position: [0, 1.86, 0] },
    );
  }
  return mergeParts(parts);
}

function buildImmortalRockGeometry(chaos) {
  const base = chaos ? 0x55445f : 0x75828c;
  return mergeParts([
    { geometry: new THREE.DodecahedronGeometry(0.34), color: base, position: [0, 0.2, 0], scale: [1, 0.8, 0.92] },
    { geometry: new THREE.DodecahedronGeometry(0.19), color: chaos ? 0x6a5878 : 0x8794a0, position: [0.23, 0.12, 0.1] },
    { geometry: new THREE.DodecahedronGeometry(0.14), color: base, position: [-0.2, 0.1, -0.12] },
  ]);
}

function buildImmortalCrystalGeometry() {
  return mergeParts([
    { geometry: new THREE.OctahedronGeometry(0.24), color: 0x9ceaff, position: [0, 0.34, 0], scale: [0.8, 1.35, 0.8] },
    { geometry: new THREE.OctahedronGeometry(0.14), color: 0xd6f7ff, position: [0.16, 0.2, 0.1], scale: [0.8, 1.2, 0.8] },
    { geometry: new THREE.OctahedronGeometry(0.11), color: 0x7fd4f0, position: [-0.16, 0.16, -0.08], scale: [0.8, 1.1, 0.8] },
  ]);
}

function buildImmortalGrassGeometry() {
  return mergeParts([
    { geometry: new THREE.ConeGeometry(0.045, 0.26, 4), color: 0x91b96a, position: [0, 0.13, 0], rotation: [0, 0, 0.12] },
    { geometry: new THREE.ConeGeometry(0.04, 0.2, 4), color: 0x7aa458, position: [0.1, 0.1, 0.07], rotation: [0, 0, 0.32] },
    { geometry: new THREE.ConeGeometry(0.038, 0.22, 4), color: 0xa9cf80, position: [-0.1, 0.11, -0.06], rotation: [0, 0, -0.3] },
  ]);
}

function buildImmortalFlowerGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    parts.push({ geometry: new THREE.SphereGeometry(0.075, 7, 6), color: 0xf1d28a, position: [Math.cos(a) * 0.09, 0.14, Math.sin(a) * 0.09], scale: [1, 0.5, 0.8] });
  }
  parts.push(
    { geometry: new THREE.CylinderGeometry(0.012, 0.018, 0.14, 5), color: 0x6f9a58, position: [0, 0.07, 0] },
    { geometry: new THREE.SphereGeometry(0.05, 7, 6), color: 0xfff3c4, position: [0, 0.16, 0] },
  );
  return mergeParts(parts);
}

/* 地标：灵泉、遗迹、剑峰、仙林、虚空祭坛、传送门 */
function buildLandmarkGeometry(kind) {
  const parts = [];
  if (kind === 'spring') {
    const stone = 0x7b9d9e;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      parts.push({ geometry: new THREE.CylinderGeometry(0.1, 0.12, 0.26, 6), color: stone, position: [Math.cos(a) * 0.62, 0.13, Math.sin(a) * 0.62] });
    }
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.62, 0.68, 0.14, 16), color: 0x6f8f90, position: [0, 0.07, 0] },
      { geometry: new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), color: 0x58d7e8, position: [0, 0.16, 0] },
      { geometry: new THREE.SphereGeometry(0.16, 10, 8), color: 0xaef6ff, position: [0, 0.3, 0], scale: [1, 0.8, 1] },
    );
  } else if (kind === 'ruins') {
    parts.push(
      { geometry: new THREE.BoxGeometry(0.9, 1.2, 0.24), color: 0x9a8d77, position: [0, 0.6, -0.24] },
      { geometry: new THREE.BoxGeometry(0.24, 0.86, 0.9), color: 0x756c66, position: [-0.3, 0.43, 0.22] },
      { geometry: new THREE.BoxGeometry(0.8, 0.14, 0.8), color: 0x8d8272, position: [0, 0.07, 0] },
      { geometry: new THREE.TorusGeometry(0.4, 0.07, 8, 22), color: 0xe7c46e, position: [0, 0.9, 0.1], rotation: [0, 0, 0] },
      { geometry: new THREE.SphereGeometry(0.14, 8, 7), color: 0xffeaa8, position: [0, 0.9, 0.1] },
    );
  } else if (kind === 'swordpeak') {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.5, 0.62, 0.2, 10), color: 0x6d6152, position: [0, 0.1, 0] },
      { geometry: new THREE.ConeGeometry(0.22, 1.9, 5), color: 0xa9d9ee, position: [0, 1.1, 0] },
      { geometry: new THREE.ConeGeometry(0.1, 0.5, 5), color: 0xe4f7ff, position: [0, 2.0, 0] },
      { geometry: new THREE.BoxGeometry(0.5, 0.07, 0.12), color: 0x8fbcda, position: [0, 0.62, 0] },
    );
  } else if (kind === 'forest') {
    parts.push({ geometry: new THREE.SphereGeometry(0.62, 12, 10), color: 0x2f7a46, position: [0, 0.5, 0], scale: [1, 0.7, 1] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      parts.push(
        { geometry: new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6), color: 0x5c4632, position: [Math.cos(a) * 0.42, 0.25, Math.sin(a) * 0.42] },
        { geometry: new THREE.ConeGeometry(0.26, 0.56, 7), color: 0x3f9455, position: [Math.cos(a) * 0.42, 0.72, Math.sin(a) * 0.42] },
      );
    }
  } else if (kind === 'voidaltar') {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.78, 0.9, 0.24, 8), color: 0x40364e, position: [0, 0.12, 0] },
      { geometry: new THREE.CylinderGeometry(0.6, 0.68, 0.14, 8), color: 0x554867, position: [0, 0.28, 0] },
      { geometry: new THREE.TorusGeometry(0.44, 0.06, 8, 24), color: 0xb98cf0, position: [0, 0.78, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: new THREE.OctahedronGeometry(0.2), color: 0xe0c6ff, position: [0, 0.72, 0] },
    );
  } else {
    // 传送门 / 通用祭台
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.62, 0.76, 0.26, 8), color: 0xc3a56c, position: [0, 0.13, 0] },
      { geometry: new THREE.TorusGeometry(0.42, 0.09, 8, 22), color: 0xf0d79a, position: [0, 0.78, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: new THREE.ConeGeometry(0.4, 0.5, 6), color: 0x9d7a46, position: [0, 0.42, 0] },
    );
  }
  return mergeParts(parts);
}

/* 主角（仙界形态）：整体为有体积的立体人物 */
function buildHeroGeometry() {
  const robe = 0x5fa8d8;
  const robeDark = 0x2f6f9c;
  const skin = 0xf3d2b4;
  const hair = 0x2a2438;
  const gold = 0xf0d078;
  const parts = [];
  for (const side of [-1, 1]) {
    parts.push(
      { geometry: new THREE.BoxGeometry(0.16, 0.1, 0.28), color: 0x2b3c55, position: [side * 0.11, 0.05, 0.04] },
      { geometry: new THREE.CylinderGeometry(0.075, 0.09, 0.32, 8), color: 0x35496a, position: [side * 0.11, 0.24, 0] },
    );
  }
  parts.push(
    { geometry: new THREE.CylinderGeometry(0.18, 0.38, 0.52, 12), color: robe, position: [0, 0.63, 0] },
    { geometry: new THREE.CylinderGeometry(0.19, 0.24, 0.12, 12), color: robeDark, position: [0, 0.89, 0] },
    { geometry: new THREE.TorusGeometry(0.2, 0.033, 6, 16), color: gold, position: [0, 0.94, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.CylinderGeometry(0.19, 0.21, 0.44, 12), color: robe, position: [0, 1.14, 0] },
    { geometry: new THREE.BoxGeometry(0.28, 0.32, 0.11), color: 0x8fd2ee, position: [0, 1.16, 0.15] },
    { geometry: new THREE.BoxGeometry(0.18, 0.1, 0.06), color: gold, position: [0, 1.24, 0.2] },
    { geometry: new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), color: skin, position: [0, 1.4, 0] },
    { geometry: new THREE.SphereGeometry(0.19, 12, 10), color: skin, position: [0, 1.56, 0], scale: [1, 0.95, 0.92] },
    { geometry: new THREE.SphereGeometry(0.2, 12, 9), color: hair, position: [0, 1.64, -0.02], scale: [1, 0.68, 1] },
    { geometry: new THREE.SphereGeometry(0.1, 8, 7), color: hair, position: [0, 1.8, -0.08] },
    { geometry: new THREE.TorusGeometry(0.19, 0.024, 6, 16), color: gold, position: [0, 1.66, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.SphereGeometry(0.03, 6, 6), color: 0x1f1a26, position: [-0.07, 1.58, 0.165] },
    { geometry: new THREE.SphereGeometry(0.03, 6, 6), color: 0x1f1a26, position: [0.07, 1.58, 0.165] },
    // 仙气飘带
    { geometry: new THREE.BoxGeometry(0.1, 0.5, 0.03), color: 0xbfe8ff, position: [-0.26, 0.72, -0.12], rotation: [0.2, 0.3, 0.18] },
    { geometry: new THREE.BoxGeometry(0.1, 0.44, 0.03), color: 0x9fd8f8, position: [0.27, 0.7, -0.1], rotation: [0.2, -0.3, -0.16] },
  );
  for (const side of [-1, 1]) {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.06, 0.075, 0.42, 8), color: robe, position: [side * 0.25, 1.08, 0], rotation: [0, 0, side * 0.36] },
      { geometry: new THREE.CylinderGeometry(0.078, 0.082, 0.12, 8), color: gold, position: [side * 0.32, 0.87, 0] },
      { geometry: new THREE.SphereGeometry(0.07, 8, 6), color: skin, position: [side * 0.35, 0.78, 0] },
    );
  }
  return mergeParts(parts);
}

/* 识海妖兽：实体模型（躯干 + 头 + 角 + 四肢 + 尾） */
function buildDemonGeometry(boss) {
  const bodyColor = boss ? 0xa66de0 : 0x8b5fc4;
  const s = boss ? 1.55 : 1;
  const parts = [
    { geometry: new THREE.SphereGeometry(0.29 * s, 12, 10), color: bodyColor, position: [0, 0.5 * s, 0], scale: [1, 0.95, 0.86] },
    { geometry: new THREE.SphereGeometry(0.2 * s, 10, 8), color: boss ? 0xd8b7f5 : 0xc6a6ea, position: [0, 0.44 * s, 0.16 * s], scale: [1, 0.9, 0.7] },
    { geometry: new THREE.SphereGeometry(0.21 * s, 12, 10), color: boss ? 0xf0d7ff : 0xdcc6f4, position: [0, 0.9 * s, 0.02 * s], scale: [1, 0.95, 0.92] },
    { geometry: new THREE.SphereGeometry(0.045 * s, 8, 6), color: 0x2a1330, position: [-0.08 * s, 0.92 * s, 0.18 * s] },
    { geometry: new THREE.SphereGeometry(0.045 * s, 8, 6), color: 0x2a1330, position: [0.08 * s, 0.92 * s, 0.18 * s] },
    { geometry: new THREE.ConeGeometry(0.055 * s, 0.22 * s, 6), color: 0xf2d77c, position: [-0.12 * s, 1.1 * s, -0.02 * s], rotation: [0, 0, 0.32] },
    { geometry: new THREE.ConeGeometry(0.055 * s, 0.22 * s, 6), color: 0xf2d77c, position: [0.12 * s, 1.1 * s, -0.02 * s], rotation: [0, 0, -0.32] },
    { geometry: new THREE.ConeGeometry(0.09 * s, 0.28 * s, 6), color: 0x7d4fb0, position: [0, 0.46 * s, -0.3 * s], rotation: [-1.15, 0, 0] },
    { geometry: new THREE.SphereGeometry(0.09 * s, 8, 6), color: bodyColor, position: [-0.11 * s, 0.1 * s, 0.04 * s], scale: [1, 0.7, 1.3] },
    { geometry: new THREE.SphereGeometry(0.09 * s, 8, 6), color: bodyColor, position: [0.11 * s, 0.1 * s, 0.04 * s], scale: [1, 0.7, 1.3] },
  ];
  for (const side of [-1, 1]) {
    parts.push({
      geometry: new THREE.CylinderGeometry(0.055 * s, 0.065 * s, 0.26 * s, 7),
      color: bodyColor,
      position: [side * 0.27 * s, 0.52 * s, 0],
      rotation: [0, 0, side * 0.5],
    });
  }
  if (boss) {
    parts.push(
      { geometry: new THREE.TorusGeometry(0.46, 0.05, 8, 24), color: 0xd9a6ff, position: [0, 0.62, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: new THREE.ConeGeometry(0.2, 0.32, 6), color: 0xf2d77c, position: [0, 1.55, -0.02] },
      { geometry: new THREE.BoxGeometry(0.5, 0.2, 0.3), color: 0x6d3f96, position: [0, 0.75, 0.06] },
    );
  }
  return mergeParts(parts);
}

/* ---------------- 地形 ---------------- */

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

const SEG = 1;

function buildGround(tiles) {
  const count = tiles.length;
  const verts = (SEG + 1) * (SEG + 1);
  const positions = new Float32Array(count * verts * 3);
  const colors = new Float32Array(count * verts * 3);
  const indices = new Uint32Array(count * SEG * SEG * 6);
  const color = new THREE.Color();
  for (let t = 0; t < count; t++) {
    const { dx, dz, info } = tiles[t];
    color.setHex(groundColor(info));
    const lift = terrainLift(dx, dz);
    for (let iz = 0; iz <= SEG; iz++) {
      for (let ix = 0; ix <= SEG; ix++) {
        const vi = iz * (SEG + 1) + ix;
        const idx = (t * verts + vi) * 3;
        positions[idx] = dx + (-0.5 + ix / SEG);
        positions[idx + 1] = lift;
        positions[idx + 2] = dz + (-0.5 + iz / SEG);
        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;
      }
    }
    let k = t * SEG * SEG * 6;
    for (let iz = 0; iz < SEG; iz++) {
      for (let ix = 0; ix < SEG; ix++) {
        const a = t * verts + iz * (SEG + 1) + ix;
        const b = a + 1;
        const c = a + SEG + 1;
        const d = c + 1;
        indices[k++] = a; indices[k++] = c; indices[k++] = b;
        indices[k++] = b; indices[k++] = c; indices[k++] = d;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const ground = new THREE.Mesh(geo, solidMaterial(0.94, 0.02));
  ground.receiveShadow = true;
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
  const s = window.getImmortal3DState?.();
  if (!s || !scene) return;
  currentState = { x: Number(s.x) || 0, y: Number(s.y) || 0 };
  const quality = document.documentElement.dataset.qualityLevel || 'high';
  const key = [currentState.x, currentState.y, quality, Math.round((host?.clientWidth || 0) / 32), Math.round((host?.clientHeight || 0) / 32)].join('|');
  if (key === lastKey) return;
  lastKey = key;

  disposeGroup(worldGroup);
  worldGroup = new THREE.Group();
  scene.add(worldGroup);
  groundHits.length = 0;

  const range = visibility();
  applyHazeFog(THREE, scene, SKY_COLOR, range);
  if (sunLight) {
    const half = Math.min(16, range.camDist);
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
  for (let wy = bounds.minZ + currentState.y; wy <= bounds.maxZ + currentState.y; wy++) {
    for (let wx = bounds.minX + currentState.x; wx <= bounds.maxX + currentState.x; wx++) {
      const dx = wx - currentState.x;
      const dz = wy - currentState.y;
      const lift = terrainLift(dx, dz);
      const camDistance = Math.hypot(dx, camY - lift, dz - camZ);
      if (camDistance > range.cull) continue;
      const info = window.getImmortal3DInfo?.(wx, wy) || { x: wx, y: wy };
      tiles.push({ wx, wy, dx, dz, dist: Math.hypot(dx, dz), camDistance, info });
    }
  }
  const ground = buildGround(tiles);
  worldGroup.add(ground);
  groundHits.push(ground);

  const lists = {
    treeBlue: [], treeForest: [], rock: [], rockChaos: [], crystal: [], grass: [], flower: [],
    spring: [], ruins: [], swordpeak: [], forestGrove: [], voidaltar: [], gate: [],
    demon: [], boss: [],
  };
  const mobile = isMobile();

  for (const tile of tiles) {
    const { dx, dz, dist, camDistance, info } = tile;
    if (info.hidden) continue;
    const lift = terrainLift(dx, dz);
    const rot = hashView(dx, dz, 5) * Math.PI * 2;
    if (info.water) continue;
    if (info.landmark) {
      const kind = info.landmark;
      if (lists[kind]) lists[kind].push({ x: dx, y: lift, z: dz, ry: 0 });
      continue;
    }
    if (info.tree) {
      (info.region === 'forest' ? lists.treeForest : lists.treeBlue).push({ x: dx, y: lift, z: dz, ry: rot, scale: 0.92 + hashView(dx, dz, 9) * 0.25 });
      continue;
    }
    if (info.blocked) {
      (info.region === 'chaos' ? lists.rockChaos : lists.rock).push({ x: dx, y: lift, z: dz, ry: rot, scale: 0.85 + hashView(dx, dz, 11) * 0.3 });
      continue;
    }
    if (info.crystal) {
      lists.crystal.push({ x: dx, y: lift, z: dz, ry: rot, scale: 0.9 + hashView(dx, dz, 13) * 0.3 });
      continue;
    }
    if (info.path) continue;
    if (camDistance < range.cull * 0.86) {
      if (hashView(dx, dz, 21) > (mobile ? 0.72 : 0.55)) {
        lists.grass.push({ x: dx + (hashView(dx, dz, 22) - 0.5) * 0.5, y: lift, z: dz + (hashView(dx, dz, 23) - 0.5) * 0.5, ry: rot, scale: 0.9 + hashView(dx, dz, 24) * 0.3 });
      }
      if (hashView(dx, dz, 25) > 0.88) lists.flower.push({ x: dx + (hashView(dx, dz, 26) - 0.5) * 0.4, y: lift, z: dz + (hashView(dx, dz, 27) - 0.5) * 0.4, ry: rot });
    }
    if (info.monster && !(dx === 0 && dz === 0) && camDistance < range.cull * (mobile ? 0.5 : 0.62)) {
      lists.demon.push({ x: dx, y: lift, z: dz, ry: hashView(dx, dz, 31) * Math.PI * 2, scale: 0.95 + hashView(dx, dz, 32) * 0.2 });
    }
    if (info.boss && !(dx === 0 && dz === 0) && camDistance < range.cull * 0.9) {
      lists.boss.push({ x: dx, y: lift, z: dz, ry: 0 });
    }
  }

  const addProto = (name, geometry, items, opts = {}) => {
    if (!items.length) return;
    addInstances(worldGroup, tileProp(name, geometry), solidMaterial(opts.roughness ?? 0.9, opts.metalness ?? 0.03), items, {
      castShadow: opts.castShadow !== false,
    });
  };

  addProto('treeBlue', () => buildImmortalTreeGeometry('normal'), lists.treeBlue);
  addProto('treeForest', () => buildImmortalTreeGeometry('forest'), lists.treeForest);
  addProto('rock', () => buildImmortalRockGeometry(false), lists.rock);
  addProto('rockChaos', () => buildImmortalRockGeometry(true), lists.rockChaos);
  addProto('crystal', buildImmortalCrystalGeometry, lists.crystal, { metalness: 0.25, castShadow: false });
  addProto('grass', buildImmortalGrassGeometry, lists.grass, { castShadow: false });
  addProto('flower', buildImmortalFlowerGeometry, lists.flower, { castShadow: false });
  addProto('spring', () => buildLandmarkGeometry('spring'), lists.spring);
  addProto('ruins', () => buildLandmarkGeometry('ruins'), lists.ruins);
  addProto('swordpeak', () => buildLandmarkGeometry('swordpeak'), lists.swordpeak);
  addProto('forestGrove', () => buildLandmarkGeometry('forest'), lists.forestGrove);
  addProto('voidaltar', () => buildLandmarkGeometry('voidaltar'), lists.voidaltar, { metalness: 0.2 });
  addProto('gate', () => buildLandmarkGeometry('gate'), lists.gate);
  addProto('demon', () => buildDemonGeometry(false), lists.demon);
  addProto('boss', () => buildDemonGeometry(true), lists.boss);

  if (hero) hero.position.set(0, 0.02, 0);
}

function resize() {
  if (!host || !renderer) return;
  const w = Math.max(1, host.clientWidth);
  const h = Math.max(1, host.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  /* 主角固定在视口中央下方：无论横竖屏都先看到自己周围的已探索区域 */
  camera.position.set(0, 10.5, 12.2);
  camera.lookAt(0, 0.55, -0.8);
  camera.updateProjectionMatrix();
  lastKey = '';
  rebuild();
}

function quality() {
  if (!renderer || !host) return;
  const q = document.documentElement.dataset.qualityLevel || 'high';
  const mobile = isMobile();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 0.95 : q === 'low' ? 0.8 : q === 'high' ? 1.15 : 1.5));
  renderer.shadowMap.enabled = !mobile && q !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = q === 'extreme' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = q === 'extreme' ? 1.06 : 1;
  renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight), false);
}

function ensureHost() {
  const next = document.getElementById('immortalMapWorld');
  if (!next || !renderer) return;
  if (host === next && renderer.domElement.parentElement === next) {
    resize();
    return;
  }
  if (resizeObserver) resizeObserver.disconnect();
  host = next;
  host.appendChild(renderer.domElement);
  resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(host);
  lastKey = '';
  resize();
  quality();
}

function clickWorld(e) {
  if (!host || !renderer) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(groundHits, false)[0];
  if (!hit) return;
  const dx = Math.round(hit.point.x);
  const dz = Math.round(hit.point.z);
  const info = window.getImmortal3DInfo?.(currentState.x + dx, currentState.y + dz) || {};
  if (dx === 0 && dz === 0) {
    if (info.site || info.boss) window.interactImmortalMap?.();
    return;
  }
  if (Math.abs(dx) + Math.abs(dz) === 1) {
    window.moveImmortalOpenWorld?.(Math.sign(dx), Math.sign(dz));
    return;
  }
  if (info.site || info.boss) window.toast?.('请走到地点旁边，再按「调查」进行互动');
}

function isHeroOccluded() {
  if (!worldGroup || !camera || !hero) return false;
  const target = new THREE.Vector3(hero.position.x, hero.position.y + 0.95, hero.position.z);
  const origin = camera.position;
  const dir = target.clone().sub(origin);
  const distance = dir.length();
  dir.normalize();
  const heroRay = new THREE.Raycaster(origin, dir, 1, Math.max(0.5, distance - 0.6));
  return heroRay.intersectObject(worldGroup, true).length > 0;
}

function boot() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  applyHazeFog(THREE, scene, SKY_COLOR, visibility());

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 160);
  camera.position.set(0, 10.5, 12.2);
  camera.lookAt(0, 0.55, -0.8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.domElement.id = 'immortal3DCanvas';
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '1',
    display: 'block',
    touchAction: 'manipulation',
  });

  scene.add(new THREE.HemisphereLight(0xd9e8ff, 0x2b2438, 2.0));
  sunLight = new THREE.DirectionalLight(0xffe6c4, 2.8);
  sunLight.position.set(-8, 15, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.bias = -0.0002;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);

  hero = new THREE.Mesh(tileProp('hero', buildHeroGeometry), solidMaterial(0.86, 0.04));
  hero.castShadow = true;
  hero.receiveShadow = true;
  hero.scale.setScalar(1.08);
  scene.add(hero);
  heroGhost = new THREE.Mesh(
    hero.geometry,
    new THREE.MeshBasicMaterial({ color: 0xd5efff, transparent: true, opacity: 0.26, depthTest: false, depthWrite: false }),
  );
  heroGhost.renderOrder = 20;
  heroGhost.visible = false;
  heroGhost.scale.setScalar(1.08);
  scene.add(heroGhost);
  window.__immortal3d = { camera, scene, renderer };

  ray = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('click', clickWorld);

  stageObserver = new MutationObserver(() => ensureHost());
  const stage = document.getElementById('immortalStage');
  if (stage) stageObserver.observe(stage, { childList: true, subtree: true });
  ensureHost();

  clock = new THREE.Clock();
  new MutationObserver(() => {
    lastQuality = '';
    lastKey = '';
    quality();
    rebuild();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-quality-level'] });

  let lastFrameAt = 0;
  let lastOcclusionCheck = 0;
  function frame(now = 0) {
    requestAnimationFrame(frame);
    const interval = isMobile() ? 1000 / 30 : 1000 / 45;
    if (document.hidden || !host || !host.isConnected || host.offsetParent === null || now - lastFrameAt < interval) return;
    lastFrameAt = now;
    if (hero) hero.position.y = 0.02 + Math.sin(clock.getElapsedTime() * 3) * 0.03;
    if (heroGhost && hero) {
      heroGhost.position.copy(hero.position);
      heroGhost.rotation.copy(hero.rotation);
      if (now - lastOcclusionCheck > 180) {
        lastOcclusionCheck = now;
        heroGhost.visible = isHeroOccluded();
      }
    }
    renderer.render(scene, camera);
  }
  frame();

  window.updateImmortalWorld3D = () => rebuild();
  window.mountImmortalWorld3D = () => {
    ensureHost();
    lastKey = '';
    rebuild();
    resize();
  };
}

async function start() {
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const cachedMaterial = createMaterialFactory(THREE);
    mat = (...args) => {
      const m = cachedMaterial(...args);
      m.userData.sharedImmortalMaterial = true;
      return m;
    };
    add = createMeshAdder(THREE);
    mergeParts = createGeometryMerger(THREE);
    addInstances = createInstanceAdder(THREE);
    boot();
  } catch (e) {
    console.warn('Immortal open world 3D unavailable', e);
    const showFallback = () => {
      const el = document.getElementById('immortalMapWorld');
      if (el && !el.querySelector('.immortal-world-fallback')) {
        el.innerHTML = '<div class="immortal-world-fallback">3D 地图暂时无法加载，请检查网络或浏览器 WebGL 支持</div>';
      }
    };
    showFallback();
    const stage = document.getElementById('immortalStage');
    if (stage) new MutationObserver(showFallback).observe(stage, { childList: true, subtree: true });
  }
}

start();
