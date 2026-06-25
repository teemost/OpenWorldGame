---
name: Skinned mesh frustum culling / invisible character
description: Why soldier.glb (and any skinned mesh) renders invisible while a different GLB renders fine in the same component
---

## The Rule
Always set `frustumCulled = false` on every mesh node after `SkeletonUtils.clone()`. Also clone materials before mutating them.

## Why
Three.js computes a skinned mesh's bounding sphere from its rest-pose bone world positions. When the clone is not yet attached to a live scene (i.e., useMemo runs before the first frame), bone world matrices haven't been updated, so they all collapse to the world origin. The bounding sphere radius comes back as ~0, and the GPU frustum-culler immediately discards the mesh as "offscreen" — even when it's right in front of the camera.

Different GLB files hit this inconsistently: fembot (Michelle) has a skeleton layout that accidentally produces a non-zero bounding sphere in the unattached state; soldier.glb does not.

## How to Apply
In the useMemo that clones a skinned GLTF:
```tsx
clone.traverse(c => {
  const mesh = c as THREE.Mesh
  if (!mesh.isMesh) return
  mesh.frustumCulled = false        // ← must always do this
  mesh.material = cloneMat(mesh.material)  // ← clone before tinting
  ...
})
```
Also applies to any `GLBMesh` helper or other place that clones and renders a GLTF skinned character.
