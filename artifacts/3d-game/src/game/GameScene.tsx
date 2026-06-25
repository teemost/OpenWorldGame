import { useRef, useState, useCallback, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls, Html, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useAuthStore } from '../auth/useAuthStore'
import { useModelStore, modelBlobURLs } from '../store/useModelStore'
import { CustomModel, AnimatedHumanoid, VehicleGLBMesh } from './GameModels'
import {
  CITY_BUILDINGS,
  INITIAL_VEHICLES,
  INITIAL_NPCS,
  isInsideBuilding,
  resolveCollision,
} from './cityData'
import { touchState } from './touchState'

export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  shoot = 'shoot',
  enter = 'enter',
  run = 'run',
}

// ─── Module-level shared state ────────────────────────────────────────────────
const sharedPlayerPos = new THREE.Vector3(0, 0.9, 0)
const sharedPlayerRot = { value: 0 }
const sharedInVehicle = { value: false }
const sharedVehicleId = { value: '' }
const sharedWantedLevel = { value: 0 }
const sharedCamYaw   = { value: Math.PI }   // camera starts behind player
const sharedCamPitch = { value: 0.25 }
const playerAnimState   = { value: 'Idle' as 'Idle' | 'Walk' | 'Run' | 'Sit' }
const playerDisplayRot  = { value: Math.PI } // smoothed display rotation

// ─── NPC / Police names ───────────────────────────────────────────────────────
const NPC_MALE_NAMES   = ['Marcus','Luis','Devon','Rico','Andre','Jerome','Bobby','Darius','Tank','Malik','Trevor','Slice','Ricky','Cleo','Ray']
const NPC_FEMALE_NAMES = ['Tanya','Carla','Keisha','Mia','Priya','Lena','Yolanda','Sandra','Nina','Donna','Eva','Brenda','Jasmine','Cece','Rosa']
const NPC_NAMES = [
  'Marcus','Luis','Tanya','Devon','Carla','Rico','Keisha','Andre',
  'Mia','Jerome','Priya','Bobby','Lena','Darius','Yolanda','Tank',
  'Cleo','Malik','Sandra','Trevor','Nina','Slice','Donna','Ricky','Eva',
]
const POLICE_SURNAMES = ['Rogers','Chen','Williams','Torres','Davis','Park','Martin','Stone']

interface VehicleRef {
  pos: THREE.Vector3; rot: number; speed: number
  color: string; occupied: boolean; mesh: THREE.Group | null
}
interface NPCRef {
  pos: THREE.Vector3; dir: number; health: number
  state: 'idle' | 'walking' | 'fleeing' | 'panicking' | 'dead'
  moveTimer: number; speed: number; mesh: THREE.Group | null
  panicTimer: number
}
interface PoliceRef {
  pos: THREE.Vector3; dir: number; health: number
  shootTimer: number; mesh: THREE.Group | null; formation: number
}
interface BulletRef {
  id: string; pos: THREE.Vector3; dir: THREE.Vector3
  age: number; owner: 'player' | 'police'; mesh: THREE.Mesh | null
}

const vehicleRefs = new Map<string, VehicleRef>()
const npcRefs     = new Map<string, NPCRef>()
const policeRefs  = new Map<string, PoliceRef>()
let   bulletRefs: BulletRef[] = []

INITIAL_VEHICLES.forEach(v => vehicleRefs.set(v.id, {
  pos: new THREE.Vector3(v.x, 0, v.z), rot: v.rot,
  speed: 0, color: v.color, occupied: false, mesh: null,
}))
INITIAL_NPCS.forEach((n, i) => npcRefs.set(n.id, {
  pos: new THREE.Vector3(n.x, 0.8, n.z),
  dir: (i * 0.7) % (Math.PI * 2), health: 100,
  state: 'walking', moveTimer: 0, speed: n.speed,
  mesh: null, panicTimer: 0,
}))

// ─── Enhanced City ─────────────────────────────────────────────────────────────
const TREE_MODELS = ['/models/tree.glb', '/models/pine_tree.glb', '/models/palm_tree.glb']
function Tree({ x, z }: { x: number; z: number }) {
  const idx = Math.floor(Math.abs(Math.sin(x * 17.3 + z * 11.7)) * 3)
  return (
    <group position={[x, 0, z]}>
      <CustomModel url={TREE_MODELS[idx]} format="glb" targetHeight={5.5} />
    </group>
  )
}

function StreetBench({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.45]} />
        <meshStandardMaterial color="#7a5a3a" />
      </mesh>
      <mesh position={[0, 0.7, -0.18]}>
        <boxGeometry args={[1.6, 0.5, 0.08]} />
        <meshStandardMaterial color="#7a5a3a" />
      </mesh>
      {[-0.65, 0.65].map((ox, i) => (
        <mesh key={i} position={[ox, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.45]} />
          <meshStandardMaterial color="#5a3a1a" />
        </mesh>
      ))}
    </group>
  )
}

// ─── Procedural canvas textures ───────────────────────────────────────────────
function mkTex(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  rX = 1, rY = 1
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rX, rY)
  t.needsUpdate = true
  return t
}

// Deterministic pseudo-random (avoids non-reproducible Math.random in loops)
const _r = (n: number) => Math.abs(Math.sin(n * 127.1 + 311.7))

const ROAD_TEX = mkTex(1024, (ctx, s) => {
  ctx.fillStyle = '#171717'; ctx.fillRect(0, 0, s, s)
  // Fine aggregate
  for (let i = 0; i < 22000; i++) {
    const x = _r(i)*s, y = _r(i+0.3)*s, v = Math.floor(20 + _r(i+0.6)*50)
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(x, y, 1+_r(i+1)*1.5, 1+_r(i+1.3)*1.5)
  }
  // Coarser aggregate stones
  for (let i = 0; i < 4000; i++) {
    const x = _r(i+100)*s, y = _r(i+100.3)*s, r = 1.5+_r(i+100.5)*3.5
    const v = Math.floor(28 + _r(i+100.8)*40)
    ctx.fillStyle = `rgba(${v},${v},${v+3},0.65)`
    ctx.beginPath()
    ctx.ellipse(x, y, r, r*0.55, _r(i+101)*Math.PI, 0, Math.PI*2)
    ctx.fill()
  }
  // Wear/oil stains
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.06+_r(i+5)*0.2})`
    ctx.beginPath()
    ctx.ellipse(_r(i+5)*s, _r(i+5.3)*s, 5+_r(i+5.6)*15, 2+_r(i+5.9)*8, _r(i+6)*Math.PI, 0, Math.PI*2)
    ctx.fill()
  }
  // Tyre tracks
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.12+_r(i+80)*0.15})`
    ctx.lineWidth = 2+_r(i+80.5)*4
    ctx.beginPath(); ctx.moveTo(_r(i+80.2)*s, 0); ctx.lineTo((_r(i+80.2)+_r(i+80.4)*0.1)*s, s)
    ctx.stroke()
  }
  // Surface cracks
  for (let i = 0; i < 50; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.25+_r(i+70)*0.35})`
    ctx.lineWidth = 0.6
    ctx.beginPath()
    let cx = _r(i+70)*s, cy = _r(i+70.3)*s
    ctx.moveTo(cx, cy)
    for (let j = 0; j < 5; j++) {
      cx += (_r(i+70.5+j*0.3)*30) - 15; cy += (_r(i+70.8+j*0.3)*30) - 15
      ctx.lineTo(cx, cy)
    }
    ctx.stroke()
  }
}, 3, 60)

const SWALK_TEX = mkTex(256, (ctx, s) => {
  ctx.fillStyle = '#a09080'; ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#78706a'; ctx.lineWidth = 3
  for (let i = 0; i <= s; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke()
  }
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(0,0,0,${_r(i+10)*0.09})`
    ctx.fillRect(_r(i+10.2)*s, _r(i+10.5)*s, 1, 1)
  }
}, 1, 30)

const GROUND_GRASS_TEX = mkTex(512, (ctx, s) => {
  ctx.fillStyle = '#1f3a0c'; ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 5000; i++) {
    const x = _r(i+20)*s, y = _r(i+20.3)*s
    ctx.fillStyle = `hsl(${92+_r(i+20.6)*26},${44+_r(i+20.9)*24}%,${15+_r(i+21)*19}%)`
    ctx.fillRect(x, y, 1, 2+_r(i+21.3)*4)
  }
}, 55, 55)

const PARK_GRASS_TEX = mkTex(512, (ctx, s) => {
  ctx.fillStyle = '#254e0d'; ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 4500; i++) {
    const x = _r(i+30)*s, y = _r(i+30.3)*s
    ctx.fillStyle = `hsl(${100+_r(i+30.6)*28},${48+_r(i+30.9)*22}%,${19+_r(i+31)*18}%)`
    ctx.fillRect(x, y, 1, 2+_r(i+31.3)*5)
  }
}, 6, 6)

const BRICK_TEX = mkTex(512, (ctx, s) => {
  ctx.fillStyle = '#4a2a14'; ctx.fillRect(0, 0, s, s)
  const bw = 52, bh = 20
  for (let row = 0; row <= Math.ceil(s/bh)+1; row++) {
    const offset = (row % 2) * (bw/2)
    for (let col = -1; col <= s/bw+2; col++) {
      const seed = row * 31 + col * 17
      const r = 130 + Math.floor(_r(seed)*35)
      const g = 52 + Math.floor(_r(seed+0.3)*20)
      ctx.fillStyle = `rgb(${r},${g},38)`
      ctx.fillRect(col*bw+offset+2, row*bh+2, bw-4, bh-4)
      ctx.fillStyle = `rgba(0,0,0,${0.04+_r(seed+0.7)*0.1})`
      ctx.fillRect(col*bw+offset+2, row*bh+2, bw-4, bh-4)
    }
  }
}, 2, 7)

const CONCRETE_TEX = mkTex(512, (ctx, s) => {
  ctx.fillStyle = '#8a8272'; ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${_r(i+40)*0.12})`
    ctx.fillRect(_r(i+40.2)*s, _r(i+40.5)*s, 1+_r(i+40.8), 1)
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5
  for (let i = 0; i < s; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke()
  }
}, 2, 5)

const BARK_TEX = mkTex(256, (ctx, s) => {
  ctx.fillStyle = '#261408'; ctx.fillRect(0, 0, s, s)
  let x = 0
  let seed = 0
  while (x < s) {
    const w = 3 + Math.floor(_r(seed)*6)
    ctx.fillStyle = `hsl(22,${50+_r(seed+0.2)*25}%,${13+_r(seed+0.5)*24}%)`
    ctx.fillRect(x, 0, w, s)
    x += w + 1 + Math.floor(_r(seed+0.8)*4)
    seed++
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${_r(i+50)*0.28})`
    ctx.fillRect(_r(i+50.2)*s, _r(i+50.5)*s, 1, 1+_r(i+50.8)*4)
  }
}, 2, 3)

