import { useState } from 'react'
import { useAuthStore } from './useAuthStore'

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')
  const { login, register, error, clearError } = useAuthStore()

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
    width: '100%', padding: '12px 16px', borderRadius: 8, border: '1.5px solid #333',
    background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15,
    fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #ff6600, #ff3300)',
    color: '#fff', fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold',
    cursor: 'pointer', letterSpacing: 2, marginTop: 4,
    boxShadow: '0 4px 20px rgba(255,80,0,0.35)',
    transition: 'opacity 0.15s',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #06060f 0%, #0e0e22 50%, #060610 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      {/* Animated city skyline bg */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.15, pointerEvents: 'none',
      }}>
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: 0,
            left: `${(i * 5.8) % 100}%`,
            width: `${30 + (i * 17) % 40}px`,
            height: `${80 + (i * 43) % 200}px`,
            background: i % 3 === 0 ? '#2a3a5a' : i % 3 === 1 ? '#1e2e3e' : '#2e3e4e',
          }} />
        ))}
      </div>

      <div style={{
        position: 'relative', width: '100%', maxWidth: 420,
        margin: '0 16px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: '#ff6600', letterSpacing: 6, marginBottom: 6 }}>
            OPEN WORLD
          </div>
          <div style={{
            fontSize: 32, fontWeight: 'bold', color: '#fff',
            letterSpacing: 4, textShadow: '0 0 30px rgba(255,100,0,0.5)',
          }}>
            CRIME CITY
          </div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 3, marginTop: 6 }}>
            ── PLAYER SYSTEM ──
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '32px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 28, borderRadius: 8, overflow: 'hidden', border: '1px solid #222' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setLocalError(''); clearError() }}
                style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                  background: tab === t ? 'rgba(255,100,0,0.2)' : 'transparent',
                  color: tab === t ? '#ff6600' : '#555',
                  fontFamily: 'monospace', fontSize: 12, letterSpacing: 2,
                  fontWeight: tab === t ? 'bold' : 'normal',
                  borderBottom: tab === t ? '2px solid #ff6600' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'login' ? 'LOGIN' : 'REGISTER'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>USERNAME</div>
                <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username" autoComplete="username" />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>PASSWORD</div>
                <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password" autoComplete="current-password" />
              </div>
              {displayError && (
                <div style={{
                  background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)',
                  color: '#ff6666', padding: '10px 14px', borderRadius: 6, fontSize: 13,
                }}>
                  {displayError}
                </div>
              )}
              <button type="submit" style={btnStyle}>ENTER CITY</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>USERNAME</div>
                <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Choose username (min 3 chars)" autoComplete="username" />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>EMAIL</div>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Your email address" autoComplete="email" />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>PASSWORD</div>
                <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters" autoComplete="new-password" />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>CONFIRM PASSWORD</div>
                <input style={inputStyle} type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password" autoComplete="new-password" />
              </div>
              {displayError && (
                <div style={{
                  background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)',
                  color: '#ff6666', padding: '10px 14px', borderRadius: 6, fontSize: 13,
                }}>
                  {displayError}
                </div>
              )}
              <button type="submit" style={btnStyle}>CREATE CHARACTER</button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 20, letterSpacing: 1 }}>
          OPEN WORLD CRIME CITY © 2025
        </div>
      </div>
    </div>
  )
}
