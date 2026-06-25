import { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

// Each loader format needs its own component because useLoader must be at component top level
function GLBMesh({ url, scale }: { url: string; scale: number }) {
  const gltf = useLoader(GLTFLoader, url)
  const scene = gltf.scene.clone()
  scene.traverse(c => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })
  return <primitive object={scene} scale={scale} />
}

function OBJMesh({ url, scale }: { url: string; scale: number }) {
  const obj = useLoader(OBJLoader, url)
  const clone = obj.clone()
  clone.traverse(c => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true
  })
  return <primitive object={clone} scale={scale} />
}

function PLYMesh({ url, scale }: { url: string; scale: number }) {
  const geo = useLoader(PLYLoader, url)
  geo.computeVertexNormals()
  return (
    <mesh geometry={geo} scale={scale} castShadow>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

function FBXMesh({ url, scale }: { url: string; scale: number }) {
  const fbx = useLoader(FBXLoader, url)
  const clone = fbx.clone(true)
  clone.traverse(c => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true
  })
  return <primitive object={clone} scale={scale} />
}

// Fallback placeholder while model is loading
function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.6, 1.8, 0.4]} />
      <meshStandardMaterial color="#555" wireframe />
    </mesh>
  )
}

interface CustomModelProps {
  url: string
  format: string
  scale?: number
}

export function CustomModel({ url, format, scale = 1 }: CustomModelProps) {
  const fmt = format.toLowerCase()

  if (fmt === 'glb' || fmt === 'gltf') {
    return (
      <Suspense fallback={<LoadingPlaceholder />}>
        <GLBMesh url={url} scale={scale} />
      </Suspense>
    )
  }
  if (fmt === 'obj') {
    return (
      <Suspense fallback={<LoadingPlaceholder />}>
        <OBJMesh url={url} scale={scale} />
      </Suspense>
    )
  }
  if (fmt === 'ply') {
    return (
      <Suspense fallback={<LoadingPlaceholder />}>
        <PLYMesh url={url} scale={scale} />
      </Suspense>
    )
  }
  if (fmt === 'fbx') {
    return (
      <Suspense fallback={<LoadingPlaceholder />}>
        <FBXMesh url={url} scale={scale} />
      </Suspense>
    )
  }
  return <LoadingPlaceholder />
}
