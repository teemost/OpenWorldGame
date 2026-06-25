import { Suspense, useEffect, useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as _SkeletonUtilsMod from 'three/examples/jsm/utils/SkeletonUtils.js'
// Three.js ≥0.160 exports as named; older builds use default. Handle both.
const SkeletonUtils: { clone: (obj: THREE.Object3D) => THREE.Object3D } =
  (_SkeletonUtilsMod as any).SkeletonUtils ??
  (_SkeletonUtilsMod as any).default?.SkeletonUtils ??
  (_SkeletonUtilsMod as any).default ??
  _SkeletonUtilsMod

// Compute scale + yOffset + optional counter-rotation to fit targetHeight, grounded at y=0.
// Measures all three world-space extents (X, Y, Z) to handle models exported with a
// +90°X root rotation (e.g. Mixamo fembot) that map the character's height to world Z.
// In that case we return counterRotX = –90° so the wrapper group stands it Y-up without
// touching any bones — the skeleton binding stays fully intact.
function computeFit(obj: THREE.Object3D, targetHeight: number): { scale: number; yOffset: number; counterRotX: number } {
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3()
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, minZ=Infinity, maxZ=-Infinity
  obj.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    mesh.geometry.computeBoundingBox()
    if (!mesh.geometry.boundingBox) return
    box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
    if (box.min.x < minX) minX = box.min.x; if (box.max.x > maxX) maxX = box.max.x
    if (box.min.y < minY) minY = box.min.y; if (box.max.y > maxY) maxY = box.max.y
    if (box.min.z < minZ) minZ = box.min.z; if (box.max.z > maxZ) maxZ = box.max.z
  })
  if (!isFinite(minY)) return { scale: 1, yOffset: 0, counterRotX: 0 }
  const sX = isFinite(minX) ? maxX - minX : 0
  const sY = maxY - minY
  const sZ = isFinite(minZ) ? maxZ - minZ : 0
  const maxSize = Math.max(sX, sY, sZ)
  if (maxSize < 0.001) return { scale: 1, yOffset: 0, counterRotX: 0 }
  const scale = targetHeight / maxSize

  // If Z is much taller than Y the character is lying flat along Z — a Mixamo
  // +90°X export maps local Y (height) → world Z. Apply a –90°X counter-rotation
  // on the outer wrapper group so the character stands upright. No bones are touched.
  if (sZ > sY * 2) {
    // After –90°X: world Z → new Y axis; minZ is the new floor.
    return { scale, yOffset: -minZ * scale, counterRotX: -Math.PI / 2 }
  }
  return { scale, yOffset: -minY * scale, counterRotX: 0 }
}

// Play the best animation: prefer walk then idle then run then first clip
function startAnimation(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[]): void {
  if (!clips.length) return
  const clip =
    clips.find(c => /walk/i.test(c.name)) ??
    clips.find(c => /idle/i.test(c.name)) ??
    clips.find(c => /run/i.test(c.name)) ??
    clips[0]
  const action = mixer.clipAction(clip)
  action.reset().setLoop(THREE.LoopRepeat, Infinity).play()
}

// ─── GLB / GLTF ───────────────────────────────────────────────────────────────
function GLBMesh({ url, targetHeight }: { url: string; targetHeight: number }) {
  const gltf = useLoader(GLTFLoader, url)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const groupRef = useRef<THREE.Group>(null!)

  const { scene, fit } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Object3D
    clone.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true
        c.receiveShadow = true
      }
    })
    const fit = computeFit(clone, targetHeight)
    return { scene: clone, fit }
  }, [gltf.scene, targetHeight])

  useEffect(() => {
    const clips = gltf.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(scene)
    startAnimation(mixer, clips)
    mixerRef.current = mixer
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      mixerRef.current = null
    }
  }, [scene, gltf.animations])

  useFrame((_, delta) => { mixerRef.current?.update(delta) })

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={fit.scale} position-y={fit.yOffset} />
    </group>
  )
}

// ─── OBJ ──────────────────────────────────────────────────────────────────────
function OBJMesh({ url, targetHeight }: { url: string; targetHeight: number }) {
  const obj = useLoader(OBJLoader, url)
  const { clone, fit } = useMemo(() => {
    const c = obj.clone()
    c.traverse(ch => { if ((ch as THREE.Mesh).isMesh) ch.castShadow = true })
    const fit = computeFit(c, targetHeight)
    return { clone: c, fit }
  }, [obj, targetHeight])
  return <primitive object={clone} scale={fit.scale} position-y={fit.yOffset} />
}

