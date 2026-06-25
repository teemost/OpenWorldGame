---
name: FBX multi-animation pattern
description: How separate idle/walk/run FBX animation files are uploaded, stored, and blended for custom FBX character models. Covers the GPU context loss trap and the hook-count constraint.
---

## The GPU context loss trap
Loading an FBX model AND soldier.glb simultaneously (for animation retargeting) doubles GPU memory pressure and crashes the WebGL context. FBX bone naming also differs from GLB/Mixamo convention, so retargeting silently fails anyway. Solution: FBX models never load soldier.glb. They use only their own animations (or separately uploaded animation files).

## Storage layout
- IndexedDB key for a clip: `anim_{category}_{clip}` (e.g. `anim_player_idle`)
- In-memory map key: `${category}_${clip}` → blob URL string (`animBlobURLs` in useModelStore)
- Metadata persisted to localStorage under `owcc_model_store_v2` → `animations` field
- Supported clips: `idle | walk | run` (ANIM_CLIPS constant)
- Supported categories: `player | npc | police | swat` (HUMANOID_CATS constant)

## Fixed hook-count constraint in AnimatedFBXMultiAnimInner
`useLoader` must be called unconditionally and always the same number of times. The component makes exactly 4 calls:
```ts
const mainFBX = useLoader(FBXLoader, url)
const idleFBX = useLoader(FBXLoader, idleUrl ?? url)  // url = cached, free
const walkFBX = useLoader(FBXLoader, walkUrl ?? url)
const runFBX  = useLoader(FBXLoader, runUrl  ?? url)
```
When a clip URL is missing, the fallback `url` (the main model) is used. Since it's already cached by `useLoader`, no extra network request or GPU load happens.

## Clip extraction logic
- When a dedicated animation URL is provided: take `animations[0]` from that FBX, clone it, rename to `'Idle'`/`'Walk'`/`'Run'`.
- When no dedicated URL (fallback === main model): search `mainFBX.animations` for a clip matching `/idle/i` etc. If nothing matches, skip that slot.
- If ZERO actions were registered after all three attempts, fall back to all raw clips from `mainFBX.animations` (same as single-file mode).

**Why:** This means any combination of zero, one, two, or three uploaded animation files works correctly. The blend state machine only plays clips that exist.

## Routing in AnimatedCustomHumanoid
```ts
const hasAnimUrls = !!(animUrls && (animUrls.idle || animUrls.walk || animUrls.run))
if (fmt === 'fbx' && hasAnimUrls) → AnimatedFBXMultiAnimInner
if (fmt === 'fbx')                 → AnimatedFBXHumanoidInner   (single-file, own clips only)
else                               → AnimatedHumanoidInner       (GLB + soldier.glb retargeting)
```

## Admin panel
`AnimUploadSection` appears inside `ModelUploadCard` for all HUMANOID_CATS. It's a collapsible section with three `AnimClipSlot` sub-components (one per clip). Each slot is a drag-drop zone that calls `uploadAnimation(catKey, clip, file)`.
