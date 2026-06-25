import * as THREE from 'three'

export interface BuildingData {
  id: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  color: string
}

export interface VehicleInitData {
  id: string
  x: number
  z: number
  rot: number
  color: string
}

export interface NPCInitData {
  id: string
  x: number
  z: number
  color: string
  speed: number
}

// Pre-calculated city buildings (no Math.random in render)
export const CITY_BUILDINGS: BuildingData[] = [
  // Downtown skyscrapers (center)
  { id: 'b0', x: -8, z: -8, width: 12, depth: 12, height: 52, color: '#2a3a4a' },
  { id: 'b1', x: 8, z: -8, width: 10, depth: 10, height: 44, color: '#1e2e3e' },
  { id: 'b2', x: -8, z: 8, width: 10, depth: 10, height: 40, color: '#2e3e4e' },
  { id: 'b3', x: 8, z: 8, width: 12, depth: 12, height: 48, color: '#1a2a3a' },

  // Mid-rise buildings near downtown
  { id: 'b4', x: -42, z: 0, width: 16, depth: 20, height: 30, color: '#3a4a5a' },
  { id: 'b5', x: 42, z: 0, width: 16, depth: 20, height: 28, color: '#4a3a5a' },
  { id: 'b6', x: 0, z: -42, width: 20, depth: 16, height: 26, color: '#3a5a4a' },
  { id: 'b7', x: 0, z: 42, width: 20, depth: 16, height: 24, color: '#5a4a3a' },

  // Downtown diagonal blocks
  { id: 'b8', x: -36, z: -36, width: 12, depth: 12, height: 22, color: '#445566' },
  { id: 'b9', x: -22, z: -45, width: 10, depth: 14, height: 18, color: '#556677' },
  { id: 'b10', x: 36, z: -36, width: 12, depth: 12, height: 20, color: '#445566' },
  { id: 'b11', x: 22, z: -45, width: 10, depth: 14, height: 16, color: '#556677' },
  { id: 'b12', x: -36, z: 36, width: 12, depth: 12, height: 24, color: '#445566' },
  { id: 'b13', x: -22, z: 45, width: 10, depth: 14, height: 19, color: '#556677' },
  { id: 'b14', x: 36, z: 36, width: 12, depth: 12, height: 21, color: '#445566' },
  { id: 'b15', x: 22, z: 45, width: 10, depth: 14, height: 17, color: '#556677' },

  // Mid-city commercial
  { id: 'b16', x: -75, z: 0, width: 18, depth: 12, height: 14, color: '#667788' },
  { id: 'b17', x: -75, z: -20, width: 14, depth: 10, height: 10, color: '#778899' },
  { id: 'b18', x: -75, z: 20, width: 14, depth: 10, height: 8, color: '#667788' },
  { id: 'b19', x: 75, z: 0, width: 18, depth: 12, height: 12, color: '#668877' },
  { id: 'b20', x: 75, z: -20, width: 14, depth: 10, height: 10, color: '#778899' },
  { id: 'b21', x: 75, z: 20, width: 14, depth: 10, height: 9, color: '#668877' },
  { id: 'b22', x: 0, z: -75, width: 12, depth: 18, height: 11, color: '#667788' },
  { id: 'b23', x: -20, z: -75, width: 10, depth: 14, height: 8, color: '#778899' },
  { id: 'b24', x: 20, z: -75, width: 10, depth: 14, height: 10, color: '#667788' },
  { id: 'b25', x: 0, z: 75, width: 12, depth: 18, height: 10, color: '#778877' },
  { id: 'b26', x: -20, z: 75, width: 10, depth: 14, height: 8, color: '#887766' },
  { id: 'b27', x: 20, z: 75, width: 10, depth: 14, height: 11, color: '#778899' },

  // Outer residential blocks
  { id: 'b28', x: -75, z: -75, width: 14, depth: 14, height: 6, color: '#aabbcc' },
  { id: 'b29', x: -60, z: -75, width: 10, depth: 10, height: 5, color: '#bbaacc' },
  { id: 'b30', x: -75, z: -60, width: 10, depth: 10, height: 4, color: '#ccbbaa' },
  { id: 'b31', x: 75, z: -75, width: 14, depth: 14, height: 7, color: '#aaccbb' },
  { id: 'b32', x: 60, z: -75, width: 10, depth: 10, height: 5, color: '#bbccaa' },
  { id: 'b33', x: 75, z: -60, width: 10, depth: 10, height: 6, color: '#ccaabb' },
  { id: 'b34', x: -75, z: 75, width: 14, depth: 14, height: 5, color: '#aabbcc' },
  { id: 'b35', x: -60, z: 75, width: 10, depth: 10, height: 6, color: '#bbaacc' },
  { id: 'b36', x: -75, z: 60, width: 10, depth: 10, height: 4, color: '#ccbbaa' },
  { id: 'b37', x: 75, z: 75, width: 14, depth: 14, height: 6, color: '#aaccbb' },
  { id: 'b38', x: 60, z: 75, width: 10, depth: 10, height: 5, color: '#bbccaa' },
  { id: 'b39', x: 75, z: 60, width: 10, depth: 10, height: 7, color: '#ccaabb' },

  // Industrial area (back left)
  { id: 'b40', x: -75, z: -40, width: 22, depth: 14, height: 8, color: '#8a7a6a' },
  { id: 'b41', x: -55, z: -60, width: 18, depth: 18, height: 6, color: '#7a8a6a' },
  { id: 'b42', x: -40, z: -75, width: 14, depth: 22, height: 9, color: '#6a7a8a' },

  // More scattered buildings
  { id: 'b43', x: -40, z: -40, width: 12, depth: 12, height: 12, color: '#556688' },
  { id: 'b44', x: 40, z: -40, width: 12, depth: 12, height: 10, color: '#665588' },
  { id: 'b45', x: -40, z: 40, width: 12, depth: 12, height: 11, color: '#558866' },
  { id: 'b46', x: 40, z: 40, width: 12, depth: 12, height: 13, color: '#886655' },

  // Extra buildings for density
  { id: 'b47', x: -55, z: 0, width: 8, depth: 14, height: 18, color: '#4a5566' },
  { id: 'b48', x: 55, z: 0, width: 8, depth: 14, height: 15, color: '#554a66' },
  { id: 'b49', x: 0, z: -55, width: 14, depth: 8, height: 16, color: '#4a6655' },
  { id: 'b50', x: 0, z: 55, width: 14, depth: 8, height: 17, color: '#66554a' },
]

