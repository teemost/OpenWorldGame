import { useState } from 'react'
import { useGameStore, GraphicsQuality } from '../store/useGameStore'
import { useAuthStore } from '../auth/useAuthStore'

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  low:    'LOW',
  medium: 'MED',
  high:   'HIGH',
}

const QUALITY_COLORS: Record<GraphicsQuality, string> = {
  low:    '#ff6633',
  medium: '#ffcc00',
  high:   '#44ff88',
}

const NEXT_QUALITY: Record<GraphicsQuality, GraphicsQuality> = {
  low: 'medium', medium: 'high', high: 'low',
}

function fpsColor(fps: number): string {
  if (fps >= 55) return '#44ff88'
  if (fps >= 35) return '#ffcc00'
  return '#ff4444'
}

export default function HUD() {
  const {
    health, money, wantedLevel, score, isGameOver, ammo, inVehicle,
    minimapDots, playerX, playerZ, fps, quality, setQuality, resetGame,
  } = useGameStore()
  const { currentUser, logout, getAllUsers } = useAuthStore()
  const [showAdmin, setShowAdmin] = useState(false)

  const mapSize  = 160
  const mapScale = mapSize / 220
  const toMapX   = (wx: number) => mapSize / 2 + wx * mapScale
  const toMapZ   = (wz: number) => mapSize / 2 + wz * mapScale

  const isAdmin  = currentUser?.role === 'admin'
  const username = currentUser?.username ?? ''

  if (isGameOver) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'monospace', zIndex: 1000,
      }}>
        <div style={{ fontSize: 64, color: '#ff3333', marginBottom: 16, fontWeight: 'bold', letterSpacing: 6 }}>
          WASTED
        </div>
        <div style={{ fontSize: 22, color: '#ffaa33', marginBottom: 8 }}>Score: {score.toLocaleString()}</div>
        <div style={{ fontSize: 16, color: '#aaa', marginBottom: 8 }}>Money: ${money.toLocaleString()}</div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>
          Level {currentUser?.level ?? 1} · {username}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={resetGame} style={{
            padding: '12px 36px', fontSize: 18, background: '#cc3333', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold',
          }}>RESPAWN</button>
          <button onClick={logout} style={{
            padding: '12px 24px', fontSize: 14, background: '#333', color: '#aaa',
            border: '1px solid #555', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace',
          }}>LOG OUT</button>
        </div>
      </div>
    )
  }

  const qColor = QUALITY_COLORS[quality]

  return (
    <>
      {/* ── Non-interactive HUD overlay ───────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>

        {/* Top-left: Wanted + player badge */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            background: 'rgba(0,0,0,0.72)', color: '#ffcc00',
            padding: '5px 12px', borderRadius: 6, fontSize: 20, fontFamily: 'monospace', letterSpacing: 4,
          }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ color: i < wantedLevel ? '#ffcc00' : '#333', marginRight: 2 }}>★</span>
            ))}
          </div>
          {wantedLevel > 0 && (
            <div style={{
              background: 'rgba(180,0,0,0.85)', color: '#fff', padding: '4px 10px',
              borderRadius: 4, fontSize: 12, fontFamily: 'monospace', animation: 'pulse 1s infinite',
            }}>
              {wantedLevel >= 4 ? '⚡ SWAT TEAM' : wantedLevel >= 2 ? '🚨 POLICE CHASE' : '🚔 POLICE ALERT'}
            </div>
          )}
          <div style={{
            background: isAdmin ? 'rgba(80,50,0,0.85)' : 'rgba(0,0,0,0.65)',
            border: `1px solid ${isAdmin ? 'rgba(255,200,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: isAdmin ? '#FFD700' : '#aaffcc',
            padding: '4px 10px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {isAdmin && <span>👑</span>}
            <span>{username}</span>
            <span style={{ color: '#666', fontSize: 10 }}>Lv.{currentUser?.level ?? 1}</span>
          </div>
        </div>

        {/* Top-right: Money & Score */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{
            background: 'rgba(0,0,0,0.72)', color: '#44ff88', padding: '6px 14px',
            borderRadius: 6, fontSize: 22, fontFamily: 'monospace', fontWeight: 'bold',
          }}>
            ${money.toLocaleString()}
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)', color: '#aaffee', padding: '4px 10px',
            borderRadius: 4, fontSize: 14, fontFamily: 'monospace',
          }}>
            SCORE: {score.toLocaleString()}
          </div>
        </div>

        {/* Bottom-left: Health + Ammo + hint */}
        <div style={{ position: 'absolute', bottom: 20, left: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'rgba(0,0,0,0.72)', padding: '8px 12px', borderRadius: 6, minWidth: 190 }}>
            <div style={{ color: '#888', fontSize: 10, fontFamily: 'monospace', marginBottom: 4, letterSpacing: 1 }}>HEALTH</div>
            <div style={{ width: '100%', height: 12, background: '#222', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${health}%`, height: '100%', borderRadius: 6, transition: 'width 0.2s',
                background: health > 60 ? '#44cc44' : health > 30 ? '#ccaa22' : '#cc3333',
              }} />
            </div>
            <div style={{ color: health > 60 ? '#44cc44' : health > 30 ? '#ccaa22' : '#cc3333', fontSize: 13, fontFamily: 'monospace', marginTop: 4 }}>
              {health} / 100
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.72)', color: '#ffaa33', padding: '6px 12px',
            borderRadius: 6, fontSize: 14, fontFamily: 'monospace',
          }}>
            {inVehicle ? '🚗 IN VEHICLE — [E] EXIT' : `🔫 AMMO: ${ammo}`}
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.45)', color: '#333', padding: '3px 8px',
            borderRadius: 4, fontSize: 10, fontFamily: 'monospace',
          }}>
            Drag canvas to orbit camera
          </div>
        </div>

        {/* Bottom-right: Minimap */}
        <div style={{
          position: 'absolute', bottom: 20, right: 14, width: mapSize, height: mapSize,
          background: 'rgba(0,0,0,0.78)', border: '2px solid #444',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 16px rgba(0,0,0,0.8)',
        }}>
          {[-80, -40, 0, 40, 80].map(r => (
            <div key={`mvr${r}`} style={{ position: 'absolute', left: toMapX(r) - 2, top: 0, width: 4, height: mapSize, background: '#2a2a2a' }} />
          ))}
          {[-80, -40, 0, 40, 80].map(r => (
            <div key={`mhr${r}`} style={{ position: 'absolute', left: 0, top: toMapZ(r) - 2, width: mapSize, height: 4, background: '#2a2a2a' }} />
          ))}
          {minimapDots.map((dot, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: toMapX(dot.x) - dot.size / 2, top: toMapZ(dot.z) - dot.size / 2,
              width: dot.size, height: dot.size,
              background: dot.color, borderRadius: '50%',
            }} />
          ))}
          <div style={{
            position: 'absolute', left: toMapX(playerX) - 6, top: toMapZ(playerZ) - 6,
            width: 12, height: 12, background: '#00ffaa', borderRadius: '50%',
            border: '2px solid #fff', zIndex: 10,
          }} />
          <div style={{
            position: 'absolute', bottom: 4, left: 0, right: 0,
            textAlign: 'center', color: '#555', fontSize: 9, fontFamily: 'monospace',
          }}>MINIMAP</div>
        </div>

        {/* FPS counter — bottom-right above minimap */}
        <div style={{
          position: 'absolute', bottom: 192, right: 14,
          background: 'rgba(0,0,0,0.72)', borderRadius: 6,
          padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'monospace', fontSize: 12,
        }}>
          <span style={{ color: fpsColor(fps), fontWeight: 'bold', minWidth: 38, textAlign: 'right' }}>
            {fps > 0 ? `${fps}` : '—'} FPS
          </span>
          <div style={{ width: 1, height: 14, background: '#333' }} />
          <span style={{ color: qColor, letterSpacing: 1 }}>
            GFX: {QUALITY_LABELS[quality]}
          </span>
        </div>
      </div>

      {/* ── Interactive buttons ── */}

      {/* Quality cycle button — right of FPS, same row */}
      <div style={{ position: 'fixed', bottom: 192, right: 14, zIndex: 300 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setQuality(NEXT_QUALITY[quality]) }}
          title="Cycle graphics quality (Low / Medium / High)"
          style={{
            opacity: 0,           // invisible — overlays the FPS badge
            position: 'absolute',
            inset: 0,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
          }}
        />
      </div>

      {/* Visible quality button below FPS badge */}
      <div style={{ position: 'fixed', bottom: 162, right: 14, zIndex: 300 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setQuality(NEXT_QUALITY[quality]) }}
          title="Cycle: Low → Medium → High"
          style={{
            background: 'rgba(0,0,0,0.72)',
            border: `1px solid ${qColor}55`,
            color: qColor,
            padding: '3px 10px', borderRadius: 4,
            fontSize: 10, fontFamily: 'monospace',
            cursor: 'pointer', letterSpacing: 1,
            width: mapSize,
          }}
        >
          ⚙ GRAPHICS: {QUALITY_LABELS[quality]} (click to change)
        </button>
      </div>

      {/* Logout */}
      <div style={{ position: 'fixed', top: 82, right: 14, zIndex: 300 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); logout() }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid #333',
            color: '#555', padding: '4px 12px', borderRadius: 4,
            fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
          }}
        >
          LOG OUT
        </button>
      </div>

      {/* Admin panel toggle */}
      {isAdmin && (
        <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 400 }}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setShowAdmin(v => !v) }}
            style={{
              background: 'rgba(80,50,0,0.9)', border: '1px solid rgba(255,200,0,0.5)',
              color: '#FFD700', padding: '6px 18px', borderRadius: 6,
              fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', letterSpacing: 2,
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            👑 ADMIN {showAdmin ? '▲' : '▼'}
          </button>
        </div>
      )}

      {isAdmin && showAdmin && (
        <div
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: 55, left: '50%', transform: 'translateX(-50%)',
            width: 460, maxHeight: '70vh', overflowY: 'auto', zIndex: 500,
            background: 'rgba(8,6,0,0.97)', border: '1px solid rgba(255,200,0,0.3)',
            borderRadius: 12, padding: '18px 22px', fontFamily: 'monospace',
            boxShadow: '0 12px 50px rgba(0,0,0,0.85)',
          }}
        >
          <div style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginBottom: 4, letterSpacing: 2 }}>
            👑 ADMIN CONTROL PANEL
          </div>
          <div style={{ color: '#555', fontSize: 11, marginBottom: 14 }}>
            {username} · {currentUser?.email}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <a
              href="#/admin"
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, display: 'block', textAlign: 'center', padding: '10px',
                background: 'rgba(255,100,0,0.15)', border: '1px solid rgba(255,100,0,0.3)',
                borderRadius: 8, color: '#ff6600', fontSize: 12,
                textDecoration: 'none', letterSpacing: 1,
              }}
            >
              ⚙️ Full Admin Dashboard
            </a>
            <a
              href="#/admin/dashboard"
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, display: 'block', textAlign: 'center', padding: '10px',
                background: 'rgba(100,0,255,0.15)', border: '1px solid rgba(100,0,255,0.3)',
                borderRadius: 8, color: '#aa66ff', fontSize: 12,
                textDecoration: 'none', letterSpacing: 1,
              }}
            >
              🎛️ Game Settings
            </a>
          </div>

          <div style={{ color: '#666', fontSize: 11, marginBottom: 10, letterSpacing: 1 }}>── REGISTERED PLAYERS ──</div>
          {getAllUsers().length === 0 ? (
            <div style={{ color: '#444', fontSize: 12 }}>No registered users yet.</div>
          ) : (
            getAllUsers().map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.03)', borderRadius: 6,
                padding: '8px 10px', marginBottom: 6,
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: u.characterColor,
                  border: '1px solid #333', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 'bold', color: 'rgba(0,0,0,0.6)',
                }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 12 }}>{u.username}</div>
                  <div style={{ color: '#555', fontSize: 10 }}>Lv.{u.level} · {u.totalScore.toLocaleString()} pts · ${u.totalMoney.toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 10, color: '#444', fontSize: 10, textAlign: 'center' }}>
            {getAllUsers().length} player{getAllUsers().length !== 1 ? 's' : ''} registered
          </div>
        </div>
      )}
    </>
  )
}