// ─── PLY ──────────────────────────────────────────────────────────────────────
function PLYMesh({ url, targetHeight }: { url: string; targetHeight: number }) {
  const geo = useLoader(PLYLoader, url)
  const geoCopy = useMemo(() => {
    const g = geo.clone()
    g.computeVertexNormals()
    g.computeBoundingBox()
    return g
  }, [geo])

  const fit = useMemo(() => {
    if (!geoCopy.boundingBox) return { scale: 1, yOffset: 0 }
    const height = geoCopy.boundingBox.max.y - geoCopy.boundingBox.min.y
    if (height < 0.001) return { scale: 1, yOffset: 0 }
    const scale = targetHeight / height
    return { scale, yOffset: -geoCopy.boundingBox.min.y * scale }
  }, [geoCopy, targetHeight])

  return (
    <mesh geometry={geoCopy} scale={fit.scale} position-y={fit.yOffset} castShadow>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─── FBX ──────────────────────────────────────────────────────────────────────
function FBXMesh({ url, targetHeight }: { url: string; targetHeight: number }) {
  const fbx = useLoader(FBXLoader, url)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  const { clone, fit } = useMemo(() => {
    const c = SkeletonUtils.clone(fbx) as THREE.Group
    c.traverse(ch => { if ((ch as THREE.Mesh).isMesh) ch.castShadow = true })
    const fit = computeFit(c, targetHeight)
    return { clone: c, fit }
  }, [fbx, targetHeight])

  useEffect(() => {
    const clips = fbx.animations
    if (!clips?.length) return
    // Build a mixer on the clone. Three.js binds by bone name — SkeletonUtils.clone
    // preserves names so the clips from the original FBX bind correctly to the clone.
    const mixer = new THREE.AnimationMixer(clone)
    startAnimation(mixer, clips)
    mixerRef.current = mixer
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
      mixerRef.current = null
    }
  }, [clone, fbx.animations])

  useFrame((_, delta) => { mixerRef.current?.update(delta) })

  return <primitive object={clone} scale={fit.scale} position-y={fit.yOffset} />
}

// ─── Fallback placeholder while model loads ───────────────────────────────────
function LoadingPlaceholder({ targetHeight }: { targetHeight: number }) {
  return (
    <mesh position-y={targetHeight / 2}>
      <boxGeometry args={[0.6, targetHeight, 0.4]} />
      <meshStandardMaterial color="#555" wireframe />
    </mesh>
  )
}

// ─── Animated Humanoid — real GLB with per-frame animation blending ──────────
type AnimState = 'Idle' | 'Walk' | 'Run'

const SKIN_MAT_RE = /skin|head|face|hair/i

interface AnimatedHumanoidProps {
  modelPath: string
  getAnimState: () => AnimState
  targetHeight?: number
  colorTint?: string | null
  skinTone?: string | null
}

function AnimatedHumanoidInner({ modelPath, getAnimState, targetHeight = 1.85, colorTint, skinTone }: AnimatedHumanoidProps) {
  const gltf = useLoader(GLTFLoader, modelPath)
  const groupRef = useRef<THREE.Group>(null!)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({})
  const currentRef = useRef<string>('')
  const getAnimStateRef = useRef(getAnimState)
  useEffect(() => { getAnimStateRef.current = getAnimState }, [getAnimState])

  const { scene, fit } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Object3D
    clone.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      // ── Critical: skinned-mesh bounding spheres are computed from rest-pose
      // bone positions which collapse to world origin, causing the GPU to cull
      // the mesh as "offscreen" even when it's right in front of the camera.
      mesh.frustumCulled = false
      mesh.castShadow = true
      mesh.receiveShadow = true
      // ── Clone materials so we don't mutate the shared GLTF-cache material
      const cloneMat = (m: THREE.Material) => {
        const c2 = m.clone()
        c2.name = m.name
        return c2
      }
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(cloneMat)
      } else if (mesh.material) {
        mesh.material = cloneMat(mesh.material)
      }
      // ── Apply skin-tone / outfit-colour tints
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach(m => {
        if (!m || !('color' in m)) return
        const mat = m as THREE.MeshStandardMaterial
        const isSkin = SKIN_MAT_RE.test(mat.name) || SKIN_MAT_RE.test(mesh.name)
        if (isSkin && skinTone) mat.color.set(skinTone)
        else if (!isSkin && colorTint) mat.color.set(colorTint)
      })
    })
    return { scene: clone, fit: computeFit(clone, targetHeight) }
  }, [gltf.scene, targetHeight, colorTint, skinTone])

  useEffect(() => {
    const clips = gltf.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(scene)
    const actions: Record<string, THREE.AnimationAction> = {}
    for (const clip of clips) actions[clip.name] = mixer.clipAction(clip)
    actionsRef.current = actions
    mixerRef.current = mixer
    const idleKey = Object.keys(actions).find(n => /idle/i.test(n)) ?? Object.keys(actions)[0]
    if (idleKey) { actions[idleKey].play(); currentRef.current = idleKey }
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      mixerRef.current = null
      actionsRef.current = {}
    }
  }, [scene, gltf.animations])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
    const state = getAnimStateRef.current()
    const actions = actionsRef.current
    const desired = state === 'Run'
      ? Object.keys(actions).find(n => /run/i.test(n))
      : state === 'Walk'
        ? Object.keys(actions).find(n => /walk/i.test(n))
        : Object.keys(actions).find(n => /idle/i.test(n))
    const target = desired ?? Object.keys(actions)[0]
    if (target && target !== currentRef.current && actions[target]) {
      const from = actions[currentRef.current]
      if (from) from.fadeOut(0.25)
      actions[target].reset().fadeIn(0.25).play()
      currentRef.current = target
    }
  })

  return (
    <group ref={groupRef} position-y={fit.yOffset}>
      <group rotation-x={fit.counterRotX}>
        <primitive object={scene} scale={fit.scale} />
      </group>
    </group>
  )
}