const LEAF_TEX = mkTex(512, (ctx, s) => {
  ctx.fillStyle = '#153a0f'; ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 2200; i++) {
    const x = _r(i+60)*s, y = _r(i+60.2)*s
    ctx.fillStyle = `hsl(${100+_r(i+60.4)*36},${38+_r(i+60.6)*28}%,${16+_r(i+60.8)*25}%)`
    ctx.beginPath()
    ctx.ellipse(x, y, 4+_r(i+61)*7, 3+_r(i+61.2)*5, _r(i+61.4)*Math.PI, 0, Math.PI*2)
    ctx.fill()
  }
}, 4, 4)

// Shared realistic materials (defined once, reused across meshes)
const ROAD_MAT    = <meshStandardMaterial map={ROAD_TEX} color="#282828" roughness={0.96} metalness={0.04}/>
const SIDEWALK_MAT= <meshStandardMaterial map={SWALK_TEX} color="#8a8070" roughness={0.92} metalness={0.0}/>
const GRASS_MAT   = <meshStandardMaterial map={GROUND_GRASS_TEX} color="#2e5c16" roughness={0.97} metalness={0.0}/>
const PARK_MAT    = <meshStandardMaterial map={PARK_GRASS_TEX} color="#3b6e1a" roughness={0.96} metalness={0.0}/>
const LAMP_MAT    = <meshStandardMaterial color="#7a8090" roughness={0.5} metalness={0.7}/>

function City() {
  return (
    <group>
      {/* Base ground — dark earth/grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        {GRASS_MAT}
      </mesh>
      {/* Park grass zones — slightly brighter */}
      {[[-60,-60],[60,-60],[-60,60],[60,60]].map(([px,pz],i)=>(
        <mesh key={`park${i}`} rotation={[-Math.PI/2,0,0]} position={[px,-0.01,pz]} receiveShadow>
          <planeGeometry args={[26,26]} />
          {PARK_MAT}
        </mesh>
      ))}
      {/* Road tarmac - vertical */}
      {[-80,-40,0,40,80].map(x=>(
        <mesh key={`vr${x}`} rotation={[-Math.PI/2,0,0]} position={[x,0,0]} receiveShadow>
          <planeGeometry args={[13,300]} />
          {ROAD_MAT}
        </mesh>
      ))}
      {/* Road tarmac - horizontal */}
      {[-80,-40,0,40,80].map(z=>(
        <mesh key={`hr${z}`} rotation={[-Math.PI/2,0,0]} position={[0,0.001,z]} receiveShadow>
          <planeGeometry args={[300,13]} />
          {ROAD_MAT}
        </mesh>
      ))}
      {/* Center lane lines V */}
      {[-80,-40,0,40,80].map(x=>(
        <mesh key={`cl${x}`} rotation={[-Math.PI/2,0,0]} position={[x,0.003,0]}>
          <planeGeometry args={[0.22,300]} />
          <meshStandardMaterial color="#f0d020" roughness={0.85}/>
        </mesh>
      ))}
      {/* Center lane lines H */}
      {[-80,-40,0,40,80].map(z=>(
        <mesh key={`clh${z}`} rotation={[-Math.PI/2,0,0]} position={[0,0.003,z]}>
          <planeGeometry args={[300,0.22]} />
          <meshStandardMaterial color="#f0d020" roughness={0.85}/>
        </mesh>
      ))}
      {/* Sidewalks V — raised concrete curb */}
      {[-80,-40,0,40,80].map(x=>[-1,1].map(s=>(
        <mesh key={`swv${x}${s}`} rotation={[-Math.PI/2,0,0]} position={[x+s*8.5,0.02,0]} receiveShadow>
          <planeGeometry args={[3,300]} />
          {SIDEWALK_MAT}
        </mesh>
      )))}
      {/* Sidewalks H */}
      {[-80,-40,0,40,80].map(z=>[-1,1].map(s=>(
        <mesh key={`swh${z}${s}`} rotation={[-Math.PI/2,0,0]} position={[0,0.025,z+s*8.5]} receiveShadow>
          <planeGeometry args={[300,3]} />
          {SIDEWALK_MAT}
        </mesh>
      )))}
      {/* Buildings */}
      {CITY_BUILDINGS.map(b=>{
        const isGlass  = b.height > 35
        const isBrick  = b.height < 18
        const wallCol  = b.color
        const roofCol  = '#1a1a1a'
        return (
          <group key={b.id} position={[b.x,0,b.z]}>
            {/* Main facade */}
            <mesh position={[0,b.height/2,0]} castShadow receiveShadow>
              <boxGeometry args={[b.width,b.height,b.depth]} />
              <meshStandardMaterial
                map={isBrick ? BRICK_TEX : isGlass ? undefined : CONCRETE_TEX}
                color={wallCol}
                roughness={isBrick ? 0.91 : isGlass ? 0.07 : 0.74}
                metalness={isGlass ? 0.55 : isBrick ? 0.0 : 0.08}
              />
            </mesh>
            {/* Roof parapet */}
            <mesh position={[0,b.height+0.3,0]}>
              <boxGeometry args={[b.width+0.5,0.6,b.depth+0.5]} />
              <meshStandardMaterial color={roofCol} roughness={0.95}/>
            </mesh>
            {/* Rooftop AC/vent boxes */}
            {b.height > 15 && [-0.8,0.8].map((ox,ri) => (
              <mesh key={ri} position={[ox*b.width*0.25, b.height+0.75, 0]}>
                <boxGeometry args={[1.2,0.9,1.2]}/>
                <meshStandardMaterial color="#555" roughness={0.85}/>
              </mesh>
            ))}
            {/* Antenna */}
            {b.height>30&&(
              <mesh position={[0,b.height+2.2,0]}>
                <cylinderGeometry args={[0.05,0.07,4.5,5]}/>
                <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3}/>
              </mesh>
            )}
            {/* Window strips — front */}
            {b.height>15&&Array.from({length:Math.floor(b.height/5)},(_,i)=>(
              <mesh key={i} position={[0,3.5+i*5,b.depth/2+0.04]}>
                <planeGeometry args={[b.width-1.5,2.4]}/>
                <meshStandardMaterial
                  color="#7ab8e8"
                  emissive="#0a2255"
                  emissiveIntensity={isGlass ? 0.25 : 0.5}
                  roughness={0.05}
                  metalness={0.15}
                />
              </mesh>
            ))}
            {/* Window strips — side */}
            {b.height>15&&Array.from({length:Math.floor(b.height/5)},(_,i)=>(
              <mesh key={`sw${i}`} position={[b.width/2+0.04,3.5+i*5,0]}>
                <planeGeometry args={[b.depth-1.5,2.4]}/>
                <meshStandardMaterial
                  color="#7ab8e8"
                  emissive="#0a2255"
                  emissiveIntensity={0.4}
                  roughness={0.05}
                  metalness={0.15}
                />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* Street lamps — metal pole + warm bulb */}
      {[-80,-40,0,40,80].map(x=>[-60,-20,20,60].map(z=>(
        <group key={`lamp${x}${z}`} position={[x+7.5,0,z]}>
          {/* Pole */}
          <mesh position={[0,3.2,0]} castShadow>
            <cylinderGeometry args={[0.07,0.13,6.4,8]}/>
            {LAMP_MAT}
          </mesh>
          {/* Arm */}
          <mesh position={[0.55,6.0,0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.04,0.04,1.1,6]}/>
            {LAMP_MAT}
          </mesh>
          {/* Housing */}
          <mesh position={[1.05,5.9,0]}>
            <boxGeometry args={[0.55,0.25,0.3]}/>
            <meshStandardMaterial color="#555" roughness={0.6} metalness={0.5}/>
          </mesh>
          {/* Bulb glow */}
          <mesh position={[1.05,5.75,0]}>
            <sphereGeometry args={[0.18,8,6]}/>
            <meshStandardMaterial color="#ffe8aa" emissive="#ffdd66" emissiveIntensity={4}/>
          </mesh>
          {/* Actual point light — illuminates the street below at night */}
          <pointLight position={[1.05,5.5,0]} color="#ffdd88" intensity={20} distance={22} decay={2} castShadow={false}/>
        </group>
      )))}
      {/* Park trees */}
      {[[-60,-60],[60,-60],[-60,60],[60,60]].map(([px,pz],pi)=>
        [[-8,-8],[-8,8],[8,-8],[8,8],[0,0],[-8,0],[8,0],[0,-8],[0,8]].map(([tx,tz],ti)=>(
          <Tree key={`tree${pi}_${ti}`} x={px+tx} z={pz+tz}/>
        ))
      )}
      {/* Street benches */}
      {[-60,-20,20,60].map(z=>(
        <StreetBench key={`bench1_${z}`} x={-83} z={z}/>
      ))}
      {/* GLB Buildings — outer city ring (CC0, poly.pizza/Quaternius) */}
      {([
        { url:'/models/building_b.glb', x:-112, z:-60, rot:0,            h:20 },
        { url:'/models/building_c.glb', x:-112, z:  0, rot:0,            h:15 },
        { url:'/models/building_f.glb', x:-112, z: 60, rot:0,            h:18 },
        { url:'/models/building_b.glb', x: 112, z:-60, rot:Math.PI,      h:20 },
        { url:'/models/building_f.glb', x: 112, z:  0, rot:Math.PI,      h:16 },
        { url:'/models/building_c.glb', x: 112, z: 60, rot:Math.PI,      h:18 },
        { url:'/models/building_c.glb', x:-60,  z:-112,rot: Math.PI/2,   h:14 },
        { url:'/models/building_f.glb', x:  0,  z:-112,rot: Math.PI/2,   h:17 },
        { url:'/models/building_b.glb', x: 60,  z:-112,rot: Math.PI/2,   h:22 },
        { url:'/models/building_f.glb', x:-60,  z: 112,rot:-Math.PI/2,   h:18 },
        { url:'/models/building_b.glb', x:  0,  z: 112,rot:-Math.PI/2,   h:20 },
        { url:'/models/building_c.glb', x: 60,  z: 112,rot:-Math.PI/2,   h:14 },
      ] as const).map((b,i)=>(
        <group key={`glbB${i}`} position={[b.x, 0, b.z]} rotation-y={b.rot}>
          <CustomModel url={b.url} format="glb" targetHeight={b.h} />
        </group>
      ))}
    </group>
  )
}

// ─── Realistic Vehicle Geometry ───────────────────────────────────────────────
type VehicleStyle = 'sedan' | 'suv' | 'sports' | 'luxury'
const VEHICLE_STYLES: VehicleStyle[] = ['sedan', 'suv', 'sports', 'luxury']

const VEHICLE_GLB: Record<VehicleStyle, string> = {
  sedan:  '/models/sedan.glb',
  suv:    '/models/suv.glb',
  sports: '/models/sports.glb',
  luxury: '/models/taxi.glb',
}

function Wheel({ x, y, z, r = 0.38 }: { x:number; y:number; z:number; r?:number }) {
  return (
    <group position={[x, y, z]}>
      {/* Tyre */}
      <mesh rotation={[0,0,Math.PI/2]} castShadow>
        <cylinderGeometry args={[r, r, 0.26, 20]}/>
        <meshStandardMaterial color="#111" roughness={0.95} metalness={0}/>
      </mesh>
      {/* Rim */}
      <mesh rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[r*0.62, r*0.62, 0.28, 12]}/>
        <meshStandardMaterial color="#c8c8c8" metalness={0.9} roughness={0.12}/>
      </mesh>
      {/* Hub cap */}
      <mesh position={[x > 0 ? 0.14 : -0.14, 0, 0]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[r*0.22, r*0.22, 0.04, 8]}/>
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2}/>
      </mesh>
      {/* Brake disc glow */}
      <mesh rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[r*0.38, r*0.38, 0.3, 10]}/>
        <meshStandardMaterial color="#444" roughness={0.7} metalness={0.4}/>
      </mesh>
    </group>
  )
}

function Windshield({ px=0, py=0, pz=0, rx=0, w=1.6, h=0.62, opacity=0.42 }:
  { px?:number; py?:number; pz?:number; rx?:number; w?:number; h?:number; opacity?:number }) {
  return (
    <mesh position={[px, py, pz]} rotation={[rx, 0, 0]}>
      <boxGeometry args={[w, h, 0.04]}/>
      <meshStandardMaterial color="#99ccff" transparent opacity={opacity} roughness={0.04} metalness={0.1} envMapIntensity={2}/>
    </mesh>
  )
}

function RealisticSedan({ c }: { c: string }) {
  return (
    <group>
      {/* Floor pan */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[1.88, 0.14, 4.55]}/>
        <meshStandardMaterial color="#1a1a1a" roughness={0.9}/>
      </mesh>
      {/* Lower body sill */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.94, 0.42, 4.5]}/>
        <meshStandardMaterial color={c} roughness={0.18} metalness={0.72}/>
      </mesh>
      {/* Door panel sculpt */}
      <mesh position={[0, 0.62, -0.1]} castShadow>
        <boxGeometry args={[1.98, 0.28, 4.0]}/>
        <meshStandardMaterial color={c} roughness={0.15} metalness={0.78}/>
      </mesh>
      {/* Upper cabin */}
      <mesh position={[0, 1.05, -0.18]} castShadow>
        <boxGeometry args={[1.76, 0.5, 2.5]}/>
        <meshStandardMaterial color={c} roughness={0.16} metalness={0.75}/>
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.31, -0.28]} castShadow>
        <boxGeometry args={[1.74, 0.1, 2.3]}/>
        <meshStandardMaterial color={c} roughness={0.14} metalness={0.8}/>
      </mesh>
      {/* Hood long */}
      <mesh position={[0, 0.72, 1.48]} rotation={[-0.06, 0, 0]} castShadow>
        <boxGeometry args={[1.82, 0.09, 1.65]}/>
        <meshStandardMaterial color={c} roughness={0.16} metalness={0.78}/>
      </mesh>
      {/* Hood front slope */}
      <mesh position={[0, 0.62, 2.16]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[1.82, 0.09, 0.55]}/>
        <meshStandardMaterial color={c} roughness={0.16} metalness={0.78}/>
      </mesh>
      {/* Trunk lid */}
      <mesh position={[0, 0.82, -1.82]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[1.76, 0.09, 1.1]}/>
        <meshStandardMaterial color={c} roughness={0.16} metalness={0.78}/>
      </mesh>
      {/* Front bumper */}
      <mesh position={[0, 0.3, 2.34]}>
        <boxGeometry args={[1.86, 0.32, 0.22]}/>
        <meshStandardMaterial color="#222" roughness={0.8} metalness={0.2}/>
      </mesh>
      {/* Front lower diffuser */}
      <mesh position={[0, 0.14, 2.38]}>
        <boxGeometry args={[1.6, 0.12, 0.14]}/>
        <meshStandardMaterial color="#111" roughness={0.9}/>
      </mesh>
      {/* Grille kidney (BMW style) */}
      {[-0.3, 0.3].map((gx, i) => (
        <mesh key={i} position={[gx, 0.52, 2.36]}>
          <boxGeometry args={[0.3, 0.2, 0.08]}/>
          <meshStandardMaterial color="#181818" roughness={0.5} metalness={0.6}/>
        </mesh>
      ))}
      {/* Rear bumper */}
      <mesh position={[0, 0.3, -2.32]}>
        <boxGeometry args={[1.86, 0.3, 0.22]}/>
        <meshStandardMaterial color="#222" roughness={0.8} metalness={0.2}/>
      </mesh>
      {/* Exhaust tips */}
      {[-0.52, 0.52].map((ex, i) => (
        <mesh key={i} position={[ex, 0.2, -2.37]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.12, 8]}/>
          <meshStandardMaterial color="#777" metalness={0.85} roughness={0.15}/>
        </mesh>
      ))}
      {/* Windshield front */}
      <Windshield px={0} py={1.04} pz={0.92} rx={-0.48} w={1.62} h={0.58}/>
      {/* Rear window */}
      <Windshield px={0} py={1.02} pz={-1.44} rx={0.38} w={1.6} h={0.5} opacity={0.38}/>
      {/* Side windows */}
      {[-0.9, 0.9].map((wx, i) => (
        <mesh key={i} position={[wx, 1.08, -0.2]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[2.1, 0.38, 0.03]}/>
          <meshStandardMaterial color="#88aadd" transparent opacity={0.38} roughness={0.04} metalness={0.1}/>
        </mesh>
      ))}
      {/* LED headlights */}
      {[[-0.58, 0.62, 2.38], [0.58, 0.62, 2.38]].map(([hx, hy, hz], i) => (
        <group key={i} position={[hx, hy, hz]}>
          <mesh><boxGeometry args={[0.42, 0.12, 0.05]}/><meshStandardMaterial color="#fff8f0" emissive="#ffffff" emissiveIntensity={3.5}/></mesh>
          <mesh position={[0, -0.1, 0]}><boxGeometry args={[0.38, 0.05, 0.05]}/><meshStandardMaterial color="#ccddff" emissive="#aabbff" emissiveIntensity={2}/></mesh>
        </group>
      ))}
      {/* LED taillights strip */}
      {[[-0.55, 0.58, -2.29], [0.55, 0.58, -2.29]].map(([tx, ty, tz], i) => (
        <group key={i} position={[tx, ty, tz]}>
          <mesh><boxGeometry args={[0.38, 0.1, 0.04]}/><meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={4}/></mesh>
          <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.32, 0.04, 0.04]}/><meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={2}/></mesh>
        </group>
      ))}
      {/* Side mirrors */}
      {[-1.0, 1.0].map((mx, i) => (
        <mesh key={i} position={[mx, 0.95, 0.72]}>
          <boxGeometry args={[0.07, 0.1, 0.2]}/>
          <meshStandardMaterial color={c} roughness={0.2} metalness={0.7}/>
        </mesh>
      ))}
      {/* A-pillar trim */}
      {[-0.86, 0.86].map((ax, i) => (
        <mesh key={i} position={[ax, 0.88, 0.7]} rotation={[0.48, 0, 0]}>
          <boxGeometry args={[0.06, 0.5, 0.06]}/>
          <meshStandardMaterial color="#111" roughness={0.7}/>
        </mesh>
      ))}
      {/* Wheels */}
      <Wheel x={-1.0} y={0.38} z={1.52}/>
      <Wheel x={ 1.0} y={0.38} z={1.52}/>
      <Wheel x={-1.0} y={0.38} z={-1.52}/>
      <Wheel x={ 1.0} y={0.38} z={-1.52}/>
    </group>
  )
}

