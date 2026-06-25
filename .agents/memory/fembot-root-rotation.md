---
name: Fembot GLB root rotation
description: fembot.glb has a +90°X rotation on its root node that makes it appear giant and lying flat; the fix is to zero the quaternion in computeFit
---

## The rule
In `computeFit` (GameModels.tsx), detect and zero any `+90°X` root rotation before measuring the bounding box.

**Why:** fembot.glb was exported from Mixamo with its geometry already in Y-up orientation (local Y = character height, range ~0 to 1.662 m). The root "Character" node has `scale=0.01` and `rotation=+90°X` (quaternion: qx≈+0.707, qw≈0.707). This maps local Y → world Z, leaving world Y extent at ~0.004 units. `computeFit` then computes `scale = 1.15 / 0.004 ≈ 287`, making the character enormous and lying flat.

Soldier.glb uses `rotation=-90°X` (qx≈-0.707) which is intentional: its geometry is in centimetre-scale Z-up orientation (local Z = height, ~183 cm), and `-90°X` correctly maps local Z → world Y. Never zero negative-X rotations.

**How to apply:**
```typescript
const rootCandidate = obj.children.length > 0 ? obj.children[0] : obj
const q = rootCandidate.quaternion
if (q.x > 0.5 && Math.abs(q.y) < 0.1 && Math.abs(q.z) < 0.1 && q.w > 0.5) {
  rootCandidate.quaternion.set(0, 0, 0, 1)  // zero +90°X permanently
}
obj.updateMatrixWorld(true)
// now measure Y bounds normally
```
This permanently fixes both the scale (correct Y measurement) and the display (character stands upright).

## Key data from fembot.glb inspection
- Root node: `scale=[0.01,0.01,0.01]`, `rotation=[0.707,0,0,0.707]` (+90°X)
- Mesh POSITION accessor: count=16340, min=[-0.728,-0.003,-0.181], max=[0.728,1.662,0.206]
- Character is ~1.662m tall in local Y space (already metre-scale, already Y-up)

## Key data from soldier.glb inspection  
- Root node: `scale=[0.01,0.01,0.01]`, `rotation=[-0.707,0,0,0.707]` (-90°X)
- Mesh POSITION: min=[-92,-22,-0.037], max=[92,22,183] (centimetre-scale, Z-up)
- Character is ~183 cm tall in local Z → after -90°X → world Y = 1.83m ✓