export function AnimatedHumanoid(props: AnimatedHumanoidProps) {
  return (
    <Suspense fallback={<LoadingPlaceholder targetHeight={props.targetHeight ?? 1.15} />}>
      <AnimatedHumanoidInner {...props} />
    </Suspense>
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────
interface CustomModelProps {
  url: string
  format: string
  // targetHeight: how tall the model should appear in-world (units).
  // For characters use ~1.8, for vehicles ~1.5.  Defaults to 1.8.
  targetHeight?: number
  /** @deprecated use targetHeight instead — kept for lena.fbx compatibility */
  scale?: number
}

export function CustomModel({ url, format, targetHeight = 1.8, scale }: CustomModelProps) {
  // Legacy scale path: lena.fbx uses explicit scale={0.011}
  // We detect this by checking if scale was explicitly passed with a small value
  const useLegacyScale = scale !== undefined && scale < 0.1

  const fmt = format.toLowerCase()

  if (fmt === 'fbx') {
    if (useLegacyScale) {
      // Legacy: use raw scale (lena.fbx is already tuned)
      return (
        <Suspense fallback={<LoadingPlaceholder targetHeight={targetHeight} />}>
          <FBXMeshLegacy url={url} scale={scale!} />
        </Suspense>
      )
    }
    return (
      <Suspense fallback={<LoadingPlaceholder targetHeight={targetHeight} />}>
        <FBXMesh url={url} targetHeight={targetHeight} />
      </Suspense>
    )
  }
  if (fmt === 'glb' || fmt === 'gltf') {
    return (
      <Suspense fallback={<LoadingPlaceholder targetHeight={targetHeight} />}>
        <GLBMesh url={url} targetHeight={targetHeight} />
      </Suspense>
    )
  }
  if (fmt === 'obj') {
    return (
      <Suspense fallback={<LoadingPlaceholder targetHeight={targetHeight} />}>
        <OBJMesh url={url} targetHeight={targetHeight} />
      </Suspense>
    )
  }
  if (fmt === 'ply') {
    return (
      <Suspense fallback={<LoadingPlaceholder targetHeight={targetHeight} />}>
        <PLYMesh url={url} targetHeight={targetHeight} />
      </Suspense>
    )
  }
  return <LoadingPlaceholder targetHeight={targetHeight} />
}

// ─── Legacy FBX with raw scale (for lena.fbx) ────────────────────────────────
function FBXMeshLegacy({ url, scale }: { url: string; scale: number }) {
  const fbx = useLoader(FBXLoader, url)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(fbx) as THREE.Group
    c.traverse(ch => { if ((ch as THREE.Mesh).isMesh) ch.castShadow = true })
    return c
  }, [fbx])

  useEffect(() => {
    const clips = fbx.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(clone)
    startAnimation(mixer, clips)
    mixerRef.current = mixer
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
      mixerRef.current = null
    }
  }, [clone, fbx.animations])

  useFrame((_, delta) => { mixerRef.current?.update(delta) })

  return <primitive object={clone} scale={scale} />
}