function RealisticSUV({ c }: { c: string }) {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[2.0, 0.16, 4.5]}/>
        <meshStandardMaterial color="#1a1a1a" roughness={0.9}/>
      </mesh>
      {/* Lower body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.06, 0.5, 4.45]}/>
        <meshStandardMaterial color={c} roughness={0.2} metalness={0.68}/>
      </mesh>
      {/* Upper body */}
      <mesh position={[0, 0.98, -0.05]} castShadow>
        <boxGeometry args={[2.02, 0.55, 4.3]}/>
        <meshStandardMaterial color={c} roughness={0.18} metalness={0.72}/>
      </mesh>
      {/* Tall cabin */}
      <mesh position={[0, 1.48, -0.1]} castShadow>
        <boxGeometry args={[1.96, 0.68, 3.5]}/>
        <meshStandardMaterial color={c} roughness={0.17} metalness={0.74}/>
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.85, -0.1]} castShadow>
        <boxGeometry args={[1.94, 0.1, 3.45]}/>
        <meshStandardMaterial color={c} roughness={0.16} metalness={0.76}/>
      </mesh>
      {/* Roof rails */}
      {[-0.88, 0.88].map((rx, i) => (
        <mesh key={i} position={[rx, 1.93, -0.1]}>
          <boxGeometry args={[0.06, 0.07, 3.0]}/>
          <meshStandardMaterial color="#333" roughness={0.6} metalness={0.7}/>
        </mesh>
      ))}
      {/* Large front grille (Mercedes-style) */}
      <mesh position={[0, 0.62, 2.28]}>
        <boxGeometry args={[1.65, 0.38, 0.1]}/>
        <meshStandardMaterial color="#111" roughness={0.4} metalness={0.7}/>
      </mesh>
      <mesh position={[0, 0.62, 2.34]}>
        <boxGeometry args={[1.5, 0.28, 0.05]}/>
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8}/>
      </mesh>
      {/* Horizontal grille bars */}
      {[-0.1, 0, 0.1].map((gy, i) => (
        <mesh key={i} position={[0, 0.62 + gy, 2.36]}>
          <boxGeometry args={[1.48, 0.025, 0.04]}/>
          <meshStandardMaterial color="#555" metalness={0.9} roughness={0.1}/>
        </mesh>
      ))}
      {/* Front bumper */}
      <mesh position={[0, 0.32, 2.3]}>
        <boxGeometry args={[2.0, 0.36, 0.24]}/>
        <meshStandardMaterial color="#222" roughness={0.8}/>
      </mesh>
      {/* Skid plate */}
      <mesh position={[0, 0.14, 2.35]}>
        <boxGeometry args={[1.7, 0.14, 0.16]}/>
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.6}/>
      </mesh>
      {/* Rear bumper */}
      <mesh position={[0, 0.32, -2.3]}>
        <boxGeometry args={[2.0, 0.34, 0.22]}/>
        <meshStandardMaterial color="#222" roughness={0.8}/>
      </mesh>
      {/* Windshield front */}
      <Windshield px={0} py={1.46} pz={1.12} rx={-0.38} w={1.78} h={0.65}/>
      {/* Rear glass */}
      <Windshield px={0} py={1.44} pz={-1.82} rx={0.28} w={1.72} h={0.6} opacity={0.38}/>
      {/* Side windows */}
      {[-0.98, 0.98].map((wx, i) => (
        <mesh key={i} position={[wx, 1.5, -0.18]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[2.8, 0.58, 0.03]}/>
          <meshStandardMaterial color="#88aacc" transparent opacity={0.38} roughness={0.04} metalness={0.1}/>
        </mesh>
      ))}
      {/* LED headlights (wide DRL) */}
      {[[-0.7, 0.95, 2.28], [0.7, 0.95, 2.28]].map(([hx, hy, hz], i) => (
        <group key={i} position={[hx, hy, hz]}>
          <mesh><boxGeometry args={[0.5, 0.1, 0.06]}/><meshStandardMaterial color="#fff8f0" emissive="#ffffff" emissiveIntensity={3}/></mesh>
          <mesh position={[0, -0.12, 0]}><boxGeometry args={[0.42, 0.04, 0.06]}/><meshStandardMaterial color="#ccddff" emissive="#aabbff" emissiveIntensity={2.5}/></mesh>
        </group>
      ))}
      {/* Taillights */}
      {[[-0.65, 1.0, -2.28], [0.65, 1.0, -2.28]].map(([tx, ty, tz], i) => (
        <mesh key={i} position={[tx, ty, tz]}>
          <boxGeometry args={[0.5, 0.22, 0.06]}/>
          <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={4}/>
        </mesh>
      ))}
      {/* Running boards */}
      {[-1.05, 1.05].map((sx, i) => (
        <mesh key={i} position={[sx, 0.3, 0]}>
          <boxGeometry args={[0.08, 0.06, 3.6]}/>
          <meshStandardMaterial color="#2a2a2a" roughness={0.9}/>
        </mesh>
      ))}
      {/* Side mirrors */}
      {[-1.05, 1.05].map((mx, i) => (
        <mesh key={i} position={[mx, 1.38, 0.96]}>
          <boxGeometry args={[0.08, 0.14, 0.24]}/>
          <meshStandardMaterial color={c} roughness={0.2} metalness={0.7}/>
        </mesh>
      ))}
      {/* Wheels (larger for SUV) */}
      <Wheel x={-1.06} y={0.46} z={1.55} r={0.46}/>
      <Wheel x={ 1.06} y={0.46} z={1.55} r={0.46}/>
      <Wheel x={-1.06} y={0.46} z={-1.55} r={0.46}/>
      <Wheel x={ 1.06} y={0.46} z={-1.55} r={0.46}/>
    </group>
  )
}

