import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from './useAuthStore'

const LIVE_EVENTS = [
  '🔫 Player187 just robbed a liquor store',
  '🚗 ShadowRider stole a police cruiser',
  '⭐ Wanted level 5 in Downtown district',
  '💀 CrimeLord defeated 3 cops',
  '💰 BigMoney earned $8,400 this session',
  '🏠 GhostX entered a safehouse',
  '🚔 Police pursuit active — Harbor District',
  '💥 XxSniper99 escaped 4-star pursuit',
  '⛽ NightOwl found a free gas station',
  '🔪 Blade_Runner brawling in Suburbs',
  '🎯 Headshot combo × 5 by Dark_Angel',
  '🚁 SWAT helicopter spotted near Airport',
]

interface Particle {
  x: number; y: number; size: number; speed: number; opacity: number; color: string
}

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')
  const [particles, setParticles] = useState<Particle[]>([])
  const [liveIdx, setLiveIdx] = useState(0)
  const [liveVisible, setLiveVisible] = useState(true)
  const [scanY, setScanY] = useState(0)
  const [glitchActive, setGlitchActive] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { login, register, error, clearError } = useAuthStore()

  // Generate particles
  useEffect(() => {
    const colors = ['#ff6600', '#ff3300', '#ffaa00', '#cc0000', '#00ccff', '#ffffff']
    setParticles(Array.from({ length: 55 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      speed: 0.008 + Math.random() * 0.018,
      opacity: 0.1 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    })))
  }, [])

  // Animate particles on canvas
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf: number
    let frame = 0
    const draw = () => {
      frame++
      c.width = window.innerWidth
      c.height = window.innerHeight
      ctx.clearRect(0, 0, c.width, c.height)

      // Grid lines (perspective effect)
      ctx.strokeStyle = 'rgba(255,102,0,0.04)'
      ctx.lineWidth = 1
      const vp = { x: c.width / 2, y: c.height * 0.62 }
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath()
        ctx.moveTo(vp.x + i * 80, c.height)
        ctx.lineTo(vp.x, vp.y)
        ctx.stroke()
      }
      for (let j = 0; j < 10; j++) {
        const t = (j / 10 + (frame * 0.0008) % 0.1) % 1
        const y = vp.y + (c.height - vp.y) * t
        const w = (c.width * 0.8) * (1 - (1 - t))
        ctx.beginPath()
        ctx.moveTo(vp.x - w / 2, y)
        ctx.lineTo(vp.x + w / 2, y)
        ctx.stroke()
      }

      // Particles
      particles.forEach((p, i) => {
        const x = (p.x + frame * p.speed * 0.4) % 100
        const y = (p.y + frame * p.speed) % 100
        ctx.beginPath()
        ctx.arc(x / 100 * c.width, y / 100 * c.height, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()
        // Trailing sparkle
        if (i % 4 === 0) {
          ctx.beginPath()
          ctx.arc(x / 100 * c.width, y / 100 * c.height, p.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = p.color + '08'
          ctx.fill()
        }
      })

      // Scan line
      const sy = (frame * 0.6) % c.height
      const grad = ctx.createLinearGradient(0, sy - 40, 0, sy + 40)
      grad.addColorStop(0, 'transparent')
      grad.addColorStop(0.5, 'rgba(255,102,0,0.03)')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, sy - 40, c.width, 80)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [particles])

  // Cycle live feed
  useEffect(() => {
    const id = setInterval(() => {
      setLiveVisible(false)
      setTimeout(() => {
        setLiveIdx(i => (i + 1) % LIVE_EVENTS.length)
        setLiveVisible(true)
      }, 400)
    }, 3200)
    return () => clearInterval(id)
  }, [])

  // Occasional glitch on title
  useEffect(() => {
    const id = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 120)
    }, 4500 + Math.random() * 3000)
    return () => clearInterval(id)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    if (!username.trim() || !password) { setLocalError('Fill in all fields.'); return }
    login(username.trim(), password)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    if (!username.trim() || !email.trim() || !password || !confirm) { setLocalError('Fill in all fields.'); return }
    if (password !== confirm) { setLocalError('Passwords do not match.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setLocalError('Invalid email address.'); return }
    register(username.trim(), email.trim(), password)
  }

  const displayError = localError || error || ''

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 16px', borderRadius: 8,
    border: '1.5px solid rgba(255,102,0,0.2)',
    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14,
    fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #ff6600 0%, #ff2200 100%)',
    color: '#fff', fontSize: 15, fontFamily: 'monospace', fontWeight: 'bold',
    cursor: 'pointer', letterSpacing: 3, marginTop: 4,
    boxShadow: '0 4px 24px rgba(255,80,0,0.45)',
    transition: 'opacity 0.15s, transform 0.1s',
    textTransform: 'uppercase' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 50% 30%, #0e0a00 0%, #080010 40%, #040010 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', overflow: 'hidden',
    }}>
      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }} />

      {/* City skyline silhouette */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'38vh', overflow:'hidden', zIndex:1, pointerEvents:'none' }}>
        <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice"
          style={{ position:'absolute', bottom:0, width:'100%', height:'100%' }}>
          {/* Buildings layer 1 - far */}
          {[
            [0,180,60,120],[65,200,45,100],[115,160,70,140],[190,210,40,90],[235,175,55,125],
            [295,220,50,80],[350,150,80,150],[435,205,55,95],[495,170,65,130],[565,215,45,85],
            [615,155,75,145],[695,200,60,100],[760,180,50,120],[815,210,65,90],[885,165,70,135],
            [960,205,45,95],[1010,175,60,125],[1075,190,50,110],[1130,155,75,145],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h}
              fill={i % 3 === 0 ? '#0d1520' : i % 3 === 1 ? '#0a1018' : '#0f1828'} />
          ))}
          {/* Windows on buildings */}
          {Array.from({ length: 90 }, (_, i) => {
            const bx = (i * 71) % 1160 + 10
            const by = 160 + ((i * 37) % 120)
            const lit = (i * 13) % 7 !== 0
            return lit ? (
              <rect key={`w${i}`} x={bx} y={by} width={4} height={5}
                fill={i % 4 === 0 ? '#ffcc44' : i % 4 === 1 ? '#88bbff' : i % 4 === 2 ? '#ff6622' : '#ffffff'}
                opacity={(0.3 + (i * 0.07) % 0.5).toFixed(2)} />
            ) : null
          })}
          {/* Street glow */}
          <defs>
            <linearGradient id="streetGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6600" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x={0} y={280} width={1200} height={20} fill="url(#streetGlow)" />
        </svg>

        {/* Neon ground line */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:2,
          background:'linear-gradient(90deg, transparent, #ff6600aa, #ff330077, #ff660099, transparent)',
          filter:'blur(2px)',
        }}/>
      </div>

      {/* Right side: live feed */}
      <div style={{
        position:'absolute', right:24, top:'50%', transform:'translateY(-50%)',
        width:260, zIndex:10, pointerEvents:'none',
      }}>
        <div style={{ color:'rgba(255,102,0,0.5)', fontSize:8, letterSpacing:3, marginBottom:10 }}>
          ◉ LIVE CITY FEED
        </div>
        <div style={{
          opacity: liveVisible ? 1 : 0, transition:'opacity 0.3s',
          background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,102,0,0.15)',
          borderRadius:8, padding:'10px 14px',
          borderLeft:'2px solid #ff6600',
        }}>
          <div style={{ color:'#ccc', fontSize:11, lineHeight:1.5 }}>
            {LIVE_EVENTS[liveIdx]}
          </div>
        </div>
        <div style={{
          marginTop:12, display:'flex', flexDirection:'column', gap:6, opacity:0.4,
        }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.05)',
              borderRadius:6, padding:'7px 12px',
              display:'flex', gap:8, alignItems:'center',
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:['#44ff88','#ff4444','#ffcc00','#4488ff'][i], opacity:0.7 }}/>
              <div style={{ color:'#333', fontSize:9 }}>
                {['Downtown', 'Harbor', 'Airport', 'Suburbs'][i]} District
              </div>
              <div style={{ marginLeft:'auto', color:'rgba(255,255,255,0.15)', fontSize:9 }}>
                {[12, 7, 3, 18][i]} online
              </div>
            </div>
          ))}
        </div>

        {/* Feature badges */}
        <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:5, opacity:0.5 }}>
          {[
            ['🚗','Open world driving'],
            ['⭐','Wanted system'],
            ['🎒','Inventory system'],
            ['🗺️','6 districts'],
          ].map(([icon, label]) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', gap:8,
              color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:0.5,
            }}>
              <span style={{ fontSize:11 }}>{icon}</span>{label}
            </div>
          ))}
        </div>
      </div>

      {/* Main form area */}
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:400, margin:'0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            fontSize:10, color:'#ff6600', letterSpacing:8, marginBottom:8, opacity:0.8,
          }}>
            OPEN WORLD
          </div>
          <div style={{
            fontSize: glitchActive ? 30 : 34, fontWeight:'bold',
            background:'linear-gradient(180deg, #ffffff 0%, #ffaa66 60%, #ff6600 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            letterSpacing: glitchActive ? 8 : 5,
            textShadow:'0 0 60px rgba(255,100,0,0.4)',
            filter: glitchActive ? 'blur(1px)' : 'none',
            transition:'all 0.05s',
            lineHeight:1.1,
          }}>
            CRIME CITY
          </div>
          <div style={{
            fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:4, marginTop:8,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, transparent, rgba(255,102,0,0.3))' }}/>
            PLAYER SYSTEM
            <div style={{ flex:1, height:1, background:'linear-gradient(90deg, rgba(255,102,0,0.3), transparent)' }}/>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(4,6,16,0.92)',
          border:'1px solid rgba(255,102,0,0.18)',
          borderRadius:16, padding:'28px 26px',
          backdropFilter:'blur(20px)',
          boxShadow:'0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,80,0,0.06), inset 0 0 40px rgba(0,0,0,0.3)',
        }}>
          {/* Tabs */}
          <div style={{
            display:'flex', marginBottom:24, borderRadius:8, overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.08)', background:'rgba(0,0,0,0.3)',
          }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setTab(t); setLocalError(''); clearError() }}
                style={{
                  flex:1, padding:'10px', border:'none', cursor:'pointer',
                  background: tab === t ? 'rgba(255,102,0,0.15)' : 'transparent',
                  color: tab === t ? '#ff8844' : 'rgba(255,255,255,0.25)',
                  fontFamily:'monospace', fontSize:11, letterSpacing:2,
                  fontWeight: tab === t ? 'bold' : 'normal',
                  borderBottom: tab === t ? '2px solid #ff6600' : '2px solid transparent',
                  transition:'all 0.18s',
                }}
              >
                {t === 'login' ? '▶ LOGIN' : '+ REGISTER'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, marginBottom:7 }}>USERNAME</div>
                <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
                  onFocus={e => { e.target.style.borderColor='rgba(255,102,0,0.6)' }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,102,0,0.2)' }}
                  placeholder="Enter your username" autoComplete="username" />
              </div>
              <div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, marginBottom:7 }}>PASSWORD</div>
                <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={e => { e.target.style.borderColor='rgba(255,102,0,0.6)' }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,102,0,0.2)' }}
                  placeholder="Enter password" autoComplete="current-password" />
              </div>
              {displayError && (
                <div style={{
                  background:'rgba(255,40,40,0.1)', border:'1px solid rgba(255,60,60,0.3)',
                  color:'#ff7766', padding:'10px 14px', borderRadius:6, fontSize:12,
                  borderLeft:'3px solid #ff4444',
                }}>
                  ⚠ {displayError}
                </div>
              )}
              <button type="submit" style={btnStyle}
                onMouseEnter={e => { e.currentTarget.style.opacity='0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1' }}
              >
                ▶ ENTER CITY
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, marginBottom:7 }}>USERNAME</div>
                <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
                  onFocus={e => { e.target.style.borderColor='rgba(255,102,0,0.6)' }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,102,0,0.2)' }}
                  placeholder="Choose username (min 3 chars)" autoComplete="username" />
              </div>
              <div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, marginBottom:7 }}>EMAIL</div>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={e => { e.target.style.borderColor='rgba(255,102,0,0.6)' }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,102,0,0.2)' }}
                  placeholder="Your email address" autoComplete="email" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, marginBottom:7 }}>PASSWORD</div>
                  <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={e => { e.target.style.borderColor='rgba(255,102,0,0.6)' }}
                    onBlur={e => { e.target.style.borderColor='rgba(255,102,0,0.2)' }}
                    placeholder="Min 6 chars" autoComplete="new-password" />
                </div>
                <div>
                  <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, marginBottom:7 }}>CONFIRM</div>
                  <input style={inputStyle} type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    onFocus={e => { e.target.style.borderColor='rgba(255,102,0,0.6)' }}
                    onBlur={e => { e.target.style.borderColor='rgba(255,102,0,0.2)' }}
                    placeholder="Repeat" autoComplete="new-password" />
                </div>
              </div>
              {displayError && (
                <div style={{
                  background:'rgba(255,40,40,0.1)', border:'1px solid rgba(255,60,60,0.3)',
                  color:'#ff7766', padding:'10px 14px', borderRadius:6, fontSize:12,
                  borderLeft:'3px solid #ff4444',
                }}>
                  ⚠ {displayError}
                </div>
              )}
              <button type="submit" style={btnStyle}
                onMouseEnter={e => { e.currentTarget.style.opacity='0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1' }}
              >
                + CREATE CHARACTER
              </button>
            </form>
          )}
        </div>

        {/* Bottom badges */}
        <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:16, opacity:0.4 }}>
          {['🌆 3D City', '🚗 Vehicles', '⭐ Wanted', '🎒 Inventory'].map(b => (
            <div key={b} style={{ color:'#555', fontSize:9, letterSpacing:0.5 }}>{b}</div>
          ))}
        </div>
        <div style={{ textAlign:'center', color:'rgba(255,255,255,0.1)', fontSize:9, marginTop:8, letterSpacing:2 }}>
          OPEN WORLD CRIME CITY © 2025
        </div>
      </div>
    </div>
  )
}
