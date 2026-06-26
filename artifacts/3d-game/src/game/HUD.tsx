import { useState, useEffect, useRef } from 'react'
import { useGameStore, GraphicsQuality, ShopType, InventoryItem } from '../store/useGameStore'
import { useAuthStore } from '../auth/useAuthStore'
import { GAS_STATIONS, ENTERABLE_HOUSES, SHOPS } from './cityData'
import { gameShared } from './gameShared'

const QUALITY_LABELS: Record<GraphicsQuality, string> = { low:'LOW', medium:'MED', high:'HIGH' }
const QUALITY_COLORS: Record<GraphicsQuality, string> = { low:'#ff6633', medium:'#ffcc00', high:'#44ff88' }
const QUALITY_DESC:   Record<GraphicsQuality, string> = {
  low:    'Best for weak devices — max FPS',
  medium: 'Balanced visuals & performance',
  high:   'Maximum detail — needs GPU',
}
const SHOP_TITLES: Record<ShopType, string> = {
  ammo:    '🔫 AMMO STORE',
  medic:   '💊 CITY PHARMACY',
  weapons: '⚡ BLACK MARKET',
}
const SHOP_COLORS: Record<ShopType, string> = {
  ammo:    '#cc4422',
  medic:   '#22aa44',
  weapons: '#6622cc',
}

interface StoreItem { name: string; desc: string; cost: number; id: string }
const STORE_ITEMS: Record<ShopType, StoreItem[]> = {
  ammo: [
    { id: 'ammo30',  name: 'Pistol Clip',      desc: '+30 ammo',        cost: 100 },
    { id: 'ammo60',  name: 'Rifle Magazine',    desc: '+60 ammo',        cost: 200 },
    { id: 'ammo150', name: 'Full Arsenal',      desc: '+150 ammo',       cost: 350 },
    { id: 'ammo_hp', name: 'Ammo + First Aid',  desc: '+80 ammo +20 HP', cost: 280 },
  ],
  medic: [
    { id: 'hp30',      name: 'Bandages',        desc: '+30 HP',          cost: 100 },
    { id: 'hp70',      name: 'Med Pack',        desc: '+70 HP',          cost: 260 },
    { id: 'hp100',     name: 'Full Heal',       desc: 'Full HP restored',cost: 500 },
    { id: 'med_armor', name: 'Trauma Kit',      desc: '+50 HP +30 armor',cost: 400 },
  ],
  weapons: [
    { id: 'armor50',  name: 'Light Armor',       desc: '+50 armor',       cost: 400 },
    { id: 'armor100', name: 'Heavy Armor',        desc: '+100 armor',      cost: 700 },
    { id: 'ammo200',  name: 'Ammo Crate',         desc: '+200 ammo',       cost: 300 },
    { id: 'upgrade',  name: 'Weapon Upgrade',     desc: '+100 ammo',       cost: 800 },
  ],
}

function fpsColor(fps: number) {
  if (fps >= 55) return '#44ff88'
  if (fps >= 35) return '#ffcc00'
  return '#ff4444'
}

const panel = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'rgba(0,0,0,0.76)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  backdropFilter: 'blur(4px)',
  fontFamily: 'monospace',
  ...extra,
})

// ─── Settings Panel ────────────────────────────────────────────────────────────
function SettingsSection({ title }: { title: string }) {
  return (
    <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:13, marginTop:4, marginBottom:10 }}>
      <div style={{ color:'#444', fontSize:9, letterSpacing:2, fontFamily:'monospace' }}>{title}</div>
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={e=>{ e.stopPropagation(); onToggle() }} onPointerDown={e=>e.stopPropagation()}
      style={{
        minWidth:50, padding:'4px 12px', borderRadius:20,
        background: on ? 'rgba(0,204,255,0.15)' : 'rgba(255,255,255,0.04)',
        border: on ? '1px solid rgba(0,204,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
        color: on ? '#00ccff' : '#444', fontSize:10, fontFamily:'monospace', cursor:'pointer',
        letterSpacing:1, transition:'all 0.15s', touchAction:'manipulation',
      }}>{on ? 'ON' : 'OFF'}</button>
  )
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <span style={{ color:'#666', fontSize:10, letterSpacing:0.5 }}>{label}</span>
      {children}
    </div>
  )
}