function RealisticSports({ c }: { c: string }) {
  return (
    <group>
      {/* Low floor */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[1.9, 0.12, 4.7]}/>
        <meshStandardMaterial color="#1a1a1a" roughness={0.9}/>
      </mesh>
      {/* Wide body */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[2.0, 0.38, 4.65]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Body crease / character line */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[2.02, 0.28, 4.6]}/>
        <meshStandardMaterial color={c} roughness={0.1} metalness={0.85}/>
      </mesh>
      {/* Low cabin */}
      <mesh position={[0, 0.9, -0.08]} castShadow>
        <boxGeometry args={[1.88, 0.44, 2.6]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Panoramic glass roof */}
      <mesh position={[0, 1.14, -0.08]}>
        <boxGeometry args={[1.5, 0.06, 2.2]}/>
        <meshStandardMaterial color="#1a2a3a" transparent opacity={0.7} roughness={0.04} metalness={0.2}/>
      </mesh>
      {/* Fastback roofline */}
      <mesh position={[0, 0.98, -1.38]} rotation={[0.28, 0, 0]} castShadow>
        <boxGeometry args={[1.84, 0.07, 1.2]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Sloped nose (Tesla-style) */}
      <mesh position={[0, 0.5, 2.22]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[1.92, 0.22, 0.7]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Closed grille (EV-style front fascia) */}
      <mesh position={[0, 0.5, 2.38]}>
        <boxGeometry args={[1.78, 0.28, 0.1]}/>
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.8}/>
      </mesh>
      {/* Front bumper lip */}
      <mesh position={[0, 0.22, 2.4]}>
        <boxGeometry args={[1.86, 0.18, 0.16]}/>
        <meshStandardMaterial color="#222" roughness={0.7}/>
      </mesh>
      {/* Rear diffuser */}
      <mesh position={[0, 0.2, -2.4]}>
        <boxGeometry args={[1.78, 0.18, 0.18]}/>
        <meshStandardMaterial color="#111" roughness={0.5} metalness={0.5}/>
      </mesh>
      {/* Rear spoiler */}
      <mesh position={[0, 1.0, -2.1]}>
        <boxGeometry args={[1.6, 0.06, 0.3]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Full-width LED front bar */}
      <mesh position={[0, 0.7, 2.4]}>
        <boxGeometry args={[1.7, 0.06, 0.05]}/>
        <meshStandardMaterial color="#ccddff" emissive="#aabbff" emissiveIntensity={3}/>
      </mesh>
      {/* Headlight clusters */}
      {[[-0.62, 0.68, 2.38], [0.62, 0.68, 2.38]].map(([hx, hy, hz], i) => (
        <mesh key={i} position={[hx, hy, hz]}>
          <boxGeometry args={[0.46, 0.14, 0.06]}/>
          <meshStandardMaterial color="#fff8f0" emissive="#ffffff" emissiveIntensity={4}/>
        </mesh>
      ))}
      {/* Full-width tail light bar */}
      <mesh position={[0, 0.65, -2.38]}>
        <boxGeometry args={[1.8, 0.08, 0.05]}/>
        <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={5}/>
      </mesh>
      {/* Windshield */}
      <Windshield px={0} py={0.98} pz={0.88} rx={-0.52} w={1.7} h={0.55} opacity={0.4}/>
      {/* Rear glass */}
      <Windshield px={0} py={0.9} pz={-1.55} rx={0.42} w={1.6} h={0.42} opacity={0.36}/>
      {/* Side windows (low) */}
      {[-0.96, 0.96].map((wx, i) => (
        <mesh key={i} position={[wx, 0.96, -0.1]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[2.0, 0.32, 0.03]}/>
          <meshStandardMaterial color="#88aadd" transparent opacity={0.38} roughness={0.04}/>
        </mesh>
      ))}
      {/* Flush door handles */}
      {[-0.98, 0.98].map((hx, i) => (
        <mesh key={i} position={[hx, 0.78, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.22]}/>
          <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.1}/>
        </mesh>
      ))}
      {/* Side mirrors (sleek) */}
      {[-0.98, 0.98].map((mx, i) => (
        <mesh key={i} position={[mx, 0.88, 0.88]}>
          <boxGeometry args={[0.06, 0.09, 0.18]}/>
          <meshStandardMaterial color="#111" roughness={0.3} metalness={0.7}/>
        </mesh>
      ))}
      {/* Sport wheels */}
      <Wheel x={-1.02} y={0.35} z={1.56} r={0.36}/>
      <Wheel x={ 1.02} y={0.35} z={1.56} r={0.36}/>
      <Wheel x={-1.02} y={0.35} z={-1.56} r={0.36}/>
      <Wheel x={ 1.02} y={0.35} z={-1.56} r={0.36}/>
    </group>
  )
}

