---
name: Fembot GLB root rotation
description: fembot.glb has a +90°X rotation on its root node that makes it appear giant and lying flat; the correct fix is a counter-rotation on the wrapper group — never zero bone rotations
---

## The rule
In `computeFit` (GameModels.tsx), detect the Z-flat case by comparing world-space extents, then return `counterRotX = -Math.PI/2` for the wrapper group. Do NOT touch any node quaternions (bones or root) — that breaks skeleton binding.

**Why:** fembot.glb was exported from Mixamo with `scale=0.01` and `rotation=+90°X` on the root "Character" node. This maps the geometry's local Y axis (height, range 0–1.662m) → world Z, so world Y extent collapses to ~0.004 units (body depth only). Previous fixes zeroed bone rotations, which corrupted the inverse-bind-matrix calculation and caused deformed skinning.

The correct geometry orientation approach:
1. Measure all three world-space extents (sX, sY, sZ) with original transforms
2. If `sZ > sY * 2`: character is lying flat along Z → return `counterRotX = -Math.PI/2`
3. Apply counter-rotation on the OUTER wrapper group; the inner `<primitive>` is untouched

**How to apply (in AnimatedHumanoidInner):**
```tsx
// Two-group wrapper: outer for yOffset, inner for counter-rotation
return (
  <group ref={groupRef} position-y={fit.yOffset}>
    <group rotation-x={fit.counterRotX}>
      <primitive object={scene} scale={fit.scale} />
    </group>
  </group>
)
```

computeFit logic:
```typescript
if (sZ > sY * 2) {
  // fembot case: Z is the height axis (from +90°X root)
  // -90°X counter-rotation makes Z→Y, standing the character upright
  return { scale: targetHeight / maxSize, yOffset: -minZ * scale, counterRotX: -Math.PI / 2 }
}
// soldier/default: Y is already height axis
return { scale: targetHeight / maxSize, yOffset: -minY * scale, counterRotX: 0 }
```

## Key data
- fembot.glb: root "Character" node has `scale=[0.01,0.01,0.01]`, `rotation=[0.707,0,0,0.707]` (+90°X)
- Geometry Y range [0, 1.662m] → after +90°X → world Z range [0, 0.01662]
- World Y extent (body depth) ≈ 0.004, World Z extent (height) ≈ 0.01665
- sZ/sY ≈ 4.3 → well above the 2× threshold
- Final scale = 1.15 / 0.01665 ≈ 69

## useMemo caching note
React Fast Refresh preserves useMemo cache across HMR updates (since `gltf.scene` reference is unchanged). User must do a **hard page refresh** (not soft reload) to see computeFit changes take effect after HMR. Full page reload → useMemo runs fresh → fix applies.
