import { Suspense, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as _SkeletonUtilsMod from 'three/examples/jsm/utils/SkeletonUtils.js'

const SkeletonUtils: { clone: (obj: THREE.Object3D) => THREE.Object3D } =
  (_SkeletonUtilsMod as any).SkeletonUtils ??
  (_SkeletonUtilsMod as any).default?.SkeletonUtils ??
  (_SkeletonUtilsMod as any).default ??
  _SkeletonUtilsMod

const SKIN_MAT_RE = /skin|head|face|hair/i

export const CHARACTER_MODEL_PATHS: Record<string, string> = {
  soldier:  '/models/soldier.glb',
  fembot:   '/models/fembot.glb',
  michelle: '/models/michelle.glb',
  xbot:     '/models/xbot.glb',
  robot:    '/models/robot.glb',
}

function computePreviewFit(obj: THREE.Object3D, targetHeight: number) {
  obj.updateMatrixWorld(true)
  let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
  obj.traverse(c => {
    const mesh = c as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    mesh.geometry.computeBoundingBox()
    if (!mesh.geometry.boundingBox) return
    const b = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)
    if (b.min.y < minY) minY = b.min.y
    if (b.max.y > maxY) maxY = b.max.y
    if (b.min.z < minZ) minZ = b.min.z
    if (b.max.z > maxZ) maxZ = b.max.z
  })
  if (!isFinite(minY)) return { scale: 1, yOffset: 0, counterRotX: 0 }
  const sY = maxY - minY
  const sZ = isFinite(minZ) ? maxZ - minZ : 0
  const maxSize = Math.max(sY, sZ)
  if (maxSize < 0.001) return { scale: 1, yOffset: 0, counterRotX: 0 }
  const scale = targetHeight / maxSize
  if (sZ > sY * 2) {
    return { scale, yOffset: -minZ * scale, counterRotX: -Math.PI / 2 }
  }
  return { scale, yOffset: -minY * scale, counterRotX: 0 }
}

// ─── Built-in GLB model mesh ──────────────────────────────────────────────────
interface ModelMeshProps {
  modelId: string
  colorTint: string | null
  skinTone: string | null
}

function ModelMesh({ modelId, colorTint, skinTone }: ModelMeshProps) {
  const path = CHARACTER_MODEL_PATHS[modelId] ?? '/models/soldier.glb'
  const gltf = useLoader(GLTFLoader, path)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const spinRef  = useRef<THREE.Group>(null!)

  const { scene, fit } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Object3D
    clone.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false
      mesh.castShadow = true
      mesh.receiveShadow = true
      const cloneMat = (m: THREE.Material) => { const c2 = m.clone(); c2.name = m.name; return c2 }
      if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(cloneMat)
      else if (mesh.material) mesh.material = cloneMat(mesh.material)
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach(m => {
        if (!m || !('color' in m)) return
        const mat = m as THREE.MeshStandardMaterial
        const isSkin = SKIN_MAT_RE.test(mat.name) || SKIN_MAT_RE.test(mesh.name)
        if (isSkin && skinTone) mat.color.set(skinTone)
        else if (!isSkin && colorTint) mat.color.set(colorTint)
      })
    })
    return { scene: clone, fit: computePreviewFit(clone, 1.85) }
  }, [gltf.scene, colorTint, skinTone])

  useEffect(() => {
    const clips = gltf.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(scene)
    const idleClip =
      clips.find(c => /idle/i.test(c.name)) ??
      clips.find(c => /walk/i.test(c.name)) ??
      clips[0]
    mixer.clipAction(idleClip).reset().setLoop(THREE.LoopRepeat, Infinity).play()
    mixerRef.current = mixer
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      mixerRef.current = null
    }
  }, [scene, gltf.animations])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.65
  })

  return (
    <group ref={spinRef} position={[0, fit.yOffset, 0]}>
      <group rotation-x={fit.counterRotX}>
        <primitive object={scene} scale={fit.scale} />
      </group>
    </group>
  )
}

