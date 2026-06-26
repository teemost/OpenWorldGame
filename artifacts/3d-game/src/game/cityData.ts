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
  gender: 'male' | 'female'
}

export interface GasStationData {
  id: string
  x: number
  z: number
  rot: number
}

export interface HouseData {
  id: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  color: string
  doorX: number
  doorZ: number
  label: string
  interiorIdx: number
}

export interface ShopData {
  id: string
  x: number
  z: number
  rot: number
  type: 'ammo' | 'medic' | 'weapons'
  label: string
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

  // Outer ring buildings (±100-130 suburban zone)
  { id: 'out0', x: -120, z: 60, width: 16, depth: 18, height: 7, color: '#8a9a8a' },
  { id: 'out1', x: -120, z: -60, width: 18, depth: 14, height: 8, color: '#9a8a7a' },
  { id: 'out2', x: 120, z: 60, width: 16, depth: 18, height: 6, color: '#7a8a9a' },
  { id: 'out3', x: 120, z: -60, width: 18, depth: 14, height: 9, color: '#8a7a9a' },
  { id: 'out4', x: 60, z: -120, width: 18, depth: 16, height: 7, color: '#9a8a8a' },
  { id: 'out5', x: -60, z: -120, width: 16, depth: 18, height: 8, color: '#8a9a7a' },
  { id: 'out6', x: 60, z: 120, width: 18, depth: 16, height: 6, color: '#7a9a8a' },
  { id: 'out7', x: -60, z: 120, width: 16, depth: 18, height: 9, color: '#9a7a8a' },

  // Far suburban blocks (around ±100-110)
  { id: 'sub0', x: -100, z: 100, width: 12, depth: 12, height: 5, color: '#aab8aa' },
  { id: 'sub1', x: 100, z: 100, width: 12, depth: 12, height: 5, color: '#b8aaaa' },
  { id: 'sub2', x: -100, z: -100, width: 12, depth: 12, height: 5, color: '#aab8b8' },
  { id: 'sub3', x: 100, z: -100, width: 12, depth: 12, height: 6, color: '#b8b8aa' },
  { id: 'sub4', x: -90, z: 55, width: 10, depth: 10, height: 4, color: '#ccbbaa' },
  { id: 'sub5', x: 90, z: -55, width: 10, depth: 10, height: 4, color: '#aaccbb' },
  { id: 'sub6', x: 55, z: 90, width: 10, depth: 10, height: 5, color: '#bbaacc' },
  { id: 'sub7', x: -55, z: -90, width: 10, depth: 10, height: 5, color: '#ccaabb' },
]

// Gas stations at the four outer corners
export const GAS_STATIONS: GasStationData[] = [
  { id: 'gs0', x: -115, z: 10, rot: 0 },
  { id: 'gs1', x: 115, z: -10, rot: Math.PI },
  { id: 'gs2', x: 10, z: -115, rot: Math.PI / 2 },
  { id: 'gs3', x: -10, z: 115, rot: -Math.PI / 2 },
]

// Enterable houses with door trigger positions and interior slot index
export const ENTERABLE_HOUSES: HouseData[] = [
  { id: 'h0', x: -115, z: 35, width: 10, depth: 12, height: 5, color: '#cc9977', doorX: -109, doorZ: 35, label: 'Johnson Residence', interiorIdx: 0 },
  { id: 'h1', x: -115, z: -35, width: 10, depth: 12, height: 5, color: '#99aa77', doorX: -109, doorZ: -35, label: 'Garcia Family', interiorIdx: 1 },
  { id: 'h2', x: 115, z: 35, width: 10, depth: 12, height: 5, color: '#7799aa', doorX: 109, doorZ: 35, label: 'Chen Apartment', interiorIdx: 2 },
  { id: 'h3', x: 115, z: -35, width: 10, depth: 12, height: 5, color: '#aa9977', doorX: 109, doorZ: -35, label: 'Williams Place', interiorIdx: 3 },
  { id: 'h4', x: 35, z: -115, width: 12, depth: 10, height: 5, color: '#aa7799', doorX: 35, doorZ: -109, label: 'Corner House', interiorIdx: 4 },
  { id: 'h5', x: -35, z: 115, width: 12, depth: 10, height: 5, color: '#77aa99', doorX: -35, doorZ: 109, label: 'Harbor View', interiorIdx: 5 },
]

// Shops — placed in accessible road-adjacent locations
export const SHOPS: ShopData[] = [
  { id: 's0', x: -25, z: -58, rot: 0, type: 'ammo', label: 'Ammo Store' },
  { id: 's1', x: 25, z: 58, rot: Math.PI, type: 'medic', label: 'City Pharmacy' },
  { id: 's2', x: 58, z: -25, rot: -Math.PI / 2, type: 'weapons', label: 'Black Market' },
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
  // Outer ring parked cars
  { id: 'v12', x: -110, z: 0, rot: Math.PI / 2, color: '#885522' },
  { id: 'v13', x: 110, z: 0, rot: -Math.PI / 2, color: '#228855' },
  { id: 'v14', x: 0, z: -110, rot: 0, color: '#552288' },
  { id: 'v15', x: 0, z: 110, rot: Math.PI, color: '#885522' },
]

