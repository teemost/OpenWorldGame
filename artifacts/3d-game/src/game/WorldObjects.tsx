import { Html } from '@react-three/drei'
import type { GasStationData, HouseData, ShopData } from './cityData'

const SHOP_ACCENT: Record<string, string> = {
  ammo: '#cc4422', medic: '#22aa44', weapons: '#5522cc',
}

// ─── Gas Station ───────────────────────────────────────────────────────────────
export function GasStation({ gs }: { gs: GasStationData }) {
  return (
    <group position={[gs.x, 0, gs.z]} rotation-y={gs.rot}>
      {/* Canopy support columns */}
      {([[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]] as [number,number][]).map(([cx, cz], i) => (
        <mesh key={i} position={[cx, 2.5, cz]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 5, 8]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Canopy roof */}
      <mesh position={[0, 5.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 0.3, 9]} />
        <meshStandardMaterial color="#cc2222" roughness={0.8} />
      </mesh>
      {/* Canopy underside */}
      <mesh position={[0, 4.92, 0]}>
        <boxGeometry args={[9.8, 0.1, 8.8]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.9} />
      </mesh>
      {/* Office building */}
      <mesh position={[0, 1.5, -5.5]} castShadow>
        <boxGeometry args={[7, 3, 3]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.85} />
      </mesh>
      {/* Office window */}
      <mesh position={[0, 1.6, -3.96]}>
        <boxGeometry args={[3, 1.2, 0.05]} />
        <meshStandardMaterial color="#88aacc" transparent opacity={0.6} roughness={0.04} />
      </mesh>
      {/* Office door */}
      <mesh position={[-2, 0.9, -3.96]}>
        <boxGeometry args={[0.9, 1.8, 0.04]} />
        <meshStandardMaterial color="#885522" roughness={0.7} />
      </mesh>
      {/* Office roof lip */}
      <mesh position={[0, 3.15, -5.5]}>
        <boxGeometry args={[7.4, 0.3, 3.4]} />
        <meshStandardMaterial color="#cc2222" roughness={0.8} />
      </mesh>
      {/* Fuel pumps */}
      {([[-1.8, 0], [1.8, 0]] as [number,number][]).map(([px, pz], i) => (
        <group key={i} position={[px, 0, pz]}>
          {/* Pump body */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.55, 1.8, 0.32]} />
            <meshStandardMaterial color="#f0f0e0" roughness={0.6} />
          </mesh>
          {/* Pump display */}
          <mesh position={[0, 1.6, 0.17]}>
            <boxGeometry args={[0.3, 0.28, 0.04]} />
            <meshStandardMaterial color="#112233" emissive="#004488" emissiveIntensity={1} />
          </mesh>
          {/* Hose */}
          <mesh position={[0.3, 1.2, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[0.04, 0.6, 0.04]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* ⛽ price sign pole */}
      <mesh position={[5.5, 2.5, -4]}>
        <cylinderGeometry args={[0.05, 0.07, 5, 6]} />
        <meshStandardMaterial color="#555" metalness={0.7} />
      </mesh>
      <mesh position={[5.5, 5.2, -4]}>
        <boxGeometry args={[1.4, 0.7, 0.08]} />
        <meshStandardMaterial color="#cc2222" emissive="#880000" emissiveIntensity={0.5} />
      </mesh>
      {/* Canopy under-light */}
      <pointLight position={[0, 4.5, 0]} color="#ffe8aa" intensity={35} distance={16} decay={2} castShadow={false} />
    </group>
  )
}

// ─── Shop Building ─────────────────────────────────────────────────────────────
export function ShopBuilding({ shop }: { shop: ShopData }) {
  const accent = SHOP_ACCENT[shop.type] ?? '#336699'
  return (
    <group position={[shop.x, 0, shop.z]} rotation-y={shop.rot}>
      {/* Main building body */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 4, 8]} />
        <meshStandardMaterial color="#d8d0c8" roughness={0.85} />
      </mesh>
      {/* Colored roof band */}
      <mesh position={[0, 4.22, 0]}>
        <boxGeometry args={[8.4, 0.44, 8.4]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      {/* Storefront glass */}
      <mesh position={[0, 1.4, 4.06]}>
        <boxGeometry args={[5.5, 2, 0.06]} />
        <meshStandardMaterial color="#aaccee" transparent opacity={0.55} roughness={0.04} metalness={0.1} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0, 4.08]}>
        <boxGeometry args={[1.1, 2.6, 0.04]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 2.95, 4.5]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[7.2, 0.06, 1.6]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      {/* Neon sign strip */}
      <mesh position={[0, 3.75, 4.14]}>
        <boxGeometry args={[6.2, 0.55, 0.12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} roughness={0.4} />
      </mesh>
      {/* Side walls for depth */}
      <mesh position={[-4.02, 2, 0]}>
        <boxGeometry args={[0.04, 4, 8]} />
        <meshStandardMaterial color="#c8c0b8" roughness={0.9} />
      </mesh>
      <mesh position={[4.02, 2, 0]}>
        <boxGeometry args={[0.04, 4, 8]} />
        <meshStandardMaterial color="#c8c0b8" roughness={0.9} />
      </mesh>
      {/* Shop entrance light */}
      <pointLight position={[0, 3.2, 3.5]} color="#ffe8cc" intensity={18} distance={12} decay={2} castShadow={false} />
    </group>
  )
}

// ─── Enterable House ───────────────────────────────────────────────────────────
export function EnterableHouse({ house }: { house: HouseData }) {
  const doorLocalX = house.doorX - house.x
  const doorLocalZ = house.doorZ - house.z
  // Door face direction (normalized)
  const dLen = Math.sqrt(doorLocalX ** 2 + doorLocalZ ** 2) || 1
  const dfX = doorLocalX / dLen
  const dfZ = doorLocalZ / dLen

  return (
    <group position={[house.x, 0, house.z]}>
      {/* House body */}
      <mesh position={[0, house.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[house.width, house.height, house.depth]} />
        <meshStandardMaterial color={house.color} roughness={0.88} />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0, house.height + 0.2, 0]}>
        <boxGeometry args={[house.width + 0.5, 0.4, house.depth + 0.5]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>
      {/* Roof parapet detail */}
      <mesh position={[0, house.height + 0.45, 0]}>
        <boxGeometry args={[house.width + 0.8, 0.1, house.depth + 0.8]} />
        <meshStandardMaterial color={house.color} roughness={0.88} />
      </mesh>
      {/* Door (on the face nearest to door trigger) */}
      <mesh position={[dfX * (house.depth / 2 + 0.02), 1.1, dfZ * (house.depth / 2 + 0.02)]}>
        <boxGeometry args={[0.9, 2.2, 0.08]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>
      {/* Front window */}
      <mesh position={[dfX * (house.depth / 2 + 0.02) + dfZ * 1.5, 2.5, dfZ * (house.depth / 2 + 0.02) + dfX * 1.5]}>
        <boxGeometry args={[Math.abs(dfZ) > 0.5 ? 1.4 : 0.08, 1.0, Math.abs(dfX) > 0.5 ? 1.4 : 0.08]} />
        <meshStandardMaterial color="#aaccee" transparent opacity={0.6} roughness={0.04} />
      </mesh>
      {/* Yellow door trigger glow circle */}
      <mesh position={[doorLocalX, 0.04, doorLocalZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 24]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffcc00"
          emissiveIntensity={2.5}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      {/* House nameplate above door */}
      <Html
        position={[doorLocalX, house.height + 1.5, doorLocalZ]}
        center
        distanceFactor={16}
        occlude
      >
        <div style={{
          color: '#ffee55',
          fontSize: 10,
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.75)',
          padding: '2px 7px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,0,0.4)',
          pointerEvents: 'none',
        }}>
          🏠 {house.label}
        </div>
      </Html>
    </group>
  )
}

// ─── Interior Room ─────────────────────────────────────────────────────────────
export function InteriorRoom({ houseIdx }: { houseIdx: number }) {
  const x = 600 + houseIdx * 30
  return (
    <group>
      {/* Position interior at far-off location in world space (origin of group = world) */}
      <group position={[x, 0, 0]}>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#a07850" roughness={0.88} />
        </mesh>
        {/* Ceiling */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#f5f0ea" roughness={0.9} />
        </mesh>

        {/* Back wall */}
        <mesh position={[0, 2, -5]}>
          <boxGeometry args={[10, 4, 0.15]} />
          <meshStandardMaterial color="#e8e0d2" roughness={0.85} />
        </mesh>
        {/* Front wall (entry side) */}
        <mesh position={[0, 2, 5]}>
          <boxGeometry args={[10, 4, 0.15]} />
          <meshStandardMaterial color="#e8e0d2" roughness={0.85} />
        </mesh>
        {/* Right wall */}
        <mesh position={[5, 2, 0]}>
          <boxGeometry args={[0.15, 4, 10]} />
          <meshStandardMaterial color="#ddd8ca" roughness={0.85} />
        </mesh>
        {/* Left wall (exit door side) */}
        <mesh position={[-5, 2, -2]}>
          <boxGeometry args={[0.15, 4, 6]} />
          <meshStandardMaterial color="#ddd8ca" roughness={0.85} />
        </mesh>
        <mesh position={[-5, 2, 4]}>
          <boxGeometry args={[0.15, 4, 2]} />
          <meshStandardMaterial color="#ddd8ca" roughness={0.85} />
        </mesh>
        {/* Left wall top (above door) */}
        <mesh position={[-5, 3.3, 2]}>
          <boxGeometry args={[0.15, 1.4, 2]} />
          <meshStandardMaterial color="#ddd8ca" roughness={0.85} />
        </mesh>

        {/* Furniture — bed */}
        <mesh position={[2.5, 0.3, -2.5]} castShadow>
          <boxGeometry args={[2, 0.6, 3.5]} />
          <meshStandardMaterial color="#6688aa" roughness={0.8} />
        </mesh>
        <mesh position={[2.5, 0.65, -4]}>
          <boxGeometry args={[2, 0.6, 0.5]} />
          <meshStandardMaterial color="#f0e8d0" roughness={0.7} />
        </mesh>
        <mesh position={[2.5, 0.62, -2.5]}>
          <boxGeometry args={[1.8, 0.1, 3.2]} />
          <meshStandardMaterial color="#f5f0e8" roughness={0.5} />
        </mesh>

        {/* Furniture — table & chair */}
        <mesh position={[-2, 0.77, 2]} castShadow>
          <boxGeometry args={[1.4, 0.08, 0.9]} />
          <meshStandardMaterial color="#7a5020" roughness={0.7} />
        </mesh>
        {[[-2.58, 0.4, 1.65], [-2.58, 0.4, 2.35], [-1.42, 0.4, 1.65], [-1.42, 0.4, 2.35]].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]}>
            <boxGeometry args={[0.08, 0.75, 0.08]} />
            <meshStandardMaterial color="#7a5020" roughness={0.8} />
          </mesh>
        ))}

        {/* Interior ceiling light */}
        <mesh position={[0, 3.95, 0]}>
          <boxGeometry args={[1.2, 0.08, 1.2]} />
          <meshStandardMaterial color="#fff8e0" emissive="#ffee88" emissiveIntensity={3} />
        </mesh>
        <pointLight position={[0, 3.5, 0]} color="#ffe4c0" intensity={50} distance={18} decay={2} castShadow={false} />
        <ambientLight intensity={1.5} color="#ffe4c0" />

        {/* Exit door glow on left wall */}
        <mesh position={[-4.92, 1.3, 2.5]}>
          <boxGeometry args={[0.1, 2.2, 1.1]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffcc00" emissiveIntensity={3} transparent opacity={0.7} depthWrite={false} />
        </mesh>
        <Html position={[-4.2, 2.8, 2.5]} center distanceFactor={10}>
          <div style={{
            color: '#ffee55',
            fontSize: 11,
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.8)',
            padding: '3px 10px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,0,0.5)',
            pointerEvents: 'none',
          }}>
            [ E ]  Exit House
          </div>
        </Html>
      </group>
    </group>
  )
}
