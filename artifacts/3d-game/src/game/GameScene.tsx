import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import {
  CITY_BUILDINGS,
  INITIAL_VEHICLES,
  INITIAL_NPCS,
  isInsideBuilding,
  resolveCollision,
} from './cityData'
import { touchState } from './touchState'

// ─── Controls enum ───────────────────────────────────────────────────────────
export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  shoot = 'shoot',
  enter = 'enter',
  run = 'run',
}

// ─── Shared mutable game refs (fast, no React overhead) ────────────────────
const sharedPlayerPos = new THREE.Vector3(0, 0.9, 0)
const sharedPlayerRot = { value: 0 }
const sharedInVehicle = { value: false }
const sharedVehicleId = { value: '' }
const sharedWantedLevel = { value: 0 }

interface VehicleRef {
  pos: THREE.Vector3
  rot: number
  speed: number
  color: string
  occupied: boolean
  mesh: THREE.Group | null
}

interface NPCRef {
  pos: THREE.Vector3
  dir: number
  health: number
  state: 'walking' | 'fleeing' | 'dead'
  moveTimer: number
  speed: number
  mesh: THREE.Group | null
}

interface PoliceRef {
  pos: THREE.Vector3
  dir: number
  health: number
  shootTimer: number
  mesh: THREE.Group | null
}

interface BulletRef {
  id: string
  pos: THREE.Vector3
  dir: THREE.Vector3
  age: number
  owner: 'player' | 'police'
  mesh: THREE.Mesh | null
}

// Shared maps for cross-component access
const vehicleRefs = new Map<string, VehicleRef>()
const npcRefs = new Map<string, NPCRef>()
const policeRefs = new Map<string, PoliceRef>()
let bulletRefs: BulletRef[] = []

// Initialize vehicles
INITIAL_VEHICLES.forEach((v) => {
  vehicleRefs.set(v.id, {
    pos: new THREE.Vector3(v.x, 0, v.z),
    rot: v.rot,
    speed: 0,
    color: v.color,
    occupied: false,
    mesh: null,
  })
})

// Initialize NPCs
INITIAL_NPCS.forEach((n) => {
  npcRefs.set(n.id, {
    pos: new THREE.Vector3(n.x, 0.8, n.z),
    dir: (INITIAL_NPCS.indexOf(n) * 0.7) % (Math.PI * 2),
    health: 100,
    state: 'walking',
    moveTimer: 0,
    speed: n.speed,
    mesh: null,
  })
})