// Pre-calculated NPC positions
export const INITIAL_NPCS: NPCInitData[] = [
  { id: 'npc0',  x: -65, z: -65, color: '#cc8844', speed: 1.5, gender: 'male'   },
  { id: 'npc1',  x: -65, z: -35, color: '#aa4488', speed: 1.8, gender: 'female' },
  { id: 'npc2',  x: -65, z: 0,   color: '#44aa88', speed: 2.0, gender: 'male'   },
  { id: 'npc3',  x: -65, z: 35,  color: '#8844aa', speed: 1.6, gender: 'female' },
  { id: 'npc4',  x: -65, z: 65,  color: '#44aacc', speed: 1.9, gender: 'male'   },
  { id: 'npc5',  x: -35, z: -65, color: '#cc4444', speed: 2.1, gender: 'female' },
  { id: 'npc6',  x: -35, z: -30, color: '#44cc88', speed: 1.7, gender: 'male'   },
  { id: 'npc7',  x: -35, z: 30,  color: '#8844cc', speed: 1.5, gender: 'female' },
  { id: 'npc8',  x: -35, z: 65,  color: '#cc8888', speed: 1.8, gender: 'male'   },
  { id: 'npc9',  x: 0,   z: -65, color: '#88cc44', speed: 2.0, gender: 'female' },
  { id: 'npc10', x: 0,   z: -30, color: '#4488cc', speed: 1.6, gender: 'male'   },
  { id: 'npc11', x: 0,   z: 30,  color: '#cc4488', speed: 1.9, gender: 'female' },
  { id: 'npc12', x: 0,   z: 65,  color: '#88aacc', speed: 1.7, gender: 'male'   },
  { id: 'npc13', x: 35,  z: -65, color: '#ccaa88', speed: 2.2, gender: 'female' },
  { id: 'npc14', x: 35,  z: -30, color: '#88ccaa', speed: 1.5, gender: 'male'   },
  { id: 'npc15', x: 35,  z: 30,  color: '#aa88cc', speed: 1.8, gender: 'female' },
  { id: 'npc16', x: 35,  z: 65,  color: '#cc88aa', speed: 1.6, gender: 'male'   },
  { id: 'npc17', x: 65,  z: -65, color: '#44ccaa', speed: 2.0, gender: 'female' },
  { id: 'npc18', x: 65,  z: -35, color: '#aacc44', speed: 1.7, gender: 'male'   },
  { id: 'npc19', x: 65,  z: 0,   color: '#cc44aa', speed: 1.9, gender: 'female' },
  { id: 'npc20', x: 65,  z: 35,  color: '#aa44cc', speed: 1.5, gender: 'male'   },
  { id: 'npc21', x: 65,  z: 65,  color: '#44aacc', speed: 2.1, gender: 'female' },
  { id: 'npc22', x: -30, z: 0,   color: '#cc8844', speed: 1.6, gender: 'male'   },
  { id: 'npc23', x: 30,  z: 0,   color: '#44cc44', speed: 1.8, gender: 'female' },
  { id: 'npc24', x: 0,   z: 0,   color: '#cc4444', speed: 2.0, gender: 'male'   },
]

// All buildings used for collision (includes outer ring and special)
const ALL_COLLISION_BUILDINGS = CITY_BUILDINGS

// Collision detection against buildings
export function isInsideBuilding(x: number, z: number, radius = 0.6): boolean {
  for (const b of ALL_COLLISION_BUILDINGS) {
    const halfW = b.width / 2 + radius
    const halfD = b.depth / 2 + radius
    if (x >= b.x - halfW && x <= b.x + halfW && z >= b.z - halfD && z <= b.z + halfD) {
      return true
    }
  }
  for (const h of ENTERABLE_HOUSES) {
    const halfW = h.width / 2 + radius
    const halfD = h.depth / 2 + radius
    if (x >= h.x - halfW && x <= h.x + halfW && z >= h.z - halfD && z <= h.z + halfD) return true
  }
  for (const s of SHOPS) {
    const r = 4 + radius
    if (x >= s.x - r && x <= s.x + r && z >= s.z - r && z <= s.z + r) return true
  }
  return false
}

export function resolveCollision(
  pos: THREE.Vector3,
  newX: number,
  newZ: number,
  radius = 0.6
): { x: number; z: number } {
  if (!isInsideBuilding(newX, pos.z, radius)) {
    if (!isInsideBuilding(newX, newZ, radius)) {
      return { x: newX, z: newZ }
    }
    return { x: newX, z: pos.z }
  }
  if (!isInsideBuilding(pos.x, newZ, radius)) {
    return { x: pos.x, z: newZ }
  }
  return { x: pos.x, z: pos.z }
}
