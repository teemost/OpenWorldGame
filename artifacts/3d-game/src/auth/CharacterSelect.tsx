import { useState } from 'react'
import { useAuthStore } from './useAuthStore'

const SKIN_TONES = [
  { label: 'Fair',   color: '#FDDBB4' },
  { label: 'Peach',  color: '#D4956A' },
  { label: 'Medium', color: '#C68642' },
  { label: 'Olive',  color: '#8D5524' },
  { label: 'Brown',  color: '#5C3317' },
  { label: 'Deep',   color: '#2C1810' },
]

const OUTFIT_COLORS = [
  { label: 'Red',    color: '#cc2200' },
  { label: 'Blue',   color: '#0055cc' },
  { label: 'Green',  color: '#00993a' },
  { label: 'Orange', color: '#ff7700' },
  { label: 'Purple', color: '#7700cc' },
  { label: 'Cyan',   color: '#009999' },
  { label: 'Gold',   color: '#ccaa00' },
  { label: 'White',  color: '#cccccc' },
]

interface Props {
  onReady: () => void
}

export default function CharacterSelect({ onReady }: Props) {
  const { currentUser, updateCharacter } = useAuthStore()
  const [skin, setSkin]     = useState(currentUser?.skinTone    ?? '#D4956A')
  const [outfit, setOutfit] = useState(currentUser?.characterColor ?? '#0055cc')

  const handleEnter = () => {
    updateCharacter(outfit, skin)
    onReady()
  }

  const swatchStyle = (selected: boolean, color: string, round: boolean): React.CSSProperties => ({
    width: 34, height: 34,
    borderRadius: round ? '50%' : 8,
    border: selected ? '3px solid #ff6600' : '3px solid transparent',
    background: color,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: selected ? '0 0 14px rgba(255,100,0,0.75)' : '0 2px 6px rgba(0,0,0,0.55)',
    transition: 'all 0.15s',
    transform: selected ? 'scale(1.2)' : 'scale(1)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #06060f 0%, #0e0e22 50%, #060610 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.12, pointerEvents: 'none' }}>
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

      <div style={{ position: 'relative', width: '100%', maxWidth: 540, margin: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#ff6600', letterSpacing: 6, marginBottom: 4 }}>OPEN WORLD CRIME CITY</div>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 3, textShadow: '0 0 30px rgba(255,100,0,0.5)' }}>
            CREATE YOUR CHARACTER
          </div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 6 }}>── CUSTOMIZE BEFORE YOU ENTER ──</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '28px 24px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex', gap: 28, alignItems: 'flex-start',
        }}>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 2 }}>PREVIEW</div>
            <svg width="110" height="170" viewBox="0 0 110 170">
              <ellipse cx="55" cy="22" rx="15" ry="17" fill={skin} stroke="#222" strokeWidth="1.5" />
              <ellipse cx="55" cy="9"  rx="14" ry="9"  fill="#1a0e08" />
              <rect x="48" y="37" width="14" height="8" fill={skin} />
              <path d="M32 46 Q29 64 30 86 L80 86 Q81 64 78 46 Q67 53 55 53 Q43 53 32 46Z" fill={outfit} stroke="#111" strokeWidth="1" />
              <path d="M32 48 Q21 59 20 78 Q22 82 26 81 Q30 62 37 54Z" fill={outfit} stroke="#111" strokeWidth="1" />
              <ellipse cx="22" cy="83" rx="5.5" ry="6.5" fill={skin} />
              <path d="M78 48 Q89 59 90 78 Q88 82 84 81 Q80 62 73 54Z" fill={outfit} stroke="#111" strokeWidth="1" />
              <ellipse cx="88" cy="83" rx="5.5" ry="6.5" fill={skin} />
              <rect x="29" y="83" width="52" height="7" fill="#1a1a1a" rx="2" />
              <path d="M37 90 Q35 115 34 140 Q38 142 43 141 Q44 116 48 91Z" fill="#1e2040" stroke="#111" strokeWidth="1" />
              <path d="M73 90 Q75 115 76 140 Q72 142 67 141 Q66 116 62 91Z" fill="#1e2040" stroke="#111" strokeWidth="1" />
              <ellipse cx="38"  cy="142" rx="10" ry="5" fill="#111" />
              <ellipse cx="72"  cy="142" rx="10" ry="5" fill="#111" />
              <circle cx="48" cy="21" r="2.5" fill="#111" />
              <circle cx="62" cy="21" r="2.5" fill="#111" />
              <circle cx="49" cy="20" r="1"   fill="#fff" />
              <circle cx="63" cy="20" r="1"   fill="#fff" />
              <path d="M49 30 Q55 33 61 30" stroke="#aa7755" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 12, color: '#ff6600', fontWeight: 'bold', letterSpacing: 1 }}>
              {(currentUser?.username ?? 'PLAYER').toUpperCase()}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>SKIN TONE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SKIN_TONES.map(s => (
                  <button key={s.color} onClick={() => setSkin(s.color)} title={s.label}
                    style={swatchStyle(skin === s.color, s.color, true)} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>OUTFIT COLOR</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {OUTFIT_COLORS.map(o => (
                  <button key={o.color} onClick={() => setOutfit(o.color)} title={o.label}
                    style={swatchStyle(outfit === o.color, o.color, false)} />
                ))}
              </div>
            </div>

            <button onClick={handleEnter} style={{
              width: '100%', padding: '13px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #ff6600, #ff3300)',
              color: '#fff', fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold',
              cursor: 'pointer', letterSpacing: 2, marginTop: 8,
              boxShadow: '0 4px 20px rgba(255,80,0,0.35)',
              transition: 'opacity 0.15s',
            }}>
              ENTER CITY
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 20, letterSpacing: 1 }}>
          OPEN WORLD CRIME CITY © 2025
        </div>
      </div>
    </div>
  )
}
