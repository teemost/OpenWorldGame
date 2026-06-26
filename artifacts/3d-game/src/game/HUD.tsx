import { useState } from 'react'
import { useGameStore, GraphicsQuality, ShopType } from '../store/useGameStore'
import { useAuthStore } from '../auth/useAuthStore'
import { GAS_STATIONS, ENTERABLE_HOUSES, SHOPS } from './cityData'

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
    { id: 'ammo30',  name: 'Pistol Clip',  desc: '+30 ammo',  cost: 100 },
    { id: 'ammo60',  name: 'Rifle Ammo',   desc: '+60 ammo',  cost: 200 },
    { id: 'ammo150', name: 'Full Arsenal', desc: '+150 ammo', cost: 350 },
  ],
  medic: [
    { id: 'hp30',  name: 'First Aid Kit', desc: '+30 HP',  cost: 150 },
    { id: 'hp70',  name: 'Med Pack',      desc: '+70 HP',  cost: 300 },
    { id: 'hp100', name: 'Full Heal',     desc: 'Full HP', cost: 500 },
  ],
  weapons: [
    { id: 'armor50',  name: 'Body Armor',      desc: '+50 armor',   cost: 400 },
    { id: 'ammo200',  name: 'Ammo Crate',       desc: '+200 ammo',   cost: 300 },
    { id: 'upgrade',  name: 'Weapon Upgrade',   desc: '+100 ammo',   cost: 800 },
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
function SettingsPanel({ quality, setQuality, fps, onClose }: {
  quality: GraphicsQuality; setQuality: (q: GraphicsQuality) => void; fps: number; onClose: () => void
}) {
  const qColor = QUALITY_COLORS[quality]
  const qualities: GraphicsQuality[] = ['low', 'medium', 'high']
  return (
    <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
      style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:340, zIndex:2200,
        background:'rgba(6,8,14,0.97)', border:'1px solid rgba(0,200,255,0.25)',
        borderRadius:14, padding:'22px 24px 20px', fontFamily:'monospace',
        boxShadow:'0 0 60px rgba(0,180,255,0.12),0 20px 60px rgba(0,0,0,0.9)',
      }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ color:'#00ccff', fontSize:13, fontWeight:'bold', letterSpacing:2 }}>⚙ GAME SETTINGS</div>
        <button type="button" onClick={onClose} onPointerDown={e=>e.stopPropagation()}
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#888', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:12, fontFamily:'monospace' }}>
          ✕ CLOSE
        </button>
      </div>
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px', marginBottom:18, border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'#666', fontSize:11, letterSpacing:1 }}>FRAME RATE</span>
        <span style={{ color:fpsColor(fps), fontSize:18, fontWeight:'bold' }}>
          {fps > 0 ? fps : '—'} <span style={{ fontSize:11, color:'#555' }}>FPS</span>
        </span>
      </div>
      <div style={{ marginBottom:6 }}>
        <div style={{ color:'#888', fontSize:10, letterSpacing:2, marginBottom:10 }}>GRAPHICS QUALITY</div>
        <div style={{ display:'flex', gap:8 }}>
          {qualities.map(q => {
            const sel = q === quality; const col = QUALITY_COLORS[q]
            return (
              <button key={q} type="button"
                onClick={e=>{ e.stopPropagation(); setQuality(q) }}
                onPointerDown={e=>e.stopPropagation()}
                style={{
                  flex:1, padding:'10px 4px', borderRadius:8,
                  border: sel ? `2px solid ${col}` : '2px solid rgba(255,255,255,0.08)',
                  background: sel ? `${col}18` : 'rgba(255,255,255,0.03)',
                  color: sel ? col : '#555', fontSize:12, fontFamily:'monospace',
                  fontWeight: sel ? 'bold' : 'normal', cursor:'pointer', letterSpacing:1, transition:'all 0.15s',
                }}>{QUALITY_LABELS[q]}</button>
            )
          })}
        </div>
        <div style={{ color:qColor, fontSize:10, textAlign:'center', marginTop:8, letterSpacing:0.5, opacity:0.8 }}>{QUALITY_DESC[quality]}</div>
      </div>
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:16, paddingTop:14 }}>
        <div style={{ color:'#444', fontSize:10, letterSpacing:1, marginBottom:8 }}>CONTROLS</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
          {[['WASD / ↑↓←→','Move'],['SHIFT','Sprint'],['E','Interact'],['SPACE','Shoot'],['DRAG','Camera orbit'],['MENU','Pause']].map(([key,desc]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 0' }}>
              <span style={{ background:'rgba(255,255,255,0.08)', borderRadius:3, padding:'1px 5px', fontSize:9, color:'#aaa', border:'1px solid rgba(255,255,255,0.1)', whiteSpace:'nowrap' }}>{key}</span>
              <span style={{ color:'#555', fontSize:10 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Game Menu / Pause ─────────────────────────────────────────────────────────
function GameMenu({ onResume, onFullMap, onSettings, onLogout }: {
  onResume: () => void; onFullMap: () => void; onSettings: () => void; onLogout: () => void
}) {
  return (
    <div onClick={onResume} style={{
      position:'fixed', inset:0, zIndex:2100,
      background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{
          background:'rgba(4,8,18,0.98)', border:'1px solid rgba(255,255,255,0.12)',
          borderRadius:16, padding:'32px 40px', minWidth:280,
          fontFamily:'monospace', textAlign:'center',
          boxShadow:'0 0 80px rgba(0,0,0,0.9)',
        }}>
        <div style={{ color:'rgba(255,140,0,0.7)', fontSize:10, letterSpacing:6, marginBottom:6 }}>GAME PAUSED</div>
        <div style={{ color:'#fff', fontSize:26, fontWeight:'bold', letterSpacing:4, marginBottom:28 }}>
          CRIME CITY
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'▶  RESUME',      action: onResume,   color:'#00cc66' },
            { label:'🗺  FULL MAP',    action: onFullMap,  color:'#00aaff' },
            { label:'⚙  SETTINGS',    action: onSettings, color:'#ffcc00' },
            { label:'EXIT',           action: onLogout,   color:'#ff4444' },
          ].map(btn => (
            <button key={btn.label} type="button"
              onClick={e=>{ e.stopPropagation(); btn.action() }}
              onPointerDown={e=>e.stopPropagation()}
              style={{
                padding:'12px 32px', borderRadius:9, border:`1px solid ${btn.color}33`,
                background:`${btn.color}12`, color:btn.color, fontSize:13, fontFamily:'monospace',
                letterSpacing:2, cursor:'pointer', transition:'all 0.15s',
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.background = `${btn.color}28`
                e.currentTarget.style.borderColor = `${btn.color}88`
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.background = `${btn.color}12`
                e.currentTarget.style.borderColor = `${btn.color}33`
              }}
            >{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Full Map Overlay ──────────────────────────────────────────────────────────
function FullMapOverlay({ dots, playerX, playerZ, onClose }: {
  dots: Array<{x:number;z:number;color:string;size:number}>
  playerX: number; playerZ: number; onClose: () => void
}) {
  const MAP_SIZE = 480
  const WORLD_RANGE = 160
  const toMap = (v: number) => MAP_SIZE / 2 + (v / WORLD_RANGE) * (MAP_SIZE / 2)

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2100, background:'rgba(0,0,0,0.88)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{ position:'relative', fontFamily:'monospace' }}>
        <div style={{ color:'#00ccff', fontSize:13, letterSpacing:4, marginBottom:12, textAlign:'center' }}>
          🗺 CITY MAP
        </div>
        <div style={{
          width:MAP_SIZE, height:MAP_SIZE, position:'relative',
          background:'rgba(4,8,18,0.97)', border:'2px solid rgba(0,150,255,0.3)',
          borderRadius:12, overflow:'hidden',
        }}>
          {/* Grid lines */}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`v${r}`} style={{ position:'absolute', left:toMap(r)-1, top:0, width:2, height:MAP_SIZE, background:'rgba(255,255,255,0.05)' }}/>
          ))}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`h${r}`} style={{ position:'absolute', left:0, top:toMap(r)-1, width:MAP_SIZE, height:2, background:'rgba(255,255,255,0.05)' }}/>
          ))}
          {/* Road lines */}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`rv${r}`} style={{ position:'absolute', left:toMap(r)-2, top:0, width:4, height:MAP_SIZE, background:'rgba(255,255,255,0.08)' }}/>
          ))}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`rh${r}`} style={{ position:'absolute', left:0, top:toMap(r)-2, width:MAP_SIZE, height:4, background:'rgba(255,255,255,0.08)' }}/>
          ))}

          {/* Gas stations */}
          {GAS_STATIONS.map(gs=>(
            <div key={gs.id} title="Gas Station" style={{ position:'absolute', left:toMap(gs.x)-10, top:toMap(gs.z)-10, width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⛽</div>
          ))}
          {/* Shops */}
          {SHOPS.map(s=>(
            <div key={s.id} title={s.label} style={{ position:'absolute', left:toMap(s.x)-10, top:toMap(s.z)-10, width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
              {s.type === 'ammo' ? '🔫' : s.type === 'medic' ? '💊' : '⚡'}
            </div>
          ))}
          {/* Houses */}
          {ENTERABLE_HOUSES.map(h=>(
            <div key={h.id} title={h.label} style={{ position:'absolute', left:toMap(h.x)-8, top:toMap(h.z)-8, width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>🏠</div>
          ))}

          {/* Entity dots */}
          {dots.map((dot,i)=>(
            <div key={i} style={{
              position:'absolute',
              left: toMap(dot.x) - dot.size * 0.6,
              top:  toMap(dot.z) - dot.size * 0.6,
              width: dot.size * 1.2, height: dot.size * 1.2,
              background: dot.color, borderRadius:'50%',
            }}/>
          ))}
          {/* Player */}
          <div style={{ position:'absolute', left:toMap(playerX)-8, top:toMap(playerZ)-8, width:16, height:16, background:'#00ffaa', borderRadius:'50%', border:'2px solid #fff', zIndex:10 }}/>
          <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.3)', fontSize:10, letterSpacing:2 }}>N</div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:12, color:'#555', fontSize:10 }}>
          {[['⛽','Gas Station'],['🔫','Ammo'],['💊','Pharmacy'],['⚡','Weapons'],['🏠','House'],['●','You']].map(([ic,lb])=>(
            <span key={lb} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize: ic === '●' ? 8 : 11 }}>{ic}</span>
              <span style={{ color:'#444' }}>{lb}</span>
            </span>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:10, color:'#333', fontSize:10, letterSpacing:2 }}>
          CLICK ANYWHERE TO CLOSE
        </div>
      </div>
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
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2100, background:'rgba(0,0,0,0.80)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{
          background:'rgba(4,8,18,0.98)', border:`1px solid ${accentColor}44`,
          borderRadius:16, padding:'28px 32px', minWidth:320,
          fontFamily:'monospace', boxShadow:`0 0 60px ${accentColor}22`,
        }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ color:accentColor, fontSize:16, fontWeight:'bold', letterSpacing:2 }}>
            {SHOP_TITLES[type]}
          </div>
          <button type="button" onClick={onClose} onPointerDown={e=>e.stopPropagation()}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#888', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:12, fontFamily:'monospace' }}>
            ✕ CLOSE
          </button>
        </div>
        <div style={{ color:'#44ff88', fontSize:18, fontWeight:'bold', marginBottom:16 }}>
          ${money.toLocaleString()} <span style={{ color:'#334', fontSize:11 }}>CASH</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map(item => {
            const canAfford = money >= item.cost
            return (
              <div key={item.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                background: canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'12px 16px',
              }}>
                <div>
                  <div style={{ color: canAfford ? '#fff' : '#444', fontSize:13 }}>{item.name}</div>
                  <div style={{ color:accentColor, fontSize:10, marginTop:2, opacity:0.8 }}>{item.desc}</div>
                </div>
                <button type="button"
                  onClick={e=>{ e.stopPropagation(); if(canAfford) onBuy(item) }}
                  onPointerDown={e=>e.stopPropagation()}
                  disabled={!canAfford}
                  style={{
                    padding:'8px 18px', borderRadius:7, fontSize:12, fontFamily:'monospace',
                    border:`1px solid ${canAfford ? accentColor+'66' : '#333'}`,
                    background: canAfford ? `${accentColor}22` : 'rgba(255,255,255,0.02)',
                    color: canAfford ? accentColor : '#333',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontWeight:'bold', letterSpacing:1,
                  }}>
                  ${item.cost}
                </button>
              </div>
            )
          })}
        </div>
        <div style={{ color:'#333', fontSize:10, textAlign:'center', marginTop:14, letterSpacing:1 }}>
          WALK AWAY OR CLICK OUTSIDE TO LEAVE SHOP
        </div>
      </div>
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
  } = useGameStore()
  const { currentUser, logout, getAllUsers } = useAuthStore()
  const [showAdmin,    setShowAdmin   ] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const MAP_SIZE = 148
  const mapScale = MAP_SIZE / 280
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
    if (item.id === 'ammo30') addAmmo(30)
    else if (item.id === 'ammo60') addAmmo(60)
    else if (item.id === 'ammo150') addAmmo(150)
    else if (item.id === 'ammo200') addAmmo(200)
    else if (item.id === 'upgrade') addAmmo(100)
    else if (item.id === 'hp30') setHealth(Math.min(100, health + 30))
    else if (item.id === 'hp70') setHealth(Math.min(100, health + 70))
    else if (item.id === 'hp100') setHealth(100)
    else if (item.id === 'armor50') addArmor(50)
  }

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (isGameOver) {
    return (
      <div style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        color:'#fff', fontFamily:'monospace', zIndex:1000,
      }}>
        <div style={{ fontSize:64, color:'#ff3333', marginBottom:16, fontWeight:'bold', letterSpacing:6 }}>WASTED</div>
        <div style={{ fontSize:22, color:'#ffaa33', marginBottom:8 }}>Score: {score.toLocaleString()}</div>
        <div style={{ fontSize:16, color:'#aaa', marginBottom:8 }}>Money: ${money.toLocaleString()}</div>
        <div style={{ fontSize:14, color:'#888', marginBottom:32 }}>Level {currentUser?.level ?? 1} · {username}</div>
        <div style={{ display:'flex', gap:16 }}>
          <button onClick={resetGame} style={{ padding:'12px 36px', fontSize:18, background:'#cc3333', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'monospace', fontWeight:'bold' }}>RESPAWN</button>
          <button onClick={logout}    style={{ padding:'12px 24px', fontSize:14, background:'#333', color:'#aaa', border:'1px solid #555', borderRadius:8, cursor:'pointer', fontFamily:'monospace' }}>LOG OUT</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Overlays ──────────────────────────────────────────────────────── */}
      {showSettings && !isPaused && (
        <>
          <div onClick={()=>setShowSettings(false)} style={{ position:'fixed', inset:0, zIndex:2199, background:'rgba(0,0,0,0.5)' }}/>
          <SettingsPanel quality={quality} setQuality={setQuality} fps={fps} onClose={()=>setShowSettings(false)}/>
        </>
      )}

      {isPaused && !showFullMap && !showSettings && (
        <GameMenu
          onResume={()=>setPaused(false)}
          onFullMap={()=>setShowFullMap(true)}
          onSettings={()=>{ setShowSettings(true); setPaused(false) }}
          onLogout={logout}
        />
      )}

      {isPaused && showSettings && (
        <>
          <div onClick={()=>{ setShowSettings(false); setPaused(true) }} style={{ position:'fixed', inset:0, zIndex:2199, background:'rgba(0,0,0,0.5)' }}/>
          <SettingsPanel quality={quality} setQuality={setQuality} fps={fps} onClose={()=>{ setShowSettings(false) }}/>
        </>
      )}

      {showFullMap && (
        <FullMapOverlay
          dots={minimapDots}
          playerX={playerX}
          playerZ={playerZ}
          onClose={()=>{ setShowFullMap(false); setPaused(false) }}
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

      {/* ── Non-interactive HUD layer ───────────────────────────────────────── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:100 }}>

        {/* ── TOP-LEFT: Minimap ────────────────────────────────────────────── */}
        <div style={{
          position:'absolute', top:16, left:16,
          width:MAP_SIZE, height:MAP_SIZE,
          background:'rgba(0,0,0,0.80)',
          border:'2px solid rgba(255,255,255,0.18)',
          borderRadius:'50%', overflow:'hidden',
          boxShadow:'0 0 0 1px rgba(0,255,170,0.25), 0 4px 20px rgba(0,0,0,0.7)',
        }}>
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`mv${r}`} style={{ position:'absolute', left:toMapX(r)-1, top:0, width:2, height:MAP_SIZE, background:'rgba(255,255,255,0.05)' }}/>
          ))}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`mh${r}`} style={{ position:'absolute', left:0, top:toMapZ(r)-1, width:MAP_SIZE, height:2, background:'rgba(255,255,255,0.05)' }}/>
          ))}
          {/* Gas station dots */}
          {GAS_STATIONS.map(gs=>(
            <div key={gs.id} style={{ position:'absolute', left:toMapX(gs.x)-4, top:toMapZ(gs.z)-4, width:8, height:8, background:'#ffcc00', borderRadius:2, border:'1px solid #ffaa00' }}/>
          ))}
          {/* Shop dots */}
          {SHOPS.map(s=>(
            <div key={s.id} style={{ position:'absolute', left:toMapX(s.x)-4, top:toMapZ(s.z)-4, width:8, height:8, background: s.type==='ammo'?'#cc4422':s.type==='medic'?'#22aa44':'#6622cc', borderRadius:2 }}/>
          ))}
          {/* Entity dots */}
          {minimapDots.map((dot,i)=>(
            <div key={i} style={{ position:'absolute', left:toMapX(dot.x)-dot.size/2, top:toMapZ(dot.z)-dot.size/2, width:dot.size, height:dot.size, background:dot.color, borderRadius:'50%' }}/>
          ))}
          {/* Player dot */}
          <div style={{ position:'absolute', left:toMapX(playerX)-6, top:toMapZ(playerZ)-6, width:12, height:12, background:'#00ffaa', borderRadius:'50%', border:'2px solid #fff', zIndex:10 }}/>
          <div style={{ position:'absolute', top:4, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.35)', fontSize:9, fontFamily:'monospace', letterSpacing:1, pointerEvents:'none' }}>N</div>
        </div>

        {/* ── LEFT SIDE: Health + Fuel + Ammo ─────────────────────────────── */}
        <div style={{ position:'absolute', top: MAP_SIZE + 26, left:16, display:'flex', flexDirection:'column', gap:6, width: MAP_SIZE }}>
          {/* Health */}
          <div style={panel({ padding:'8px 12px' })}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color:'#666', fontSize:9, letterSpacing:2 }}>HEALTH</span>
              <span style={{ color:hpColor, fontSize:12, fontWeight:'bold' }}>{Math.ceil(health)}<span style={{ color:'#444', fontWeight:'normal' }}>/100</span></span>
            </div>
            <div style={{ width:'100%', height:7, background:'#1a1a1a', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${health}%`, height:'100%', borderRadius:4, background:hpColor, transition:'width 0.2s', boxShadow:`0 0 6px ${hpColor}88` }}/>
            </div>
          </div>

          {/* Armor (only show if > 0) */}
          {armor > 0 && (
            <div style={panel({ padding:'5px 12px' })}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ color:'#666', fontSize:9, letterSpacing:2 }}>ARMOR</span>
                <span style={{ color:'#4488ff', fontSize:11, fontWeight:'bold' }}>{Math.ceil(armor)}</span>
              </div>
              <div style={{ width:'100%', height:5, background:'#1a1a1a', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${armor}%`, height:'100%', borderRadius:4, background:'#4488ff', transition:'width 0.2s' }}/>
              </div>
            </div>
          )}

          {/* Fuel (only while in vehicle) */}
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

          {/* Ammo / Vehicle */}
          <div style={panel({ padding:'7px 12px', display:'flex', alignItems:'center', gap:8 })}>
            {inVehicle
              ? <><span style={{ fontSize:14 }}>🚗</span><span style={{ color:'#aabbff', fontSize:11 }}>DRIVING · [E] EXIT</span></>
              : <><span style={{ fontSize:13 }}>🔫</span><span style={{ color:'#ffaa33', fontSize:12, fontWeight:'bold' }}>{ammo}</span><span style={{ color:'#555', fontSize:10, marginLeft:2 }}>AMMO</span></>
            }
          </div>
        </div>

        {/* ── TOP-RIGHT: Stats column ──────────────────────────────────────── */}
        <div style={{ position:'absolute', top:16, right:16, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
          <div style={panel({ padding:'7px 14px' })}>
            <div style={{ color:'#44ff88', fontSize:24, fontWeight:'bold', letterSpacing:1, textAlign:'right' }}>
              ${money.toLocaleString()}
            </div>
            <div style={{ color:'#336644', fontSize:9, letterSpacing:2, textAlign:'right', marginTop:1 }}>CASH</div>
          </div>
          <div style={panel({ padding:'5px 12px', display:'flex', alignItems:'center', gap:8 })}>
            <span style={{ color:'#555', fontSize:9, letterSpacing:1 }}>SCORE</span>
            <span style={{ color:'#aaffee', fontSize:14, fontWeight:'bold' }}>{score.toLocaleString()}</span>
          </div>
          <div style={panel({ padding:'5px 12px' })}>
            <div style={{ display:'flex', gap:3, alignItems:'center' }}>
              {Array.from({length:5},(_,i)=>(
                <span key={i} style={{ color: i<wantedLevel ? '#ffcc00' : '#2a2a2a', fontSize:18, textShadow: i<wantedLevel ? '0 0 8px #ffcc0088' : 'none' }}>★</span>
              ))}
            </div>
          </div>
          {wantedLevel > 0 && (
            <div style={{ background:'rgba(180,0,0,0.88)', color:'#fff', padding:'4px 11px', borderRadius:6, fontSize:11, fontFamily:'monospace', border:'1px solid rgba(255,80,80,0.4)', letterSpacing:0.5 }}>
              {wantedLevel >= 4 ? '⚡ SWAT TEAM' : wantedLevel >= 2 ? '🚨 POLICE CHASE' : '🚔 POLICE ALERT'}
            </div>
          )}
          <div style={panel({
            padding:'6px 12px', display:'flex', alignItems:'center', gap:7,
            border: isAdmin ? '1px solid rgba(255,200,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
            background: isAdmin ? 'rgba(60,40,0,0.88)' : 'rgba(0,0,0,0.76)',
          })}>
            {isAdmin && <span style={{ fontSize:13 }}>👑</span>}
            <div style={{ width:22, height:22, borderRadius:'50%', background: currentUser?.characterColor ?? '#44ff88', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:'bold', color:'rgba(0,0,0,0.6)', flexShrink:0 }}>
              {username[0]?.toUpperCase()}
            </div>
            <span style={{ color: isAdmin ? '#FFD700' : '#ccffee', fontSize:12 }}>{username}</span>
            <span style={{ color:'#444', fontSize:10 }}>Lv.{currentUser?.level ?? 1}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', background:'rgba(0,0,0,0.5)', borderRadius:5 }}>
            <span style={{ color:fpsColor(fps), fontSize:11, fontWeight:'bold', fontFamily:'monospace' }}>{fps > 0 ? fps : '—'} FPS</span>
            <span style={{ width:1, height:11, background:'#333', display:'inline-block' }}/>
            <span style={{ color:qColor, fontSize:10, fontFamily:'monospace', letterSpacing:1 }}>{QUALITY_LABELS[quality]}</span>
          </div>
        </div>

        {/* ── BOTTOM CENTER: Interaction prompt ───────────────────────────── */}
        {interactionPrompt && (
          <div style={{
            position:'absolute', bottom:100, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.85)', border:'1px solid rgba(255,255,255,0.2)',
            borderRadius:8, padding:'10px 22px', fontFamily:'monospace',
            color:'#fff', fontSize:13, letterSpacing:1, whiteSpace:'nowrap',
            backdropFilter:'blur(4px)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.6)',
          }}>
            {interactionPrompt}
          </div>
        )}

        {/* ── Fuel warning ────────────────────────────────────────────────── */}
        {inVehicle && playerFuel <= 15 && (
          <div style={{
            position:'absolute', bottom:140, left:'50%', transform:'translateX(-50%)',
            background:'rgba(200,50,0,0.9)', borderRadius:7, padding:'6px 18px',
            color:'#fff', fontSize:12, fontFamily:'monospace', letterSpacing:1, whiteSpace:'nowrap',
            animation: 'none',
          }}>
            ⛽ FUEL LOW — Find a gas station!
          </div>
        )}
      </div>

      {/* ── Interactive buttons ──────────────────────────────────────────────── */}
      <div style={{ position:'fixed', top:270, right:16, zIndex:1000, display:'flex', gap:6 }}>
        <button type="button"
          onClick={e=>{ e.stopPropagation(); setPaused(!isPaused) }}
          onPointerDown={e=>e.stopPropagation()}
          style={{
            background: isPaused ? 'rgba(255,180,0,0.22)' : 'rgba(0,0,0,0.82)',
            border:`1px solid ${isPaused ? '#ffcc00' : 'rgba(255,255,255,0.12)'}`,
            color: isPaused ? '#ffcc00' : '#666',
            padding:'5px 13px', borderRadius:6, fontSize:11, fontFamily:'monospace',
            cursor:'pointer', letterSpacing:1, touchAction:'manipulation', transition:'all 0.15s',
          }}
        >☰ MENU</button>
        <button type="button"
          onClick={e=>{ e.stopPropagation(); setShowSettings(v=>!v) }}
          onPointerDown={e=>e.stopPropagation()}
          style={{
            background: showSettings ? 'rgba(0,180,255,0.22)' : 'rgba(0,0,0,0.82)',
            border:`1px solid ${showSettings ? '#00ccff' : 'rgba(0,180,255,0.28)'}`,
            color: showSettings ? '#00ccff' : '#4d7a99',
            padding:'5px 13px', borderRadius:6, fontSize:11, fontFamily:'monospace',
            cursor:'pointer', letterSpacing:1, touchAction:'manipulation', transition:'all 0.15s',
          }}
        >⚙ SETTINGS</button>
        <button type="button"
          onClick={e=>{ e.stopPropagation(); logout() }}
          onPointerDown={e=>e.stopPropagation()}
          style={{
            background:'rgba(0,0,0,0.72)', border:'1px solid rgba(255,255,255,0.08)',
            color:'#555', padding:'5px 12px', borderRadius:6,
            fontSize:11, fontFamily:'monospace', cursor:'pointer', touchAction:'manipulation',
          }}
        >EXIT</button>
      </div>

      {/* Admin button */}
      {isAdmin && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', zIndex:1000 }}>
          <button type="button"
            onClick={e=>{ e.stopPropagation(); setShowAdmin(v=>!v) }}
            onPointerDown={e=>e.stopPropagation()}
            style={{
              background:'rgba(70,45,0,0.92)', border:'1px solid rgba(255,200,0,0.45)',
              color:'#FFD700', padding:'7px 20px', borderRadius:7,
              fontFamily:'monospace', fontSize:12, cursor:'pointer', letterSpacing:2,
              boxShadow:'0 2px 14px rgba(0,0,0,0.6)',
            }}
          >👑 ADMIN {showAdmin ? '▲' : '▼'}</button>
        </div>
      )}

      {isAdmin && showAdmin && (
        <div
          onClick={e=>e.stopPropagation()}
          onMouseDown={e=>e.stopPropagation()}
          style={{
            position:'fixed', top:58, left:'50%', transform:'translateX(-50%)',
            width:460, maxHeight:'68vh', overflowY:'auto', zIndex:1001,
            background:'rgba(8,6,0,0.97)', border:'1px solid rgba(255,200,0,0.28)',
            borderRadius:12, padding:'18px 22px', fontFamily:'monospace',
            boxShadow:'0 12px 50px rgba(0,0,0,0.88)',
          }}
        >
          <div style={{ color:'#FFD700', fontSize:14, fontWeight:'bold', marginBottom:4, letterSpacing:2 }}>👑 ADMIN CONTROL PANEL</div>
          <div style={{ color:'#555', fontSize:11, marginBottom:14 }}>{username} · {currentUser?.email}</div>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <a href="#/admin" onClick={e=>e.stopPropagation()} style={{ flex:1, display:'block', textAlign:'center', padding:'10px', background:'rgba(255,100,0,0.15)', border:'1px solid rgba(255,100,0,0.3)', borderRadius:8, color:'#ff6600', fontSize:12, textDecoration:'none', letterSpacing:1 }}>⚙️ Full Admin Dashboard</a>
            <a href="#/admin/dashboard" onClick={e=>e.stopPropagation()} style={{ flex:1, display:'block', textAlign:'center', padding:'10px', background:'rgba(100,0,255,0.15)', border:'1px solid rgba(100,0,255,0.3)', borderRadius:8, color:'#aa66ff', fontSize:12, textDecoration:'none', letterSpacing:1 }}>🎛️ Game Settings</a>
          </div>
          <div style={{ color:'#666', fontSize:11, marginBottom:10, letterSpacing:1 }}>── REGISTERED PLAYERS ──</div>
          {getAllUsers().length === 0
            ? <div style={{ color:'#444', fontSize:12 }}>No registered users yet.</div>
            : getAllUsers().map(u=>(
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'8px 10px', marginBottom:6, border:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:u.characterColor, border:'1px solid #333', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:'bold', color:'rgba(0,0,0,0.6)' }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#fff', fontSize:12 }}>{u.username}</div>
                  <div style={{ color:'#555', fontSize:10 }}>Lv.{u.level} · {u.totalScore.toLocaleString()} pts · ${u.totalMoney.toLocaleString()}</div>
                </div>
              </div>
            ))
          }
          <div style={{ marginTop:10, color:'#444', fontSize:10, textAlign:'center' }}>{getAllUsers().length} player{getAllUsers().length!==1?'s':''} registered</div>
        </div>
      )}
    </>
  )
}
