import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/useAuthStore'

const TIPS = [
  'Drive carefully — run out of fuel and you\'re stranded.',
  'Enter any house with a yellow door glow to explore inside.',
  'Buy body armor at the Black Market for extra protection.',
  'Gas stations refuel your vehicle for $50.',
  'Wanted level drops to zero if you lay low for 30 seconds.',
  'Press E near a vehicle to enter it. Press E again to exit.',
  'Pharmacies sell health packs — always keep some stocked.',
  'Higher wanted levels spawn SWAT teams with heavy weapons.',
]

interface Props {
  onEnter: () => void
}

export default function LobbyScreen({ onEnter }: Props) {
  const { currentUser, logout } = useAuthStore()
  const [tip, setTip] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setTip(t => (t + 1) % TIPS.length)
        setFade(true)
      }, 400)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  if (!currentUser) return null

  const levelProgress = ((currentUser.totalScore % 1000) / 1000) * 100

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #070b14 0%, #0d1a2e 50%, #0a0f1a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', overflow: 'hidden',
    }}>
      {/* City silhouette backdrop */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
        background: 'linear-gradient(to top, #0a0f1a 0%, transparent 100%)',
        zIndex: 0,
      }}/>
      {[
        { l: '3%', h: 100 }, { l: '7%', h: 140 }, { l: '12%', h: 80 }, { l: '16%', h: 180 },
        { l: '20%', h: 120 }, { l: '25%', h: 60 }, { l: '30%', h: 200 }, { l: '35%', h: 160 },
        { l: '40%', h: 90 }, { l: '45%', h: 220 }, { l: '50%', h: 170 }, { l: '55%', h: 110 },
        { l: '60%', h: 150 }, { l: '65%', h: 80 }, { l: '70%', h: 190 }, { l: '75%', h: 130 },
        { l: '80%', h: 70 }, { l: '85%', h: 160 }, { l: '90%', h: 100 }, { l: '94%', h: 140 },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: 0, left: b.l,
          width: 28, height: b.h,
          background: 'rgba(10,20,40,0.9)',
          borderTop: '1px solid rgba(0,100,200,0.15)',
          zIndex: 1,
        }}/>
      ))}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: 24 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,140,0,0.6)', fontSize: 11, letterSpacing: 6, marginBottom: 6 }}>
            OPEN WORLD
          </div>
          <div style={{
            fontSize: 52, fontWeight: 'bold', letterSpacing: 6,
            color: '#fff',
            textShadow: '0 0 60px rgba(255,80,0,0.6), 0 0 20px rgba(255,80,0,0.4)',
          }}>
            CRIME CITY
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 8, marginTop: 4 }}>
            — ENTER THE WORLD —
          </div>
        </div>

        {/* Player card + stats row */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          {/* Player card */}
          <div style={{
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '20px 24px', minWidth: 220,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: currentUser.characterColor,
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 'bold', color: 'rgba(0,0,0,0.7)',
                flexShrink: 0,
              }}>
                {currentUser.username[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                  {currentUser.role === 'admin' ? '👑 ' : ''}{currentUser.username}
                </div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                  Level {currentUser.level}
                </div>
              </div>
            </div>

            {/* Level progress */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#555', fontSize: 9, letterSpacing: 2 }}>XP PROGRESS</span>
                <span style={{ color: '#aaa', fontSize: 9 }}>{(currentUser.totalScore % 1000)}/1000</span>
              </div>
              <div style={{ height: 4, background: '#1a1a2e', borderRadius: 4 }}>
                <div style={{
                  width: `${levelProgress}%`, height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, #ff6600, #ffaa00)',
                }}/>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'TOTAL SCORE', value: currentUser.totalScore.toLocaleString() },
                { label: 'TOTAL CASH', value: `$${currentUser.totalMoney.toLocaleString()}` },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                  padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{ color: '#555', fontSize: 8, letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: '#00ffaa', fontSize: 13, fontWeight: 'bold' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* World info */}
          <div style={{
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '20px 24px', minWidth: 220,
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ color: '#555', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>WORLD FEATURES</div>
            {[
              { icon: '🏠', label: '6 Enterable Buildings', desc: 'Look for yellow door glows' },
              { icon: '⛽', label: '4 Gas Stations', desc: 'Keep your tank full' },
              { icon: '🔫', label: '3 Shops', desc: 'Ammo, Health & Weapons' },
              { icon: '🚗', label: '16 Vehicles', desc: 'Drive anywhere on the map' },
              { icon: '⭐', label: 'Wanted System', desc: 'Police escalates to SWAT' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ color: '#ccc', fontSize: 11 }}>{f.label}</div>
                  <div style={{ color: '#555', fontSize: 9 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls quick reference */}
        <div style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '12px 20px',
          display: 'flex', gap: 24, alignItems: 'center',
        }}>
          {[
            ['WASD', 'Move'],
            ['E', 'Enter/Exit'],
            ['SHIFT', 'Sprint/Boost'],
            ['SPACE', 'Shoot'],
            ['DRAG', 'Camera'],
            ['MENU', 'Pause'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4, padding: '2px 7px', fontSize: 9, color: '#aaa',
              }}>{k}</span>
              <span style={{ color: '#444', fontSize: 9 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Rotating tip */}
        <div style={{
          color: fade ? '#ff9933' : 'transparent',
          fontSize: 12, textAlign: 'center', maxWidth: 500,
          transition: 'color 0.4s',
          minHeight: 18,
        }}>
          💡 {TIPS[tip]}
        </div>

        {/* Enter button */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={onEnter}
            style={{
              padding: '16px 56px', fontSize: 18, fontWeight: 'bold',
              background: 'linear-gradient(135deg, #cc4400, #ff6600)',
              color: '#fff', border: 'none', borderRadius: 10,
              cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 3,
              boxShadow: '0 0 40px rgba(255,100,0,0.35)',
              transition: 'transform 0.1s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.04)'
              e.currentTarget.style.boxShadow = '0 0 60px rgba(255,100,0,0.55)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(255,100,0,0.35)'
            }}
          >
            ENTER CITY
          </button>
          <button
            onClick={logout}
            style={{
              padding: '16px 24px', fontSize: 13,
              background: 'rgba(0,0,0,0.5)', color: '#555',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
              cursor: 'pointer', fontFamily: 'monospace',
            }}
          >
            LOG OUT
          </button>
        </div>
      </div>
    </div>
  )
}
