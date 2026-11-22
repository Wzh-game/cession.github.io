/* Shared Three.js helpers used by all 3D scenes.
   - createMaterialFactory: cached MeshStandardMaterial by color/roughness/metalness
   - createMeshAdder: tiny addMesh helper
   - createGeometryMerger: merges many primitive parts (with per-part color) into one
     vertex-colored BufferGeometry, so a whole prop/character is a single solid mesh
   - createInstanceAdder: draws a prototype geometry many times with InstancedMesh
     (per-instance transform + optional per-instance tint)
*/

export function createMaterialFactory(THREE) {
  const cache = new Map();
  return function material(color, roughness = 0.9, metalness = 0) {
    const key = [color, roughness, metalness].join(':');
    if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return cache.get(key);
  };
}

export function createMeshAdder(THREE) {
  return function addMesh(parent, geometry, material, x = 0, y = 0, z = 0, castShadow = true, receiveShadow = true) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = castShadow;
    object.receiveShadow = receiveShadow;
    parent.add(object);
    return object;
  };
}

/* Merge parts into one solid, vertex-colored geometry.
   part = { geometry, color, position:[x,y,z], rotation:[x,y,z], scale:number|[x,y,z] } */
export function createGeometryMerger(THREE) {
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const color = new THREE.Color();

  return function mergeParts(parts) {
    const positions = [];
    const normals = [];
    const colors = [];
    for (const part of parts) {
      if (!part || !part.geometry) continue;
      let geo = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      const rot = part.rotation || [0, 0, 0];
      euler.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
      quat.setFromEuler(euler);
      const p = part.position || [0, 0, 0];
      pos.set(p[0] || 0, p[1] || 0, p[2] || 0);
      const s = part.scale;
      if (Array.isArray(s)) scl.set(s[0], s[1], s[2]);
      else if (typeof s === 'number') scl.set(s, s, s);
      else scl.set(1, 1, 1);
      matrix.compose(pos, quat, scl);
      geo.applyMatrix4(matrix);
      const pa = geo.attributes.position;
      const na = geo.attributes.normal;
      color.setHex(part.color === undefined ? 0xffffff : part.color);
      for (let i = 0; i < pa.count; i++) {
        positions.push(pa.getX(i), pa.getY(i), pa.getZ(i));
        if (na) normals.push(na.getX(i), na.getY(i), na.getZ(i));
        else normals.push(0, 1, 0);
        colors.push(color.r, color.g, color.b);
      }
      geo.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  };
}

/* Draw a prototype geometry many times.
   item = { x,y,z, ry?, rx?, rz?, scale?|sx/sy/sz, color? } */
export function createInstanceAdder(THREE) {
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const tint = new THREE.Color();

  return function addInstances(parent, geometry, material, items, options = {}) {
    if (!geometry || !items || !items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    let tinted = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      euler.set(it.rx || 0, it.ry || 0, it.rz || 0);
      quat.setFromEuler(euler);
      pos.set(it.x || 0, it.y || 0, it.z || 0);
      if (Array.isArray(it.scale)) scl.set(it.scale[0], it.scale[1], it.scale[2]);
      else if (typeof it.scale === 'number') scl.set(it.scale, it.scale, it.scale);
      else scl.set(it.sx || 1, it.sy || 1, it.sz || 1);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
      if (it.color !== undefined) {
        tinted = true;
        tint.setHex(it.color);
        mesh.setColorAt(i, tint);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (tinted && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = options.frustumCulled !== false;
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    parent.add(mesh);
    return mesh;
  };
}

/* 雾色与背景色一致：地块窗口的边缘落在雾的远端，于是画面里看不到任何“空洞”，
   远景自然收进雾里。near/far 以“相机距离”为准，玩家附近永远是清晰的。 */
export function applyHazeFog(THREE, scene, colorHex, range) {
  const near = Math.max(6, range.near);
  const far = Math.max(near + 4, range.far);
  scene.fog = new THREE.Fog(colorHex, near, far);
  return scene.fog;
}