function SettingsPanel({ quality, setQuality, fps, onClose,
  sensitivity, setSensitivity, fov, setFov,
  showFps, setShowFps, showMinimap, setShowMinimap,
}: {
  quality: GraphicsQuality; setQuality: (q: GraphicsQuality) => void
  fps: number; onClose: () => void
  sensitivity: number; setSensitivity: (v: number) => void
  fov: number; setFov: (v: number) => void
  showFps: boolean; setShowFps: (v: boolean) => void
  showMinimap: boolean; setShowMinimap: (v: boolean) => void
}) {
  const qColor = QUALITY_COLORS[quality]
  const qualities: GraphicsQuality[] = ['low', 'medium', 'high']

  return (
    <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
      style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:400, maxHeight:'90vh', overflowY:'auto', zIndex:2200,
        background:'rgba(6,8,14,0.98)', border:'1px solid rgba(0,200,255,0.25)',
        borderRadius:14, padding:'20px 22px', fontFamily:'monospace',
        boxShadow:'0 0 60px rgba(0,180,255,0.12),0 20px 60px rgba(0,0,0,0.9)',
      }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ color:'#00ccff', fontSize:13, fontWeight:'bold', letterSpacing:2 }}>⚙ GAME SETTINGS</div>
        <button type="button" onClick={onClose} onPointerDown={e=>e.stopPropagation()}
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#888', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:12, fontFamily:'monospace' }}>
          ✕ CLOSE
        </button>
      </div>

      {/* ── Performance ── */}
      <SettingsSection title="PERFORMANCE" />

      {/* FPS counter row */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'9px 13px', marginBottom:12, border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'#666', fontSize:10, letterSpacing:1 }}>FRAME RATE</span>
        <span style={{ color:fpsColor(fps), fontSize:16, fontWeight:'bold' }}>
          {fps > 0 ? fps : '—'} <span style={{ fontSize:10, color:'#555' }}>FPS</span>
        </span>
      </div>
      <SettingsRow label="Show FPS counter">
        <Toggle on={showFps} onToggle={() => setShowFps(!showFps)} />
      </SettingsRow>

      {/* Graphics quality */}
      <div style={{ marginBottom:12 }}>
        <div style={{ color:'#666', fontSize:10, letterSpacing:0.5, marginBottom:8 }}>GRAPHICS QUALITY</div>
        <div style={{ display:'flex', gap:8 }}>
          {qualities.map(q => {
            const sel = q === quality; const col = QUALITY_COLORS[q]
            return (
              <button key={q} type="button"
                onClick={e=>{ e.stopPropagation(); setQuality(q) }}
                onPointerDown={e=>e.stopPropagation()}
                style={{
                  flex:1, padding:'9px 4px', borderRadius:8,
                  border: sel ? `2px solid ${col}` : '2px solid rgba(255,255,255,0.08)',
                  background: sel ? `${col}18` : 'rgba(255,255,255,0.03)',
                  color: sel ? col : '#555', fontSize:11, fontFamily:'monospace',
                  fontWeight: sel ? 'bold' : 'normal', cursor:'pointer', letterSpacing:1, transition:'all 0.15s',
                }}>{QUALITY_LABELS[q]}</button>
            )
          })}
        </div>
        <div style={{ color:qColor, fontSize:10, textAlign:'center', marginTop:7, letterSpacing:0.5, opacity:0.7 }}>{QUALITY_DESC[quality]}</div>
      </div>

      {/* ── Camera ── */}
      <SettingsSection title="CAMERA" />

      {/* Sensitivity */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ color:'#666', fontSize:10 }}>Look Sensitivity</span>
          <span style={{ color:'#00ccff', fontSize:11, fontWeight:'bold' }}>{sensitivity.toFixed(1)}×</span>
        </div>
        <input type="range" min={0.2} max={3.0} step={0.05} value={sensitivity}
          onChange={e => setSensitivity(Number(e.target.value))}
          onPointerDown={e=>e.stopPropagation()}
          style={{ width:'100%', accentColor:'#00ccff', cursor:'pointer', height:4 }} />
        <div style={{ display:'flex', justifyContent:'space-between', color:'#333', fontSize:9, marginTop:3 }}>
          <span>0.2 SLOW</span><span>FAST 3.0</span>
        </div>
      </div>

      {/* FOV */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ color:'#666', fontSize:10 }}>Field of View</span>
          <span style={{ color:'#00ccff', fontSize:11, fontWeight:'bold' }}>{fov}°</span>
        </div>
        <input type="range" min={45} max={100} step={1} value={fov}
          onChange={e => setFov(Number(e.target.value))}
          onPointerDown={e=>e.stopPropagation()}
          style={{ width:'100%', accentColor:'#00ccff', cursor:'pointer', height:4 }} />
        <div style={{ display:'flex', justifyContent:'space-between', color:'#333', fontSize:9, marginTop:3 }}>
          <span>45° NARROW</span><span>WIDE 100°</span>
        </div>
      </div>

      {/* ── Display ── */}
      <SettingsSection title="DISPLAY" />

      <SettingsRow label="Minimap">
        <Toggle on={showMinimap} onToggle={() => setShowMinimap(!showMinimap)} />
      </SettingsRow>

      {/* ── Controls Reference ── */}
      <SettingsSection title="CONTROLS REFERENCE" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 14px' }}>
        {[
          ['WASD / ↑↓←→','Move'],['SHIFT','Sprint / Boost'],
          ['A / D','Camera orbit'],['DRAG right','Camera rotate'],
          ['E','Interact / Enter'],['SPACE','Shoot'],
          ['ESC','Pause menu'],['T / 💬','Chat & commands'],
          ['E near door','Enter house/shop'],['F (map)','Set waypoint'],
        ].map(([key,desc]) => (
          <div key={key} style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 0' }}>
            <span style={{ background:'rgba(255,255,255,0.07)', borderRadius:3, padding:'1px 5px', fontSize:8, color:'#aaa', border:'1px solid rgba(255,255,255,0.1)', whiteSpace:'nowrap', flexShrink:0 }}>{key}</span>
            <span style={{ color:'#444', fontSize:9 }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Chat Menu ───────────────────────────────────────────────────────────
function AdminChatMenu({ onClose }: { onClose: () => void }) {
  const {
    health, setHealth, money, addMoney, ammo, addAmmo, armor, addArmor,
    wantedLevel, setWantedLevel, timeOfDay, setTimeOfDay, godMode, setGodMode,
    addScore,
  } = useGameStore()

  function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ color:'#888', fontSize:10, letterSpacing:0.5, minWidth:80 }}>{label}</span>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {children}
        </div>
      </div>
    )
  }

  function Btn({ label, onClick, color='#888' }: { label: string; onClick: () => void; color?: string }) {
    return (
      <button type="button" onClick={e=>{ e.stopPropagation(); onClick() }}
        onPointerDown={e=>e.stopPropagation()}
        style={{
          padding:'4px 10px', borderRadius:6, cursor:'pointer',
          background:`${color}15`, border:`1px solid ${color}44`,
          color, fontSize:10, fontFamily:'monospace', letterSpacing:0.5,
          touchAction:'manipulation', transition:'all 0.1s',
        }}>
        {label}
      </button>
    )
  }

  return (
    <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
      style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:400, maxHeight:'88vh', overflowY:'auto', zIndex:2400,
        background:'rgba(5,8,10,0.98)', fontFamily:'monospace',
        border:'1px solid rgba(255,200,0,0.3)',
        borderRadius:14, padding:'18px 20px',
        boxShadow:'0 0 60px rgba(255,180,0,0.1),0 20px 60px rgba(0,0,0,0.95)',
      }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ color:'#FFD700', fontSize:13, fontWeight:'bold', letterSpacing:2 }}>👑 ADMIN PANEL</div>
          <div style={{ color:'#554400', fontSize:9, letterSpacing:1 }}>GAME MASTER CONTROLS</div>
        </div>
        <button type="button" onClick={onClose} onPointerDown={e=>e.stopPropagation()}
          style={{ background:'rgba(255,200,0,0.08)', border:'1px solid rgba(255,200,0,0.25)', color:'#887700', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:12, fontFamily:'monospace' }}>
          ✕ CLOSE
        </button>
      </div>

      {/* Status row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:16 }}>
        {[
          { label:'HP', val:`${Math.ceil(health)}`, color:'#44cc44' },
          { label:'$', val:money.toLocaleString(), color:'#44ff88' },
          { label:'AMMO', val:`${ammo}`, color:'#ffaa33' },
          { label:'ARMOR', val:`${Math.ceil(armor)}`, color:'#4488ff' },
        ].map(s=>(
          <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:7, padding:'7px 8px', textAlign:'center', border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color:s.color, fontSize:13, fontWeight:'bold' }}>{s.val}</div>
            <div style={{ color:'#333', fontSize:8, letterSpacing:1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Player ── */}
      <div style={{ color:'#554400', fontSize:9, letterSpacing:2, marginBottom:10 }}>PLAYER</div>

      <Row label="Health">
        <Btn label="25" color="#cc4444" onClick={()=>setHealth(25)} />
        <Btn label="50" color="#ccaa44" onClick={()=>setHealth(50)} />
        <Btn label="75" color="#88cc44" onClick={()=>setHealth(75)} />
        <Btn label="FULL" color="#44cc44" onClick={()=>setHealth(100)} />
      </Row>
      <Row label="Money">
        <Btn label="+$500" color="#44ff88" onClick={()=>addMoney(500)} />
        <Btn label="+$2K" color="#44ff88" onClick={()=>addMoney(2000)} />
        <Btn label="+$10K" color="#44ff88" onClick={()=>addMoney(10000)} />
        <Btn label="-$500" color="#ff4444" onClick={()=>addMoney(-500)} />
      </Row>
      <Row label="Ammo">
        <Btn label="+50" color="#ffaa33" onClick={()=>addAmmo(50)} />
        <Btn label="+150" color="#ffaa33" onClick={()=>addAmmo(150)} />
        <Btn label="FULL" color="#ffaa33" onClick={()=>addAmmo(999)} />
      </Row>
      <Row label="Armor">
        <Btn label="+25" color="#4488ff" onClick={()=>addArmor(25)} />
        <Btn label="FULL" color="#4488ff" onClick={()=>addArmor(100)} />
      </Row>
      <Row label="Score">
        <Btn label="+1K" color="#aaaaff" onClick={()=>addScore(1000)} />
        <Btn label="+10K" color="#aaaaff" onClick={()=>addScore(10000)} />
      </Row>

      {/* ── World ── */}
      <div style={{ borderTop:'1px solid rgba(255,200,0,0.1)', paddingTop:12, marginTop:4, color:'#554400', fontSize:9, letterSpacing:2, marginBottom:10 }}>WORLD</div>

      {/* Time of day */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ color:'#888', fontSize:10 }}>Time of Day</span>
          <span style={{ color:'#FFD700', fontSize:11, fontWeight:'bold' }}>
            {Math.floor(timeOfDay).toString().padStart(2,'0')}:{Math.round((timeOfDay%1)*60).toString().padStart(2,'0')}
          </span>
        </div>
        <input type="range" min={0} max={23.9} step={0.1} value={timeOfDay}
          onChange={e=>setTimeOfDay(Number(e.target.value))}
          onPointerDown={e=>e.stopPropagation()}
          style={{ width:'100%', accentColor:'#FFD700', cursor:'pointer', height:4 }} />
        <div style={{ display:'flex', justifyContent:'space-between', color:'#333', fontSize:9, marginTop:3 }}>
          <span>00:00 MIDNIGHT</span><span>NOON 12:00</span><span>23:00</span>
        </div>
      </div>

      {/* Wanted level */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ color:'#888', fontSize:10 }}>Wanted Level</span>
          <span style={{ color: wantedLevel > 0 ? '#ff4444' : '#444', fontSize:11, fontWeight:'bold' }}>
            {'★'.repeat(wantedLevel)}{'☆'.repeat(5-wantedLevel)}
          </span>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          {[0,1,2,3,4,5].map(w=>(
            <button key={w} type="button"
              onClick={e=>{ e.stopPropagation(); setWantedLevel(w) }}
              onPointerDown={e=>e.stopPropagation()}
              style={{
                flex:1, padding:'5px 2px', borderRadius:5, cursor:'pointer',
                background: wantedLevel === w ? (w===0?'rgba(68,204,68,0.2)':'rgba(255,68,68,0.2)') : 'rgba(255,255,255,0.03)',
                border: wantedLevel === w ? (w===0?'1px solid #44cc44':'1px solid #ff4444') : '1px solid rgba(255,255,255,0.08)',
                color: wantedLevel === w ? (w===0?'#44cc44':'#ff6666') : '#333',
                fontSize:11, fontFamily:'monospace',
              }}>{w}</button>
          ))}
        </div>
      </div>

      {/* ── Cheats ── */}
      <div style={{ borderTop:'1px solid rgba(255,200,0,0.1)', paddingTop:12, marginTop:4, color:'#554400', fontSize:9, letterSpacing:2, marginBottom:10 }}>CHEATS</div>

      <Row label="God Mode">
        <Toggle on={godMode} onToggle={()=>setGodMode(!godMode)} />
      </Row>

      <div style={{ marginTop:8, color:'#332200', fontSize:9, textAlign:'center', letterSpacing:1 }}>
        /admin · AUTHORIZED PERSONNEL ONLY
      </div>
    </div>
  )
}

// ─── Inventory Overlay ─────────────────────────────────────────────────────────
const ITEM_TYPE_COLOR: Record<string, string> = {
  weapon: '#ff6633', ammo: '#ffcc00', consumable: '#44cc88', equipment: '#4488ff',
}
const ITEM_TYPE_LABEL: Record<string, string> = {
  weapon: 'WEAPON', ammo: 'AMMO', consumable: 'ITEM', equipment: 'GEAR',
}