// ─── City (static geometry) ───────────────────────────────────────────────
function City() {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial color="#2d4020" />
      </mesh>

      {/* Road tarmac - vertical (along Z) */}
      {[-80, -40, 0, 40, 80].map((x) => (
        <mesh key={`vr${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 0]}>
          <planeGeometry args={[12, 280]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      ))}
      {/* Road tarmac - horizontal (along X) */}
      {[-80, -40, 0, 40, 80].map((z) => (
        <mesh key={`hr${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, z]}>
          <planeGeometry args={[280, 12]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      ))}

      {/* Road markings - center lines */}
      {[-80, -40, 0, 40, 80].map((x) => (
        <mesh key={`crv${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, 0]}>
          <planeGeometry args={[0.3, 280]} />
          <meshStandardMaterial color="#ffee00" />
        </mesh>
      ))}
      {[-80, -40, 0, 40, 80].map((z) => (
        <mesh key={`crh${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, z]}>
          <planeGeometry args={[280, 0.3]} />
          <meshStandardMaterial color="#ffee00" />
        </mesh>
      ))}

      {/* Sidewalks */}
      {[-80, -40, 0, 40, 80].map((x) =>
        [-1, 1].map((side) => (
          <mesh
            key={`sw${x}${side}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x + side * 8, 0.02, 0]}
          >
            <planeGeometry args={[3, 280]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        ))
      )}
      {[-80, -40, 0, 40, 80].map((z) =>
        [-1, 1].map((side) => (
          <mesh
            key={`swh${z}${side}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.025, z + side * 8]}
          >
            <planeGeometry args={[280, 3]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        ))
      )}

      {/* Buildings */}
      {CITY_BUILDINGS.map((b) => (
        <group key={b.id} position={[b.x, 0, b.z]}>
          {/* Building body */}
          <mesh position={[0, b.height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
          {/* Rooftop accent */}
          <mesh position={[0, b.height + 0.3, 0]}>
            <boxGeometry args={[b.width, 0.5, b.depth]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {/* Window rows (tall buildings) */}
          {b.height > 20 &&
            Array.from({ length: Math.floor(b.height / 5) }, (_, i) => (
              <mesh
                key={i}
                position={[0, 3 + i * 5, b.depth / 2 + 0.05]}
              >
                <planeGeometry args={[b.width - 2, 2]} />
                <meshStandardMaterial
                  color="#aaccff"
                  emissive="#2244aa"
                  emissiveIntensity={0.3}
                />
              </mesh>
            ))}
        </group>
      ))}

      {/* Street lamps */}
      {[-80, -40, 0, 40, 80].map((x) =>
        [-60, -20, 20, 60].map((z) => (
          <group key={`lamp${x}${z}`} position={[x + 7, 0, z]}>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.1, 0.15, 6, 6]} />
              <meshStandardMaterial color="#888" />
            </mesh>
            <mesh position={[0, 6.2, 0]}>
              <sphereGeometry args={[0.4, 8, 8]} />
              <meshStandardMaterial color="#ffffaa" emissive="#ffee66" emissiveIntensity={1} />
            </mesh>
          </group>
        ))
      )}

      {/* Boundary wall (invisible collision barrier) */}
    </group>
  )
}

// ─── Vehicle Component ───────────────────────────────────────────────────────
interface VehicleProps {
  vehicleId: string
}

function Vehicle({ vehicleId }: VehicleProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const vRef = vehicleRefs.get(vehicleId)!
  const { color } = vRef

  useEffect(() => {
    vRef.mesh = groupRef.current
    return () => { vRef.mesh = null }
  }, [vRef])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(vRef.pos.x, 0, vRef.pos.z)
    groupRef.current.rotation.y = vRef.rot
  })

  return (
    <group ref={groupRef} position={[vRef.pos.x, 0, vRef.pos.z]} rotation-y={vRef.rot}>
      {/* Car body */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 4.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Car cabin */}
      <mesh position={[0, 1.25, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.7, 2.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 1.25, 0.99]}>
        <boxGeometry args={[1.7, 0.55, 0.05]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.6} />
      </mesh>
      {/* Wheels */}
      {[[-1.1, 0.3, 1.5], [1.1, 0.3, 1.5], [-1.1, 0.3, -1.5], [1.1, 0.3, -1.5]].map(
        ([wx, wy, wz], i) => (
          <mesh key={i} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.3, 12]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        )
      )}
      {/* Headlights */}
      <mesh position={[0.6, 0.65, 2.25]}>
        <boxGeometry args={[0.4, 0.25, 0.05]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-0.6, 0.65, 2.25]}>
        <boxGeometry args={[0.4, 0.25, 0.05]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      {/* Taillights */}
      <mesh position={[0.7, 0.65, -2.25]}>
        <boxGeometry args={[0.35, 0.2, 0.05]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-0.7, 0.65, -2.25]}>
        <boxGeometry args={[0.35, 0.2, 0.05]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={1} />
      </mesh>
    </group>
  )
}

// ─── NPC Component ───────────────────────────────────────────────────────────
interface NPCProps {
  npcId: string
}