function RealisticLuxury({ c }: { c: string }) {
  return (
    <group>
      {/* Long wheelbase floor */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[1.92, 0.13, 5.0]}/>
        <meshStandardMaterial color="#1a1a1a" roughness={0.9}/>
      </mesh>
      {/* Main body */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[1.98, 0.46, 4.95]}/>
        <meshStandardMaterial color={c} roughness={0.14} metalness={0.8}/>
      </mesh>
      {/* Body crease */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[2.0, 0.25, 4.9]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.06, -0.28]} castShadow>
        <boxGeometry args={[1.82, 0.52, 2.6]}/>
        <meshStandardMaterial color={c} roughness={0.13} metalness={0.8}/>
      </mesh>
      {/* Long elegant roof */}
      <mesh position={[0, 1.33, -0.32]} castShadow>
        <boxGeometry args={[1.8, 0.1, 2.5]}/>
        <meshStandardMaterial color={c} roughness={0.12} metalness={0.82}/>
      </mesh>
      {/* Long hood */}
      <mesh position={[0, 0.7, 1.62]} rotation={[-0.04, 0, 0]} castShadow>
        <boxGeometry args={[1.86, 0.08, 1.95]}/>
        <meshStandardMaterial color={c} roughness={0.13} metalness={0.82}/>
      </mesh>
      {/* Hood ornament mount */}
      <mesh position={[0, 0.76, 2.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.14, 6]}/>
        <meshStandardMaterial color="#ddd" metalness={0.95} roughness={0.05}/>
      </mesh>
      {/* Long trunk */}
      <mesh position={[0, 0.8, -2.0]} rotation={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[1.82, 0.08, 1.2]}/>
        <meshStandardMaterial color={c} roughness={0.13} metalness={0.82}/>
      </mesh>
      {/* Chrome front grille surround */}
      <mesh position={[0, 0.54, 2.52]}>
        <boxGeometry args={[1.4, 0.36, 0.12]}/>
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.85}/>
      </mesh>
      <mesh position={[0, 0.54, 2.56]}>
        <boxGeometry args={[1.36, 0.32, 0.06]}/>
        <meshStandardMaterial color="#222" roughness={0.2} metalness={0.9}/>
      </mesh>
      {/* Chrome grille bars */}
      {[-0.12, 0, 0.12].map((gy, i) => (
        <mesh key={i} position={[0, 0.54 + gy, 2.58]}>
          <boxGeometry args={[1.32, 0.02, 0.04]}/>
          <meshStandardMaterial color="#c8c8c8" metalness={0.95} roughness={0.05}/>
        </mesh>
      ))}
      {/* Front bumper */}
      <mesh position={[0, 0.3, 2.54]}>
        <boxGeometry args={[1.92, 0.32, 0.22]}/>
        <meshStandardMaterial color="#222" roughness={0.8}/>
      </mesh>
      {/* Chrome bumper trim */}
      <mesh position={[0, 0.38, 2.56]}>
        <boxGeometry args={[1.9, 0.06, 0.08]}/>
        <meshStandardMaterial color="#c8c8c8" metalness={0.9} roughness={0.1}/>
      </mesh>
      {/* Rear bumper */}
      <mesh position={[0, 0.3, -2.54]}>
        <boxGeometry args={[1.92, 0.32, 0.22]}/>
        <meshStandardMaterial color="#222" roughness={0.8}/>
      </mesh>
      {/* Exhaust quad tips */}
      {[-0.6, -0.4, 0.4, 0.6].map((ex, i) => (
        <mesh key={i} position={[ex, 0.2, -2.58]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 8]}/>
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1}/>
        </mesh>
      ))}
      {/* Elegant LED headlights */}
      {[[-0.6, 0.62, 2.56], [0.6, 0.62, 2.56]].map(([hx, hy, hz], i) => (
        <group key={i} position={[hx, hy, hz]}>
          <mesh><boxGeometry args={[0.46, 0.1, 0.06]}/><meshStandardMaterial color="#fff8f0" emissive="#ffffff" emissiveIntensity={3.5}/></mesh>
          <mesh position={[0, -0.09, 0]}><boxGeometry args={[0.36, 0.04, 0.06]}/><meshStandardMaterial color="#ccddff" emissive="#aabbff" emissiveIntensity={2.5}/></mesh>
          <mesh position={[hx>0?0.18:-0.18, 0.02, 0]}><boxGeometry args={[0.1, 0.06, 0.06]}/><meshStandardMaterial color="#ccddff" emissive="#aabbff" emissiveIntensity={2}/></mesh>
        </group>
      ))}
      {/* Rear LED taillights */}
      {[[-0.58, 0.6, -2.56], [0.58, 0.6, -2.56]].map(([tx, ty, tz], i) => (
        <group key={i} position={[tx, ty, tz]}>
          <mesh><boxGeometry args={[0.44, 0.14, 0.05]}/><meshStandardMaterial color="#ff1a00" emissive="#ff1a00" emissiveIntensity={5}/></mesh>
          <mesh position={[0, -0.1, 0]}><boxGeometry args={[0.36, 0.05, 0.05]}/><meshStandardMaterial color="#ff8800" emissive="#ff6600" emissiveIntensity={2.5}/></mesh>
        </group>
      ))}
      {/* Windshield */}
      <Windshield px={0} py={1.06} pz={0.94} rx={-0.46} w={1.66} h={0.56}/>
      {/* Rear window */}
      <Windshield px={0} py={1.04} pz={-1.56} rx={0.36} w={1.62} h={0.5} opacity={0.38}/>
      {/* Side windows */}
      {[-0.93, 0.93].map((wx, i) => (
        <mesh key={i} position={[wx, 1.1, -0.25]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[2.2, 0.38, 0.03]}/>
          <meshStandardMaterial color="#88aadd" transparent opacity={0.38} roughness={0.04}/>
        </mesh>
      ))}
      {/* Chrome window trim */}
      {[-0.94, 0.94].map((wx, i) => (
        <mesh key={i} position={[wx, 1.1, -0.25]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[2.24, 0.42, 0.015]}/>
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} transparent opacity={0.6}/>
        </mesh>
      ))}
      {/* Side mirrors */}
      {[-1.02, 1.02].map((mx, i) => (
        <mesh key={i} position={[mx, 1.0, 0.88]}>
          <boxGeometry args={[0.07, 0.12, 0.22]}/>
          <meshStandardMaterial color={c} roughness={0.18} metalness={0.75}/>
        </mesh>
      ))}
      {/* Luxury wheels */}
      <Wheel x={-1.02} y={0.38} z={1.65} r={0.4}/>
      <Wheel x={ 1.02} y={0.38} z={1.65} r={0.4}/>
      <Wheel x={-1.02} y={0.38} z={-1.65} r={0.4}/>
      <Wheel x={ 1.02} y={0.38} z={-1.65} r={0.4}/>
    </group>
  )
}

function Vehicle({ vehicleId }: { vehicleId: string }) {
  const groupRef = useRef<THREE.Group>(null!)
  const vRef = vehicleRefs.get(vehicleId)!
  const { modelRevision } = useModelStore()
  const vehicleModel = modelBlobURLs.get('vehicle')
  const style = VEHICLE_STYLES[parseInt(vehicleId.replace('v','')) % 4]

  useEffect(() => { vRef.mesh = groupRef.current; return () => { vRef.mesh = null } }, [vRef])
  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(vRef.pos.x, 0, vRef.pos.z)
    groupRef.current.rotation.y = vRef.rot
  })

  void modelRevision

  if (vehicleModel) {
    return (
      <group ref={groupRef}>
        <CustomModel url={vehicleModel.url} format={vehicleModel.format} targetHeight={1.5} />
      </group>
    )
  }

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        <VehicleGLBMesh url={VEHICLE_GLB[style]} targetHeight={1.5} />
      </Suspense>
    </group>
  )
}

// ─── Enhanced NPC ─────────────────────────────────────────────────────────────
function NPC({ npcId, npcIndex }: { npcId: string; npcIndex: number }) {
  const groupRef = useRef<THREE.Group>(null!)
  const nRef = npcRefs.get(npcId)!
  const npcData = INITIAL_NPCS.find(n => n.id === npcId)
  const isFemale = npcData?.gender === 'female'
  const npcName = isFemale
    ? NPC_FEMALE_NAMES[npcIndex % NPC_FEMALE_NAMES.length]
    : NPC_MALE_NAMES[npcIndex % NPC_MALE_NAMES.length]
  const npcColor = npcData?.color ?? '#888'
  const { modelRevision } = useModelStore()
  const npcModel = modelBlobURLs.get('npc')
  void modelRevision

  useEffect(() => { nRef.mesh = groupRef.current; return () => { nRef.mesh = null } }, [nRef])

  useFrame((_, delta) => {
    if (!groupRef.current || nRef.state === 'dead') {
      if (groupRef.current) groupRef.current.visible = false
      return
    }
    nRef.moveTimer  += delta
    nRef.panicTimer  = Math.max(0, nRef.panicTimer - delta)
    const dist = nRef.pos.distanceTo(sharedPlayerPos)

    // ── Distance culling: skip + hide beyond fog range ────────────────────
    if (dist > 105) { groupRef.current.visible = false; return }
    groupRef.current.visible = true

    // ── Fast path for distant NPCs: simple wander, skip expensive AI ──────
    if (dist > 72) {
      if (nRef.moveTimer > 3.0) {
        nRef.moveTimer = 0
        nRef.dir += (npcId.charCodeAt(3) % 7 - 3) * 0.5
      }
      nRef.pos.x = Math.max(-108, Math.min(108, nRef.pos.x + Math.sin(nRef.dir) * nRef.speed * delta))
      nRef.pos.z = Math.max(-108, Math.min(108, nRef.pos.z + Math.cos(nRef.dir) * nRef.speed * delta))
      groupRef.current.position.set(nRef.pos.x, 0, nRef.pos.z)
      groupRef.current.rotation.y = nRef.dir
      return
    }

    // ── Full AI state machine (nearby NPCs only) ──────────────────────────
    if (sharedWantedLevel.value >= 3) {
      nRef.state = 'panicking'
      nRef.panicTimer = 5
    } else if (dist < 20 && sharedWantedLevel.value > 0) {
      nRef.state = 'fleeing'
    } else if (nRef.panicTimer > 0) {
      nRef.state = 'panicking'
    } else if (dist < 18 && sharedWantedLevel.value === 0) {
      if (nRef.state === 'fleeing') nRef.state = 'walking'
    } else if (dist > 40) {
      nRef.state = 'walking'
    }

    // Propagate panic to nearby NPCs (throttled: only when moveTimer resets)
    if ((nRef.state === 'panicking' || nRef.state === 'fleeing') && nRef.moveTimer < delta * 2) {
      for (const [, other] of npcRefs) {
        if (other !== nRef && other.state === 'walking' && other.pos.distanceTo(nRef.pos) < 12) {
          other.state = 'panicking'
          other.panicTimer = 3 + Math.random() * 2
        }
      }
    }

    const speedMult = nRef.state === 'panicking' ? 3.2 : nRef.state === 'fleeing' ? 2.5 : 1
    const speed = nRef.speed * speedMult

    if (nRef.state === 'fleeing' || nRef.state === 'panicking') {
      const awayX = nRef.pos.x - sharedPlayerPos.x
      const awayZ = nRef.pos.z - sharedPlayerPos.z
      nRef.dir = Math.atan2(awayX, awayZ)
    } else {
      if (nRef.moveTimer > 2.5) {
        nRef.moveTimer = 0
        nRef.dir += (npcId.charCodeAt(3) % 7 - 3) * 0.6 + (Date.now() % 100) * 0.001
      }
    }

    const nx = Math.max(-108, Math.min(108, nRef.pos.x + Math.sin(nRef.dir) * speed * delta))
    const nz = Math.max(-108, Math.min(108, nRef.pos.z + Math.cos(nRef.dir) * speed * delta))
    if (!isInsideBuilding(nx, nz, 0.4)) { nRef.pos.x = nx; nRef.pos.z = nz }
    else nRef.dir += Math.PI * 0.5

    groupRef.current.position.set(nRef.pos.x, 0, nRef.pos.z)
    groupRef.current.rotation.y = nRef.dir
  })

  // Varied clothing per NPC
  const shirtColor = npcColor
  const pantsColor = `hsl(${(npcIndex * 47) % 360},40%,25%)`
  const skinTones = ['#ddb080','#c8956c','#a0724a','#7a4a28','#f0c090']
  const skin = skinTones[npcIndex % skinTones.length]

  // Only show name tag if within 30 units of player (performance: Html overlays are expensive)
  const distNow = nRef.pos.distanceTo(sharedPlayerPos)
  const npcTag = distNow < 30 ? (
    <Html position={[0, 2.6, 0]} center distanceFactor={10} occlude>
      <div style={{
        color: '#fff', fontSize: 11, fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.65)', padding: '2px 7px',
        borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.15)',
      }}>{npcName}</div>
    </Html>
  ) : null

  if (npcModel) {
    return (
      <group ref={groupRef} position={[nRef.pos.x, 0, nRef.pos.z]}>
        {npcTag}
        <CustomModel url={npcModel.url} format={npcModel.format} targetHeight={1.15} />
      </group>
    )
  }

  return (
    <group ref={groupRef} position={[nRef.pos.x, 0, nRef.pos.z]}>
      {npcTag}
      <AnimatedHumanoid
        modelPath={isFemale ? '/models/fembot.glb' : '/models/soldier.glb'}
        getAnimState={() => {
          const s = nRef.state
          if (s === 'panicking' || s === 'fleeing') return 'Run' as const
          if (s === 'walking') return 'Walk' as const
          return 'Idle' as const
        }}
        targetHeight={1.15}
        disableAnimation
      />
    </group>
  )
}

