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
      {/* Convenience store sign */}
      <mesh position={[0, 3.5, -3.94]}>
        <boxGeometry args={[5, 0.6, 0.12]} />
        <meshStandardMaterial color="#ff6600" emissive="#cc4400" emissiveIntensity={1.2} roughness={0.5} />
      </mesh>
      {/* Fuel pumps */}
      {([[-1.8, 0], [1.8, 0]] as [number,number][]).map(([px, pz], i) => (
        <group key={i} position={[px, 0, pz]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.55, 1.8, 0.32]} />
            <meshStandardMaterial color="#f0f0e0" roughness={0.6} />
          </mesh>
          {/* Display screen */}
          <mesh position={[0, 1.6, 0.17]}>
            <boxGeometry args={[0.3, 0.28, 0.04]} />
            <meshStandardMaterial color="#112233" emissive="#004488" emissiveIntensity={1.2} />
          </mesh>
          {/* Price label */}
          <mesh position={[0, 1.1, 0.17]}>
            <boxGeometry args={[0.28, 0.14, 0.04]} />
            <meshStandardMaterial color="#001122" emissive="#002244" emissiveIntensity={0.8} />
          </mesh>
          {/* Hose */}
          <mesh position={[0.3, 1.2, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[0.04, 0.6, 0.04]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* Nozzle */}
          <mesh position={[0.42, 0.92, 0]}>
            <boxGeometry args={[0.07, 0.18, 0.07]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Price sign pole */}
      <mesh position={[5.5, 2.5, -4]}>
        <cylinderGeometry args={[0.05, 0.07, 5, 6]} />
        <meshStandardMaterial color="#555" metalness={0.7} />
      </mesh>
      <mesh position={[5.5, 5.2, -4]}>
        <boxGeometry args={[1.4, 0.7, 0.08]} />
        <meshStandardMaterial color="#cc2222" emissive="#880000" emissiveIntensity={0.5} />
      </mesh>
      {/* Concrete forecourt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#a09080" roughness={0.95} />
      </mesh>
      {/* Yellow line markings */}
      {([-3.5, 3.5] as number[]).map((lx, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.015, 0]}>
          <planeGeometry args={[0.12, 8]} />
          <meshStandardMaterial color="#ffcc00" roughness={0.8} />
        </mesh>
      ))}
      {/* Canopy under-light */}
      <pointLight position={[0, 4.5, 0]} color="#ffe8aa" intensity={35} distance={16} decay={2} castShadow={false} />
      {/* Sign glow */}
      <pointLight position={[0, 3.5, -3.9]} color="#ff8800" intensity={8} distance={8} decay={2} castShadow={false} />
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
      {/* Yellow door trigger glow */}
      <mesh position={[0, 0.03, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffcc00" emissiveIntensity={2} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* Shop entrance light */}
      <pointLight position={[0, 3.2, 3.5]} color="#ffe8cc" intensity={18} distance={12} decay={2} castShadow={false} />
      {/* Neon glow */}
      <pointLight position={[0, 3.75, 4.2]} color={accent} intensity={6} distance={8} decay={2} castShadow={false} />
    </group>
  )
}

// ─── Enterable House ───────────────────────────────────────────────────────────
export function EnterableHouse({ house }: { house: HouseData }) {
  const doorLocalX = house.doorX - house.x
  const doorLocalZ = house.doorZ - house.z
  const dLen = Math.sqrt(doorLocalX ** 2 + doorLocalZ ** 2) || 1
  const dfX = doorLocalX / dLen
  const dfZ = doorLocalZ / dLen

  const roofColors = ['#cc6644', '#4466cc', '#44cc66', '#cc44aa', '#ccaa44', '#44aacc']
  const roofColor = roofColors[house.interiorIdx % roofColors.length]

  return (
    <group position={[house.x, 0, house.z]}>
      {/* House body */}
      <mesh position={[0, house.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[house.width, house.height, house.depth]} />
        <meshStandardMaterial color={house.color} roughness={0.88} />
      </mesh>
      {/* Slanted roof */}
      <mesh position={[0, house.height + 0.8, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[house.width + 1, 0.3, house.depth + 1]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      {/* Roof ridge */}
      <mesh position={[0, house.height + 1.1, 0]}>
        <boxGeometry args={[house.width + 0.4, 0.2, house.depth * 0.15]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>
      {/* Side walls texture detail */}
      <mesh position={[0, house.height + 0.4, 0]}>
        <boxGeometry args={[house.width + 0.5, 0.1, house.depth + 0.5]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>
      {/* Door frame */}
      <mesh position={[dfX * (house.depth / 2 + 0.01), house.height / 2, dfZ * (house.depth / 2 + 0.01)]}>
        <boxGeometry args={[
          Math.abs(dfX) > 0.5 ? 0.1 : 1.4,
          house.height,
          Math.abs(dfZ) > 0.5 ? 0.1 : 1.4
        ]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>
      {/* Door panel */}
      <mesh position={[dfX * (house.depth / 2 + 0.02), 1.1, dfZ * (house.depth / 2 + 0.02)]}>
        <boxGeometry args={[
          Math.abs(dfX) > 0.5 ? 0.08 : 0.9,
          2.2,
          Math.abs(dfZ) > 0.5 ? 0.9 : 0.08
        ]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
      </mesh>
      {/* Door knob */}
      <mesh position={[
        dfX * (house.depth / 2 + 0.04) + dfZ * 0.3,
        1.05,
        dfZ * (house.depth / 2 + 0.04) + dfX * 0.3
      ]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#c8a844" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Front windows */}
      {[-1.5, 1.5].map((offset, i) => (
        <mesh key={i} position={[
          dfX * (house.depth / 2 + 0.02) + dfZ * offset,
          2.4,
          dfZ * (house.depth / 2 + 0.02) + dfX * offset
        ]}>
          <boxGeometry args={[
            Math.abs(dfZ) > 0.5 ? 1.2 : 0.08,
            0.9,
            Math.abs(dfX) > 0.5 ? 1.2 : 0.08
          ]} />
          <meshStandardMaterial color="#aaccee" transparent opacity={0.65} roughness={0.04} emissive="#334455" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Porch step */}
      <mesh position={[dfX * (house.depth / 2 + 0.9), 0.08, dfZ * (house.depth / 2 + 0.9)]}>
        <boxGeometry args={[
          Math.abs(dfX) > 0.5 ? 0.5 : 2.0,
          0.16,
          Math.abs(dfZ) > 0.5 ? 2.0 : 0.5
        ]} />
        <meshStandardMaterial color="#888880" roughness={0.95} />
      </mesh>
      {/* Yellow door trigger glow circle */}
      <mesh position={[doorLocalX, 0.04, doorLocalZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 32]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffcc00"
          emissiveIntensity={2.8}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      {/* Outer glow ring */}
      <mesh position={[doorLocalX, 0.02, doorLocalZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.4, 32]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ff8800"
          emissiveIntensity={1.5}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      {/* House nameplate above door */}
      <Html
        position={[doorLocalX, house.height + 1.8, doorLocalZ]}
        center
        distanceFactor={18}
        occlude
      >
        <div style={{
          color: '#ffee55',
          fontSize: 10,
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.8)',
          padding: '3px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,220,0,0.5)',
          pointerEvents: 'none',
          boxShadow: '0 0 8px rgba(255,200,0,0.3)',
        }}>
          🏠 {house.label}
        </div>
      </Html>
      {/* Warm porch light */}
      <pointLight
        position={[dfX * (house.depth / 2 + 0.5), 2.5, dfZ * (house.depth / 2 + 0.5)]}
        color="#ffddaa"
        intensity={12}
        distance={8}
        decay={2}
        castShadow={false}
      />
    </group>
  )
}

// ─── Interior Rooms (12 unique types) ─────────────────────────────────────────
const INTERIOR_THEMES = [
  { name: 'Living Room',  floor: '#8b6914', wall: '#e8e0d2', ceiling: '#f5f0ea', accent: '#cc8844' },
  { name: 'Kitchen',      floor: '#c8b896', wall: '#f0ece4', ceiling: '#f8f6f2', accent: '#4488aa' },
  { name: 'Bedroom',      floor: '#7a5830', wall: '#ddd0c8', ceiling: '#f0ece8', accent: '#886688' },
  { name: 'Office',       floor: '#444444', wall: '#cccccc', ceiling: '#eeeeee', accent: '#224488' },
  { name: 'Penthouse',    floor: '#222222', wall: '#2a2a3a', ceiling: '#1a1a2a', accent: '#ffcc00' },
  { name: 'Basement',     floor: '#333322', wall: '#3a3828', ceiling: '#2a2820', accent: '#aa6622' },
  { name: 'Studio',       floor: '#6a5440', wall: '#e0d8cc', ceiling: '#ece8e0', accent: '#cc6644' },
  { name: 'Loft',         floor: '#584820', wall: '#b8a888', ceiling: '#ccc0a0', accent: '#8866aa' },
  { name: 'Beach House',  floor: '#d4c0a0', wall: '#f0e8d8', ceiling: '#faf6f0', accent: '#44aacc' },
  { name: 'Urban Flat',   floor: '#3a3a3a', wall: '#e8e4e0', ceiling: '#f0ece8', accent: '#cc4444' },
  { name: 'Cottage',      floor: '#a08050', wall: '#f0ead8', ceiling: '#faf4e8', accent: '#448844' },
  { name: 'Apartment',    floor: '#787058', wall: '#dcd8cc', ceiling: '#eceae4', accent: '#4466cc' },
]

export function InteriorRoom({ houseIdx }: { houseIdx: number }) {
  const x = 600 + houseIdx * 30
  const theme = INTERIOR_THEMES[houseIdx % INTERIOR_THEMES.length]
  const isPenthouse = theme.name === 'Penthouse'
  const isBasement  = theme.name === 'Basement'

  return (
    <group>
      <group position={[x, 0, 0]}>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color={theme.floor} roughness={0.75} />
        </mesh>
        {/* Floor rug */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.02, 0.5]}>
          <planeGeometry args={[5, 4]} />
          <meshStandardMaterial color={theme.accent} roughness={0.9} opacity={0.7} transparent />
        </mesh>
        {/* Ceiling */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color={theme.ceiling} roughness={0.9} />
        </mesh>
        {/* Back wall */}
        <mesh position={[0, 2, -6]}>
          <boxGeometry args={[12, 4, 0.15]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        {/* Front wall (entry side) — has door gap */}
        <mesh position={[-3.5, 2, 6]}>
          <boxGeometry args={[5, 4, 0.15]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        <mesh position={[4.5, 2, 6]}>
          <boxGeometry args={[3, 4, 0.15]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        <mesh position={[2, 3.4, 6]}>
          <boxGeometry args={[2, 1.2, 0.15]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        {/* Right wall */}
        <mesh position={[6, 2, 0]}>
          <boxGeometry args={[0.15, 4, 12]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        {/* Left wall (exit door side) */}
        <mesh position={[-6, 2, -2]}>
          <boxGeometry args={[0.15, 4, 8]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        <mesh position={[-6, 2, 4.5]}>
          <boxGeometry args={[0.15, 4, 3]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>
        <mesh position={[-6, 3.3, 2.5]}>
          <boxGeometry args={[0.15, 1.4, 2]} />
          <meshStandardMaterial color={theme.wall} roughness={0.85} />
        </mesh>

        {/* ── FURNITURE: Sofa ─────────────────────────────────── */}
        <group position={[2, 0, -3.5]}>
          {/* Sofa base */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[3, 0.6, 1.2]} />
            <meshStandardMaterial color={theme.accent} roughness={0.8} />
          </mesh>
          {/* Back cushion */}
          <mesh position={[0, 0.85, -0.55]}>
            <boxGeometry args={[2.9, 0.7, 0.22]} />
            <meshStandardMaterial color={theme.accent} roughness={0.75} />
          </mesh>
          {/* Arm rests */}
          {[-1.4, 1.4].map((ax, i) => (
            <mesh key={i} position={[ax, 0.65, 0]}>
              <boxGeometry args={[0.2, 0.5, 1.2]} />
              <meshStandardMaterial color={theme.accent} roughness={0.8} />
            </mesh>
          ))}
          {/* Seat cushions */}
          {[-0.85, 0.85].map((sx, i) => (
            <mesh key={i} position={[sx, 0.72, 0.1]}>
              <boxGeometry args={[1.3, 0.12, 1.0]} />
              <meshStandardMaterial color={theme.accent} roughness={0.7} opacity={0.9} transparent />
            </mesh>
          ))}
        </group>

        {/* ── FURNITURE: Coffee table ────────────────────────── */}
        <mesh position={[1.5, 0.34, -1.8]} castShadow>
          <boxGeometry args={[2, 0.08, 1]} />
          <meshStandardMaterial color="#7a5020" roughness={0.6} />
        </mesh>
        {[[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].map(([lx, lz], i) => (
          <mesh key={i} position={[1.5 + lx, 0.17, -1.8 + lz]}>
            <cylinderGeometry args={[0.04, 0.04, 0.34, 6]} />
            <meshStandardMaterial color="#5a3810" roughness={0.7} />
          </mesh>
        ))}

        {/* ── FURNITURE: TV & Stand ─────────────────────────── */}
        <group position={[-0.5, 0, -5.5]}>
          {/* TV stand */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[2.5, 0.8, 0.5]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
          </mesh>
          {/* TV screen */}
          <mesh position={[0, 1.7, 0.02]}>
            <boxGeometry args={[2.2, 1.2, 0.08]} />
            <meshStandardMaterial color="#0a1018" roughness={0.3} metalness={0.2} />
          </mesh>
          {/* TV display glow */}
          <mesh position={[0, 1.7, 0.07]}>
            <boxGeometry args={[2.1, 1.1, 0.02]} />
            <meshStandardMaterial
              color={isPenthouse ? '#001144' : '#002244'}
              emissive={isPenthouse ? '#0044cc' : '#003388'}
              emissiveIntensity={isBasement ? 0.5 : 1.2}
            />
          </mesh>
          {/* TV frame */}
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[2.3, 1.3, 0.1]} />
            <meshStandardMaterial color="#111" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* TV light */}
          <pointLight position={[0, 1.7, 0.5]} color="#3355aa" intensity={isPenthouse ? 10 : 5} distance={6} decay={2} castShadow={false} />
        </group>

        {/* ── FURNITURE: Bookshelf ──────────────────────────── */}
        <group position={[5, 0, -4]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[0.4, 3, 1.4]} />
            <meshStandardMaterial color="#6a4820" roughness={0.7} />
          </mesh>
          {/* Books */}
          {[0.5, 1.0, 1.5, 2.0, 2.5].map((by, i) => (
            <mesh key={i} position={[0.05, by, 0]}>
              <boxGeometry args={[0.12, 0.35, 1.2]} />
              <meshStandardMaterial color={['#cc4422','#4422cc','#22cc44','#cccc22','#cc22aa'][i]} roughness={0.8} />
            </mesh>
          ))}
        </group>

        {/* ── FURNITURE: Dining table + chairs ──────────────── */}
        <group position={[-2.5, 0, 2]}>
          {/* Table */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[2, 0.09, 1.2]} />
            <meshStandardMaterial color="#7a5020" roughness={0.65} />
          </mesh>
          {/* Table legs */}
          {[[-0.85, -0.5], [0.85, -0.5], [-0.85, 0.5], [0.85, 0.5]].map(([tx, tz], i) => (
            <mesh key={i} position={[tx, 0.4, tz]}>
              <boxGeometry args={[0.08, 0.8, 0.08]} />
              <meshStandardMaterial color="#5a3810" roughness={0.7} />
            </mesh>
          ))}
          {/* Chairs */}
          {[[-1.3, 0, 0], [1.3, Math.PI, 0]].map(([cx, cry, cz], i) => (
            <group key={i} position={[cx, 0, cz]} rotation-y={cry}>
              <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[0.55, 0.06, 0.55]} />
                <meshStandardMaterial color={theme.accent} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.85, -0.26]}>
                <boxGeometry args={[0.55, 0.65, 0.06]} />
                <meshStandardMaterial color={theme.accent} roughness={0.8} />
              </mesh>
              {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([clx, clz], j) => (
                <mesh key={j} position={[clx, 0.22, clz]}>
                  <boxGeometry args={[0.06, 0.45, 0.06]} />
                  <meshStandardMaterial color="#5a3810" roughness={0.7} />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* ── FURNITURE: Bed (bedroom/studio) ───────────────── */}
        {(theme.name === 'Bedroom' || theme.name === 'Studio' || theme.name === 'Cottage' || theme.name === 'Loft') && (
          <group position={[3.5, 0, -3]}>
            {/* Bed base */}
            <mesh position={[0, 0.28, 0]} castShadow>
              <boxGeometry args={[2.2, 0.56, 3.5]} />
              <meshStandardMaterial color="#6688aa" roughness={0.8} />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, 0.62, 0]}>
              <boxGeometry args={[2.0, 0.16, 3.3]} />
              <meshStandardMaterial color="#f5f0e8" roughness={0.6} />
            </mesh>
            {/* Pillow */}
            <mesh position={[0, 0.72, -1.5]}>
              <boxGeometry args={[1.6, 0.12, 0.55]} />
              <meshStandardMaterial color="#f0e8d0" roughness={0.65} />
            </mesh>
            {/* Blanket */}
            <mesh position={[0, 0.7, 0.5]}>
              <boxGeometry args={[1.9, 0.1, 2.4]} />
              <meshStandardMaterial color={theme.accent} roughness={0.8} />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, 1.05, -1.8]}>
              <boxGeometry args={[2.2, 0.88, 0.14]} />
              <meshStandardMaterial color="#5a4030" roughness={0.75} />
            </mesh>
            {/* Nightstand */}
            <mesh position={[-1.4, 0.5, -1.5]} castShadow>
              <boxGeometry args={[0.5, 1.0, 0.5]} />
              <meshStandardMaterial color="#7a5020" roughness={0.7} />
            </mesh>
            {/* Lamp */}
            <mesh position={[-1.4, 1.1, -1.5]}>
              <cylinderGeometry args={[0.06, 0.06, 0.3, 6]} />
              <meshStandardMaterial color="#888" metalness={0.7} />
            </mesh>
            <mesh position={[-1.4, 1.28, -1.5]}>
              <cylinderGeometry args={[0.15, 0.06, 0.22, 8]} />
              <meshStandardMaterial color="#f5e8cc" emissive="#ffe8aa" emissiveIntensity={1.5} />
            </mesh>
            <pointLight position={[-1.4, 1.2, -1.5]} color="#ffddaa" intensity={12} distance={6} decay={2} castShadow={false} />
          </group>
        )}

        {/* ── FURNITURE: Desk / Computer (office/penthouse) ─── */}
        {(theme.name === 'Office' || theme.name === 'Penthouse' || theme.name === 'Urban Flat') && (
          <group position={[4, 0, -3]}>
            {/* Desk */}
            <mesh position={[0, 0.76, 0]} castShadow>
              <boxGeometry args={[2.4, 0.06, 1.0]} />
              <meshStandardMaterial color={isPenthouse ? '#222' : '#5a4020'} roughness={0.5} metalness={isPenthouse ? 0.6 : 0} />
            </mesh>
            {/* Desk legs */}
            {[[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]].map(([dlx, dlz], i) => (
              <mesh key={i} position={[dlx, 0.38, dlz]}>
                <boxGeometry args={[0.06, 0.76, 0.06]} />
                <meshStandardMaterial color={isPenthouse ? '#333' : '#3a2810'} roughness={0.6} />
              </mesh>
            ))}
            {/* Monitor */}
            <mesh position={[0, 1.25, -0.35]}>
              <boxGeometry args={[1.4, 0.8, 0.06]} />
              <meshStandardMaterial color="#0a0f18" roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.25, -0.32]}>
              <boxGeometry args={[1.3, 0.72, 0.02]} />
              <meshStandardMaterial color="#001122" emissive="#002244" emissiveIntensity={1.5} />
            </mesh>
            {/* Keyboard */}
            <mesh position={[0, 0.8, 0.1]}>
              <boxGeometry args={[0.8, 0.04, 0.3]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <pointLight position={[0, 1.25, -0.2]} color="#224488" intensity={8} distance={4} decay={2} castShadow={false} />
          </group>
        )}

        {/* ── Ceiling light fixture ─────────────────────────── */}
        <mesh position={[0, 3.95, 0]}>
          <boxGeometry args={[1.4, 0.1, 1.4]} />
          <meshStandardMaterial
            color={isPenthouse ? '#443300' : '#fff8e0'}
            emissive={isPenthouse ? '#ffcc00' : '#ffee88'}
            emissiveIntensity={isPenthouse ? 3 : 2.5}
          />
        </mesh>
        {/* Pendant drop */}
        <mesh position={[0, 3.55, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.9, 6]} />
          <meshStandardMaterial color="#555" metalness={0.7} />
        </mesh>
        <mesh position={[0, 3.1, 0]}>
          <cylinderGeometry args={[0.28, 0.18, 0.3, 10]} />
          <meshStandardMaterial color={isPenthouse ? '#886600' : '#ccbbaa'} roughness={0.5} />
        </mesh>
        <pointLight position={[0, 3.5, 0]} color={isPenthouse ? '#ffcc66' : '#ffe4c0'} intensity={55} distance={18} decay={2} castShadow={false} />
        <ambientLight intensity={isBasement ? 0.8 : 1.5} color={isPenthouse ? '#ffe0aa' : '#ffe4c0'} />

        {/* ── Window with outside glow ──────────────────────── */}
        <mesh position={[5.92, 2.5, -2]}>
          <boxGeometry args={[0.1, 1.5, 1.8]} />
          <meshStandardMaterial color="#88ccff" transparent opacity={0.5} roughness={0.04} emissive="#004488" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[5.5, 2.5, -2]} color="#88aaff" intensity={8} distance={5} decay={2} castShadow={false} />

        {/* ── Exit door glow on left wall ───────────────────── */}
        <mesh position={[-5.92, 1.3, 2.5]}>
          <boxGeometry args={[0.1, 2.2, 1.2]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffcc00" emissiveIntensity={3} transparent opacity={0.7} depthWrite={false} />
        </mesh>
        {/* Exit door glow circle */}
        <mesh position={[-5.5, 0.02, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 24]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffcc00" emissiveIntensity={2} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <Html position={[-4, 2.8, 2.5]} center distanceFactor={10}>
          <div style={{
            color: '#ffee55',
            fontSize: 11,
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.85)',
            padding: '4px 12px',
            borderRadius: 5,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,220,0,0.6)',
            pointerEvents: 'none',
            fontWeight: 'bold',
            letterSpacing: 1,
            boxShadow: '0 0 10px rgba(255,200,0,0.4)',
          }}>
            🚪 [ E ] Exit
          </div>
        </Html>
      </group>
    </group>
  )
}