function NPC({ npcId }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const nRef = npcRefs.get(npcId)!

  useEffect(() => {
    nRef.mesh = groupRef.current
    return () => { nRef.mesh = null }
  }, [nRef])

  useFrame((_, delta) => {
    if (!groupRef.current || nRef.state === 'dead') return

    nRef.moveTimer += delta
    const dist = nRef.pos.distanceTo(sharedPlayerPos)

    // React to player proximity and wanted level
    if (dist < 25 && sharedWantedLevel.value === 0) {
      if (nRef.state !== 'fleeing') nRef.state = 'fleeing'
    } else if (dist > 40) {
      nRef.state = 'walking'
    }

    // Flee from combat zone
    if (sharedWantedLevel.value > 0 && dist < 40) {
      nRef.state = 'fleeing'
    }

    const speed = nRef.state === 'fleeing' ? nRef.speed * 2.5 : nRef.speed

    if (nRef.state === 'fleeing') {
      // Run away from player
      const away = nRef.pos.clone().sub(sharedPlayerPos).normalize()
      nRef.dir = Math.atan2(away.x, away.z)
    } else {
      // Wander: change direction periodically
      if (nRef.moveTimer > 2.5) {
        nRef.moveTimer = 0
        nRef.dir += (npcId.charCodeAt(3) % 7 - 3) * 0.6 + (Date.now() % 100) * 0.001
      }
    }

    const newX = nRef.pos.x + Math.sin(nRef.dir) * speed * delta
    const newZ = nRef.pos.z + Math.cos(nRef.dir) * speed * delta

    // Clamp to map
    const clampedX = Math.max(-108, Math.min(108, newX))
    const clampedZ = Math.max(-108, Math.min(108, newZ))

    if (!isInsideBuilding(clampedX, clampedZ, 0.4)) {
      nRef.pos.x = clampedX
      nRef.pos.z = clampedZ
    } else {
      nRef.dir += Math.PI * 0.5
    }

    groupRef.current.position.set(nRef.pos.x, 0, nRef.pos.z)
    groupRef.current.rotation.y = nRef.dir
    groupRef.current.visible = true // already returned if dead above
  })

  return (
    <group ref={groupRef} position={[nRef.pos.x, 0, nRef.pos.z]}>
      {/* Body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.55, 1.1, 0.4]} />
        <meshStandardMaterial color={INITIAL_NPCS.find((n) => n.id === npcId)?.color ?? '#888'} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial color="#ddb080" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.15, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, 0.2]} />
        <meshStandardMaterial color="#3a3a6a" />
      </mesh>
      <mesh position={[0.15, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, 0.2]} />
        <meshStandardMaterial color="#3a3a6a" />
      </mesh>
    </group>
  )
}

// ─── Police Unit Component ────────────────────────────────────────────────────
interface PoliceProps {
  policeId: string
  onShootPlayer: () => void
}

function PoliceUnit({ policeId, onShootPlayer }: PoliceProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const pRef = policeRefs.get(policeId)!

  useEffect(() => {
    pRef.mesh = groupRef.current
    return () => { pRef.mesh = null }
  }, [pRef])

  useFrame((_, delta) => {
    if (!groupRef.current || pRef.health <= 0) {
      if (groupRef.current) groupRef.current.visible = false
      return
    }

    pRef.shootTimer += delta

    const dist = pRef.pos.distanceTo(sharedPlayerPos)
    const toPlayer = sharedPlayerPos.clone().sub(pRef.pos).normalize()
    pRef.dir = Math.atan2(toPlayer.x, toPlayer.z)

    if (dist > 5) {
      // Chase player
      const speed = 4.5 + sharedWantedLevel.value * 0.5
      const newX = pRef.pos.x + toPlayer.x * speed * delta
      const newZ = pRef.pos.z + toPlayer.z * speed * delta
      if (!isInsideBuilding(newX, newZ, 0.6)) {
        pRef.pos.x = newX
        pRef.pos.z = newZ
      }
    } else if (dist < 5 && pRef.shootTimer > 1.5) {
      // Shoot at player
      pRef.shootTimer = 0
      onShootPlayer()
    }

    groupRef.current.position.set(pRef.pos.x, 0, pRef.pos.z)
    groupRef.current.rotation.y = pRef.dir
  })

  return (
    <group ref={groupRef} position={[pRef.pos.x, 0, pRef.pos.z]}>
      {/* Body - blue police uniform */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.6, 1.1, 0.45]} />
        <meshStandardMaterial color="#2244bb" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ddb080" />
      </mesh>
      {/* Hat */}
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.55, 0.2, 0.55]} />
        <meshStandardMaterial color="#111188" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.15, 0.2, 0]}>
        <boxGeometry args={[0.22, 0.4, 0.22]} />
        <meshStandardMaterial color="#1a1a4a" />
      </mesh>
      <mesh position={[0.15, 0.2, 0]}>
        <boxGeometry args={[0.22, 0.4, 0.22]} />
        <meshStandardMaterial color="#1a1a4a" />
      </mesh>
      {/* Badge */}
      <mesh position={[0, 1.0, 0.23]}>
        <boxGeometry args={[0.15, 0.1, 0.01]} />
        <meshStandardMaterial color="#ffcc00" emissive="#aa8800" />
      </mesh>
    </group>
  )
}

