import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/useAuthStore'

const TIPS = [
  'Look for yellow glowing circles at house doors to enter them.',
  'Drive carefully — run out of fuel and you\'re stranded!',
  'Press [ E ] near a gas station while driving to refuel for $50.',
  'Buy body armor at the Black Market for extra protection in fights.',
  'Wanted level drops to zero if you lay low for 30 seconds.',
  'Press [ E ] near a vehicle to enter it. Press [ E ] again to exit.',
  'Pharmacies sell health packs — always keep some stocked.',
  'Higher wanted levels spawn SWAT teams with heavy weapons.',
  'The map has expanded: Harbor, Airport, East Hills & West Docks!',
  'There are 18 enterable houses and 8 gas stations across the city.',
  'Shift while driving for turbo boost. Watch out for corners!',
  'Sprint by holding Shift on foot to move faster.',
]

const DISTRICTS = [
  { name: 'Downtown', icon: '🏙️', desc: 'Skyscrapers & commerce' },
  { name: 'Suburbs',  icon: '🏘️', desc: 'Residential neighborhoods' },
  { name: 'Harbor',   icon: '⚓', desc: 'Docks & waterfront' },
  { name: 'Airport',  icon: '✈️', desc: 'North industrial zone' },
  { name: 'East Hills', icon: '⛰️', desc: 'Upscale hill mansions' },
  { name: 'West Docks', icon: '🚢', desc: 'Shipping warehouses' },
]

interface Props {
  onEnter: () => void
}

type Tab = 'play' | 'stats' | 'controls' | 'map'