// ─── Enhanced Police Unit ────────────────────────────────────────────────────
function PoliceUnit({ policeId, policeIndex, onShootPlayer }: {
  policeId: string; policeIndex: number; onShootPlayer: () => void
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const pRef = policeRefs.get(policeId)!
  const surname = POLICE_SURNAMES[policeIndex % POLICE_SURNAMES.length]
  const { modelRevision } = useModelStore()
  void modelRevision

  useEffect(() => { pRef.mesh = groupRef.current; return () => { pRef.mesh = null } }, [pRef])

  useFrame((_, delta) => {
    if (!groupRef.current || pRef.health <= 0) {
      if (groupRef.current) groupRef.current.visible = false
      return
    }
    pRef.shootTimer += delta
    const dist = pRef.pos.distanceTo(sharedPlayerPos)
    const toPlayer = sharedPlayerPos.clone().sub(pRef.pos).normalize()
    pRef.dir = Math.atan2(toPlayer.x, toPlayer.z)

    const wantedLvl = sharedWantedLevel.value
    const chaseSpeed = 4.5 + wantedLvl * 0.8

    if (dist > 5) {
      // Formation logic at high wanted: flank player
      if (wantedLvl >= 3 && pRef.formation !== undefined) {
        const formAngle = pRef.formation * (Math.PI * 2 / 4)
        const flankedX = sharedPlayerPos.x + Math.cos(formAngle) * 8
        const flankedZ = sharedPlayerPos.z + Math.sin(formAngle) * 8
        const toFlank = new THREE.Vector2(flankedX - pRef.pos.x, flankedZ - pRef.pos.z).normalize()
        const nx = pRef.pos.x + toFlank.x * chaseSpeed * delta
        const nz = pRef.pos.z + toFlank.y * chaseSpeed * delta
        if (!isInsideBuilding(nx, nz, 0.6)) { pRef.pos.x = nx; pRef.pos.z = nz }
      } else {
        const nx = pRef.pos.x + toPlayer.x * chaseSpeed * delta
        const nz = pRef.pos.z + toPlayer.z * chaseSpeed * delta
        if (!isInsideBuilding(nx, nz, 0.6)) { pRef.pos.x = nx; pRef.pos.z = nz }
      }
    } else if (pRef.shootTimer > Math.max(0.6, 1.8 - wantedLvl * 0.2)) {
      pRef.shootTimer = 0
      onShootPlayer()
    }

    groupRef.current.position.set(pRef.pos.x, 0, pRef.pos.z)
    groupRef.current.rotation.y = pRef.dir
    groupRef.current.visible = true
  })

  const isSwat = sharedWantedLevel.value >= 4
  const uniformColor = isSwat ? '#111' : '#1e3a88'
  const hatColor = isSwat ? '#000' : '#0a1a66'
  const policeModel = isSwat ? modelBlobURLs.get('swat') : modelBlobURLs.get('police')

  // Only show police tag when close (Html overlays are GPU-expensive)
  const policeDistNow = pRef.pos.distanceTo(sharedPlayerPos)
  const policeTag = policeDistNow < 28 ? (
    <Html position={[0, 2.6, 0]} center distanceFactor={10} occlude>
      <div style={{
        color: '#aaddff', fontSize: 11, fontFamily: 'monospace',
        background: 'rgba(0,20,60,0.75)', padding: '2px 7px',
        borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none',
        border: '1px solid rgba(100,150,255,0.35)',
      }}>
        {isSwat ? `SWAT ${surname}` : `Ofc. ${surname}`}
      </div>
    </Html>
  ) : null

  if (policeModel) {
    return (
      <group ref={groupRef} position={[pRef.pos.x, 0, pRef.pos.z]}>
        {policeTag}
        <CustomModel url={policeModel.url} format={policeModel.format} targetHeight={1.15} />
      </group>
    )
  }

  return (
    <group ref={groupRef} position={[pRef.pos.x, 0, pRef.pos.z]}>
      {policeTag}
      <AnimatedHumanoid
        modelPath='/models/soldier.glb'
        getAnimState={() => {
          const dist = pRef.pos.distanceTo(sharedPlayerPos)
          return dist > 5 ? 'Run' as const : 'Idle' as const
        }}
        targetHeight={1.15}
      />
    </group>
  )
}

// ─── Bullet ───────────────────────────────────────────────────────────────────
function Bullet({ bullet, onExpire, onHitNPC, onHitPolice }: {
  bullet: BulletRef; onExpire: (id: string) => void
  onHitNPC: (id: string) => void; onHitPolice: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  useEffect(() => { bullet.mesh = meshRef.current; return () => { bullet.mesh = null } }, [bullet])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    bullet.age += delta
    if (bullet.age > 2.5) { onExpire(bullet.id); return }
    bullet.pos.addScaledVector(bullet.dir, 48 * delta)
    if (Math.abs(bullet.pos.x) > 125 || Math.abs(bullet.pos.z) > 125) { onExpire(bullet.id); return }
    if (isInsideBuilding(bullet.pos.x, bullet.pos.z, 0.1)) { onExpire(bullet.id); return }

    if (bullet.owner === 'player') {
      for (const [id, npc] of npcRefs) {
        if (npc.state === 'dead') continue
        if (bullet.pos.distanceTo(npc.pos) < 1.2) { onHitNPC(id); onExpire(bullet.id); return }
      }
      for (const [id, p] of policeRefs) {
        if (p.health <= 0) continue
        if (bullet.pos.distanceTo(p.pos) < 1.2) { onHitPolice(id); onExpire(bullet.id); return }
      }
    }
    meshRef.current.position.copy(bullet.pos)
  })

  return (
    <mesh ref={meshRef} position={[bullet.pos.x, bullet.pos.y, bullet.pos.z]}>
      <sphereGeometry args={[bullet.owner==='player'?0.13:0.1, 6, 6]}/>
      <meshStandardMaterial
        color={bullet.owner==='player'?'#ffff00':'#ff4444'}
        emissive={bullet.owner==='player'?'#ffaa00':'#ff0000'}
        emissiveIntensity={2.5}
      />
    </mesh>
  )
}