// ─── Bullet Component ─────────────────────────────────────────────────────────
interface BulletProps {
  bullet: BulletRef
  onExpire: (id: string) => void
  onHitNPC: (id: string) => void
  onHitPolice: (id: string) => void
}

function Bullet({ bullet, onExpire, onHitNPC, onHitPolice }: BulletProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    bullet.mesh = meshRef.current
    return () => { bullet.mesh = null }
  }, [bullet])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    bullet.age += delta
    if (bullet.age > 2.5) {
      onExpire(bullet.id)
      return
    }

    bullet.pos.addScaledVector(bullet.dir, 45 * delta)

    // Out of bounds
    if (Math.abs(bullet.pos.x) > 120 || Math.abs(bullet.pos.z) > 120) {
      onExpire(bullet.id)
      return
    }

    // Hit building
    if (isInsideBuilding(bullet.pos.x, bullet.pos.z, 0.1)) {
      onExpire(bullet.id)
      return
    }

    // Hit NPCs (player bullets only)
    if (bullet.owner === 'player') {
      for (const [id, npc] of npcRefs) {
        if (npc.state === 'dead') continue
        if (bullet.pos.distanceTo(npc.pos) < 1.2) {
          onHitNPC(id)
          onExpire(bullet.id)
          return
        }
      }
      // Hit police
      for (const [id, police] of policeRefs) {
        if (police.health <= 0) continue
        if (bullet.pos.distanceTo(police.pos) < 1.2) {
          onHitPolice(id)
          onExpire(bullet.id)
          return
        }
      }
    }

    meshRef.current.position.copy(bullet.pos)
  })

  const isPlayer = bullet.owner === 'player'
  return (
    <mesh ref={meshRef} position={[bullet.pos.x, bullet.pos.y, bullet.pos.z]}>
      <sphereGeometry args={[isPlayer ? 0.12 : 0.1, 6, 6]} />
      <meshStandardMaterial
        color={isPlayer ? '#ffff00' : '#ff4444'}
        emissive={isPlayer ? '#ffaa00' : '#ff0000'}
        emissiveIntensity={2}
      />
    </mesh>
  )
}

// ─── Player Component ─────────────────────────────────────────────────────────
interface PlayerProps {
  onShoot: (pos: THREE.Vector3, dir: THREE.Vector3) => void
}