export default function LobbyScreen({ onEnter }: Props) {
  const { currentUser, logout } = useAuthStore()
  const [tip, setTip] = useState(0)
  const [fade, setFade] = useState(true)
  const [tab, setTab] = useState<Tab>('play')
  const [enterHover, setEnterHover] = useState(false)
  const [bgFrame, setBgFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setTip(t => (t + 1) % TIPS.length)
        setFade(true)
      }, 400)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setBgFrame(f => f + 1), 80)
    return () => clearInterval(id)
  }, [])

  if (!currentUser) return null

  const levelProgress = ((currentUser.totalScore % 1000) / 1000) * 100

  const BUILDINGS = [
    { l: '2%', h: 90 }, { l: '5%', h: 145 }, { l: '9%', h: 75 }, { l: '13%', h: 190 },
    { l: '17%', h: 115 }, { l: '21%', h: 55 }, { l: '25%', h: 210 }, { l: '29%', h: 165 },
    { l: '33%', h: 88 }, { l: '37%', h: 225 }, { l: '41%', h: 175 }, { l: '45%', h: 108 },
    { l: '49%', h: 155 }, { l: '53%', h: 82 }, { l: '57%', h: 195 }, { l: '61%', h: 135 },
    { l: '65%', h: 68 }, { l: '69%', h: 185 }, { l: '73%', h: 125 }, { l: '77%', h: 98 },
    { l: '81%', h: 155 }, { l: '85%', h: 78 }, { l: '89%', h: 140 }, { l: '93%', h: 105 }, { l: '97%', h: 70 },
  ]

  const windowLit = (bIdx: number, wRow: number, wCol: number) => {
    const seed = (bIdx * 7 + wRow * 3 + wCol * 11 + bgFrame * 0.02) % 1
    return seed > 0.35
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #050810 0%, #0c1525 40%, #080d18 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', overflow: 'hidden', userSelect: 'none',
    }}>
      {/* ── Animated city skyline ────────────────────────────────────────── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260, zIndex: 1, pointerEvents: 'none' }}>
        {BUILDINGS.map((b, bi) => {
          const floors = Math.floor(b.h / 22)
          return (
            <div key={bi} style={{
              position: 'absolute', bottom: 0, left: b.l,
              width: 26, height: b.h,
              background: `rgba(8,14,28,0.95)`,
              borderTop: `1px solid rgba(0,80,180,0.2)`,
            }}>
              {Array.from({ length: floors }, (_, fi) =>
                [0, 1].map((wi) => (
                  <div key={`${fi}_${wi}`} style={{
                    position: 'absolute',
                    left: 3 + wi * 12,
                    bottom: 6 + fi * 22,
                    width: 8, height: 12,
                    background: windowLit(bi, fi, wi)
                      ? `rgba(255,${220 + (bi * 13 % 30)},${100 + (fi * 17 % 80)},0.85)`
                      : 'rgba(10,18,35,0.6)',
                    transition: 'background 2s',
                  }} />
                ))
              )}
            </div>
          )
        })}
        {/* Ground glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
          background: 'linear-gradient(to top, rgba(255,80,0,0.08) 0%, transparent 100%)',
        }} />
      </div>

      {/* ── Stars ────────────────────────────────────────────────────────── */}
      {Array.from({ length: 60 }, (_, i) => (
        <div key={`star${i}`} style={{
          position: 'absolute',
          left: `${(i * 137.5) % 100}%`,
          top: `${(i * 73.1) % 55}%`,
          width: i % 5 === 0 ? 2 : 1,
          height: i % 5 === 0 ? 2 : 1,
          background: `rgba(255,255,255,${0.3 + (i % 4) * 0.18})`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      ))}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, padding: '20px 16px', width: '100%', maxWidth: 760,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,120,0,0.7)', fontSize: 10, letterSpacing: 8, marginBottom: 4 }}>
            OPEN WORLD
          </div>
          <div style={{
            fontSize: 48, fontWeight: 'bold', letterSpacing: 5,
            color: '#fff',
            textShadow: '0 0 60px rgba(255,80,0,0.7), 0 0 20px rgba(255,80,0,0.5), 0 2px 0 rgba(0,0,0,0.8)',
            lineHeight: 1,
          }}>
            CRIME CITY
          </div>
          <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9, letterSpacing: 8, marginTop: 5 }}>
            — NEXT GENERATION OPEN WORLD —
          </div>
        </div>

        {/* ── Tab nav ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4 }}>
          {([['play','▶ PLAY'],['stats','📊 STATS'],['map','🗺 MAP'],['controls','⌨ CONTROLS']] as [Tab,string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '7px 16px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
                letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s',
                border: tab === t ? '1px solid rgba(255,120,0,0.7)' : '1px solid rgba(255,255,255,0.1)',
                background: tab === t ? 'rgba(255,80,0,0.2)' : 'rgba(0,0,0,0.4)',
                color: tab === t ? '#ffaa44' : '#555',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── Tab: PLAY ──────────────────────────────────────────────────── */}
        {tab === 'play' && (
          <div style={{ display: 'flex', gap: 14, width: '100%', alignItems: 'stretch' }}>
            {/* Player card */}
            <div style={{
              background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '18px 22px', flex: 1,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: '#555', fontSize: 9, letterSpacing: 2, marginBottom: 12 }}>PLAYER</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: currentUser.characterColor,
                  border: '2px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 'bold', color: 'rgba(0,0,0,0.6)',
                  flexShrink: 0,
                  boxShadow: `0 0 16px ${currentUser.characterColor}55`,
                }}>
                  {currentUser.username[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                    {currentUser.role === 'admin' ? '👑 ' : ''}{currentUser.username}
                  </div>
                  <div style={{ color: '#ff8844', fontSize: 11, marginTop: 2 }}>
                    Level {currentUser.level}
                  </div>
                </div>
              </div>
              {/* XP bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#444', fontSize: 8, letterSpacing: 2 }}>XP</span>
                  <span style={{ color: '#888', fontSize: 9 }}>{currentUser.totalScore % 1000} / 1000</span>
                </div>
                <div style={{ height: 5, background: '#111', borderRadius: 4 }}>
                  <div style={{
                    width: `${levelProgress}%`, height: '100%', borderRadius: 4,
                    background: 'linear-gradient(90deg, #ff6600, #ffaa00)',
                    boxShadow: '0 0 8px rgba(255,140,0,0.5)',
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {[
                  { label: 'SCORE', value: currentUser.totalScore.toLocaleString(), color: '#00ffaa' },
                  { label: 'CASH', value: `$${currentUser.totalMoney.toLocaleString()}`, color: '#44ff88' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 10px', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ color: '#444', fontSize: 8, letterSpacing: 1, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ color: item.color, fontSize: 13, fontWeight: 'bold' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* World features */}
            <div style={{
              background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '18px 22px', flex: 1,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: '#555', fontSize: 9, letterSpacing: 2, marginBottom: 12 }}>WORLD</div>
              {[
                { icon: '🏠', label: '18 Enterable Houses', desc: 'Yellow glow = enter' },
                { icon: '⛽', label: '8 Gas Stations', desc: 'Keep your tank full' },
                { icon: '🔫', label: '6 Shops', desc: 'Ammo, Health, Weapons' },
                { icon: '🚗', label: '20 Vehicles', desc: 'Drive anywhere' },
                { icon: '🗺️', label: '6 Districts', desc: 'Expanded open world' },
                { icon: '⭐', label: 'Wanted System', desc: 'Police → SWAT' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{ color: '#ccc', fontSize: 11 }}>{f.label}</div>
                    <div style={{ color: '#444', fontSize: 9 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: STATS ─────────────────────────────────────────────────── */}
        {tab === 'stats' && (
          <div style={{
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '20px 28px', width: '100%',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: '#555', fontSize: 9, letterSpacing: 2, marginBottom: 16 }}>PLAYER STATISTICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'LEVEL', value: currentUser.level, icon: '⭐', color: '#ffcc00' },
                { label: 'TOTAL SCORE', value: currentUser.totalScore.toLocaleString(), icon: '🏆', color: '#00ffaa' },
                { label: 'TOTAL CASH', value: `$${currentUser.totalMoney.toLocaleString()}`, icon: '💰', color: '#44ff88' },
                { label: 'XP TO NEXT', value: `${1000 - (currentUser.totalScore % 1000)}`, icon: '📈', color: '#ff8844' },
                { label: 'SESSIONS', value: currentUser.level * 3, icon: '🎮', color: '#aaddff' },
                { label: 'RANK', value: currentUser.role === 'admin' ? 'ADMIN' : 'CIVILIAN', icon: '🎖️', color: currentUser.role === 'admin' ? '#FFD700' : '#888' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: '14px 12px', textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ color: s.color, fontSize: 16, fontWeight: 'bold', marginBottom: 3 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 8, letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* XP progress */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#555', fontSize: 9, letterSpacing: 1 }}>
                <span>LEVEL {currentUser.level}</span>
                <span>XP: {currentUser.totalScore % 1000} / 1000</span>
                <span>LEVEL {currentUser.level + 1}</span>
              </div>
              <div style={{ height: 8, background: '#111', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${levelProgress}%`, height: '100%',
                  background: 'linear-gradient(90deg, #ff6600, #ffcc00)',
                  boxShadow: '0 0 12px rgba(255,140,0,0.6)',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: MAP ───────────────────────────────────────────────────── */}
        {tab === 'map' && (
          <div style={{
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '20px 28px', width: '100%',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: '#555', fontSize: 9, letterSpacing: 2, marginBottom: 14 }}>CITY DISTRICTS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {DISTRICTS.map(d => (
                <div key={d.name} style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: '14px 12px', textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{d.icon}</div>
                  <div style={{ color: '#eee', fontSize: 12, fontWeight: 'bold', marginBottom: 3 }}>{d.name}</div>
                  <div style={{ color: '#555', fontSize: 9 }}>{d.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, color: '#444', fontSize: 10, textAlign: 'center' }}>
              Press <span style={{ color: '#aaa', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3, fontSize: 9 }}>M</span> in-game to open the full city map
            </div>
          </div>
        )}

        {/* ── Tab: CONTROLS ──────────────────────────────────────────────── */}
        {tab === 'controls' && (
          <div style={{
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '20px 28px', width: '100%',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: '#555', fontSize: 9, letterSpacing: 2, marginBottom: 14 }}>KEYBOARD & TOUCH CONTROLS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 28px' }}>
              {[
                ['W A S D / ↑↓←→', 'Move player'],
                ['SHIFT', 'Sprint / Vehicle boost'],
                ['E', 'Enter / Exit (vehicle or house)'],
                ['SPACE', 'Shoot'],
                ['A / D', 'Orbit camera (on foot)'],
                ['DRAG', 'Rotate camera (mouse/touch)'],
                ['ESC / MENU', 'Pause game'],
                ['M / MAP', 'Toggle full city map'],
                ['SHIFT + W', 'Turbo while driving'],
                ['E near gas', 'Refuel vehicle ($50)'],
                ['E near shop', 'Open store menu'],
                ['E at door', 'Enter yellow-lit house'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 4, padding: '2px 8px', fontSize: 9, color: '#aaa', whiteSpace: 'nowrap',
                    minWidth: 70, textAlign: 'center',
                  }}>{key}</span>
                  <span style={{ color: '#555', fontSize: 10 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Rotating tip ─────────────────────────────────────────────── */}
        <div style={{
          color: fade ? '#ff9933' : 'transparent',
          fontSize: 11, textAlign: 'center', maxWidth: 580,
          transition: 'color 0.4s', minHeight: 16,
        }}>
          💡 {TIPS[tip]}
        </div>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={onEnter}
            onMouseEnter={() => setEnterHover(true)}
            onMouseLeave={() => setEnterHover(false)}
            style={{
              padding: '16px 60px', fontSize: 17, fontWeight: 'bold',
              background: enterHover
                ? 'linear-gradient(135deg, #ff5500, #ffaa00)'
                : 'linear-gradient(135deg, #cc4400, #ff6600)',
              color: '#fff', border: 'none', borderRadius: 10,
              cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 3,
              boxShadow: enterHover
                ? '0 0 60px rgba(255,120,0,0.7), 0 4px 20px rgba(0,0,0,0.5)'
                : '0 0 40px rgba(255,100,0,0.4), 0 4px 16px rgba(0,0,0,0.4)',
              transform: enterHover ? 'scale(1.04) translateY(-1px)' : 'scale(1)',
              transition: 'all 0.15s',
            }}
          >
            ▶  ENTER CITY
          </button>
          <button
            onClick={logout}
            style={{
              padding: '16px 22px', fontSize: 12,
              background: 'rgba(0,0,0,0.5)', color: '#444',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
              cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            LOG OUT
          </button>
        </div>
      </div>
    </div>
  )
}
