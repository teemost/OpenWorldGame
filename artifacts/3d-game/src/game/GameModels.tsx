import { Suspense, useEffect, useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js'

// ─── GLB / GLTF ───────────────────────────────────────────────────────────────
function GLBMesh({ url, scale }: { url: string; scale: number }) {
  const gltf = useLoader(GLTFLoader, url)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // SkeletonUtils.clone properly rebinds skinned mesh bone references
  const scene = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Object3D
    clone.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true
        c.receiveShadow = true
      }
    })
    return clone
  }, [gltf.scene])

  useEffect(() => {
    if (!gltf.animations?.length) return
    const mixer = new THREE.AnimationMixer(scene)
    const clips = gltf.animations
    // Prefer walk/idle/run by name, fall back to first clip
    const clip = clips.find(c => /walk|idle|run/i.test(c.name)) ?? clips[0]
    mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play()
    mixerRef.current = mixer
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      mixerRef.current = null
    }
  }, [scene, gltf.animations])

  useFrame((_, delta) => { mixerRef.current?.update(delta) })

  return <primitive object={scene} scale={scale} />
}

// ─── OBJ ──────────────────────────────────────────────────────────────────────
function OBJMesh({ url, scale }: { url: string; scale: number }) {
  const obj = useLoader(OBJLoader, url)
  const clone = useMemo(() => {
    const c = obj.clone()
    c.traverse(ch => { if ((ch as THREE.Mesh).isMesh) ch.castShadow = true })
    return c
  }, [obj])
  return <primitive object={clone} scale={scale} />
}

// ─── PLY ──────────────────────────────────────────────────────────────────────
function PLYMesh({ url, scale }: { url: string; scale: number }) {
  const geo = useLoader(PLYLoader, url)
  const geoCopy = useMemo(() => { const g = geo.clone(); g.computeVertexNormals(); return g }, [geo])
  return (
    <mesh geometry={geoCopy} scale={scale} castShadow>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─── FBX ──────────────────────────────────────────────────────────────────────
function FBXMesh({ url, scale }: { url: string; scale: number }) {
  const fbx = useLoader(FBXLoader, url)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // SkeletonUtils.clone rebinds skeleton bone references in the new hierarchy
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(fbx) as THREE.Group
    c.traverse(ch => { if ((ch as THREE.Mesh).isMesh) ch.castShadow = true })
    return c
  }, [fbx])

  useEffect(() => {
    const clips = fbx.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(clone)
    // Prefer walk/run/idle/take clip by name — Mixamo exports are often named "mixamo.com"
    const clip =
      clips.find(c => /walk/i.test(c.name)) ??
      clips.find(c => /idle/i.test(c.name)) ??
      clips.find(c => /run/i.test(c.name)) ??
      clips[0]
    mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play()
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

// ─── Fallback placeholder while model loads ───────────────────────────────────
function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.6, 1.8, 0.4]} />
      <meshStandardMaterial color="#555" wireframe />
    </mesh>
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────
interface CustomModelProps {
  url: string
  format: string
  scale?: number
}

export function CustomModel({ url, format, scale = 1 }: CustomModelProps) {
  const fmt = format.toLowerCase()
  if (fmt === 'glb' || fmt === 'gltf') {
    return <Suspense fallback={<LoadingPlaceholder />}><GLBMesh url={url} scale={scale} /></Suspense>
  }
  if (fmt === 'obj') {
    return <Suspense fallback={<LoadingPlaceholder />}><OBJMesh url={url} scale={scale} /></Suspense>
  }
  if (fmt === 'ply') {
    return <Suspense fallback={<LoadingPlaceholder />}><PLYMesh url={url} scale={scale} /></Suspense>
  }
  if (fmt === 'fbx') {
    return <Suspense fallback={<LoadingPlaceholder />}><FBXMesh url={url} scale={scale} /></Suspense>
  }
  return <LoadingPlaceholder />
}
