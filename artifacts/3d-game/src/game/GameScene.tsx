import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useAuthStore } from '../auth/useAuthStore'
import { useModelStore, modelBlobURLs } from '../store/useModelStore'
import { CustomModel } from './GameModels'
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
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.8, 7]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[1.3, 9, 7]} />
        <meshStandardMaterial color="#2d6a2d" />
      </mesh>
      <mesh position={[0, 3.9, 0]} castShadow>
        <sphereGeometry args={[0.9, 8, 6]} />
        <meshStandardMaterial color="#256025" />
      </mesh>
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

function City() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#2d4020" />
      </mesh>
      {/* Park grass zones */}
      {[[-60,-60],[60,-60],[-60,60],[60,60]].map(([px,pz],i)=>(
        <mesh key={`park${i}`} rotation={[-Math.PI/2,0,0]} position={[px,-0.01,pz]} receiveShadow>
          <planeGeometry args={[26,26]} />
          <meshStandardMaterial color="#3a6020" />
        </mesh>
      ))}
      {/* Road tarmac - vertical */}
      {[-80,-40,0,40,80].map(x=>(
        <mesh key={`vr${x}`} rotation={[-Math.PI/2,0,0]} position={[x,0,0]}>
          <planeGeometry args={[13,300]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
      ))}
      {/* Road tarmac - horizontal */}
      {[-80,-40,0,40,80].map(z=>(
        <mesh key={`hr${z}`} rotation={[-Math.PI/2,0,0]} position={[0,0.001,z]}>
          <planeGeometry args={[300,13]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
      ))}
      {/* Center dashed lines V */}
      {[-80,-40,0,40,80].map(x=>(
        <mesh key={`cl${x}`} rotation={[-Math.PI/2,0,0]} position={[x,0.003,0]}>
          <planeGeometry args={[0.25,300]} />
          <meshStandardMaterial color="#ffee00" />
        </mesh>
      ))}
      {/* Center dashed lines H */}
      {[-80,-40,0,40,80].map(z=>(
        <mesh key={`clh${z}`} rotation={[-Math.PI/2,0,0]} position={[0,0.003,z]}>
          <planeGeometry args={[300,0.25]} />
          <meshStandardMaterial color="#ffee00" />
        </mesh>
      ))}
      {/* Sidewalks V */}
      {[-80,-40,0,40,80].map(x=>[-1,1].map(s=>(
        <mesh key={`swv${x}${s}`} rotation={[-Math.PI/2,0,0]} position={[x+s*8.5,0.02,0]}>
          <planeGeometry args={[3,300]} />
          <meshStandardMaterial color="#6a6a6a" />
        </mesh>
      )))}
      {/* Sidewalks H */}
      {[-80,-40,0,40,80].map(z=>[-1,1].map(s=>(
        <mesh key={`swh${z}${s}`} rotation={[-Math.PI/2,0,0]} position={[0,0.025,z+s*8.5]}>
          <planeGeometry args={[300,3]} />
          <meshStandardMaterial color="#6a6a6a" />
        </mesh>
      )))}
      {/* Buildings */}
      {CITY_BUILDINGS.map(b=>(
        <group key={b.id} position={[b.x,0,b.z]}>
          <mesh position={[0,b.height/2,0]} castShadow receiveShadow>
            <boxGeometry args={[b.width,b.height,b.depth]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
          <mesh position={[0,b.height+0.4,0]}>
            <boxGeometry args={[b.width+0.4,0.8,b.depth+0.4]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Antenna */}
          {b.height>30&&(
            <mesh position={[0,b.height+2,0]}>
              <cylinderGeometry args={[0.06,0.06,4,5]}/>
              <meshStandardMaterial color="#888"/>
            </mesh>
          )}
          {/* Windows */}
          {b.height>20&&Array.from({length:Math.floor(b.height/5)},(_,i)=>(
            <mesh key={i} position={[0,3+i*5,b.depth/2+0.06]}>
              <planeGeometry args={[b.width-2,2.2]}/>
              <meshStandardMaterial color="#aaccff" emissive="#1133aa" emissiveIntensity={0.4}/>
            </mesh>
          ))}
          {/* Side windows */}
          {b.height>20&&Array.from({length:Math.floor(b.height/5)},(_,i)=>(
            <mesh key={`sw${i}`} position={[b.width/2+0.06,3+i*5,0]}>
              <planeGeometry args={[b.depth-2,2.2]}/>
              <meshStandardMaterial color="#aaccff" emissive="#1133aa" emissiveIntensity={0.3}/>
            </mesh>
          ))}
        </group>
      ))}
      {/* Street lamps */}
      {[-80,-40,0,40,80].map(x=>[-60,-20,20,60].map(z=>(
        <group key={`lamp${x}${z}`} position={[x+7.5,0,z]}>
          <mesh position={[0,3,0]}>
            <cylinderGeometry args={[0.08,0.12,6,6]}/>
            <meshStandardMaterial color="#999"/>
          </mesh>
          <mesh position={[0.6,5.8,0]}>
            <cylinderGeometry args={[0.04,0.04,1.2,6]} rotation={[0,0,Math.PI/2]}/>
            <meshStandardMaterial color="#999"/>
          </mesh>
          <mesh position={[1.1,5.7,0]}>
            <sphereGeometry args={[0.3,8,6]}/>
            <meshStandardMaterial color="#ffffaa" emissive="#ffee66" emissiveIntensity={2}/>
          </mesh>
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
      {/* Crosswalk stripes */}
      {[-80,-40,0,40,80].map(x=>[-80,-40,0,40,80].filter(z=>z!==x).map(z=>(
        Array.from({length:4},(_,i)=>(
          <mesh key={`cw${x}${z}${i}`} rotation={[-Math.PI/2,0,0]} position={[x-3+i*2,0.004,z+8.5]}>
            <planeGeometry args={[1.5,3]}/>
            <meshStandardMaterial color="rgba(255,255,255,0.6)"/>
          </mesh>
        ))
      )))}
    </group>
  )
}

// ─── Enhanced Vehicle ─────────────────────────────────────────────────────────
function Vehicle({ vehicleId }: { vehicleId: string }) {
  const groupRef = useRef<THREE.Group>(null!)
  const vRef = vehicleRefs.get(vehicleId)!
  const { modelRevision } = useModelStore()
  const vehicleModel = modelBlobURLs.get('vehicle')

  useEffect(() => { vRef.mesh = groupRef.current; return () => { vRef.mesh = null } }, [vRef])
  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(vRef.pos.x, 0, vRef.pos.z)
    // Only update rotation when it actually changes to avoid visual jitter
    groupRef.current.rotation.y = vRef.rot
  })

  void modelRevision // subscribe to re-render when models change

  const c = vRef.color
  if (vehicleModel) {
    return (
      <group ref={groupRef}>
        <CustomModel url={vehicleModel.url} format={vehicleModel.format} scale={1.5} />
      </group>
    )
  }

  return (
    <group ref={groupRef}>
      {/* Main chassis */}
      <mesh position={[0,0.42,0]} castShadow>
        <boxGeometry args={[2.1,0.55,4.8]}/>
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.5}/>
      </mesh>
      {/* Raised cabin */}
      <mesh position={[0,1.05,-0.25]} castShadow>
        <boxGeometry args={[1.75,0.65,2.6]}/>
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.5}/>
      </mesh>
      {/* Hood slope */}
      <mesh position={[0,0.72,1.5]} rotation={[0.22,0,0]} castShadow>
        <boxGeometry args={[1.9,0.12,1.6]}/>
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.5}/>
      </mesh>
      {/* Trunk */}
      <mesh position={[0,0.68,-1.65]} rotation={[-0.15,0,0]} castShadow>
        <boxGeometry args={[1.9,0.12,1.4]}/>
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.5}/>
      </mesh>
      {/* Front bumper */}
      <mesh position={[0,0.28,2.48]}>
        <boxGeometry args={[2.0,0.28,0.18]}/>
        <meshStandardMaterial color="#333" roughness={0.8}/>
      </mesh>
      {/* Rear bumper */}
      <mesh position={[0,0.28,-2.48]}>
        <boxGeometry args={[2.0,0.28,0.18]}/>
        <meshStandardMaterial color="#333" roughness={0.8}/>
      </mesh>
      {/* Windshield */}
      <mesh position={[0,1.08,0.9]} rotation={[-0.45,0,0]}>
        <boxGeometry args={[1.65,0.7,0.07]}/>
        <meshStandardMaterial color="#88ccff" transparent opacity={0.5} roughness={0} metalness={0.1}/>
      </mesh>
      {/* Rear window */}
      <mesh position={[0,1.08,-1.4]} rotation={[0.4,0,0]}>
        <boxGeometry args={[1.65,0.55,0.07]}/>
        <meshStandardMaterial color="#88ccff" transparent opacity={0.45} roughness={0} metalness={0.1}/>
      </mesh>
      {/* Side windows */}
      {[-0.88,0.88].map((wx,i)=>(
        <mesh key={i} position={[wx,1.08,-0.2]} rotation={[0,Math.PI/2,0]}>
          <boxGeometry args={[1.9,0.45,0.04]}/>
          <meshStandardMaterial color="#88ccff" transparent opacity={0.4} roughness={0}/>
        </mesh>
      ))}
      {/* Wheels — enhanced with hub detail */}
      {[[-1.06,0.36,1.55],[1.06,0.36,1.55],[-1.06,0.36,-1.55],[1.06,0.36,-1.55]].map(([wx,wy,wz],i)=>(
        <group key={i} position={[wx,wy,wz]}>
          <mesh rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.38,0.38,0.28,16]}/>
            <meshStandardMaterial color="#111" roughness={0.9}/>
          </mesh>
          <mesh rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.22,0.22,0.3,8]}/>
            <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2}/>
          </mesh>
        </group>
      ))}
      {/* Headlights */}
      {[[-0.65,0.65,2.42],[0.65,0.65,2.42]].map(([hx,hy,hz],i)=>(
        <mesh key={i} position={[hx,hy,hz]}>
          <boxGeometry args={[0.45,0.22,0.06]}/>
          <meshStandardMaterial color="#ffffee" emissive="#ffffff" emissiveIntensity={1.5}/>
        </mesh>
      ))}
      {/* Taillights */}
      {[[-0.7,0.65,-2.42],[0.7,0.65,-2.42]].map(([tx,ty,tz],i)=>(
        <mesh key={i} position={[tx,ty,tz]}>
          <boxGeometry args={[0.38,0.2,0.06]}/>
          <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={1.2}/>
        </mesh>
      ))}
      {/* Side mirrors */}
      {[-1.12,1.12].map((mx,i)=>(
        <mesh key={i} position={[mx,1.1,0.55]}>
          <boxGeometry args={[0.08,0.14,0.22]}/>
          <meshStandardMaterial color={c} roughness={0.3} metalness={0.4}/>
        </mesh>
      ))}
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

  const npcTag = (
    <Html position={[0, 2.6, 0]} center distanceFactor={10} occlude>
      <div style={{
        color: '#fff', fontSize: 11, fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.65)', padding: '2px 7px',
        borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.15)',
      }}>{npcName}</div>
    </Html>
  )

  if (npcModel) {
    return (
      <group ref={groupRef} position={[nRef.pos.x, 0, nRef.pos.z]}>
        {npcTag}
        <CustomModel url={npcModel.url} format={npcModel.format} scale={1} />
      </group>
    )
  }

  if (isFemale) {
    return (
      <group ref={groupRef} position={[nRef.pos.x, 0, nRef.pos.z]}>
        {npcTag}
        <CustomModel url="/lena.fbx" format="fbx" scale={0.011} />
      </group>
    )
  }

  return (
    <group ref={groupRef} position={[nRef.pos.x, 0, nRef.pos.z]}>
      {npcTag}
      {/* Torso */}
      <mesh position={[0,0.95,0]} castShadow>
        <boxGeometry args={[0.55,0.85,0.38]}/>
        <meshStandardMaterial color={shirtColor} roughness={0.9}/>
      </mesh>
      {/* Head */}
      <mesh position={[0,1.65,0]} castShadow>
        <boxGeometry args={[0.42,0.42,0.4]}/>
        <meshStandardMaterial color={skin}/>
      </mesh>
      {/* Hair */}
      <mesh position={[0,1.87,0]}>
        <boxGeometry args={[0.44,0.1,0.42]}/>
        <meshStandardMaterial color={`hsl(${(npcIndex*23)%360},30%,20%)`}/>
      </mesh>
      {/* Neck */}
      <mesh position={[0,1.42,0]}>
        <cylinderGeometry args={[0.1,0.1,0.22,7]}/>
        <meshStandardMaterial color={skin}/>
      </mesh>
      {/* Arms */}
      {[-0.38,0.38].map((ax,i)=>(
        <group key={i}>
          <mesh position={[ax,0.95,0]} rotation={[0,0,ax<0?0.25:-0.25]}>
            <boxGeometry args={[0.17,0.7,0.17]}/>
            <meshStandardMaterial color={shirtColor} roughness={0.9}/>
          </mesh>
          <mesh position={[ax*1.1,0.58,0]}>
            <boxGeometry args={[0.15,0.35,0.15]}/>
            <meshStandardMaterial color={skin}/>
          </mesh>
        </group>
      ))}
      {/* Legs */}
      {[-0.15,0.15].map((lx,i)=>(
        <group key={i}>
          <mesh position={[lx,0.38,0]}>
            <boxGeometry args={[0.2,0.52,0.2]}/>
            <meshStandardMaterial color={pantsColor} roughness={0.9}/>
          </mesh>
          <mesh position={[lx,0.08,0.02]}>
            <boxGeometry args={[0.2,0.18,0.3]}/>
            <meshStandardMaterial color="#222"/>
          </mesh>
        </group>
      ))}
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

  const policeTag = (
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
  )

  if (policeModel) {
    return (
      <group ref={groupRef} position={[pRef.pos.x, 0, pRef.pos.z]}>
        {policeTag}
        <CustomModel url={policeModel.url} format={policeModel.format} scale={1} />
      </group>
    )
  }

  return (
    <group ref={groupRef} position={[pRef.pos.x, 0, pRef.pos.z]}>
      {policeTag}
      {/* Torso / vest */}
      <mesh position={[0,0.95,0]} castShadow>
        <boxGeometry args={[0.6,0.85,0.45]}/>
        <meshStandardMaterial color={uniformColor}/>
      </mesh>
      {/* Chest armor */}
      <mesh position={[0,0.98,0.23]}>
        <boxGeometry args={[0.5,0.6,0.06]}/>
        <meshStandardMaterial color={isSwat?'#1a1a1a':'#2244cc'} roughness={0.4}/>
      </mesh>
      {/* Badge */}
      <mesh position={[0,1.02,0.27]}>
        <boxGeometry args={[0.14,0.1,0.02]}/>
        <meshStandardMaterial color="#ffcc00" emissive="#aa8800" emissiveIntensity={0.5}/>
      </mesh>
      {/* Head */}
      <mesh position={[0,1.65,0]} castShadow>
        <boxGeometry args={[0.45,0.44,0.42]}/>
        <meshStandardMaterial color="#ddb080"/>
      </mesh>
      {/* Helmet/Hat */}
      <mesh position={[0,1.9,0]}>
        <boxGeometry args={[0.52,0.22,0.55]}/>
        <meshStandardMaterial color={hatColor}/>
      </mesh>
      {isSwat && (
        <mesh position={[0,1.73,0.22]}>
          <boxGeometry args={[0.48,0.28,0.06]}/>
          <meshStandardMaterial color="#222" transparent opacity={0.5}/>
        </mesh>
      )}
      {/* Neck */}
      <mesh position={[0,1.42,0]}>
        <cylinderGeometry args={[0.1,0.1,0.22,7]}/>
        <meshStandardMaterial color="#ddb080"/>
      </mesh>
      {/* Arms */}
      {[-0.4,0.4].map((ax,i)=>(
        <mesh key={i} position={[ax,0.9,0]} rotation={[0,0,ax<0?0.3:-0.3]}>
          <boxGeometry args={[0.18,0.72,0.18]}/>
          <meshStandardMaterial color={uniformColor}/>
        </mesh>
      ))}
      {/* Gun arm extension */}
      <mesh position={[0.42,0.75,0.3]} rotation={[-0.5,0,0.3]}>
        <boxGeometry args={[0.1,0.12,0.45]}/>
        <meshStandardMaterial color="#222"/>
      </mesh>
      {/* Legs */}
      {[-0.16,0.16].map((lx,i)=>(
        <group key={i}>
          <mesh position={[lx,0.38,0]}>
            <boxGeometry args={[0.22,0.52,0.22]}/>
            <meshStandardMaterial color={uniformColor}/>
          </mesh>
          <mesh position={[lx,0.08,0.02]}>
            <boxGeometry args={[0.22,0.18,0.32]}/>
            <meshStandardMaterial color="#111"/>
          </mesh>
        </group>
      ))}
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
      if (kb.left)  sharedCamYaw.value += 1.6 * delta
      if (kb.right) sharedCamYaw.value -= 1.6 * delta

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

      let newX = posRef.current.x + moveX * speed * delta
      let newZ = posRef.current.z + moveZ * speed * delta

      // Player faces movement direction (decoupled from camera)
      if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
        rotRef.current.value = Math.atan2(moveX, moveZ)
      }

      newX = Math.max(-108, Math.min(108, newX))
      newZ = Math.max(-108, Math.min(108, newZ))
      const resolved = resolveCollision(posRef.current, newX, newZ, 0.55)
      posRef.current.x = resolved.x
      posRef.current.z = resolved.z
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

    // Sync mesh — player faces movement direction, NOT camera
    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.y = rotRef.current.value
    groupRef.current.visible = true

    // ── Orbit camera with collision ───────────────────────────────────────
    const camYaw   = sharedCamYaw.value
    const camPitch = sharedCamPitch.value
    const CAM_DIST   = 5.5
    const CAM_HEIGHT = 1.8

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

  return (
    <group ref={groupRef} position={[sharedPlayerPos.x,sharedPlayerPos.y,sharedPlayerPos.z]}>
      {nameTag}
      {/* Torso */}
      <mesh position={[0,0.98,0]} castShadow>
        <boxGeometry args={[0.58,0.88,0.4]}/>
        <meshStandardMaterial color={playerColor} roughness={0.8}/>
      </mesh>
      {/* Head */}
      <mesh position={[0,1.68,0]} castShadow>
        <boxGeometry args={[0.44,0.44,0.42]}/>
        <meshStandardMaterial color={skinTone}/>
      </mesh>
      {/* Hair */}
      <mesh position={[0,1.9,0]}>
        <boxGeometry args={[0.46,0.12,0.44]}/>
        <meshStandardMaterial color={isAdmin?'#FFD700':'#222'}/>
      </mesh>
      {/* Neck */}
      <mesh position={[0,1.45,0]}>
        <cylinderGeometry args={[0.1,0.1,0.22,7]}/>
        <meshStandardMaterial color={skinTone}/>
      </mesh>
      {/* Arms */}
      {[-0.4,0.4].map((ax,i)=>(
        <group key={i}>
          <mesh position={[ax,0.98,0]} rotation={[0,0,ax<0?0.28:-0.28]}>
            <boxGeometry args={[0.17,0.72,0.17]}/>
            <meshStandardMaterial color={playerColor} roughness={0.8}/>
          </mesh>
          <mesh position={[ax*1.1,0.6,0]}>
            <boxGeometry args={[0.15,0.35,0.15]}/>
            <meshStandardMaterial color={skinTone}/>
          </mesh>
        </group>
      ))}
      {/* Gun in right hand */}
      <mesh position={[0.46,0.72,0.28]} rotation={[-0.4,0,0.3]}>
        <boxGeometry args={[0.09,0.12,0.38]}/>
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3}/>
      </mesh>
      {/* Legs */}
      {[-0.16,0.16].map((lx,i)=>(
        <group key={i}>
          <mesh position={[lx,0.38,0]}>
            <boxGeometry args={[0.22,0.54,0.22]}/>
            <meshStandardMaterial color="#1a2a4a" roughness={0.9}/>
          </mesh>
          <mesh position={[lx,0.08,0.03]}>
            <boxGeometry args={[0.22,0.18,0.32]}/>
            <meshStandardMaterial color="#111"/>
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
function DynamicLighting({ timeOfDay }: { timeOfDay: number }) {
  const isDay  = timeOfDay >= 6 && timeOfDay <= 20
  const isDawn = timeOfDay >= 6 && timeOfDay < 9
  const isDusk = timeOfDay >= 17 && timeOfDay <= 20

  let ambInt = isDay ? 0.65 : 0.12
  let ambCol = '#ffffff', dirInt = isDay ? 1.3 : 0.0, dirCol = '#ffffff'
  let skyColor = '#87ceeb'
  if (isDawn || isDusk) { ambCol='#ffaa66'; dirCol='#ff8844'; ambInt=0.45; skyColor=isDawn?'#ff9944':'#ff6622' }
  else if (!isDay) skyColor='#0a0a2a'

  return (
    <>
      <color attach="background" args={[skyColor]}/>
      <ambientLight intensity={ambInt} color={ambCol}/>
      <directionalLight position={[50,80,50]} intensity={dirInt} color={dirCol}
        castShadow shadow-mapSize={[2048,2048]}
        shadow-camera-near={1} shadow-camera-far={220}
        shadow-camera-left={-130} shadow-camera-right={130}
        shadow-camera-top={130} shadow-camera-bottom={-130}
      />
      {!isDay && <pointLight position={[0,8,0]} intensity={0.9} color="#ffee88" distance={45}/>}
      <fog attach="fog" args={[skyColor,70,220]}/>
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
      {INITIAL_NPCS.map((n,i)=><NPC key={n.id} npcId={n.id} npcIndex={i}/>)}
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
    </>
  )
}