function InventoryOverlay({ inventory, ammo, health, armor, money, onUse, onRemove, onClose }: {
  inventory: InventoryItem[]
  ammo: number; health: number; armor: number; money: number
  onUse: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const categories = ['all', 'weapon', 'ammo', 'consumable', 'equipment']
  const filtered = filter === 'all' ? inventory : inventory.filter(i => i.type === filter)

  const GRID_SLOTS = 20
  const slots = Array.from({ length: GRID_SLOTS }, (_, i) => filtered[i] ?? null)

  const canUse = (item: InventoryItem) =>
    (item.type === 'consumable') ||
    (item.type === 'equipment' && item.id === 'id_card')

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2100,
      background:'rgba(0,0,0,0.88)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{
          background:'rgba(4,8,18,0.98)', border:'1px solid rgba(0,180,255,0.2)',
          borderRadius:18, padding:'28px 32px', width:680, maxWidth:'96vw',
          fontFamily:'monospace', maxHeight:'90vh', display:'flex', flexDirection:'column',
          boxShadow:'0 0 80px rgba(0,120,255,0.12), 0 20px 60px rgba(0,0,0,0.9)',
        }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>🎒</span>
            <div>
              <div style={{ color:'#00aaff', fontSize:15, fontWeight:'bold', letterSpacing:3 }}>INVENTORY</div>
              <div style={{ color:'#333', fontSize:8, letterSpacing:2 }}>{inventory.length} ITEM TYPES</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', gap:8, fontSize:11, color:'#555' }}>
              <span>❤️ <span style={{ color:'#44cc44' }}>{Math.ceil(health)}</span></span>
              <span>🛡 <span style={{ color:'#4488ff' }}>{Math.ceil(armor)}</span></span>
              <span>🔫 <span style={{ color:'#ffaa33' }}>{ammo}</span></span>
              <span>💰 <span style={{ color:'#44ff88' }}>${money.toLocaleString()}</span></span>
            </div>
            <button type="button" onClick={onClose} onPointerDown={e=>e.stopPropagation()}
              style={{
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#888', borderRadius:6, padding:'4px 12px', cursor:'pointer',
                fontSize:12, fontFamily:'monospace', transition:'all 0.12s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.color='#ccc'}}
              onMouseLeave={e=>{e.currentTarget.style.color='#888'}}
            >✕ CLOSE</button>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {categories.map(cat => (
            <button key={cat} type="button"
              onClick={e=>{ e.stopPropagation(); setFilter(cat); setSelected(null) }}
              onPointerDown={e=>e.stopPropagation()}
              style={{
                padding:'4px 14px', borderRadius:20, fontSize:9, fontFamily:'monospace',
                letterSpacing:1, cursor:'pointer', transition:'all 0.12s',
                border: filter === cat
                  ? `1px solid ${cat === 'all' ? '#00aaff' : ITEM_TYPE_COLOR[cat]}88`
                  : '1px solid rgba(255,255,255,0.08)',
                background: filter === cat
                  ? `${cat === 'all' ? '#00aaff' : ITEM_TYPE_COLOR[cat]}18`
                  : 'rgba(255,255,255,0.03)',
                color: filter === cat
                  ? (cat === 'all' ? '#00aaff' : ITEM_TYPE_COLOR[cat])
                  : '#444',
              }}
            >{cat === 'all' ? '⊞ ALL' : (ITEM_TYPE_LABEL[cat] ?? cat.toUpperCase())}</button>
          ))}
        </div>

        <div style={{ display:'flex', gap:20, flex:1, minHeight:0 }}>
          {/* Grid */}
          <div style={{ flex:1 }}>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8,
            }}>
              {slots.map((item, idx) => {
                const isSelected = item && selected?.id === item.id
                const typeColor = item ? ITEM_TYPE_COLOR[item.type] : 'transparent'
                return (
                  <div key={idx}
                    onClick={e=>{ e.stopPropagation(); if (item) setSelected(item) }}
                    onPointerDown={e=>e.stopPropagation()}
                    style={{
                      width:'100%', aspectRatio:'1',
                      background: item
                        ? (isSelected ? `${typeColor}22` : 'rgba(255,255,255,0.04)')
                        : 'rgba(255,255,255,0.015)',
                      border: isSelected
                        ? `2px solid ${typeColor}88`
                        : item
                          ? `1px solid ${typeColor}33`
                          : '1px solid rgba(255,255,255,0.04)',
                      borderRadius:10,
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      cursor: item ? 'pointer' : 'default',
                      transition:'all 0.12s',
                      position:'relative',
                      padding:6,
                    }}
                  >
                    {item ? (
                      <>
                        <div style={{ fontSize:24, lineHeight:1, marginBottom:4 }}>{item.icon}</div>
                        <div style={{ color:'#ccc', fontSize:8, textAlign:'center', letterSpacing:0.3, lineHeight:1.2 }}>
                          {item.name.length > 10 ? item.name.slice(0,10)+'…' : item.name}
                        </div>
                        {item.stackable && (
                          <div style={{
                            position:'absolute', top:4, right:6,
                            color: typeColor, fontSize:9, fontWeight:'bold',
                          }}>×{item.quantity}</div>
                        )}
                        <div style={{
                          position:'absolute', bottom:3, left:3,
                          background:`${typeColor}33`, borderRadius:3,
                          padding:'1px 4px', fontSize:7, color:typeColor, letterSpacing:0.5,
                        }}>{ITEM_TYPE_LABEL[item.type]}</div>
                      </>
                    ) : (
                      <div style={{ color:'rgba(255,255,255,0.04)', fontSize:18 }}>□</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{
            width:190, flexShrink:0,
            background:'rgba(255,255,255,0.025)', borderRadius:12,
            border:'1px solid rgba(255,255,255,0.07)',
            padding:'16px 14px', display:'flex', flexDirection:'column',
          }}>
            {selected ? (
              <>
                <div style={{ textAlign:'center', fontSize:40, marginBottom:10 }}>{selected.icon}</div>
                <div style={{
                  display:'inline-block', alignSelf:'center',
                  background:`${ITEM_TYPE_COLOR[selected.type]}22`,
                  border:`1px solid ${ITEM_TYPE_COLOR[selected.type]}44`,
                  borderRadius:4, padding:'2px 10px', fontSize:8,
                  color:ITEM_TYPE_COLOR[selected.type], letterSpacing:2, marginBottom:8,
                }}>{ITEM_TYPE_LABEL[selected.type]}</div>
                <div style={{ color:'#eee', fontSize:13, fontWeight:'bold', textAlign:'center', marginBottom:6 }}>
                  {selected.name}
                </div>
                <div style={{ color:'#555', fontSize:10, textAlign:'center', lineHeight:1.5, marginBottom:16 }}>
                  {selected.description}
                </div>
                {selected.stackable && (
                  <div style={{ color:'#888', fontSize:10, textAlign:'center', marginBottom:12 }}>
                    Qty: <span style={{ color:'#fff', fontWeight:'bold' }}>{selected.quantity}</span>
                  </div>
                )}
                <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:7 }}>
                  {canUse(selected) && (
                    <button type="button"
                      onClick={e=>{ e.stopPropagation(); onUse(selected.id); if (selected.quantity <= 1) setSelected(null) }}
                      onPointerDown={e=>e.stopPropagation()}
                      style={{
                        padding:'9px', borderRadius:8, fontSize:11, fontFamily:'monospace',
                        letterSpacing:1, cursor:'pointer', transition:'all 0.12s',
                        border:`1px solid ${ITEM_TYPE_COLOR[selected.type]}66`,
                        background:`${ITEM_TYPE_COLOR[selected.type]}22`,
                        color:ITEM_TYPE_COLOR[selected.type], fontWeight:'bold',
                      }}>⚡ USE ITEM</button>
                  )}
                  <button type="button"
                    onClick={e=>{ e.stopPropagation(); onRemove(selected.id); setSelected(null) }}
                    onPointerDown={e=>e.stopPropagation()}
                    style={{
                      padding:'7px', borderRadius:8, fontSize:10, fontFamily:'monospace',
                      letterSpacing:1, cursor:'pointer', transition:'all 0.12s',
                      border:'1px solid rgba(255,80,80,0.3)',
                      background:'rgba(255,40,40,0.07)',
                      color:'rgba(255,100,100,0.7)',
                    }}>🗑 DROP</button>
                </div>
              </>
            ) : (
              <div style={{ color:'#2a2a2a', fontSize:11, textAlign:'center', marginTop:'auto', marginBottom:'auto', lineHeight:1.8 }}>
                Select an item<br/>to inspect
              </div>
            )}
          </div>
        </div>

        <div style={{ color:'#222', fontSize:9, textAlign:'center', marginTop:14, letterSpacing:1 }}>
          CLICK OUTSIDE TO CLOSE · USE CONSUMABLES FOR INSTANT EFFECTS
        </div>
      </div>
    </div>
  )
}

// ─── Game Menu / Pause ─────────────────────────────────────────────────────────
function GameMenu({ onResume, onFullMap, onInventory, onSettings, onLogout, username, score, money, level }: {
  onResume: () => void; onFullMap: () => void; onInventory: () => void; onSettings: () => void; onLogout: () => void
  username: string; score: number; money: number; level: number
}) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  return (
    <div onClick={onResume} style={{
      position:'fixed', inset:0, zIndex:2100,
      background:'rgba(0,0,0,0.82)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{
          background:'rgba(4,8,18,0.98)', border:'1px solid rgba(255,255,255,0.12)',
          borderRadius:18, padding:'36px 48px', minWidth:320,
          fontFamily:'monospace', textAlign:'center',
          boxShadow:'0 0 100px rgba(0,0,0,0.95), 0 0 40px rgba(255,80,0,0.08)',
        }}>
        {/* Game title */}
        <div style={{ color:'rgba(255,140,0,0.6)', fontSize:9, letterSpacing:7, marginBottom:5 }}>GAME PAUSED</div>
        <div style={{ color:'#fff', fontSize:28, fontWeight:'bold', letterSpacing:4, marginBottom:6,
          textShadow:'0 0 30px rgba(255,80,0,0.4)' }}>
          CRIME CITY
        </div>
        {/* Player summary */}
        <div style={{
          background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px',
          marginBottom:24, border:'1px solid rgba(255,255,255,0.06)',
          display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8,
        }}>
          <div>
            <div style={{ color:'#ffcc00', fontSize:12, fontWeight:'bold' }}>Lv {level}</div>
            <div style={{ color:'#444', fontSize:8, letterSpacing:1 }}>LEVEL</div>
          </div>
          <div>
            <div style={{ color:'#00ffaa', fontSize:12, fontWeight:'bold' }}>{score.toLocaleString()}</div>
            <div style={{ color:'#444', fontSize:8, letterSpacing:1 }}>SCORE</div>
          </div>
          <div>
            <div style={{ color:'#44ff88', fontSize:12, fontWeight:'bold' }}>${money.toLocaleString()}</div>
            <div style={{ color:'#444', fontSize:8, letterSpacing:1 }}>CASH</div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { label:'▶  RESUME GAME',   action: onResume,    color:'#00cc66' },
            { label:'🗺  CITY MAP',      action: onFullMap,   color:'#00aaff' },
            { label:'🎒 INVENTORY',      action: onInventory, color:'#aa88ff' },
            { label:'⚙  SETTINGS',      action: onSettings,  color:'#ffcc00' },
            { label:'🚪 EXIT TO MENU',   action: onLogout,    color:'#ff4444' },
          ].map(btn => (
            <button key={btn.label} type="button"
              onClick={e=>{ e.stopPropagation(); btn.action() }}
              onPointerDown={e=>e.stopPropagation()}
              onMouseEnter={() => setHoveredBtn(btn.label)}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                padding:'13px 32px', borderRadius:9,
                border: hoveredBtn === btn.label ? `1px solid ${btn.color}66` : `1px solid ${btn.color}22`,
                background: hoveredBtn === btn.label ? `${btn.color}20` : `${btn.color}0a`,
                color: hoveredBtn === btn.label ? btn.color : `${btn.color}88`,
                fontSize:12, fontFamily:'monospace', letterSpacing:2,
                cursor:'pointer', transition:'all 0.12s',
                transform: hoveredBtn === btn.label ? 'scale(1.02)' : 'scale(1)',
              }}
            >{btn.label}</button>
          ))}
        </div>
        <div style={{ color:'#222', fontSize:10, marginTop:16, letterSpacing:1 }}>
          {username} · CLICK ANYWHERE TO RESUME
        </div>
      </div>
    </div>
  )
}