// ─── Enhanced Player ──────────────────────────────────────────────────────────
function Player({ onShoot }: { onShoot: (pos: THREE.Vector3, dir: THREE.Vector3) => void }) {
  const groupRef   = useRef<THREE.Group>(null!)
  const posRef     = useRef(sharedPlayerPos)
  const rotRef     = useRef(sharedPlayerRot)
  const [, getControls] = useKeyboardControls<Controls>()
  const fireCooldown  = useRef(0)
  const enterCooldown = useRef(0)
  const { currentUser } = useAuthStore()
  const playerName  = currentUser?.username ?? 'Player'
  const playerColor = currentUser?.characterColor ?? '#ff6600'
  const isAdmin     = currentUser?.role === 'admin'
  const { modelRevision } = useModelStore()
  const playerModel = modelBlobURLs.get('player')

  void modelRevision // subscribe to model store updates

  const { takeDamage, setInVehicle, useAmmo, incrementWanted, addMoney, addScore } = useGameStore()

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    const kb = getControls()
    const controls = {
      forward: kb.forward || touchState.forward,
      back:    kb.back    || touchState.back,
      shoot:   kb.shoot   || touchState.shoot,
      enter:   kb.enter   || touchState.enter,
      run:     kb.run     || touchState.run,
    }
    fireCooldown.current  = Math.max(0, fireCooldown.current - delta)
    enterCooldown.current = Math.max(0, enterCooldown.current - delta)

    // ── Camera orbit from right-side drag / mouse ────────────────────────
    const CAM_SEN = 0.0038
    if (touchState.camDx !== 0 || touchState.camDy !== 0) {
      sharedCamYaw.value   += touchState.camDx * CAM_SEN
      sharedCamPitch.value  = Math.max(-0.08, Math.min(0.58, sharedCamPitch.value - touchState.camDy * CAM_SEN))
      touchState.camDx = 0
      touchState.camDy = 0
    }

    if (sharedInVehicle.value) {
      // ── In-vehicle ─────────────────────────────────────────────────────
      const vRef = vehicleRefs.get(sharedVehicleId.value)
      if (!vRef) return

      // A/D steers the vehicle on desktop; touch uses vehicleLeft/vehicleRight
      const vLeft  = kb.left  || touchState.vehicleLeft
      const vRight = kb.right || touchState.vehicleRight
      const turnSpd = 1.9 * delta
      if (vLeft)  vRef.rot += turnSpd
      if (vRight) vRef.rot -= turnSpd

      // ── Vehicle camera auto-align (follows vehicle direction) ───────────
      // When the vehicle is moving, smoothly rotate the camera yaw to match
      // the vehicle's facing direction so the car doesn't appear to spin.
      if (Math.abs(vRef.speed) > 0.5) {
        let angleDiff = vRef.rot - sharedCamYaw.value
        while (angleDiff > Math.PI)  angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        sharedCamYaw.value += angleDiff * Math.min(1, 3.5 * delta)
      }

      const accel = controls.run ? 24 : 15
      if (controls.forward)     vRef.speed += accel * delta
      else if (controls.back)   vRef.speed -= accel * delta
      else                      vRef.speed *= 0.88

      vRef.speed = Math.max(-9, Math.min(32, vRef.speed))

      const dx = Math.sin(vRef.rot) * vRef.speed * delta
      const dz = Math.cos(vRef.rot) * vRef.speed * delta
      const nx = Math.max(-108, Math.min(108, vRef.pos.x + dx))
      const nz = Math.max(-108, Math.min(108, vRef.pos.z + dz))
      if (!isInsideBuilding(nx, nz, 1.6)) { vRef.pos.x = nx; vRef.pos.z = nz }
      else vRef.speed *= -0.3

      posRef.current.set(vRef.pos.x, 0.9, vRef.pos.z)
      rotRef.current.value = vRef.rot
      sharedPlayerPos.copy(posRef.current)
      playerAnimState.value = 'Sit'

      if (controls.enter && enterCooldown.current <= 0) {
        enterCooldown.current = 0.5
        vRef.occupied = false; vRef.speed = 0
        sharedInVehicle.value = false; sharedVehicleId.value = ''
        setInVehicle(false)
        posRef.current.x += Math.sin(rotRef.current.value + Math.PI / 2) * 3
        posRef.current.z += Math.cos(rotRef.current.value + Math.PI / 2) * 3
        sharedPlayerPos.copy(posRef.current)
      }
    } else {
      // ── On-foot: A/D orbits camera ──────────────────────────────────────
      if (kb.left)  sharedCamYaw.value -= 1.6 * delta
      if (kb.right) sharedCamYaw.value += 1.6 * delta

      // ── On-foot: camera-relative movement ──────────────────────────────
      const camYaw = sharedCamYaw.value
      const speed  = controls.run ? 9.5 : 5.8

      // Forward = toward where camera is looking (away from camera pos)
      const fwdX = -Math.sin(camYaw)
      const fwdZ = -Math.cos(camYaw)
      // Right strafe
      const strX =  Math.cos(camYaw)
      const strZ = -Math.sin(camYaw)

      let moveX = 0, moveZ = 0
      if (controls.forward)       { moveX += fwdX;       moveZ += fwdZ       }
      if (controls.back)          { moveX -= fwdX * 0.6; moveZ -= fwdZ * 0.6 }
      if (touchState.strafeLeft)  { moveX -= strX;       moveZ -= strZ       }
      if (touchState.strafeRight) { moveX += strX;       moveZ += strZ       }
      playerAnimState.value = (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) ? (controls.run ? 'Run' : 'Walk') : 'Idle'

      let newX = posRef.current.x + moveX * speed * delta
      let newZ = posRef.current.z + moveZ * speed * delta

      // Player faces movement direction (decoupled from camera)
      if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
        rotRef.current.value = Math.atan2(moveX, moveZ) + Math.PI
      }

      newX = Math.max(-108, Math.min(108, newX))
      newZ = Math.max(-108, Math.min(108, newZ))
      const resolved = resolveCollision(posRef.current, newX, newZ, 0.55)
      posRef.current.x = resolved.x
      posRef.current.z = resolved.z
      posRef.current.y = 0
      sharedPlayerPos.copy(posRef.current)

      // Enter vehicle
      if (controls.enter && enterCooldown.current <= 0) {
        enterCooldown.current = 0.5
        for (const [id, vRef] of vehicleRefs) {
          if (!vRef.occupied && posRef.current.distanceTo(vRef.pos) < 4.5) {
            vRef.occupied = true; sharedInVehicle.value = true
            sharedVehicleId.value = id; setInVehicle(true)
            posRef.current.copy(vRef.pos); posRef.current.y = 0.9
            rotRef.current.value = vRef.rot
            sharedPlayerPos.copy(posRef.current); break
          }
        }
      }
    }

    // Shoot (works in both modes) — fires in camera forward direction
    if (controls.shoot && fireCooldown.current <= 0) {
      fireCooldown.current = 0.22
      if (useAmmo()) {
        const cy = sharedCamYaw.value
        const cp = sharedCamPitch.value
        const dir = new THREE.Vector3(
          -Math.sin(cy) * Math.cos(cp),
           Math.sin(cp),
          -Math.cos(cy) * Math.cos(cp)
        ).normalize()
        onShoot(new THREE.Vector3(posRef.current.x, posRef.current.y + 1.3, posRef.current.z), dir)
      }
    }

    // Sync mesh — smooth rotation via angular lerp (avoids snapping)
    {
      const target = rotRef.current.value
      let diff = target - playerDisplayRot.value
      while (diff >  Math.PI) diff -= 2 * Math.PI
      while (diff < -Math.PI) diff += 2 * Math.PI
      playerDisplayRot.value += diff * Math.min(1, 14 * delta)
    }
    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.y = playerDisplayRot.value
    groupRef.current.visible = true

    // ── Orbit camera with collision ───────────────────────────────────────
    const camYaw   = sharedCamYaw.value
    const camPitch = sharedCamPitch.value
    const CAM_DIST   = 1.8
    const CAM_HEIGHT = 1.1

    const safeCam = (ox:number,oy:number,oz:number,dx:number,dy:number,dz:number)=>{
      for (let i=0;i<=12;i++){
        const t=i/12
        const cx=dx+(ox-dx)*t, cz=dz+(oz-dz)*t
        if(!isInsideBuilding(cx,cz,0.3)) return{x:cx,y:dy+(oy-dy)*t,z:cz}
      }
      return{x:ox,y:oy,z:oz}
    }

    if (sharedInVehicle.value) {
      const vRef = vehicleRefs.get(sharedVehicleId.value)
      if (vRef) {
        const tx=vRef.pos.x, ty=0.9, tz=vRef.pos.z
        const c=safeCam(tx,ty+CAM_HEIGHT,tz,
          tx+Math.sin(camYaw)*CAM_DIST,
          ty+CAM_HEIGHT+Math.sin(camPitch)*CAM_DIST*0.5,
          tz+Math.cos(camYaw)*CAM_DIST)
        camera.position.set(c.x,c.y,c.z)
        camera.lookAt(tx,ty+0.8,tz)
      }
    } else {
      const px=posRef.current.x, py=posRef.current.y, pz=posRef.current.z
      const c=safeCam(px,py+CAM_HEIGHT,pz,
        px+Math.sin(camYaw)*CAM_DIST,
        py+CAM_HEIGHT+Math.sin(camPitch)*CAM_DIST*0.5,
        pz+Math.cos(camYaw)*CAM_DIST)
      camera.position.set(c.x,c.y,c.z)
      camera.lookAt(px,py+1.2,pz)
    }
  })

  const skinTone = '#f0b880'
  const nameTag = (
    <Html position={[0,2.8,0]} center distanceFactor={10} occlude>
      <div style={{
        color: isAdmin ? '#FFD700' : '#00ffaa',
        fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold',
        background: isAdmin ? 'rgba(80,50,0,0.8)' : 'rgba(0,40,20,0.8)',
        padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap',
        pointerEvents: 'none',
        border: `1px solid ${isAdmin?'rgba(255,200,0,0.5)':'rgba(0,255,150,0.3)'}`,
      }}>
        {isAdmin ? '👑 ' : ''}{playerName}
      </div>
    </Html>
  )

  if (playerModel) {
    return (
      <group ref={groupRef} position={[sharedPlayerPos.x,sharedPlayerPos.y,sharedPlayerPos.z]}>
        {nameTag}
        <CustomModel url={playerModel.url} format={playerModel.format} scale={1} />
      </group>
    )
  }

  const playerUser = useAuthStore(s => s.currentUser)

  return (
    <group ref={groupRef} position={[sharedPlayerPos.x,sharedPlayerPos.y,sharedPlayerPos.z]}>
      {nameTag}
      <AnimatedHumanoid
        modelPath='/models/soldier.glb'
        getAnimState={() => playerAnimState.value}
        targetHeight={1.85}
        colorTint={playerUser?.characterColor ?? null}
        skinTone={playerUser?.skinTone ?? null}
      />
    </group>
  )
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
function DynamicLighting({ timeOfDay }: { timeOfDay: number }) {
  // Time phases:  Dawn 5-8 | Day 8-17 | Golden 17-19 | Dusk 19-21 | Evening 21-23 | Night 23-5
  const isDawn    = timeOfDay >= 5  && timeOfDay < 8
  const isDay     = timeOfDay >= 8  && timeOfDay < 17
  const isGolden  = timeOfDay >= 17 && timeOfDay < 19
  const isDusk    = timeOfDay >= 19 && timeOfDay < 21
  const isEvening = timeOfDay >= 21 && timeOfDay < 23
  const isNight   = timeOfDay >= 23 || timeOfDay < 5
  const hasSky    = isDawn || isDay || isGolden || isDusk

  // Smooth 0→1 sun arc across the day (peaks at 12:30)
  const t         = Math.max(0, Math.min(1, (timeOfDay - 5) / 15))
  const elevation = Math.sin(t * Math.PI)
  const azimuth   = 0.12 + t * 0.76

  const sunX = Math.cos(azimuth * Math.PI * 2) * 80
  const sunY = elevation * 90 + (isDusk ? 3 : isDawn ? 4 : 8)
  const sunZ = Math.sin(azimuth * Math.PI * 2) * 80

  // Per-phase light parameters
  const dirIntensity = hasSky ? Math.max(0.3, elevation * 7 + (isDawn || isDusk ? 1.5 : 2)) : 0
  const dirColor = isDawn ? '#ffbb66' : isGolden ? '#ffaa44' : isDusk ? '#ff7744' : '#fff8f0'

  const hemiSky    = isDawn ? '#ffc87a' : isGolden ? '#ffbb55' : isDusk ? '#ff9955' :
                     isEvening ? '#1a2a55' : isNight ? '#101830' : '#b8d4ff'
  const hemiGround = hasSky ? '#3a5a1a' : '#0c1808'

  const ambientInt  = isDay ? 2.8 : isGolden ? 2.2 : isDawn ? 1.8 : isDusk ? 1.2 :
                      isEvening ? 1.0 : 1.2   // night is bright enough to play
  const ambientCol  = isEvening || isNight ? '#7090cc' : '#ffffff'

  const fogColor = isDawn    ? '#ffc89a' : isGolden ? '#ffa95a' : isDusk ? '#cc8855' :
                   isEvening ? '#0d1a35' : isNight  ? '#07101e' : '#c6e0f5'
  const fogNear  = isEvening || isNight ? 55 : 75
  const fogFar   = isEvening || isNight ? 170 : 220

  // Night sky gradient (deep blue)
  const nightSkyColor = isEvening ? '#0b1528' : '#06101e'

  return (
    <>
      {/* Sky or night background */}
      {hasSky ? (
        <Sky
          distance={450000}
          sunPosition={[sunX, sunY, sunZ]}
          turbidity={isDawn || isDusk ? 10 : isGolden ? 8 : 3}
          rayleigh={isDawn || isDusk || isGolden ? 5 : 0.8}
          mieCoefficient={isDusk || isGolden ? 0.012 : 0.005}
          mieDirectionalG={0.85}
        />
      ) : (
        <>
          <color attach="background" args={[nightSkyColor]}/>
          {/* Stars simulation via emissive hemisphere fill */}
        </>
      )}

      {/* Ambient fill */}
      <ambientLight intensity={ambientInt} color={ambientCol}/>

      {/* Hemisphere sky/ground */}
      <hemisphereLight
        args={[hemiSky as THREE.ColorRepresentation, hemiGround as THREE.ColorRepresentation,
               hasSky ? 4.5 : (isEvening ? 1.8 : 2.2)]}
      />

      {/* Sun directional light */}
      {hasSky && (
        <directionalLight
          position={[sunX, sunY, sunZ]}
          intensity={dirIntensity}
          color={dirColor}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1} shadow-camera-far={200}
          shadow-camera-left={-90} shadow-camera-right={90}
          shadow-camera-top={90}  shadow-camera-bottom={-90}
          shadow-bias={-0.0005}
        />
      )}

      {/* Moon — cool directional light at night/evening */}
      {(isEvening || isNight) && (
        <directionalLight
          position={[-40, 60, 30]}
          intensity={isNight ? 2.8 : 1.6}
          color="#c8d8f8"
          castShadow={false}
        />
      )}

      {/* City-wide ambient glow at night — warm neon atmosphere */}
      {(isEvening || isNight || isDusk) && <>
        {/* Central city uplight */}
        <pointLight position={[0, 18, 0]}  intensity={isNight?55:35}  color="#ffcc88" distance={220} decay={1.4}/>
        {/* District fills — 4 quadrants */}
        <pointLight position={[-55,-2,-55]} intensity={isNight?38:22}  color="#ff9944" distance={140} decay={1.6}/>
        <pointLight position={[ 55,-2,-55]} intensity={isNight?38:22}  color="#44aaff" distance={140} decay={1.6}/>
        <pointLight position={[-55,-2, 55]} intensity={isNight?38:22}  color="#ff6688" distance={140} decay={1.6}/>
        <pointLight position={[ 55,-2, 55]} intensity={isNight?38:22}  color="#88ff88" distance={140} decay={1.6}/>
        {/* Moonlight fill pools */}
        <pointLight position={[0, 30, 0]}  intensity={isNight?22:10}   color="#c8d8ff" distance={280} decay={1.0}/>
        <pointLight position={[0,  5, 0]}  intensity={isNight?12:6}    color="#aaccff" distance={120} decay={1.8}/>
        {/* Distant glow columns */}
        <pointLight position={[-80,10,-80]} intensity={isNight?20:10}  color="#ffaa55" distance={100} decay={2}/>
        <pointLight position={[ 80,10, 80]} intensity={isNight?20:10}  color="#55aaff" distance={100} decay={2}/>
        <pointLight position={[-80,10, 80]} intensity={isNight?20:10}  color="#ff55aa" distance={100} decay={2}/>
        <pointLight position={[ 80,10,-80]} intensity={isNight?20:10}  color="#aaff55" distance={100} decay={2}/>
      </>}

      {/* Low-lying road glow at dusk/evening */}
      {(isDusk || isEvening) && <>
        <pointLight position={[0, 2, 0]}   intensity={18} color="#ff9955" distance={90} decay={2}/>
        <pointLight position={[40, 2, 0]}  intensity={12} color="#ffaa66" distance={70} decay={2}/>
        <pointLight position={[-40, 2, 0]} intensity={12} color="#ffaa66" distance={70} decay={2}/>
      </>}

      <fog attach="fog" args={[fogColor, fogNear, fogFar]}/>
    </>
  )
}

