---
name: GLB character scaling and visibility bugs
description: Two separate bugs that make animated GLB characters invisible — frustum culling + wrong computeFit axis
---

## Bug 1: Skinned mesh frustum culling
Set `mesh.frustumCulled = false` after SkeletonUtils.clone(). Skinned mesh bounding spheres collapse to origin before bones are updated, causing the GPU to cull the mesh even when it's on screen.

## Bug 2: computeFit ignoring root-node transforms (the real cause of invisible males)
The Vanguard/Mixamo soldier GLB has its geometry in **centimeter scale with Z-as-up** and a root "Character" node that applies `scale:0.01` + `rotation:90°X` to convert it to meter/Y-up space. Reading raw vertex Y positions gives the wrong axis (only -22 to +22, the chest depth), so computeFit produces a microscopic scale that compounds with the existing 0.01 node scale → character renders at ~0.01cm tall, completely invisible.

**Fix:** Call `obj.updateMatrixWorld(true)` before measuring bounds, then use `mesh.geometry.computeBoundingBox()` + `bb.applyMatrix4(mesh.matrixWorld)` to get world-space extents that correctly include root-node scale/rotation.

## Both fixes combined (required):
```tsx
// In computeFit:
obj.updateMatrixWorld(true)
obj.traverse(child => {
  const mesh = child as THREE.Mesh
  if (!mesh.isMesh || !mesh.geometry) return
  mesh.geometry.computeBoundingBox()
  const bb = mesh.geometry.boundingBox
  if (!bb) return
  tmpBox.copy(bb).applyMatrix4(mesh.matrixWorld)
  // union min/max Y
})

// After cloning:
mesh.frustumCulled = false
mesh.material = cloneMat(mesh.material)  // clone before tinting
```

## Why fembot worked but soldier didn't
fembot (Michelle) geometry is already in meter scale, Y-up, no root node transform. Raw Y positions give correct height. Soldier (Vanguard) geometry is cm-scale, Z-up, with a 0.01+90° root — raw Y positions are completely wrong.