// ─── Custom GLB model preview ─────────────────────────────────────────────────
function CustomGLBMesh({ url }: { url: string }) {
  const gltf      = useLoader(GLTFLoader, url)
  const mixerRef  = useRef<THREE.AnimationMixer | null>(null)
  const spinRef   = useRef<THREE.Group>(null!)

  const { scene, fit } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Object3D
    clone.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false
      mesh.castShadow = true
    })
    return { scene: clone, fit: computePreviewFit(clone, 1.85) }
  }, [gltf.scene])

  useEffect(() => {
    const clips = gltf.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(scene)
    const clip = clips.find(c => /idle/i.test(c.name)) ?? clips[0]
    mixer.clipAction(clip).reset().setLoop(THREE.LoopRepeat, Infinity).play()
    mixerRef.current = mixer
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(scene); mixerRef.current = null }
  }, [scene, gltf.animations])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.65
  })

  return (
    <group ref={spinRef} position={[0, fit.yOffset, 0]}>
      <group rotation-x={fit.counterRotX}>
        <primitive object={scene} scale={fit.scale} />
      </group>
    </group>
  )
}

// ─── Custom FBX model preview ─────────────────────────────────────────────────
function CustomFBXMesh({ url }: { url: string }) {
  const fbx      = useLoader(FBXLoader, url)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const spinRef  = useRef<THREE.Group>(null!)

  const { clone, fit } = useMemo(() => {
    const c = SkeletonUtils.clone(fbx) as THREE.Group
    c.traverse(ch => {
      const mesh = ch as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false
      mesh.castShadow = true
    })
    return { clone: c, fit: computePreviewFit(c, 1.85) }
  }, [fbx])

  useEffect(() => {
    const clips = fbx.animations
    if (!clips?.length) return
    const mixer = new THREE.AnimationMixer(clone)
    const clip = clips.find(c => /idle/i.test(c.name)) ?? clips[0]
    mixer.clipAction(clip).reset().setLoop(THREE.LoopRepeat, Infinity).play()
    mixerRef.current = mixer
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(clone); mixerRef.current = null }
  }, [clone, fbx.animations])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.65
  })

  return (
    <group ref={spinRef} position={[0, fit.yOffset, 0]}>
      <group rotation-x={fit.counterRotX}>
        <primitive object={clone} scale={fit.scale} />
      </group>
    </group>
  )
}

// ─── Loader fallback ──────────────────────────────────────────────────────────
function SpinningBox() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.8 })
  return (
    <mesh ref={ref} position={[0, 0.9, 0]}>
      <boxGeometry args={[0.45, 1.7, 0.28]} />
      <meshStandardMaterial color="#223344" wireframe />
    </mesh>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CharacterPreview3DProps {
  modelId: string
  colorTint?: string | null
  skinTone?: string | null
  width?: number
  height?: number
  accentColor?: string
  customUrl?: string
  customFormat?: string
}

export default function CharacterPreview3D({
  modelId,
  colorTint = null,
  skinTone = null,
  width = 170,
  height = 220,
  accentColor = '#ff6600',
  customUrl,
  customFormat,
}: CharacterPreview3DProps) {
  const isCustom  = (modelId === 'custom' || modelId.startsWith('custom_')) && !!customUrl
  const isFbx     = (customFormat ?? '').toLowerCase() === 'fbx'

  return (
    <div style={{
      width, height,
      borderRadius: 12,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 80%, rgba(20,30,50,1) 0%, rgba(6,6,15,1) 100%)',
      border: `1px solid ${accentColor}33`,
      boxShadow: `0 0 24px ${accentColor}22, inset 0 0 30px rgba(0,0,0,0.5)`,
      position: 'relative',
    }}>
      <Canvas
        camera={{ position: [0, 0.95, 3.2], fov: 38 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 6, 4]}  intensity={1.4} castShadow color="#fff8ee" />
        <directionalLight position={[-3, 4, -2]} intensity={0.5} color="#4466cc" />
        <directionalLight position={[0, -1, 2]}  intensity={0.15} color="#ff6600" />

        <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
          <circleGeometry args={[1.1, 48]} />
          <meshStandardMaterial color="#111827" roughness={0.9} metalness={0.1} />
        </mesh>

        <Suspense fallback={<SpinningBox />}>
          {isCustom
            ? isFbx
              ? <CustomFBXMesh url={customUrl!} />
              : <CustomGLBMesh url={customUrl!} />
            : <ModelMesh modelId={modelId} colorTint={colorTint} skinTone={skinTone} />
          }
        </Suspense>
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 40,
        background: `linear-gradient(to top, rgba(6,6,15,0.85), transparent)`,
        pointerEvents: 'none',
      }} />
    </div>
  )
}
