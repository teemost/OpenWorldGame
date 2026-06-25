import { Suspense, useEffect, useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Compute bounding box and return scale + y-offset to fit targetHeight, grounded at y=0
function computeFit(obj: THREE.Object3D, targetHeight: number): { scale: number; yOffset: number } {
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3()
  box.getSize(size)
  const modelHeight = size.y
  if (modelHeight < 0.001) return { scale: 1, yOffset: 0 }
  const scale = targetHeight / modelHeight
  // After scaling, bottom of model should be at y=0
  const scaledBottom = box.min.y * scale
  const yOffset = -scaledBottom
  return { scale, yOffset }
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