function Player({ onShoot }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const posRef = useRef(sharedPlayerPos)
  const rotRef = useRef(sharedPlayerRot)
  const [, getControls] = useKeyboardControls<Controls>()
  const fireCooldown = useRef(0)
  const enterCooldown = useRef(0)
  const bodyRef = useRef<THREE.Mesh>(null!)
  const pitchRef = useRef(0) // vertical look angle (first-person)

  const {
    takeDamage,
    setInVehicle,
    useAmmo,
    incrementWanted,
    addMoney,
    addScore,
  } = useGameStore()

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    const kb = getControls()
    // forward/back/shoot/enter/run merged from keyboard + touch
    const controls = {
      forward: kb.forward || touchState.forward,
      back:    kb.back    || touchState.back,
      // left/right only for keyboard (on-foot turning) and vehicle steering
      left:    kb.left    || touchState.left,
      right:   kb.right   || touchState.right,
      shoot:   kb.shoot   || touchState.shoot,
      enter:   kb.enter   || touchState.enter,
      run:     kb.run     || touchState.run,
    }
    fireCooldown.current = Math.max(0, fireCooldown.current - delta)
    enterCooldown.current = Math.max(0, enterCooldown.current - delta)

    // ── Camera/player rotation from right-side drag ──────────────────────────
    const CAM_SENSITIVITY = 0.007
    const PITCH_LIMIT = Math.PI / 2.5 // ~72° up/down
    if (touchState.camDx !== 0 || touchState.camDy !== 0) {
      if (sharedInVehicle.value) {
        const vRef2 = vehicleRefs.get(sharedVehicleId.value)
        if (vRef2) vRef2.rot -= touchState.camDx * CAM_SENSITIVITY
      } else {
        rotRef.current.value -= touchState.camDx * CAM_SENSITIVITY
      }
      pitchRef.current = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitchRef.current - touchState.camDy * CAM_SENSITIVITY)
      )
      touchState.camDx = 0
      touchState.camDy = 0
    }

    if (sharedInVehicle.value) {
      // ── In-vehicle controls ─────────────────────────────────────────────
      const vRef = vehicleRefs.get(sharedVehicleId.value)
      if (!vRef) return

      const turnSpeed = 1.8 * delta
      if (controls.left) vRef.rot += turnSpeed
      if (controls.right) vRef.rot -= turnSpeed

      const accel = controls.run ? 22 : 14
      const friction = 0.9
      if (controls.forward) vRef.speed += accel * delta
      else if (controls.back) vRef.speed -= accel * delta
      else vRef.speed *= friction

      vRef.speed = Math.max(-8, Math.min(28, vRef.speed))

      const dx = Math.sin(vRef.rot) * vRef.speed * delta
      const dz = Math.cos(vRef.rot) * vRef.speed * delta
      const newX = Math.max(-108, Math.min(108, vRef.pos.x + dx))
      const newZ = Math.max(-108, Math.min(108, vRef.pos.z + dz))

      // Vehicle collision with buildings (wider radius)
      if (!isInsideBuilding(newX, newZ, 1.5)) {
        vRef.pos.x = newX
        vRef.pos.z = newZ
      } else {
        vRef.speed *= -0.3
      }

      posRef.current.set(vRef.pos.x, 0.9, vRef.pos.z)
      rotRef.current.value = vRef.rot
      sharedPlayerPos.copy(posRef.current)

      // Exit vehicle
      if (controls.enter && enterCooldown.current <= 0) {
        enterCooldown.current = 0.5
        vRef.occupied = false
        vRef.speed = 0
        sharedInVehicle.value = false
        sharedVehicleId.value = ''
        setInVehicle(false)
        posRef.current.x += Math.sin(rotRef.current.value + Math.PI / 2) * 3
        posRef.current.z += Math.cos(rotRef.current.value + Math.PI / 2) * 3
        sharedPlayerPos.copy(posRef.current)
      }
    } else {
      // ── On-foot controls ────────────────────────────────────────────────
      // Keyboard left/right = turn; touch left/right = STRAFE (not turn)
      const turnSpeed = 2.2 * delta
      if (kb.left)  rotRef.current.value += turnSpeed
      if (kb.right) rotRef.current.value -= turnSpeed

      const speed = controls.run ? 9 : 5.5
      const fwdX = Math.sin(rotRef.current.value)
      const fwdZ = Math.cos(rotRef.current.value)
      // Perpendicular direction for strafing
      const strX =  Math.cos(rotRef.current.value)
      const strZ = -Math.sin(rotRef.current.value)

      let newX = posRef.current.x
      let newZ = posRef.current.z
      if (controls.forward) { newX += fwdX * speed * delta; newZ += fwdZ * speed * delta }
      if (controls.back)    { newX -= fwdX * speed * delta * 0.6; newZ -= fwdZ * speed * delta * 0.6 }
      // Touch joystick X → strafe (keyboard left/right already handled as turn above)
      if (touchState.strafeLeft)  { newX -= strX * speed * delta; newZ -= strZ * speed * delta }
      if (touchState.strafeRight) { newX += strX * speed * delta; newZ += strZ * speed * delta }

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
          if (!vRef.occupied && posRef.current.distanceTo(vRef.pos) < 4) {
            vRef.occupied = true
            sharedInVehicle.value = true
            sharedVehicleId.value = id
            setInVehicle(true)
            posRef.current.copy(vRef.pos)
            posRef.current.y = 0.9
            rotRef.current.value = vRef.rot
            sharedPlayerPos.copy(posRef.current)
            break
          }
        }
      }

      // Shoot — ray from eye in facing direction (accounts for pitch)
      if (controls.shoot && fireCooldown.current <= 0) {
        fireCooldown.current = 0.25
        if (useAmmo()) {
          const pitch = pitchRef.current
          const rot   = rotRef.current.value
          const dir = new THREE.Vector3(
            Math.sin(rot) * Math.cos(pitch),
            Math.sin(pitch),
            Math.cos(rot) * Math.cos(pitch)
          ).normalize()
          const origin = new THREE.Vector3(
            posRef.current.x,
            posRef.current.y + 1.55, // eye height
            posRef.current.z
          )
          onShoot(origin, dir)
        }
      }
    }

    // Sync player group (visible — third-person)
    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.y = rotRef.current.value
    groupRef.current.visible = true

    // ── Third-person camera (behind the player at shoulder height) ───────────
    const pitch = pitchRef.current
    const CAM_DIST   = 5   // how far behind
    const CAM_HEIGHT = 1.6 // shoulder/head height offset

    // Camera collision: step from desired camera pos toward player until clear
    const safeCamera = (
      originX: number, originY: number, originZ: number,
      desiredX: number, desiredY: number, desiredZ: number
    ) => {
      const steps = 10
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const cx = desiredX + (originX - desiredX) * t
        const cz = desiredZ + (originZ - desiredZ) * t
        if (!isInsideBuilding(cx, cz, 0.3)) {
          return { x: cx, y: desiredY + (originY - desiredY) * t, z: cz }
        }
      }
      return { x: originX, y: originY, z: originZ }
    }

    if (sharedInVehicle.value) {
      const vRef = vehicleRefs.get(sharedVehicleId.value)
      if (vRef) {
        const rot = vRef.rot
        const tx = vRef.pos.x
        const ty = 0.9
        const tz = vRef.pos.z
        const desiredX = tx - Math.sin(rot) * CAM_DIST
        const desiredY = ty + CAM_HEIGHT
        const desiredZ = tz - Math.cos(rot) * CAM_DIST
        const cam = safeCamera(tx, ty + CAM_HEIGHT, tz, desiredX, desiredY, desiredZ)
        camera.position.set(cam.x, cam.y, cam.z)
        camera.lookAt(tx + Math.sin(rot) * 3, ty + 0.6, tz + Math.cos(rot) * 3)
      }
    } else {
      const rot = rotRef.current.value
      const px = posRef.current.x
      const py = posRef.current.y
      const pz = posRef.current.z
      const desiredX = px - Math.sin(rot) * CAM_DIST
      const desiredY = py + CAM_HEIGHT
      const desiredZ = pz - Math.cos(rot) * CAM_DIST
      const cam = safeCamera(px, py + CAM_HEIGHT, pz, desiredX, desiredY, desiredZ)
      camera.position.set(cam.x, cam.y, cam.z)
      camera.lookAt(px + Math.sin(rot) * 3, py + 1.0, pz + Math.cos(rot) * 3)
    }
  })

  return (
    <group ref={groupRef} position={[sharedPlayerPos.x, sharedPlayerPos.y, sharedPlayerPos.z]}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.65, 1.1, 0.5]} />
        <meshStandardMaterial color="#ff6600" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ffaa80" />
      </mesh>
      {/* Legs (hidden when in vehicle) */}
      {!sharedInVehicle.value && (
        <>
          <mesh position={[-0.17, 0.2, 0]}>
            <boxGeometry args={[0.22, 0.45, 0.22]} />
            <meshStandardMaterial color="#1a3a5a" />
          </mesh>
          <mesh position={[0.17, 0.2, 0]}>
            <boxGeometry args={[0.22, 0.45, 0.22]} />
            <meshStandardMaterial color="#1a3a5a" />
          </mesh>
        </>
      )}
      {/* Gun arm */}
      <mesh position={[0.4, 0.9, 0.2]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.15, 0.5, 0.15]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  )
}

