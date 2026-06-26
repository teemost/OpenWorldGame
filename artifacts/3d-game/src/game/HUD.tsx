import { useState, useEffect } from 'react'
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
function SettingsPanel({ quality, setQuality, fps, onClose }: {
  quality: GraphicsQuality; setQuality: (q: GraphicsQuality) => void; fps: number; onClose: () => void
}) {
  const qColor = QUALITY_COLORS[quality]
  const qualities: GraphicsQuality[] = ['low', 'medium', 'high']
  return (
    <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
      style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:360, zIndex:2200,
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
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px', marginBottom:14, border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'#666', fontSize:11, letterSpacing:1 }}>FRAME RATE</span>
        <span style={{ color:fpsColor(fps), fontSize:18, fontWeight:'bold' }}>
          {fps > 0 ? fps : '—'} <span style={{ fontSize:11, color:'#555' }}>FPS</span>
        </span>
      </div>
      <div style={{ marginBottom:14 }}>
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
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:14 }}>
        <div style={{ color:'#444', fontSize:10, letterSpacing:1, marginBottom:8 }}>CONTROLS</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
          {[
            ['WASD / ↑↓←→','Move'],['SHIFT','Sprint/Boost'],['E','Interact'],
            ['SPACE','Shoot'],['A/D','Camera orbit'],['E near door','Enter house'],
            ['DRAG','Camera rotate'],['ESC','Pause game'],
          ].map(([key,desc]) => (
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
function GameMenu({ onResume, onFullMap, onSettings, onLogout, username, score, money, level }: {
  onResume: () => void; onFullMap: () => void; onSettings: () => void; onLogout: () => void
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
            { label:'▶  RESUME GAME',   action: onResume,   color:'#00cc66', icon:'▶' },
            { label:'🗺  CITY MAP',      action: onFullMap,  color:'#00aaff', icon:'🗺' },
            { label:'⚙  SETTINGS',      action: onSettings, color:'#ffcc00', icon:'⚙' },
            { label:'🚪 EXIT TO MENU',   action: onLogout,   color:'#ff4444', icon:'🚪' },
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
function FullMapOverlay({ dots, playerX, playerZ, onClose }: {
  dots: Array<{x:number;z:number;color:string;size:number}>
  playerX: number; playerZ: number; onClose: () => void
}) {
  const MAP_SIZE = 500
  const WORLD_RANGE = 190
  const toMap = (v: number) => MAP_SIZE / 2 + (v / WORLD_RANGE) * (MAP_SIZE / 2)

  const DISTRICT_LABELS = [
    { label: 'DOWNTOWN', x: 0, z: 0, color: '#ff8844' },
    { label: 'HARBOR', x: 0, z: 155, color: '#44aaff' },
    { label: 'AIRPORT', x: 0, z: -155, color: '#ffcc44' },
    { label: 'EAST HILLS', x: 150, z: 0, color: '#ff6644' },
    { label: 'WEST DOCKS', x: -150, z: 0, color: '#44ccaa' },
  ]

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2100, background:'rgba(0,0,0,0.92)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
        style={{ position:'relative', fontFamily:'monospace' }}>
        <div style={{ color:'#00ccff', fontSize:13, letterSpacing:4, marginBottom:10, textAlign:'center' }}>
          🗺 CRIME CITY — FULL MAP
        </div>
        <div style={{
          width:MAP_SIZE, height:MAP_SIZE, position:'relative',
          background:'rgba(4,8,18,0.97)', border:'2px solid rgba(0,150,255,0.35)',
          borderRadius:12, overflow:'hidden',
          boxShadow:'0 0 40px rgba(0,100,255,0.15)',
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
          {/* Outer ring roads at ±120 (already in above set) */}

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
            }}>⛽</div>
          ))}
          {/* Shops */}
          {SHOPS.map(s=>(
            <div key={s.id} title={s.label} style={{
              position:'absolute', left:toMap(s.x)-10, top:toMap(s.z)-10,
              width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12,
            }}>
              {s.type === 'ammo' ? '🔫' : s.type === 'medic' ? '💊' : '⚡'}
            </div>
          ))}
          {/* Houses */}
          {ENTERABLE_HOUSES.map(h=>(
            <div key={h.id} title={h.label} style={{
              position:'absolute', left:toMap(h.x)-7, top:toMap(h.z)-7,
              width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10,
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
            }}/>
          ))}
          {/* Player marker */}
          <div style={{
            position:'absolute', left:toMap(playerX)-8, top:toMap(playerZ)-8,
            width:16, height:16, background:'#00ffaa', borderRadius:'50%',
            border:'2px solid #fff', zIndex:10,
            boxShadow:'0 0 10px rgba(0,255,170,0.8)',
          }}/>
          {/* Compass */}
          <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:2 }}>N</div>
          <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.15)', fontSize:9, letterSpacing:2 }}>S</div>
          <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.15)', fontSize:9 }}>W</div>
          <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.15)', fontSize:9 }}>E</div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:14, justifyContent:'center', marginTop:10, color:'#555', fontSize:10, flexWrap:'wrap' }}>
          {[
            ['⛽','Gas (8)'],['🔫','Ammo'],['💊','Pharmacy'],['⚡','Weapons'],
            ['🏠',`Houses (${ENTERABLE_HOUSES.length})`],['●','You'],
          ].map(([ic,lb])=>(
            <span key={lb} style={{ display:'flex', alignItems:'center', gap:3 }}>
              <span style={{ fontSize: ic === '●' ? 8 : 11 }}>{ic}</span>
              <span style={{ color:'#444' }}>{lb}</span>
            </span>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:8, color:'#282828', fontSize:10, letterSpacing:2 }}>
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

// ─── Prominent Enter / Exit Button ────────────────────────────────────────────
function InteractionButton({ prompt, onPress }: { prompt: string | null; onPress: () => void }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 750)
    return () => clearInterval(id)
  }, [])

  if (!prompt) return null

  const isExit    = prompt.includes('Exit House')
  const isEnter   = prompt.includes('Enter —')
  const isVehicle = prompt.includes('Enter Vehicle')
  const isRefuel  = prompt.includes('Refuel')
  const isShop    = prompt.includes('Enter —') && !isEnter

  if (!isExit && !isEnter && !isVehicle && !isRefuel) return null

  // For house enter/exit → big prominent button
  if (isExit || isEnter) {
    const icon   = isExit ? '🚪' : '🏠'
    const label  = isExit ? 'EXIT HOUSE' : 'ENTER HOUSE'
    const color  = isExit ? '#ff6633' : '#ffcc00'
    const bgColor = isExit ? 'rgba(180,60,20,0.15)' : 'rgba(200,160,0,0.12)'
    const houseLabel = isEnter ? prompt.replace('[ E ]  Enter — ', '').replace('[ E ]  Enter — ', '') : ''
    return (
      <div style={{
        position: 'fixed',
        bottom: 130,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}>
        {houseLabel && (
          <div style={{
            color: '#ffeeaa',
            fontSize: 12,
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.8)',
            padding: '4px 14px',
            borderRadius: 20,
            border: '1px solid rgba(255,220,0,0.3)',
            letterSpacing: 1,
          }}>
            {houseLabel}
          </div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: bgColor,
          border: `2px solid ${color}${pulse ? 'cc' : '55'}`,
          borderRadius: 16,
          padding: '14px 32px',
          backdropFilter: 'blur(8px)',
          boxShadow: `0 0 ${pulse ? 40 : 20}px ${color}44, 0 4px 20px rgba(0,0,0,0.6)`,
          transition: 'all 0.3s',
        }}>
          <span style={{ fontSize: 28 }}>{icon}</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color, fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 2, lineHeight: 1 }}>
              {label}
            </div>
            <div style={{
              color: `${color}88`,
              fontSize: 11,
              fontFamily: 'monospace',
              letterSpacing: 2,
              marginTop: 3,
            }}>
              PRESS  <span style={{
                background: 'rgba(255,255,255,0.12)',
                border: `1px solid ${color}55`,
                borderRadius: 4,
                padding: '1px 8px',
                color: '#fff',
              }}>E</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // For vehicle / refuel → smaller compact prompt
  const icon    = isVehicle ? '🚗' : '⛽'
  const actionText = isVehicle ? 'ENTER VEHICLE' : 'REFUEL  ·  $50'
  const color   = isVehicle ? '#88aaff' : '#ffcc00'

  return (
    <div style={{
      position: 'fixed',
      bottom: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1200,
      pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(0,0,0,0.80)',
      border: `1px solid ${color}44`,
      borderRadius: 12,
      padding: '10px 24px',
      backdropFilter: 'blur(6px)',
      boxShadow: `0 0 20px ${color}22, 0 4px 14px rgba(0,0,0,0.6)`,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ color, fontSize: 13, fontFamily: 'monospace', letterSpacing: 1, fontWeight: 'bold' }}>
        {actionText}
      </span>
      <span style={{
        background: 'rgba(255,255,255,0.1)',
        border: `1px solid rgba(255,255,255,0.2)`,
        borderRadius: 4, padding: '2px 8px',
        color: '#aaa', fontSize: 10, fontFamily: 'monospace',
      }}>E</span>
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
  const { currentUser, logout } = useAuthStore()
  const [showSettings, setShowSettings] = useState(false)

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
          username={username}
          score={score}
          money={money}
          level={currentUser?.level ?? 1}
        />
      )}

      {isPaused && showSettings && (
        <>
          <div onClick={()=>{ setShowSettings(false) }} style={{ position:'fixed', inset:0, zIndex:2199, background:'rgba(0,0,0,0.5)' }}/>
          <SettingsPanel quality={quality} setQuality={setQuality} fps={fps} onClose={()=>setShowSettings(false)}/>
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

      {/* ── Prominent interaction button (ENTER/EXIT house, vehicle, refuel) ── */}
      {!isPaused && !showFullMap && !showStore && (
        <InteractionButton prompt={interactionPrompt} onPress={() => {}} />
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
            <div key={`mv${r}`} style={{ position:'absolute', left:toMapX(r)-0.5, top:0, width:1, height:MAP_SIZE, background:'rgba(255,255,255,0.05)' }}/>
          ))}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`mh${r}`} style={{ position:'absolute', left:0, top:toMapZ(r)-0.5, width:MAP_SIZE, height:1, background:'rgba(255,255,255,0.05)' }}/>
          ))}
          {/* Road lines on minimap */}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`mrv${r}`} style={{ position:'absolute', left:toMapX(r)-1, top:0, width:3, height:MAP_SIZE, background:'rgba(255,255,255,0.07)' }}/>
          ))}
          {[-120,-80,-40,0,40,80,120].map(r=>(
            <div key={`mrh${r}`} style={{ position:'absolute', left:0, top:toMapZ(r)-1, width:MAP_SIZE, height:3, background:'rgba(255,255,255,0.07)' }}/>
          ))}
          {/* Gas station dots */}
          {GAS_STATIONS.map(gs=>(
            <div key={gs.id} style={{ position:'absolute', left:toMapX(gs.x)-4, top:toMapZ(gs.z)-4, width:8, height:8, background:'#ffcc00', borderRadius:2, border:'1px solid #ffaa00', opacity:0.9 }}/>
          ))}
          {/* House dots on minimap */}
          {ENTERABLE_HOUSES.map(h=>(
            <div key={h.id} style={{ position:'absolute', left:toMapX(h.x)-3, top:toMapZ(h.z)-3, width:6, height:6, background:'#ff9944', borderRadius:1, opacity:0.7 }}/>
          ))}
          {/* Shop dots */}
          {SHOPS.map(s=>(
            <div key={s.id} style={{ position:'absolute', left:toMapX(s.x)-3, top:toMapZ(s.z)-3, width:6, height:6, background: s.type==='ammo'?'#cc4422':s.type==='medic'?'#22aa44':'#6622cc', borderRadius:1 }}/>
          ))}
          {/* Entity dots */}
          {minimapDots.map((dot,i)=>(
            <div key={i} style={{ position:'absolute', left:toMapX(dot.x)-dot.size/2, top:toMapZ(dot.z)-dot.size/2, width:dot.size, height:dot.size, background:dot.color, borderRadius:'50%' }}/>
          ))}
          {/* Player dot */}
          <div style={{ position:'absolute', left:toMapX(playerX)-6, top:toMapZ(playerZ)-6, width:12, height:12, background:'#00ffaa', borderRadius:'50%', border:'2px solid #fff', zIndex:10, boxShadow:'0 0 6px rgba(0,255,170,0.8)' }}/>
          <div style={{ position:'absolute', top:4, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.35)', fontSize:9, fontFamily:'monospace', letterSpacing:1, pointerEvents:'none' }}>N</div>
        </div>

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
        <div style={{ position:'absolute', top:16, right:16, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
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
            <span style={{ color:'#333', fontSize:9 }}>|</span>
            <span style={{ color:fpsColor(fps), fontSize:11, fontWeight:'bold' }}>{fps > 0 ? fps : '—'}</span>
            <span style={{ color:'#444', fontSize:9 }}>FPS</span>
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

        {/* ── BOTTOM-RIGHT: MENU Button (always visible) ──────────────────── */}
        <div style={{ position:'absolute', bottom:16, right:16, pointerEvents:'auto' }}>
          <button
            onClick={() => setPaused(!isPaused)}
            style={{
              padding:'10px 18px', fontSize:12, fontFamily:'monospace',
              background:'rgba(0,0,0,0.75)', color:'#666',
              border:'1px solid rgba(255,255,255,0.12)', borderRadius:8,
              cursor:'pointer', letterSpacing:1, transition:'all 0.12s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='#aaa'; e.currentTarget.style.borderColor='rgba(255,255,255,0.25)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#666'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'}}
          >
            ☰ MENU
          </button>
        </div>
      </div>
    </>
  )
}