// ─── Full Map Overlay ──────────────────────────────────────────────────────────
function FullMapOverlay({ dots, playerX, playerZ, onClose, waypointX, waypointZ, onSetWaypoint, onClearWaypoint }: {
  dots: Array<{x:number;z:number;color:string;size:number}>
  playerX: number; playerZ: number; onClose: () => void
  waypointX: number | null; waypointZ: number | null
  onSetWaypoint: (x: number, z: number) => void
  onClearWaypoint: () => void
}) {
  const MAP_SIZE = 500
  const WORLD_RANGE = 190
  const toMap = (v: number) => MAP_SIZE / 2 + (v / WORLD_RANGE) * (MAP_SIZE / 2)
  const toWorld = (mapV: number) => (mapV - MAP_SIZE / 2) / (MAP_SIZE / 2) * WORLD_RANGE

  const DISTRICT_LABELS = [
    { label: 'DOWNTOWN', x: 0, z: 0, color: '#ff8844' },
    { label: 'HARBOR', x: 0, z: 155, color: '#44aaff' },
    { label: 'AIRPORT', x: 0, z: -155, color: '#ffcc44' },
    { label: 'EAST HILLS', x: 150, z: 0, color: '#ff6644' },
    { label: 'WEST DOCKS', x: -150, z: 0, color: '#44ccaa' },
  ]

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const mapX = e.clientX - rect.left
    const mapZ = e.clientY - rect.top
    const worldX = toWorld(mapX)
    const worldZ = toWorld(mapZ)
    onSetWaypoint(worldX, worldZ)
  }

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2100, background:'rgba(0,0,0,0.92)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{ position:'relative', fontFamily:'monospace' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ color:'#00ccff', fontSize:13, letterSpacing:4 }}>
            🗺 CRIME CITY — FULL MAP
          </div>
          {waypointX !== null && (
            <button type="button" onClick={e=>{ e.stopPropagation(); onClearWaypoint() }}
              style={{
                background:'rgba(255,200,0,0.12)', border:'1px solid rgba(255,200,0,0.4)',
                borderRadius:6, color:'#ffdd00', fontSize:10, fontFamily:'monospace',
                padding:'3px 10px', cursor:'pointer', letterSpacing:1,
                touchAction:'manipulation',
              }}>✕ CLEAR WAYPOINT</button>
          )}
        </div>
        <div
          onClick={handleMapClick}
          style={{
            width:MAP_SIZE, height:MAP_SIZE, position:'relative',
            background:'rgba(4,8,18,0.97)', border:'2px solid rgba(0,150,255,0.35)',
            borderRadius:12, overflow:'hidden',
            boxShadow:'0 0 40px rgba(0,100,255,0.15)',
            cursor:'crosshair',
          }}>
          {/* Background ground color */}
          <div style={{ position:'absolute', inset:0, background:'#0a1018' }} />

          {/* Grid lines */}
          {[-160,-120,-80,-40,0,40,80,120,160].map(r=>(
            <div key={`v${r}`} style={{ position:'absolute', left:toMap(r)-0.5, top:0, width:1, height:MAP_SIZE, background:'rgba(255,255,255,0.04)' }}/>
          ))}
          {[-160,-120,-80,-40,0,40,80,120,160].map(r=>(
            <div key={`h${r}`} style={{ position:'absolute', left:0, top:toMap(r)-0.5, width:MAP_SIZE, height:1, background:'rgba(255,255,255,0.04)' }}/>
          ))}
          {/* Road lines — vertical */}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`rv${r}`} style={{ position:'absolute', left:toMap(r)-2, top:0, width:5, height:MAP_SIZE, background:'rgba(255,255,255,0.10)' }}/>
          ))}
          {/* Road lines — horizontal */}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`rh${r}`} style={{ position:'absolute', left:0, top:toMap(r)-2, width:MAP_SIZE, height:5, background:'rgba(255,255,255,0.10)' }}/>
          ))}

          {/* District labels */}
          {DISTRICT_LABELS.map(d => (
            <div key={d.label} style={{
              position:'absolute', left:toMap(d.x), top:toMap(d.z),
              transform:'translate(-50%,-50%)',
              color:d.color, fontSize:8, letterSpacing:2, opacity:0.35, pointerEvents:'none',
              fontWeight:'bold', whiteSpace:'nowrap',
            }}>{d.label}</div>
          ))}

          {/* Gas stations */}
          {GAS_STATIONS.map(gs=>(
            <div key={gs.id} title="Gas Station" style={{
              position:'absolute', left:toMap(gs.x)-10, top:toMap(gs.z)-10,
              width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
              pointerEvents:'none',
            }}>⛽</div>
          ))}
          {/* Shops */}
          {SHOPS.map(s=>(
            <div key={s.id} title={s.label} style={{
              position:'absolute', left:toMap(s.x)-10, top:toMap(s.z)-10,
              width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12,
              pointerEvents:'none',
            }}>
              {s.type === 'ammo' ? '🔫' : s.type === 'medic' ? '💊' : '⚡'}
            </div>
          ))}
          {/* Houses */}
          {ENTERABLE_HOUSES.map(h=>(
            <div key={h.id} title={h.label} style={{
              position:'absolute', left:toMap(h.x)-7, top:toMap(h.z)-7,
              width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10,
              pointerEvents:'none',
            }}>🏠</div>
          ))}

          {/* Entity dots */}
          {dots.map((dot,i)=>(
            <div key={i} style={{
              position:'absolute',
              left: toMap(dot.x) - dot.size * 0.5,
              top:  toMap(dot.z) - dot.size * 0.5,
              width: dot.size, height: dot.size,
              background: dot.color, borderRadius:'50%', opacity:0.8,
              pointerEvents:'none',
            }}/>
          ))}
          {/* Player marker */}
          <div style={{
            position:'absolute', left:toMap(playerX)-8, top:toMap(playerZ)-8,
            width:16, height:16, background:'#00ffaa', borderRadius:'50%',
            border:'2px solid #fff', zIndex:10, pointerEvents:'none',
            boxShadow:'0 0 10px rgba(0,255,170,0.8)',
          }}/>
          {/* Waypoint marker on full map */}
          {waypointX !== null && waypointZ !== null && (
            <div style={{
              position:'absolute',
              left: toMap(waypointX) - 10, top: toMap(waypointZ) - 10,
              width: 20, height: 20, zIndex: 12, pointerEvents: 'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 16,
              filter: 'drop-shadow(0 0 6px rgba(255,220,0,1))',
            }}>📍</div>
          )}
          {/* Compass */}
          <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:2, pointerEvents:'none' }}>N</div>
          <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.15)', fontSize:9, letterSpacing:2, pointerEvents:'none' }}>S</div>
          <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.15)', fontSize:9, pointerEvents:'none' }}>W</div>
          <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.15)', fontSize:9, pointerEvents:'none' }}>E</div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:14, justifyContent:'center', marginTop:10, color:'#555', fontSize:10, flexWrap:'wrap' }}>
          {[
            ['⛽','Gas (8)'],['🔫','Ammo'],['💊','Pharmacy'],['⚡','Weapons'],
            ['🏠',`Houses (${ENTERABLE_HOUSES.length})`],['●','You'],
            ['📍','Waypoint'],
          ].map(([ic,lb])=>(
            <span key={lb} style={{ display:'flex', alignItems:'center', gap:3 }}>
              <span style={{ fontSize: ic === '●' ? 8 : 11 }}>{ic}</span>
              <span style={{ color:'#444' }}>{lb}</span>
            </span>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:6, color:'#333', fontSize:10, letterSpacing:1 }}>
          TAP MAP TO SET WAYPOINT · CLICK OUTSIDE TO CLOSE
        </div>
      </div>
    </div>
  )
}

// ─── GPS Arrow ─────────────────────────────────────────────────────────────────
function GPSArrow({ waypointX, waypointZ, onClear }: {
  waypointX: number; waypointZ: number; onClear: () => void
}) {
  const arrowRef = useRef<HTMLDivElement>(null)
  const distRef  = useRef<HTMLSpanElement>(null)
  const rafRef   = useRef<number | undefined>(undefined)

  useEffect(() => {
    const tick = () => {
      if (arrowRef.current && distRef.current) {
        const px  = gameShared.playerX
        const pz  = gameShared.playerZ
        const dx  = waypointX - px
        const dz  = waypointZ - pz
        const dist = Math.sqrt(dx * dx + dz * dz)
        const yaw  = gameShared.cameraYaw
        const fwd  = -dx * Math.sin(yaw) - dz * Math.cos(yaw)
        const rgt  =  dx * Math.cos(yaw) - dz * Math.sin(yaw)
        const angle = Math.atan2(rgt, fwd)
        arrowRef.current.style.transform = `rotate(${angle}rad)`
        distRef.current.textContent = dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [waypointX, waypointZ])

  return (
    <div style={{
      position:'fixed', left: 22, top: 172,
      zIndex: 900, pointerEvents:'auto',
      display:'flex', flexDirection:'column', alignItems:'center', gap: 2,
      background:'rgba(0,0,0,0.65)', borderRadius: 10,
      border:'1px solid rgba(255,210,0,0.35)',
      padding:'6px 8px',
      boxShadow:'0 0 12px rgba(255,210,0,0.2)',
      width: 60,
    }}>
      <span style={{ color:'rgba(255,210,0,0.5)', fontSize:7, fontFamily:'monospace', letterSpacing:1 }}>GPS</span>
      <div ref={arrowRef} style={{
        fontSize: 22, lineHeight: 1, color:'#ffdd00',
        filter:'drop-shadow(0 0 5px rgba(255,220,0,0.9))',
        transformOrigin:'center',
      }}>▲</div>
      <span ref={distRef} style={{
        color:'#ffdd00', fontSize:9, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.5,
      }} />
      <button type="button" onClick={onClear}
        onPointerDown={e=>e.stopPropagation()}
        style={{
          marginTop:2, background:'transparent', border:'none',
          color:'rgba(255,180,0,0.5)', fontSize:9, fontFamily:'monospace',
          cursor:'pointer', padding:'1px 4px', touchAction:'manipulation',
        }}>✕</button>
    </div>
  )
}

// ─── Store Overlay ─────────────────────────────────────────────────────────────
function StoreOverlay({ type, money, onBuy, onClose }: {
  type: ShopType; money: number
  onBuy: (item: StoreItem) => void
  onClose: () => void
}) {
  const items = STORE_ITEMS[type]
  const accentColor = SHOP_COLORS[type]
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2100, background:'rgba(0,0,0,0.85)',
      display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(4px)',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{
          background:'rgba(4,8,18,0.98)', border:`1px solid ${accentColor}44`,
          borderRadius:18, padding:'28px 32px', minWidth:360, maxWidth:440,
          fontFamily:'monospace',
          boxShadow:`0 0 80px ${accentColor}18, 0 20px 60px rgba(0,0,0,0.9)`,
        }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ color:accentColor, fontSize:17, fontWeight:'bold', letterSpacing:2 }}>
            {SHOP_TITLES[type]}
          </div>
          <button type="button" onClick={onClose} onPointerDown={e=>e.stopPropagation()}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#888', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:12, fontFamily:'monospace', transition:'all 0.12s' }}
            onMouseEnter={e=>{e.currentTarget.style.color='#ccc'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#888'}}>
            ✕ CLOSE
          </button>
        </div>

        {/* Cash display */}
        <div style={{
          background:'rgba(0,255,100,0.06)', border:'1px solid rgba(0,255,100,0.12)',
          borderRadius:8, padding:'10px 14px', marginBottom:18,
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{ fontSize:18 }}>💰</span>
          <div>
            <div style={{ color:'#44ff88', fontSize:20, fontWeight:'bold', letterSpacing:1 }}>
              ${money.toLocaleString()}
            </div>
            <div style={{ color:'#224', fontSize:9, letterSpacing:1 }}>YOUR CASH</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(item => {
            const canAfford = money >= item.cost
            const isHovered = hoveredItem === item.id
            return (
              <div key={item.id}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background: isHovered && canAfford
                    ? `${accentColor}14`
                    : canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
                  border: isHovered && canAfford
                    ? `1px solid ${accentColor}44`
                    : '1px solid rgba(255,255,255,0.05)',
                  borderRadius:10, padding:'12px 16px',
                  transition:'all 0.12s',
                }}>
                <div>
                  <div style={{ color: canAfford ? '#eee' : '#333', fontSize:13 }}>{item.name}</div>
                  <div style={{ color: canAfford ? accentColor : '#2a2a2a', fontSize:10, marginTop:2, opacity:0.9 }}>{item.desc}</div>
                </div>
                <button type="button"
                  onClick={e=>{ e.stopPropagation(); if(canAfford) onBuy(item) }}
                  onPointerDown={e=>e.stopPropagation()}
                  disabled={!canAfford}
                  style={{
                    padding:'9px 20px', borderRadius:8, fontSize:12, fontFamily:'monospace',
                    border: canAfford ? `1px solid ${accentColor}88` : '1px solid #222',
                    background: canAfford ? `${accentColor}28` : 'transparent',
                    color: canAfford ? accentColor : '#2a2a2a',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontWeight:'bold', letterSpacing:1, transition:'all 0.12s',
                    transform: isHovered && canAfford ? 'scale(1.05)' : 'scale(1)',
                  }}>
                  ${item.cost}
                </button>
              </div>
            )
          })}
        </div>
        <div style={{ color:'#222', fontSize:10, textAlign:'center', marginTop:14, letterSpacing:1 }}>
          WALK AWAY OR CLICK OUTSIDE TO LEAVE
        </div>
      </div>
    </div>
  )
}