// ─── Lighting based on time of day ────────────────────────────────────────────
function DynamicLighting({ timeOfDay }: { timeOfDay: number }) {
  const ambientRef = useRef<THREE.AmbientLight>(null!)
  const dirRef = useRef<THREE.DirectionalLight>(null!)

  const isDay = timeOfDay >= 6 && timeOfDay <= 20
  const isDawn = timeOfDay >= 6 && timeOfDay < 9
  const isDusk = timeOfDay >= 17 && timeOfDay <= 20

  let ambientIntensity = isDay ? 0.6 : 0.1
  let ambientColor = '#ffffff'
  let dirIntensity = isDay ? 1.2 : 0.0
  let dirColor = '#ffffff'
  let skyColor = '#87ceeb'

  if (isDawn || isDusk) {
    ambientColor = '#ffaa66'
    dirColor = '#ff8844'
    ambientIntensity = 0.4
    skyColor = isDawn ? '#ff9944' : '#ff6622'
  } else if (!isDay) {
    skyColor = '#0a0a2a'
  }

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <ambientLight ref={ambientRef} intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        ref={dirRef}
        position={[50, 80, 50]}
        intensity={dirIntensity}
        color={dirColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      {/* Street light glow at night */}
      {!isDay && (
        <pointLight position={[0, 8, 0]} intensity={0.8} color="#ffee88" distance={40} />
      )}
      <fog attach="fog" args={[skyColor, 60, 200]} />
    </>
  )
}

