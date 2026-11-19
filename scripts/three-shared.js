/* Shared Three.js material cache factory used by all 3D scenes. */
export function createMaterialFactory(THREE){
 const cache=new Map();
 return function material(color,roughness=.9,metalness=0){
  const key=[color,roughness,metalness].join(':');
  if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
  return cache.get(key);
 };
}