// ─── Minimap Collector ────────────────────────────────────────────────────────
function MinimapCollector() {
  const setMinimapDots = useGameStore(s=>s.setMinimapDots)
  const setPlayerPos   = useGameStore(s=>s.setPlayerPos)
  const frameCount     = useRef(0)
  useFrame(()=>{
    if(++frameCount.current%6!==0) return
    const dots: Array<{x:number;z:number;color:string;size:number}> = []
    for(const[,v] of vehicleRefs) dots.push({x:v.pos.x,z:v.pos.z,color:v.color,size:5})
    for(const[,n] of npcRefs) if(n.state!=='dead') dots.push({x:n.pos.x,z:n.pos.z,color:'#88ff88',size:3})
    for(const[,p] of policeRefs) if(p.health>0) dots.push({x:p.pos.x,z:p.pos.z,color:'#4466ff',size:4})
    setMinimapDots(dots)
    setPlayerPos(sharedPlayerPos.x,sharedPlayerPos.z)
  })
  return null
}

// ─── FPS Collector ────────────────────────────────────────────────────────────
function FPSCollector() {
  const setFps    = useGameStore(s => s.setFps)
  const fpsBuffer = useRef<number[]>([])
  const lastTime  = useRef(performance.now())

  useFrame(() => {
    const now   = performance.now()
    const delta = now - lastTime.current
    lastTime.current = now
    if (delta <= 0) return

    fpsBuffer.current.push(1000 / delta)
    if (fpsBuffer.current.length > 30) fpsBuffer.current.shift()

    // Update store every 30 frames (≈0.5 s at 60 fps)
    if (fpsBuffer.current.length === 30) {
      const avg = fpsBuffer.current.reduce((a, b) => a + b, 0) / 30
      setFps(Math.round(avg))
    }
  })
  return null
}

// ─── Police Spawner ───────────────────────────────────────────────────────────
const MAX_POLICE = 6
let policeIdCounter = 0

function spawnPolice(wantedLevel: number) {
  const count = Math.min(wantedLevel * 2, MAX_POLICE)
  const ids = Array.from(policeRefs.keys())
  while (ids.length > count) { policeRefs.delete(ids.pop()!) }
  let formationIdx = 0
  while (policeRefs.size < count) {
    const id = `police${policeIdCounter++}`
    const angle = Math.random() * Math.PI * 2
    const dist  = 35 + Math.random() * 35
    policeRefs.set(id, {
      pos: new THREE.Vector3(
        Math.max(-100,Math.min(100, sharedPlayerPos.x+Math.cos(angle)*dist)),
        0,
        Math.max(-100,Math.min(100, sharedPlayerPos.z+Math.sin(angle)*dist))
      ),
      dir:0, health:100, shootTimer:0, mesh:null,
      formation: formationIdx++,
    })
  }
}

// ─── Main GameScene ───────────────────────────────────────────────────────────
export default function GameScene() {
  const [bullets,   setBullets  ] = useState<BulletRef[]>([])
  const [policeIds, setPoliceIds] = useState<string[]>([])
  const [timeOfDay, setTimeOfDay] = useState(10)
  const timeRef        = useRef(10)
  const wantedDecayRef = useRef(0)
  const wantedLevel    = useGameStore(s=>s.wantedLevel)
  const { takeDamage, setWantedLevel, incrementWanted, addMoney, addScore, isGameOver } = useGameStore()
  const [policeIndexMap, setPoliceIndexMap] = useState<Map<string,number>>(new Map())
  const { settings } = useModelStore()

  useFrame((_,delta)=>{
    const prevTime = timeRef.current
    timeRef.current += delta * 0.05
    if (timeRef.current>=24) timeRef.current=0
    // Only setState roughly every 1-2 real seconds (when half-hour changes in game time)
    if(Math.floor(timeRef.current * 2) !== Math.floor(prevTime * 2)) setTimeOfDay(timeRef.current)

    if(sharedWantedLevel.value>0){
      wantedDecayRef.current+=delta
      if(wantedDecayRef.current>30){
        wantedDecayRef.current=0
        sharedWantedLevel.value=Math.max(0,sharedWantedLevel.value-1)
        setWantedLevel(sharedWantedLevel.value)
      }
    }
  })

  useEffect(()=>{
    sharedWantedLevel.value=wantedLevel
    spawnPolice(wantedLevel)
    const ids=Array.from(policeRefs.keys())
    setPoliceIds(ids)
    const map=new Map<string,number>()
    ids.forEach((id,i)=>map.set(id,i))
    setPoliceIndexMap(map)
  },[wantedLevel])

  const handleShoot=useCallback((pos:THREE.Vector3,dir:THREE.Vector3)=>{
    const id=`b${Date.now()}_${Math.random().toString(36).slice(2)}`
    bulletRefs=[...bulletRefs,{id,pos:pos.clone(),dir:dir.clone(),age:0,owner:'player',mesh:null}]
    setBullets([...bulletRefs])
  },[])

  const handlePoliceShoot=useCallback(()=>{
    for(const[,p] of policeRefs){
      if(p.pos.distanceTo(sharedPlayerPos)<7){
        const dir=sharedPlayerPos.clone().sub(p.pos).normalize(); dir.y=0
        const id=`pb${Date.now()}_${Math.random().toString(36).slice(2)}`
        bulletRefs=[...bulletRefs,{id,pos:p.pos.clone().add(new THREE.Vector3(0,1.2,0)),dir,age:0,owner:'police',mesh:null}]
        setBullets([...bulletRefs]); break
      }
    }
  },[])

  const handleBulletExpire=useCallback((id:string)=>{
    bulletRefs=bulletRefs.filter(b=>b.id!==id); setBullets([...bulletRefs])
  },[])

  const handleHitNPC=useCallback((id:string)=>{
    const npc=npcRefs.get(id); if(!npc||npc.state==='dead') return
    npc.health-=34
    if(npc.health<=0){
      npc.state='dead'; addMoney(50); addScore(100)
      incrementWanted(); sharedWantedLevel.value=Math.min(5,sharedWantedLevel.value+1)
      wantedDecayRef.current=0; spawnPolice(sharedWantedLevel.value)
      setPoliceIds(Array.from(policeRefs.keys()))
    }
  },[addMoney,addScore,incrementWanted])

  const handleHitPolice=useCallback((id:string)=>{
    const p=policeRefs.get(id); if(!p||p.health<=0) return
    p.health-=40; addScore(150)
    if(p.health<=0){
      addMoney(100); addScore(250); incrementWanted()
      sharedWantedLevel.value=Math.min(5,sharedWantedLevel.value+2)
      wantedDecayRef.current=0
    }
  },[addMoney,addScore,incrementWanted])

  const handlePoliceBulletHit=useCallback(()=>{ takeDamage(12) },[takeDamage])

  if (isGameOver) return <DynamicLighting timeOfDay={timeOfDay}/>

  return (
    <>
      <DynamicLighting timeOfDay={timeOfDay}/>
      <City/>
      {INITIAL_VEHICLES.map(v=><Vehicle key={v.id} vehicleId={v.id}/>)}
      {INITIAL_NPCS.slice(0, settings.npcCount).map((n,i)=><NPC key={n.id} npcId={n.id} npcIndex={i}/>)}
      {policeIds.map(id=>policeRefs.has(id)?(
        <PoliceUnit key={id} policeId={id}
          policeIndex={policeIndexMap.get(id)??0}
          onShootPlayer={handlePoliceShoot}/>
      ):null)}
      {bullets.map(b=>(
        <Bullet key={b.id} bullet={b}
          onExpire={handleBulletExpire}
          onHitNPC={handleHitNPC}
          onHitPolice={handleHitPolice}/>
      ))}
      <Player onShoot={handleShoot}/>
      <MinimapCollector/>
      <FPSCollector/>
    </>
  )
}