// ─── Minimap dot collector ─────────────────────────────────────────────────────
let minimapDots: Array<{ x: number; z: number; color: string; size: number }> = []

function MinimapCollector() {
  const setMinimapDots = useGameStore((s) => s.setMinimapDots)
  const setPlayerPos   = useGameStore((s) => s.setPlayerPos)
  const frameCount = useRef(0)

  useFrame(() => {
    frameCount.current++
    if (frameCount.current % 6 !== 0) return // Update every 6 frames

    const dots: typeof minimapDots = []
    for (const [, v] of vehicleRefs) {
      dots.push({ x: v.pos.x, z: v.pos.z, color: v.color, size: 5 })
    }
    for (const [, n] of npcRefs) {
      if (n.state !== 'dead') dots.push({ x: n.pos.x, z: n.pos.z, color: '#88ff88', size: 3 })
    }
    for (const [, p] of policeRefs) {
      if (p.health > 0) dots.push({ x: p.pos.x, z: p.pos.z, color: '#4466ff', size: 4 })
    }
    setMinimapDots(dots)
    setPlayerPos(sharedPlayerPos.x, sharedPlayerPos.z)
  })
  return null
}

// ─── Police Spawner ───────────────────────────────────────────────────────────
const MAX_POLICE = 4
let policeIdCounter = 0

function spawnPolice(wantedLevel: number) {
  const count = Math.min(wantedLevel, MAX_POLICE)
  // Remove excess
  const ids = Array.from(policeRefs.keys())
  while (ids.length > count) {
    policeRefs.delete(ids.pop()!)
  }
  // Add if needed
  while (policeRefs.size < count) {
    const id = `police${policeIdCounter++}`
    const angle = Math.random() * Math.PI * 2
    const spawnDist = 40 + Math.random() * 30
    const spawnX = sharedPlayerPos.x + Math.cos(angle) * spawnDist
    const spawnZ = sharedPlayerPos.z + Math.sin(angle) * spawnDist
    policeRefs.set(id, {
      pos: new THREE.Vector3(
        Math.max(-100, Math.min(100, spawnX)),
        0,
        Math.max(-100, Math.min(100, spawnZ))
      ),
      dir: 0,
      health: 100,
      shootTimer: 0,
      mesh: null,
    })
  }
}

