import { useState } from 'react'
import { useGameStore, GraphicsQuality } from '../store/useGameStore'
import { useAuthStore } from '../auth/useAuthStore'

const QUALITY_LABELS: Record<GraphicsQuality, string> = { low:'LOW', medium:'MED', high:'HIGH' }
const QUALITY_COLORS: Record<GraphicsQuality, string> = { low:'#ff6633', medium:'#ffcc00', high:'#44ff88' }
const QUALITY_DESC:   Record<GraphicsQuality, string> = {
  low:    'Best for weak devices — max FPS',
  medium: 'Balanced visuals & performance',
  high:   'Maximum detail — needs GPU',
}

function fpsColor(fps: number) {
  if (fps >= 55) return '#44ff88'
  if (fps >= 35) return '#ffcc00'
  return '#ff4444'
}

// ─── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ quality, setQuality, fps, onClose }: {
  quality: GraphicsQuality; setQuality: (q: GraphicsQuality) => void; fps: number; onClose: () => void
}) {
  const qColor = QUALITY_COLORS[quality]
  const qualities: GraphicsQuality[] = ['low', 'medium', 'high']
  return (
    <div
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:340, zIndex:2000,
        background:'rgba(6,8,14,0.97)', border:'1px solid rgba(0,200,255,0.25)',
        borderRadius:14, padding:'22px 24px 20px', fontFamily:'monospace',
        boxShadow:'0 0 60px rgba(0,180,255,0.12),0 20px 60px rgba(0,0,0,0.9)',
      }}
    >
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
          {[['WASD / ↑↓←→','Move'],['SHIFT','Sprint'],['E','Enter/Exit car'],['CLICK','Shoot'],['DRAG','Camera orbit'],['F5','Respawn']].map(([key,desc]) => (
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

// ─── Shared panel style ────────────────────────────────────────────────────────
const panel = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background:'rgba(0,0,0,0.76)',
  border:'1px solid rgba(255,255,255,0.08)',
  borderRadius:8,
  backdropFilter:'blur(4px)',
  fontFamily:'monospace',
  ...extra,
})

// ─── Main HUD ─────────────────────────────────────────────────────────────────
export default function HUD() {
  const {
    health, money, wantedLevel, score, isGameOver, ammo, inVehicle,
    minimapDots, playerX, playerZ, fps, quality, setQuality, resetGame,
  } = useGameStore()
  const { currentUser, logout, getAllUsers } = useAuthStore()
  const [showAdmin,    setShowAdmin   ] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const MAP_SIZE = 148
  const mapScale = MAP_SIZE / 220
  const toMapX   = (wx: number) => MAP_SIZE / 2 + wx * mapScale
  const toMapZ   = (wz: number) => MAP_SIZE / 2 + wz * mapScale

  const isAdmin  = currentUser?.role === 'admin'
  const username = currentUser?.username ?? ''
  const qColor   = QUALITY_COLORS[quality]
  const hpColor  = health > 60 ? '#44cc44' : health > 30 ? '#ccaa22' : '#cc3333'

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
          <button onClick={logout} style={{ padding:'12px 24px', fontSize:14, background:'#333', color:'#aaa', border:'1px solid #555', borderRadius:8, cursor:'pointer', fontFamily:'monospace' }}>LOG OUT</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Settings modal ──────────────────────────────────────────────────── */}
      {showSettings && (
        <>
          <div onClick={()=>setShowSettings(false)} style={{ position:'fixed', inset:0, zIndex:1999, background:'rgba(0,0,0,0.5)' }}/>
          <SettingsPanel quality={quality} setQuality={setQuality} fps={fps} onClose={()=>setShowSettings(false)}/>
        </>
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
          {[-80,-40,0,40,80].map(r=>(
            <div key={`mv${r}`} style={{ position:'absolute', left:toMapX(r)-1, top:0, width:2, height:MAP_SIZE, background:'rgba(255,255,255,0.06)' }}/>
          ))}
          {[-80,-40,0,40,80].map(r=>(
            <div key={`mh${r}`} style={{ position:'absolute', left:0, top:toMapZ(r)-1, width:MAP_SIZE, height:2, background:'rgba(255,255,255,0.06)' }}/>
          ))}
          {minimapDots.map((dot,i)=>(
            <div key={i} style={{ position:'absolute', left:toMapX(dot.x)-dot.size/2, top:toMapZ(dot.z)-dot.size/2, width:dot.size, height:dot.size, background:dot.color, borderRadius:'50%' }}/>
          ))}
          {/* Player dot */}
          <div style={{ position:'absolute', left:toMapX(playerX)-6, top:toMapZ(playerZ)-6, width:12, height:12, background:'#00ffaa', borderRadius:'50%', border:'2px solid #fff', zIndex:10 }}/>
          {/* Compass N label */}
          <div style={{ position:'absolute', top:4, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.35)', fontSize:9, fontFamily:'monospace', letterSpacing:1, pointerEvents:'none' }}>N</div>
        </div>

        {/* ── LEFT SIDE, below minimap: Health + Ammo ─────────────────────── */}
        <div style={{ position:'absolute', top: MAP_SIZE + 26, left:16, display:'flex', flexDirection:'column', gap:6, width: MAP_SIZE }}>
          {/* Health */}
          <div style={panel({ padding:'8px 12px' })}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color:'#666', fontSize:9, letterSpacing:2 }}>HEALTH</span>
              <span style={{ color:hpColor, fontSize:12, fontWeight:'bold' }}>{health}<span style={{ color:'#444', fontWeight:'normal' }}>/100</span></span>
            </div>
            <div style={{ width:'100%', height:7, background:'#1a1a1a', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${health}%`, height:'100%', borderRadius:4, background:hpColor, transition:'width 0.2s', boxShadow:`0 0 6px ${hpColor}88` }}/>
            </div>
          </div>
          {/* Ammo / Vehicle */}
          <div style={panel({ padding:'7px 12px', display:'flex', alignItems:'center', gap:8 })}>
            {inVehicle
              ? <><span style={{ fontSize:14 }}>🚗</span><span style={{ color:'#aabbff', fontSize:11 }}>IN VEHICLE · [E] EXIT</span></>
              : <><span style={{ fontSize:13 }}>🔫</span><span style={{ color:'#ffaa33', fontSize:12, fontWeight:'bold' }}>{ammo}</span><span style={{ color:'#555', fontSize:10, marginLeft:2 }}>AMMO</span></>
            }
          </div>
        </div>

        {/* ── TOP-RIGHT: Stats column ──────────────────────────────────────── */}
        <div style={{ position:'absolute', top:16, right:16, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
          {/* Money */}
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
                <span key={i} style={{ color: i<wantedLevel ? '#ffcc00' : '#2a2a2a', fontSize:18, textShadow: i<wantedLevel ? '0 0 8px #ffcc0088' : 'none' }}>★</span>
              ))}
            </div>
          </div>
          {/* Police alert badge */}
          {wantedLevel > 0 && (
            <div style={{ background:'rgba(180,0,0,0.88)', color:'#fff', padding:'4px 11px', borderRadius:6, fontSize:11, fontFamily:'monospace', border:'1px solid rgba(255,80,80,0.4)', letterSpacing:0.5 }}>
              {wantedLevel >= 4 ? '⚡ SWAT TEAM' : wantedLevel >= 2 ? '🚨 POLICE CHASE' : '🚔 POLICE ALERT'}
            </div>
          )}
          {/* Player badge */}
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
          {/* FPS badge */}
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', background:'rgba(0,0,0,0.5)', borderRadius:5 }}>
            <span style={{ color:fpsColor(fps), fontSize:11, fontWeight:'bold', fontFamily:'monospace' }}>{fps > 0 ? fps : '—'} FPS</span>
            <span style={{ width:1, height:11, background:'#333', display:'inline-block' }}/>
            <span style={{ color:qColor, fontSize:10, fontFamily:'monospace', letterSpacing:1 }}>{QUALITY_LABELS[quality]}</span>
          </div>
        </div>

      </div>

      {/* ── Interactive buttons (zIndex≥1000 to clear TouchControls) ────────── */}

      {/* Settings button — bottom-right above touch buttons */}
      <div style={{ position:'fixed', bottom:110, right:16, zIndex:1000 }}>
        <button type="button"
          onClick={e=>{ e.stopPropagation(); setShowSettings(v=>!v) }}
          onPointerDown={e=>e.stopPropagation()}
          style={{
            background: showSettings ? 'rgba(0,180,255,0.22)' : 'rgba(0,0,0,0.78)',
            border:`2px solid ${showSettings ? '#00ccff' : 'rgba(0,180,255,0.3)'}`,
            color: showSettings ? '#00ccff' : '#5588aa',
            padding:'7px 16px', borderRadius:7, fontSize:12, fontFamily:'monospace',
            cursor:'pointer', letterSpacing:1, touchAction:'manipulation', transition:'all 0.15s',
          }}
        >⚙ SETTINGS</button>
      </div>

      {/* Logout — bottom-right, below settings */}
      <div style={{ position:'fixed', bottom:72, right:16, zIndex:1000 }}>
        <button type="button"
          onClick={e=>{ e.stopPropagation(); logout() }}
          onPointerDown={e=>e.stopPropagation()}
          style={{
            background:'rgba(0,0,0,0.6)', border:'1px solid #2a2a2a', color:'#444',
            padding:'5px 14px', borderRadius:6, fontSize:11, fontFamily:'monospace',
            cursor:'pointer', touchAction:'manipulation',
          }}
        >LOG OUT</button>
      </div>

      {/* Admin button — top-center */}
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

      {/* Admin panel dropdown */}
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