// Pre-calculated vehicle positions
export const INITIAL_VEHICLES: VehicleInitData[] = [
  { id: 'v0', x: -55, z: -20, rot: 0, color: '#cc3333' },
  { id: 'v1', x: -55, z: 20, rot: 0, color: '#3344cc' },
  { id: 'v2', x: 55, z: -20, rot: Math.PI, color: '#33bb44' },
  { id: 'v3', x: 55, z: 20, rot: Math.PI, color: '#ccaa33' },
  { id: 'v4', x: -20, z: -55, rot: Math.PI / 2, color: '#cc33aa' },
  { id: 'v5', x: 20, z: -55, rot: Math.PI / 2, color: '#33aacc' },
  { id: 'v6', x: -20, z: 55, rot: -Math.PI / 2, color: '#cc7733' },
  { id: 'v7', x: 20, z: 55, rot: -Math.PI / 2, color: '#7733cc' },
  { id: 'v8', x: -90, z: 15, rot: 0, color: '#44cc66' },
  { id: 'v9', x: 90, z: -15, rot: Math.PI, color: '#cc6644' },
  { id: 'v10', x: 15, z: -90, rot: Math.PI / 2, color: '#6644cc' },
  { id: 'v11', x: -15, z: 90, rot: -Math.PI / 2, color: '#cc4466' },
]

// Pre-calculated NPC positions (diverse spread across the city)
export const INITIAL_NPCS: NPCInitData[] = [
  { id: 'npc0', x: -65, z: -65, color: '#cc8844', speed: 1.5 },
  { id: 'npc1', x: -65, z: -35, color: '#aa4488', speed: 1.8 },
  { id: 'npc2', x: -65, z: 0, color: '#44aa88', speed: 2.0 },
  { id: 'npc3', x: -65, z: 35, color: '#8844aa', speed: 1.6 },
  { id: 'npc4', x: -65, z: 65, color: '#44aacc', speed: 1.9 },
  { id: 'npc5', x: -35, z: -65, color: '#cc4444', speed: 2.1 },
  { id: 'npc6', x: -35, z: -30, color: '#44cc88', speed: 1.7 },
  { id: 'npc7', x: -35, z: 30, color: '#8844cc', speed: 1.5 },
  { id: 'npc8', x: -35, z: 65, color: '#cc8888', speed: 1.8 },
  { id: 'npc9', x: 0, z: -65, color: '#88cc44', speed: 2.0 },
  { id: 'npc10', x: 0, z: -30, color: '#4488cc', speed: 1.6 },
  { id: 'npc11', x: 0, z: 30, color: '#cc4488', speed: 1.9 },
  { id: 'npc12', x: 0, z: 65, color: '#88aacc', speed: 1.7 },
  { id: 'npc13', x: 35, z: -65, color: '#ccaa88', speed: 2.2 },
  { id: 'npc14', x: 35, z: -30, color: '#88ccaa', speed: 1.5 },
  { id: 'npc15', x: 35, z: 30, color: '#aa88cc', speed: 1.8 },
  { id: 'npc16', x: 35, z: 65, color: '#cc88aa', speed: 1.6 },
  { id: 'npc17', x: 65, z: -65, color: '#44ccaa', speed: 2.0 },
  { id: 'npc18', x: 65, z: -35, color: '#aacc44', speed: 1.7 },
  { id: 'npc19', x: 65, z: 0, color: '#cc44aa', speed: 1.9 },
  { id: 'npc20', x: 65, z: 35, color: '#aa44cc', speed: 1.5 },
  { id: 'npc21', x: 65, z: 65, color: '#44aacc', speed: 2.1 },
  { id: 'npc22', x: -30, z: 0, color: '#cc8844', speed: 1.6 },
  { id: 'npc23', x: 30, z: 0, color: '#44cc44', speed: 1.8 },
  { id: 'npc24', x: 0, z: 0, color: '#cc4444', speed: 2.0 },
]

// Collision detection against buildings
export function isInsideBuilding(x: number, z: number, radius = 0.6): boolean {
  for (const b of CITY_BUILDINGS) {
    const halfW = b.width / 2 + radius
    const halfD = b.depth / 2 + radius
    if (x >= b.x - halfW && x <= b.x + halfW && z >= b.z - halfD && z <= b.z + halfD) {
      return true
    }
  }
  return false
}

export function resolveCollision(
  pos: THREE.Vector3,
  newX: number,
  newZ: number,
  radius = 0.6
): { x: number; z: number } {
  // Try X movement
  if (!isInsideBuilding(newX, pos.z, radius)) {
    if (!isInsideBuilding(newX, newZ, radius)) {
      return { x: newX, z: newZ }
    }
    return { x: newX, z: pos.z }
  }
  // Try Z movement
  if (!isInsideBuilding(pos.x, newZ, radius)) {
    return { x: pos.x, z: newZ }
  }
  // No movement possible
  return { x: pos.x, z: pos.z }
}