// ─── Main GameScene ────────────────────────────────────────────────────────────
export default function GameScene() {
  const [bullets, setBullets] = useState<BulletRef[]>([])
  const [policeIds, setPoliceIds] = useState<string[]>([])
  const [timeOfDay, setTimeOfDay] = useState(10)

  const timeRef = useRef(10)
  const wantedDecayRef = useRef(0)
  const wantedLevel = useGameStore((s) => s.wantedLevel)
  const { takeDamage, setWantedLevel, incrementWanted, addMoney, addScore, isGameOver } =
    useGameStore()

  // Time of day cycle
  useFrame((_, delta) => {
    timeRef.current += delta * 0.05 // 1 game hour per 20 real seconds
    if (timeRef.current >= 24) timeRef.current = 0
    const tod = Math.floor(timeRef.current * 10) / 10
    if (Math.floor(tod) !== Math.floor(timeRef.current - delta * 0.05)) {
      setTimeOfDay(tod)
    }

    // Wanted level decay when hiding
    if (sharedWantedLevel.value > 0) {
      wantedDecayRef.current += delta
      if (wantedDecayRef.current > 30) {
        wantedDecayRef.current = 0
        sharedWantedLevel.value = Math.max(0, sharedWantedLevel.value - 1)
        setWantedLevel(sharedWantedLevel.value)
      }
    }

    // (player pos written to store by MinimapCollector)
  })

  // Police spawning when wanted level changes
  useEffect(() => {
    sharedWantedLevel.value = wantedLevel
    spawnPolice(wantedLevel)
    setPoliceIds(Array.from(policeRefs.keys()))
  }, [wantedLevel])

  const handleShoot = useCallback((pos: THREE.Vector3, dir: THREE.Vector3) => {
    const id = `b${Date.now()}_${Math.random().toString(36).slice(2)}`
    const newBullet: BulletRef = {
      id,
      pos: pos.clone(),
      dir: dir.clone(),
      age: 0,
      owner: 'player',
      mesh: null,
    }
    bulletRefs = [...bulletRefs, newBullet]
    setBullets([...bulletRefs])
  }, [])

  const handlePoliceShoot = useCallback(() => {
    const id = `pb${Date.now()}_${Math.random().toString(36).slice(2)}`
    // Find shooting police
    for (const [, police] of policeRefs) {
      if (police.pos.distanceTo(sharedPlayerPos) < 6) {
        const dir = sharedPlayerPos.clone().sub(police.pos).normalize()
        dir.y = 0
        const newBullet: BulletRef = {
          id,
          pos: police.pos.clone().add(new THREE.Vector3(0, 1, 0)),
          dir,
          age: 0,
          owner: 'police',
          mesh: null,
        }
        bulletRefs = [...bulletRefs, newBullet]
        setBullets([...bulletRefs])
        break
      }
    }
  }, [])

  const handleBulletExpire = useCallback((id: string) => {
    bulletRefs = bulletRefs.filter((b) => b.id !== id)
    setBullets([...bulletRefs])
  }, [])

  const handleHitNPC = useCallback(
    (id: string) => {
      const npc = npcRefs.get(id)
      if (!npc || npc.state === 'dead') return
      npc.health -= 34
      if (npc.health <= 0) {
        npc.state = 'dead'
        addMoney(50)
        addScore(100)
        // Increase wanted
        incrementWanted()
        sharedWantedLevel.value = Math.min(5, sharedWantedLevel.value + 1)
        wantedDecayRef.current = 0
        spawnPolice(sharedWantedLevel.value)
        setPoliceIds(Array.from(policeRefs.keys()))
      }
    },
    [addMoney, addScore, incrementWanted]
  )

  const handleHitPolice = useCallback(
    (id: string) => {
      const police = policeRefs.get(id)
      if (!police || police.health <= 0) return
      police.health -= 40
      addScore(150)
      if (police.health <= 0) {
        addMoney(100)
        addScore(250)
        incrementWanted()
        sharedWantedLevel.value = Math.min(5, sharedWantedLevel.value + 2)
        wantedDecayRef.current = 0
      }
    },
    [addMoney, addScore, incrementWanted]
  )

  // Police bullet hitting player
  const handlePoliceBulletHitPlayer = useCallback(() => {
    takeDamage(12)
  }, [takeDamage])

  if (isGameOver) {
    return <DynamicLighting timeOfDay={timeOfDay} />
  }

  return (
    <>
      <DynamicLighting timeOfDay={timeOfDay} />

      <City />

      {/* Vehicles */}
      {INITIAL_VEHICLES.map((v) => (
        <Vehicle key={v.id} vehicleId={v.id} />
      ))}

      {/* NPCs */}
      {INITIAL_NPCS.map((n) => (
        <NPC key={n.id} npcId={n.id} />
      ))}

      {/* Police */}
      {policeIds.map((id) =>
        policeRefs.has(id) ? (
          <PoliceUnit key={id} policeId={id} onShootPlayer={handlePoliceShoot} />
        ) : null
      )}

      {/* Bullets */}
      {bullets.map((bullet) => (
        <Bullet
          key={bullet.id}
          bullet={bullet}
          onExpire={handleBulletExpire}
          onHitNPC={handleHitNPC}
          onHitPolice={handleHitPolice}
        />
      ))}

      {/* Player */}
      <Player onShoot={handleShoot} />

      {/* Minimap + player pos → Zustand store → HUD rendered in App.tsx */}
      <MinimapCollector />
    </>
  )
}