// Dispatch a synthetic 'E' keypress so touch buttons trigger the same logic as the keyboard
function triggerEKey() {
  const opts = { key: 'e', code: 'KeyE', bubbles: true }
  document.dispatchEvent(new KeyboardEvent('keydown', opts))
  setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', opts)), 100)
}

// ─── Prominent Enter / Exit / Interact Button ──────────────────────────────────
function InteractionButton({ prompt }: { prompt: string | null }) {
  const [pulse, setPulse] = useState(false)
  const [tick,  setTick]  = useState(0)

  useEffect(() => {
    const id = setInterval(() => { setPulse(p => !p); setTick(t => t + 1) }, 600)
    return () => clearInterval(id)
  }, [])

  if (!prompt) return null

  const isExit    = prompt.includes('Exit House')
  const isEnter   = prompt.includes('Enter —')
  const isShop    = prompt.includes('Shop') || prompt.includes('Store') || prompt.includes('Pharmacy') || prompt.includes('Market')
  const isVehicle = prompt.includes('Enter Vehicle')
  const isRefuel  = prompt.includes('Refuel')

  if (!isExit && !isEnter && !isVehicle && !isRefuel) return null

  // ── House enter / exit / shop ───────────────────────────────────────────────
  if (isExit || isEnter) {
    const isShopEntry = isEnter && isShop
    const icon   = isExit ? '🚪' : isShopEntry ? '🏪' : '🏠'
    const label  = isExit ? 'EXIT BUILDING' : isShopEntry ? 'ENTER SHOP' : 'ENTER HOUSE'
    const color  = isExit ? '#ff6633' : isShopEntry ? '#00ccff' : '#ffcc00'
    const bg     = isExit ? 'rgba(150,40,10,0.22)' : isShopEntry ? 'rgba(0,140,200,0.18)' : 'rgba(180,130,0,0.18)'
    const placeName = isEnter ? prompt.replace(/^\[ E \]\s+Enter — /, '').trim() : ''

    const glowSize = pulse ? 60 : 28
    const borderAlpha = pulse ? 'cc' : '55'

    return (
      <div style={{
        position: 'fixed', bottom: 130, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        pointerEvents: 'auto',
      }}>
        {/* Location name badge */}
        {placeName && (
          <div style={{
            color: color, fontSize: 12, fontFamily: 'monospace', letterSpacing: 2,
            background: 'rgba(0,0,0,0.88)', padding: '5px 20px', borderRadius: 24,
            border: `1px solid ${color}44`,
            boxShadow: `0 0 16px ${color}22`,
            textTransform: 'uppercase',
          }}>📍 {placeName}</div>
        )}

        {/* Main action button */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); triggerEKey() }}
          onPointerDown={e => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', gap: 18, cursor: 'pointer',
            background: bg,
            border: `2px solid ${color}${borderAlpha}`,
            borderRadius: 20, padding: '14px 38px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 ${glowSize}px ${color}44, inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.8)`,
            transition: 'box-shadow 0.4s, border-color 0.4s', outline: 'none',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 34, filter: pulse ? 'drop-shadow(0 0 8px currentColor)' : 'none', transition: 'filter 0.4s' }}>{icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              color, fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace',
              letterSpacing: 3, lineHeight: 1.1,
              textShadow: `0 0 ${pulse ? 18 : 6}px ${color}88`,
              transition: 'text-shadow 0.4s',
            }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{
                background: 'rgba(255,255,255,0.14)', border: `1px solid ${color}66`,
                borderRadius: 5, padding: '2px 9px', color: '#fff', fontSize: 11,
                fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1,
              }}>E</span>
              <span style={{ color: `${color}88`, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.5 }}>
                or TAP THIS BUTTON
              </span>
            </div>
          </div>
        </button>

        {/* Subtle distance hint dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: color,
              opacity: (tick + i) % 3 === 0 ? 0.9 : 0.15,
              transition: 'opacity 0.3s',
            }}/>
          ))}
        </div>
      </div>
    )
  }

  // ── Vehicle / refuel ────────────────────────────────────────────────────────
  const icon       = isVehicle ? '🚗' : '⛽'
  const actionText = isVehicle ? 'ENTER VEHICLE' : 'REFUEL  ·  $50'
  const color      = isVehicle ? '#88aaff' : '#ffcc00'
  const glowPx     = pulse ? 36 : 18

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); triggerEKey() }}
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', bottom: 108, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1500, pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(0,0,0,0.88)',
        border: `1.5px solid ${color}${pulse ? '99' : '44'}`,
        borderRadius: 14, padding: '13px 30px',
        backdropFilter: 'blur(8px)',
        boxShadow: `0 0 ${glowPx}px ${color}33, 0 6px 20px rgba(0,0,0,0.8)`,
        cursor: 'pointer', outline: 'none', transition: 'all 0.4s',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ color, fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 'bold' }}>
          {actionText}
        </div>
        <div style={{ color: `${color}66`, fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>
          PRESS{' '}
          <span style={{ background: 'rgba(255,255,255,0.12)', border: `1px solid ${color}44`, borderRadius: 3, padding: '0 5px', color: '#ccc' }}>E</span>
          {' '}or tap
        </div>
      </div>
    </button>
  )
}

// ─── Chat / Roleplay Command Bar ───────────────────────────────────────────────
interface ChatMsg { id: number; text: string; type: 'chat'|'me'|'yell'|'cmd'|'system'; at: number }

const RP_COMMANDS: Record<string, (arg: string) => string> = {
  me:      (a) => `✦ ${a}`,
  rob:     (a) => `🔫 ${a ? `Robbing ${a}!` : 'Attempting a robbery!'}`,
  arrest:  (a) => `🚔 ${a ? `Arresting ${a}!` : 'Making an arrest!'}`,
  deal:    (a) => `💊 ${a || 'Dealing on the street corner…'}`,
  yell:    (a) => a.toUpperCase(),
  rp:      (a) => `[RP] ${a}`,
}

let chatIdCounter = 0

function ChatBar({ isPaused, isAdmin, onOpenAdmin }: {
  isPaused: boolean
  isAdmin: boolean
  onOpenAdmin: () => void
}) {
  const [open,     setOpen]    = useState(false)
  const [input,    setInput]   = useState('')
  const [msgs,     setMsgs]    = useState<ChatMsg[]>([
    { id: 0, text: `📋 /help for commands${isAdmin ? '  ·  /admin for GM panel' : ''}`, type: 'system', at: Date.now() },
  ])
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-clear old messages
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setMsgs(prev => prev.filter(m => now - m.at < 10000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Focus when opening
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function submit() {
    const raw = input.trim()
    if (!raw) { setOpen(false); return }
    setInput('')

    let msg: ChatMsg
    if (raw.startsWith('/')) {
      const parts = raw.slice(1).split(' ')
      const cmd   = parts[0].toLowerCase()
      const arg   = parts.slice(1).join(' ')

      if (cmd === 'admin') {
        if (isAdmin) {
          onOpenAdmin()
          setOpen(false)
          return
        }
        msg = { id: ++chatIdCounter, text: '🚫 Access denied — admins only', type: 'system', at: Date.now() }
      } else if (cmd === 'help') {
        const adminHint = isAdmin ? ' /admin' : ''
        msg = { id: ++chatIdCounter, text: `📋 Commands: /me /rob /arrest /deal /yell /rp${adminHint} /help`, type: 'system', at: Date.now() }
      } else {
        const fn = RP_COMMANDS[cmd]
        if (fn) {
          msg = { id: ++chatIdCounter, text: fn(arg), type: cmd === 'yell' ? 'yell' : cmd === 'me' ? 'me' : 'cmd', at: Date.now() }
        } else {
          msg = { id: ++chatIdCounter, text: `❌ Unknown command: /${cmd}  (try /help)`, type: 'system', at: Date.now() }
        }
      }
    } else {
      msg = { id: ++chatIdCounter, text: raw, type: 'chat', at: Date.now() }
    }
    setMsgs(prev => [...prev.slice(-7), msg])
    setOpen(false)
  }

  const msgColor: Record<string, string> = {
    chat: '#e8e8cc', me: '#66ffaa', yell: '#ff5533', cmd: '#ffcc44', system: '#4488cc',
  }

  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1600, pointerEvents: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      minWidth: 320, maxWidth: 480,
    }}>
      {/* Message log (above input) */}
      {msgs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
          {msgs.slice(-4).map(m => (
            <div key={m.id} style={{
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8, padding: '4px 14px',
              color: msgColor[m.type] ?? '#ccc',
              fontSize: m.type === 'yell' ? 14 : 11,
              fontFamily: 'monospace',
              fontWeight: m.type === 'yell' ? 'bold' : 'normal',
              fontStyle: m.type === 'me' ? 'italic' : 'normal',
              letterSpacing: m.type === 'yell' ? 2 : 0.3,
              textShadow: m.type === 'yell' ? '0 0 12px #ff553388' : 'none',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 440, textAlign: 'center',
              pointerEvents: 'none',
            }}>
              {m.text}
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      {open ? (
        <div style={{ display: 'flex', gap: 6, width: '100%' }}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submit() }
              if (e.key === 'Escape') { setOpen(false); setInput('') }
              e.stopPropagation()
            }}
            placeholder="Chat or /me /rob /yell /rp /help…"
            maxLength={120}
            style={{
              flex: 1, background: 'rgba(4,8,18,0.95)', border: '1.5px solid rgba(0,200,255,0.4)',
              borderRadius: 10, padding: '10px 14px',
              color: '#eee', fontSize: 12, fontFamily: 'monospace', outline: 'none',
              backdropFilter: 'blur(8px)', boxShadow: '0 0 20px rgba(0,180,255,0.15)',
            }}
          />
          <button type="button" onClick={submit} onPointerDown={e=>e.stopPropagation()}
            style={{
              padding: '10px 16px', borderRadius: 10, background: 'rgba(0,180,255,0.2)',
              border: '1.5px solid rgba(0,200,255,0.4)', color: '#00ccff',
              fontSize: 13, cursor: 'pointer', fontFamily: 'monospace',
              touchAction: 'manipulation',
            }}>▶</button>
          <button type="button" onClick={()=>{setOpen(false);setInput('')}} onPointerDown={e=>e.stopPropagation()}
            style={{
              padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)', color: '#666',
              fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
              touchAction: 'manipulation',
            }}>✕</button>
        </div>
      ) : (
        !isPaused && (
          <button type="button"
            onClick={e => { e.stopPropagation(); setOpen(true) }}
            onPointerDown={e => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
              padding: '5px 20px', color: 'rgba(255,255,255,0.3)',
              fontSize: 11, fontFamily: 'monospace', letterSpacing: 1,
              cursor: 'pointer', outline: 'none',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            }}>
            💬 CHAT / COMMANDS
          </button>
        )
      )}
    </div>
  )
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────
export default function HUD() {
  const {
    health, money, wantedLevel, score, isGameOver, ammo, inVehicle,
    minimapDots, playerX, playerZ, fps, quality, setQuality, resetGame,
    playerFuel, armor,
    isPaused, setPaused,
    showFullMap, setShowFullMap,
    interactionPrompt,
    showStore, currentShopType, closeStore,
    addAmmo, addFuel, addArmor, addMoney, setHealth,
    waypointX, waypointZ, setWaypoint, clearWaypoint,
    sensitivity, setSensitivity, fov, setFov,
    showFps, setShowFps, showMinimap, setShowMinimap,
    inventory, showInventory, setShowInventory, useInventoryItem, removeInventoryItem, addInventoryItem,
  } = useGameStore()
  const { currentUser, logout } = useAuthStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [playerYaw, setPlayerYaw] = useState(0)

  // Track player facing direction for minimap arrow
  useEffect(() => {
    const id = setInterval(() => setPlayerYaw(gameShared.cameraYaw), 100)
    return () => clearInterval(id)
  }, [])

  const MAP_SIZE = 148
  const mapScale = MAP_SIZE / 290
  const toMapX   = (wx: number) => MAP_SIZE / 2 + wx * mapScale
  const toMapZ   = (wz: number) => MAP_SIZE / 2 + wz * mapScale

  const isAdmin  = currentUser?.role === 'admin'
  const username = currentUser?.username ?? ''
  const qColor   = QUALITY_COLORS[quality]
  const hpColor  = health > 60 ? '#44cc44' : health > 30 ? '#ccaa22' : '#cc3333'
  const fuelColor = playerFuel > 40 ? '#44cc88' : playerFuel > 20 ? '#ffaa22' : '#ff4444'

  function handleBuy(item: StoreItem) {
    const cost = item.cost
    if (money < cost) return
    addMoney(-cost)
    if (item.id === 'ammo30')     addAmmo(30)
    else if (item.id === 'ammo60')     addAmmo(60)
    else if (item.id === 'ammo150')    addAmmo(150)
    else if (item.id === 'ammo200')    addAmmo(200)
    else if (item.id === 'upgrade')    addAmmo(100)
    else if (item.id === 'ammo_hp')  { addAmmo(80); setHealth(Math.min(100, health + 20)) }
    else if (item.id === 'hp30')       setHealth(Math.min(100, health + 30))
    else if (item.id === 'hp70')       setHealth(Math.min(100, health + 70))
    else if (item.id === 'hp100')      setHealth(100)
    else if (item.id === 'med_armor') { setHealth(Math.min(100, health + 50)); addArmor(30) }
    else if (item.id === 'armor50')    addArmor(50)
    else if (item.id === 'armor100')   addArmor(100)

    const invMap: Record<string, InventoryItem> = {
      ammo30:    { id:'inv_ammo30',   name:'Pistol Clip',   icon:'🟡', quantity:1, type:'ammo',      description:'+30 ammo. Standard pistol magazine.', stackable:true },
      ammo60:    { id:'inv_ammo60',   name:'Rifle Mag',     icon:'🟠', quantity:1, type:'ammo',      description:'+60 ammo. Rifle magazine.', stackable:true },
      ammo150:   { id:'inv_ammo150',  name:'Full Arsenal',  icon:'🔴', quantity:1, type:'ammo',      description:'+150 ammo. Full supply crate.', stackable:true },
      ammo200:   { id:'inv_ammo200',  name:'Ammo Crate',   icon:'📦', quantity:1, type:'ammo',      description:'+200 ammo. Heavy crate.', stackable:true },
      hp30:      { id:'inv_hp30',     name:'Bandages',      icon:'🩹', quantity:1, type:'consumable', description:'+30 HP when used.', stackable:true, useValue:30 },
      hp70:      { id:'inv_hp70',     name:'Med Pack',      icon:'💊', quantity:1, type:'consumable', description:'+70 HP when used.', stackable:true, useValue:70 },
      hp100:     { id:'inv_hp100',    name:'Full Heal',     icon:'💉', quantity:1, type:'consumable', description:'Full HP restore when used.', stackable:true, useValue:100 },
      armor50:   { id:'inv_armor50',  name:'Light Armor',   icon:'🦺', quantity:1, type:'equipment',  description:'+50 armor protection.', stackable:false },
      armor100:  { id:'inv_armor100', name:'Heavy Armor',   icon:'🛡', quantity:1, type:'equipment',  description:'+100 full body armor.', stackable:false },
    }
    const invItem = invMap[item.id]
    if (invItem) addInventoryItem(invItem)
  }

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (isGameOver) {
    return (
      <div style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.92)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        color:'#fff', fontFamily:'monospace', zIndex:1000,
        backgroundImage:'radial-gradient(ellipse at center, rgba(120,0,0,0.3) 0%, transparent 70%)',
      }}>
        <div style={{ fontSize:72, color:'#ff2222', marginBottom:12, fontWeight:'bold', letterSpacing:8,
          textShadow:'0 0 40px rgba(255,30,30,0.8)' }}>WASTED</div>
        <div style={{ fontSize:22, color:'#ffaa33', marginBottom:8 }}>Score: {score.toLocaleString()}</div>
        <div style={{ fontSize:16, color:'#aaa', marginBottom:8 }}>Cash: ${money.toLocaleString()}</div>
        <div style={{ fontSize:14, color:'#666', marginBottom:36 }}>
          Level {currentUser?.level ?? 1} · {username}
        </div>
        <div style={{ display:'flex', gap:16 }}>
          <button onClick={resetGame} style={{
            padding:'14px 44px', fontSize:18,
            background:'linear-gradient(135deg, #cc2222, #ff4444)',
            color:'#fff', border:'none', borderRadius:10,
            cursor:'pointer', fontFamily:'monospace', fontWeight:'bold', letterSpacing:2,
            boxShadow:'0 0 30px rgba(255,30,30,0.4)',
          }}>RESPAWN</button>
          <button onClick={logout} style={{
            padding:'14px 28px', fontSize:14,
            background:'rgba(255,255,255,0.05)', color:'#aaa',
            border:'1px solid #333', borderRadius:10,
            cursor:'pointer', fontFamily:'monospace',
          }}>LOG OUT</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Overlays ──────────────────────────────────────────────────────── */}
      {showAdminMenu && (
        <>
          <div onClick={()=>setShowAdminMenu(false)} style={{ position:'fixed', inset:0, zIndex:2399, background:'rgba(0,0,0,0.6)' }}/>
          <AdminChatMenu onClose={()=>setShowAdminMenu(false)} />
        </>
      )}

      {showSettings && !isPaused && (
        <>
          <div onClick={()=>setShowSettings(false)} style={{ position:'fixed', inset:0, zIndex:2199, background:'rgba(0,0,0,0.5)' }}/>
          <SettingsPanel quality={quality} setQuality={setQuality} fps={fps} onClose={()=>setShowSettings(false)}
            sensitivity={sensitivity} setSensitivity={setSensitivity}
            fov={fov} setFov={setFov}
            showFps={showFps} setShowFps={setShowFps}
            showMinimap={showMinimap} setShowMinimap={setShowMinimap}
          />
        </>
      )}

      {isPaused && !showFullMap && !showSettings && !showInventory && (
        <GameMenu
          onResume={()=>setPaused(false)}
          onFullMap={()=>setShowFullMap(true)}
          onInventory={()=>{ setShowInventory(true); setPaused(false) }}
          onSettings={()=>{ setShowSettings(true); setPaused(false) }}
          onLogout={logout}
          username={username}
          score={score}
          money={money}
          level={currentUser?.level ?? 1}
        />
      )}

      {isPaused && showSettings && (
        <>
          <div onClick={()=>{ setShowSettings(false) }} style={{ position:'fixed', inset:0, zIndex:2199, background:'rgba(0,0,0,0.5)' }}/>
          <SettingsPanel quality={quality} setQuality={setQuality} fps={fps} onClose={()=>setShowSettings(false)}
            sensitivity={sensitivity} setSensitivity={setSensitivity}
            fov={fov} setFov={setFov}
            showFps={showFps} setShowFps={setShowFps}
            showMinimap={showMinimap} setShowMinimap={setShowMinimap}
          />
        </>
      )}

      {showFullMap && (
        <FullMapOverlay
          dots={minimapDots}
          playerX={playerX}
          playerZ={playerZ}
          onClose={()=>{ setShowFullMap(false); setPaused(false) }}
          waypointX={waypointX}
          waypointZ={waypointZ}
          onSetWaypoint={(x,z)=>{ setWaypoint(x,z); setShowFullMap(false); setPaused(false) }}
          onClearWaypoint={clearWaypoint}
        />
      )}

      {showStore && currentShopType && (
        <StoreOverlay
          type={currentShopType}
          money={money}
          onBuy={handleBuy}
          onClose={closeStore}
        />
      )}

      {showInventory && (
        <InventoryOverlay
          inventory={inventory}
          ammo={ammo}
          health={health}
          armor={armor}
          money={money}
          onUse={useInventoryItem}
          onRemove={(id) => removeInventoryItem(id)}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* ── Chat / Roleplay command bar (top center) ────────────────────────── */}
      {!showFullMap && (
        <ChatBar isPaused={isPaused} isAdmin={isAdmin} onOpenAdmin={()=>setShowAdminMenu(true)} />
      )}

      {/* ── GPS Arrow (camera-relative bearing to active waypoint) ─────────── */}
      {!isPaused && !showFullMap && waypointX !== null && waypointZ !== null && (
        <GPSArrow waypointX={waypointX} waypointZ={waypointZ} onClear={clearWaypoint} />
      )}

      {/* ── Prominent interaction button (ENTER/EXIT house, vehicle, refuel) ── */}
      {!isPaused && !showFullMap && !showStore && (
        <InteractionButton prompt={interactionPrompt} />
      )}

      {/* ── Non-interactive HUD layer ───────────────────────────────────────── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:100 }}>

        {/* ── TOP-LEFT: Minimap ────────────────────────────────────────────── */}
        {showMinimap && (
        <div style={{ position:'absolute', top:16, left:16, pointerEvents:'auto' }}>

          {/* Compass labels — outside the circle */}
          {[
            { label:'N', x: MAP_SIZE/2, y:-14, color:'#ff4444' },
            { label:'S', x: MAP_SIZE/2, y:MAP_SIZE+4, color:'#aaa' },
            { label:'W', x:-12, y:MAP_SIZE/2, color:'#aaa' },
            { label:'E', x:MAP_SIZE+2, y:MAP_SIZE/2, color:'#aaa' },
          ].map(c=>(
            <div key={c.label} style={{
              position:'absolute',
              left:c.x, top:c.y,
              transform:'translate(-50%,-50%)',
              color:c.color, fontSize:9, fontWeight:'bold', fontFamily:'monospace',
              letterSpacing:0, pointerEvents:'none', lineHeight:1,
            }}>{c.label}</div>
          ))}

          {/* Map circle — clickable to expand */}
          <div
            onClick={()=>setShowFullMap(true)}
            title="Click to open full map"
            style={{
              position:'relative',
              width:MAP_SIZE, height:MAP_SIZE,
              background:'rgba(4,8,14,0.88)',
              border:'2px solid rgba(255,255,255,0.2)',
              borderRadius:'50%', overflow:'hidden',
              boxShadow:'0 0 0 1px rgba(0,255,170,0.2), 0 0 28px rgba(0,255,170,0.06), 0 6px 24px rgba(0,0,0,0.8)',
              cursor:'pointer',
            }}>

            {/* Zone fills — city districts */}
            {[
              { x:-145, z:-145, w:145, h:145, color:'rgba(60,20,80,0.20)', label:'DOWNTOWN' },
              { x:0,    z:-145, w:145, h:145, color:'rgba(20,60,30,0.18)', label:'HARBOR' },
              { x:-145, z:0,    w:145, h:145, color:'rgba(80,50,10,0.16)', label:'INDUSTRIAL' },
              { x:0,    z:0,    w:145, h:145, color:'rgba(10,40,80,0.16)', label:'SUBURBS' },
            ].map(z=>(
              <div key={z.label} style={{
                position:'absolute',
                left:toMapX(z.x), top:toMapZ(z.z),
                width:z.w * mapScale, height:z.h * mapScale,
                background:z.color, pointerEvents:'none',
              }}/>
            ))}

            {/* Main roads (thicker, brighter) */}
            {[0].map(r=>(
              <div key={`mainv${r}`} style={{ position:'absolute', left:toMapX(r)-2, top:0, width:5, height:MAP_SIZE, background:'rgba(255,255,255,0.14)' }}/>
            ))}
            {[0].map(r=>(
              <div key={`mainh${r}`} style={{ position:'absolute', left:0, top:toMapZ(r)-2, width:MAP_SIZE, height:5, background:'rgba(255,255,255,0.14)' }}/>
            ))}
            {/* Side roads */}
            {[-120,-80,-40,40,80,120].map(r=>(
              <div key={`sv${r}`} style={{ position:'absolute', left:toMapX(r)-1, top:0, width:2, height:MAP_SIZE, background:'rgba(255,255,255,0.07)' }}/>
            ))}
            {[-120,-80,-40,40,80,120].map(r=>(
              <div key={`sh${r}`} style={{ position:'absolute', left:0, top:toMapZ(r)-1, width:MAP_SIZE, height:2, background:'rgba(255,255,255,0.07)' }}/>
            ))}

            {/* Gas station markers — yellow square */}
            {GAS_STATIONS.map(gs=>(
              <div key={gs.id} style={{
                position:'absolute', left:toMapX(gs.x)-4, top:toMapZ(gs.z)-4,
                width:8, height:8, background:'#ffcc00', borderRadius:2,
                border:'1px solid #ffee88', opacity:0.95,
                boxShadow:'0 0 4px #ffcc0066',
              }}/>
            ))}
            {/* House markers — orange diamond */}
            {ENTERABLE_HOUSES.map(h=>(
              <div key={h.id} style={{
                position:'absolute', left:toMapX(h.x)-4, top:toMapZ(h.z)-4,
                width:8, height:8, background:'#ff9944',
                transform:'rotate(45deg)', borderRadius:1, opacity:0.75,
              }}/>
            ))}
            {/* Shop markers — colored circle */}
            {SHOPS.map(s=>(
              <div key={s.id} style={{
                position:'absolute', left:toMapX(s.x)-4, top:toMapZ(s.z)-4,
                width:8, height:8, borderRadius:'50%',
                background: s.type==='ammo'?'#cc4422': s.type==='medic'?'#22aa55':'#8844ee',
                border:'1px solid rgba(255,255,255,0.25)',
                boxShadow: `0 0 5px ${s.type==='ammo'?'#cc442266': s.type==='medic'?'#22aa5566':'#8844ee66'}`,
              }}/>
            ))}

            {/* Entity dots (NPCs, vehicles) */}
            {minimapDots.map((dot,i)=>(
              <div key={i} style={{
                position:'absolute',
                left:toMapX(dot.x)-dot.size/2, top:toMapZ(dot.z)-dot.size/2,
                width:dot.size, height:dot.size,
                background:dot.color, borderRadius:'50%',
              }}/>
            ))}

            {/* Waypoint trace line — from player to waypoint */}
            {waypointX !== null && waypointZ !== null && (
              <svg style={{
                position:'absolute', inset:0, width:'100%', height:'100%',
                zIndex:10, pointerEvents:'none', overflow:'hidden',
              }}>
                <line
                  x1={toMapX(playerX)} y1={toMapZ(playerZ)}
                  x2={toMapX(waypointX)} y2={toMapZ(waypointZ)}
                  stroke="#ffdd00" strokeWidth="1.5"
                  strokeDasharray="5,4" opacity="0.75"
                  strokeLinecap="round"
                />
                <circle
                  cx={toMapX(waypointX)} cy={toMapZ(waypointZ)}
                  r="5" fill="none"
                  stroke="#ffdd00" strokeWidth="1.5" opacity="0.6"
                />
              </svg>
            )}

            {/* Waypoint marker */}
            {waypointX !== null && waypointZ !== null && (
              <div style={{
                position:'absolute',
                left: toMapX(waypointX) - 6, top: toMapZ(waypointZ) - 6,
                width:12, height:12, background:'#ffdd00', zIndex:11,
                transform:'rotate(45deg)', borderRadius:2,
                border:'1.5px solid #fff',
                boxShadow:'0 0 8px rgba(255,220,0,0.95)',
              }}/>
            )}

            {/* Player direction arrow */}
            <div style={{
              position:'absolute',
              left: toMapX(playerX), top: toMapZ(playerZ),
              width:0, height:0, zIndex:12,
              transform:`translate(-50%,-50%) rotate(${playerYaw}rad)`,
            }}>
              {/* Arrow body */}
              <div style={{
                position:'absolute',
                left:-4, top:-10,
                width:8, height:14,
                background:'rgba(0,255,170,0.9)',
                clipPath:'polygon(50% 0%, 100% 100%, 50% 75%, 0% 100%)',
                filter:'drop-shadow(0 0 4px rgba(0,255,170,0.8))',
              }}/>
            </div>

            {/* Player glow dot center */}
            <div style={{
              position:'absolute',
              left:toMapX(playerX)-4, top:toMapZ(playerZ)-4,
              width:8, height:8,
              background:'#00ffaa', borderRadius:'50%',
              border:'2px solid #fff', zIndex:13,
              boxShadow:'0 0 8px rgba(0,255,170,0.9)',
            }}/>

            {/* Circular vignette overlay */}
            <div style={{
              position:'absolute', inset:0,
              background:'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.55) 100%)',
              borderRadius:'50%', pointerEvents:'none', zIndex:20,
            }}/>
          </div>

          {/* POI legend strip below minimap */}
          <div style={{
            marginTop:6, display:'flex', gap:6, alignItems:'center',
            background:'rgba(0,0,0,0.7)', borderRadius:6, padding:'4px 8px',
            border:'1px solid rgba(255,255,255,0.07)',
          }}>
            {[
              { color:'#ffcc00', shape:'square', label:'⛽' },
              { color:'#ff9944', shape:'diamond', label:'🏠' },
              { color:'#22aa55', shape:'circle',  label:'💊' },
              { color:'#cc4422', shape:'circle',  label:'🔫' },
              { color:'#8844ee', shape:'circle',  label:'⚡' },
            ].map(p=>(
              <div key={p.label} style={{ display:'flex', alignItems:'center', gap:3 }}>
                <div style={{
                  width:7, height:7,
                  background:p.color,
                  borderRadius: p.shape==='circle' ? '50%' : p.shape==='diamond' ? '1px' : '1px',
                  transform: p.shape==='diamond' ? 'rotate(45deg)' : 'none',
                  flexShrink:0,
                }}/>
                <span style={{ color:'#555', fontSize:8, fontFamily:'monospace' }}>{p.label}</span>
              </div>
            ))}
            <div style={{ marginLeft:'auto', color:'#333', fontSize:7, letterSpacing:1, fontFamily:'monospace', whiteSpace:'nowrap' }}>
              TAP MAP ⬆
            </div>
          </div>

          {/* Inventory quick button below minimap */}
          <button
            type="button"
            onClick={e=>{ e.stopPropagation(); setShowInventory(true) }}
            onPointerDown={e=>e.stopPropagation()}
            style={{
              marginTop:5, width:'100%',
              padding:'5px 0', fontSize:10, fontFamily:'monospace',
              background:'rgba(100,60,255,0.15)', color:'#aa88ff',
              border:'1px solid rgba(150,100,255,0.25)', borderRadius:6,
              cursor:'pointer', letterSpacing:1, transition:'all 0.12s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              touchAction:'manipulation',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(120,80,255,0.25)'; e.currentTarget.style.color='#cc99ff' }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(100,60,255,0.15)'; e.currentTarget.style.color='#aa88ff' }}
          >
            🎒 <span>BAG ({inventory.length})</span>
          </button>
        </div>
        )}

        {/* ── LEFT SIDE: Health + Fuel + Ammo ─────────────────────────────── */}
        <div style={{ position:'absolute', top: MAP_SIZE + 26, left:16, display:'flex', flexDirection:'column', gap:6, width: MAP_SIZE }}>
          {/* Health */}
          <div style={panel({ padding:'8px 12px' })}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color:'#666', fontSize:9, letterSpacing:2 }}>❤️ HEALTH</span>
              <span style={{ color:hpColor, fontSize:12, fontWeight:'bold' }}>{Math.ceil(health)}<span style={{ color:'#444', fontWeight:'normal' }}>/100</span></span>
            </div>
            <div style={{ width:'100%', height:7, background:'#1a1a1a', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${health}%`, height:'100%', borderRadius:4, background:hpColor, transition:'width 0.2s', boxShadow:`0 0 6px ${hpColor}88` }}/>
            </div>
          </div>

          {/* Armor */}
          {armor > 0 && (
            <div style={panel({ padding:'5px 12px' })}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ color:'#666', fontSize:9, letterSpacing:2 }}>🛡 ARMOR</span>
                <span style={{ color:'#4488ff', fontSize:11, fontWeight:'bold' }}>{Math.ceil(armor)}</span>
              </div>
              <div style={{ width:'100%', height:5, background:'#1a1a1a', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${armor}%`, height:'100%', borderRadius:4, background:'#4488ff', transition:'width 0.2s' }}/>
              </div>
            </div>
          )}

          {/* Fuel */}
          {inVehicle && (
            <div style={panel({ padding:'6px 12px' })}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ color:'#666', fontSize:9, letterSpacing:2 }}>⛽ FUEL</span>
                <span style={{ color:fuelColor, fontSize:11, fontWeight:'bold' }}>{Math.ceil(playerFuel)}%</span>
              </div>
              <div style={{ width:'100%', height:6, background:'#1a1a1a', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${playerFuel}%`, height:'100%', borderRadius:4, background:fuelColor, transition:'width 0.3s', boxShadow:`0 0 4px ${fuelColor}88` }}/>
              </div>
            </div>
          )}

          {/* Ammo / Vehicle state */}
          <div style={panel({ padding:'7px 12px', display:'flex', alignItems:'center', gap:8 })}>
            {inVehicle
              ? <><span style={{ fontSize:14 }}>🚗</span><span style={{ color:'#aabbff', fontSize:11 }}>IN VEHICLE</span></>
              : <><span style={{ fontSize:13 }}>🔫</span><span style={{ color:'#ffaa33', fontSize:12, fontWeight:'bold' }}>{ammo}</span><span style={{ color:'#555', fontSize:10, marginLeft:2 }}>AMMO</span></>
            }
          </div>
        </div>

        {/* ── TOP-RIGHT: Money / Score / Wanted ────────────────────────────── */}
        <div style={{ position:'absolute', top:58, right:16, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
          {/* Cash */}
          <div style={panel({ padding:'7px 14px' })}>
            <div style={{ color:'#44ff88', fontSize:24, fontWeight:'bold', letterSpacing:1, textAlign:'right' }}>
              ${money.toLocaleString()}
            </div>
            <div style={{ color:'#336644', fontSize:9, letterSpacing:2, textAlign:'right', marginTop:1 }}>CASH</div>
          </div>
          {/* Score */}
          <div style={panel({ padding:'5px 12px', display:'flex', alignItems:'center', gap:8 })}>
            <span style={{ color:'#555', fontSize:9, letterSpacing:1 }}>SCORE</span>
            <span style={{ color:'#aaffee', fontSize:14, fontWeight:'bold' }}>{score.toLocaleString()}</span>
          </div>
          {/* Wanted stars */}
          <div style={panel({ padding:'5px 12px' })}>
            <div style={{ display:'flex', gap:3, alignItems:'center' }}>
              {Array.from({length:5},(_,i)=>(
                <span key={i} style={{
                  color: i<wantedLevel ? '#ffcc00' : '#1a1a1a',
                  fontSize:18,
                  textShadow: i<wantedLevel ? '0 0 8px #ffcc0088' : 'none',
                  transition: 'all 0.2s',
                }}>★</span>
              ))}
            </div>
          </div>
          {/* Wanted alert */}
          {wantedLevel > 0 && (
            <div style={{
              background:'rgba(180,0,0,0.88)', color:'#fff',
              padding:'4px 11px', borderRadius:6, fontSize:11,
              fontFamily:'monospace', border:'1px solid rgba(255,80,80,0.4)',
              letterSpacing:0.5, animation:'none',
              boxShadow:'0 0 12px rgba(255,40,40,0.3)',
            }}>
              {wantedLevel >= 4 ? '⚡ SWAT TEAM' : wantedLevel >= 2 ? '🚨 POLICE CHASE' : '🚔 POLICE ALERT'}
            </div>
          )}
          {/* Quality + FPS */}
          <div style={panel({ padding:'6px 12px', display:'flex', alignItems:'center', gap:7 })}>
            <span style={{ color:qColor, fontSize:9, letterSpacing:1 }}>{QUALITY_LABELS[quality]}</span>
            {showFps && (
              <>
                <span style={{ color:'#333', fontSize:9 }}>|</span>
                <span style={{ color:fpsColor(fps), fontSize:11, fontWeight:'bold' }}>{fps > 0 ? fps : '—'}</span>
                <span style={{ color:'#444', fontSize:9 }}>FPS</span>
              </>
            )}
          </div>
          {/* Admin badge */}
          {isAdmin && (
            <div style={{ color:'#FFD700', fontSize:10, fontFamily:'monospace', letterSpacing:2,
              background:'rgba(80,50,0,0.7)', padding:'3px 10px', borderRadius:5,
              border:'1px solid rgba(255,200,0,0.3)' }}>
              👑 ADMIN
            </div>
          )}
        </div>

        {/* ── BOTTOM-LEFT: Controls reminder ──────────────────────────────── */}
        <div style={{
          position:'absolute', bottom:16, left:16,
          display:'flex', flexDirection:'column', gap:3,
          opacity: 0.35,
        }}>
          {[
            ['WASD', 'Move'], ['SHIFT', 'Sprint'], ['E', 'Interact'],
            ['SPACE', 'Shoot'], ['ESC', 'Menu'],
          ].map(([key, desc]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{
                background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:3, padding:'1px 5px', fontSize:8, color:'#888',
                fontFamily:'monospace',
              }}>{key}</span>
              <span style={{ color:'#555', fontSize:8, fontFamily:'monospace' }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* ── BOTTOM-CENTER: Compact interaction hint (shops/etc.) ─────────── */}
        {!isPaused && !showFullMap && !showStore && interactionPrompt &&
          !interactionPrompt.includes('Enter —') &&
          !interactionPrompt.includes('Exit House') &&
          !interactionPrompt.includes('Enter Vehicle') &&
          !interactionPrompt.includes('Refuel') && (
          <div style={{
            position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.82)', border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:10, padding:'9px 22px',
            color:'#aaa', fontSize:12, fontFamily:'monospace', whiteSpace:'nowrap',
            boxShadow:'0 0 20px rgba(0,0,0,0.5)',
          }}>
            {interactionPrompt}
          </div>
        )}

        {/* ── BOTTOM-RIGHT: MENU Button ────────────────────────────────────── */}
      </div>

      {/* ── MENU button: top-right, zIndex 1000 above TouchControls overlay (z:400) ── */}
      <div style={{ position:'fixed', top:16, right:16, zIndex:1000, pointerEvents:'auto' }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPaused(!isPaused) }}
          onPointerDown={e => e.stopPropagation()}
          style={{
            padding:'8px 18px', fontSize:12, fontFamily:'monospace',
            background:'rgba(0,0,0,0.82)', color:'#888',
            border:'1px solid rgba(255,255,255,0.18)', borderRadius:8,
            cursor:'pointer', letterSpacing:1, transition:'all 0.12s',
            touchAction:'manipulation', WebkitTapHighlightColor:'transparent',
            minWidth:70, minHeight:36,
          }}
          onMouseEnter={e=>{e.currentTarget.style.color='#ddd'; e.currentTarget.style.borderColor='rgba(255,255,255,0.4)'}}
          onMouseLeave={e=>{e.currentTarget.style.color='#888'; e.currentTarget.style.borderColor='rgba(255,255,255,0.18)'}}
        >
          ☰ MENU
        </button>
      </div>
    </>
  )
}
