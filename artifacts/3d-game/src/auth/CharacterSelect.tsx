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

const CHARACTER_MODELS = [
  {
    id: 'soldier',
    label: 'Soldier',
    emoji: '🪖',
    description: 'Combat ready',
    accent: '#4a8f3f',
  },
  {
    id: 'fembot',
    label: 'Fembot',
    emoji: '🤖',
    description: 'Cyber enforcer',
    accent: '#7a3fbf',
  },
  {
    id: 'michelle',
    label: 'Michelle',
    emoji: '💃',
    description: 'Street dancer',
    accent: '#bf3f6a',
  },
  {
    id: 'xbot',
    label: 'X-Bot',
    emoji: '🦾',
    description: 'Mechanized',
    accent: '#3f6abf',
  },
  {
    id: 'robot',
    label: 'Robot',
    emoji: '🤖',
    description: 'Expressive AI',
    accent: '#bf8f3f',
  },
]

interface Props {
  onReady: () => void
}

export default function CharacterSelect({ onReady }: Props) {
  const { currentUser, updateCharacter } = useAuthStore()
  const [skin, setSkin]     = useState(currentUser?.skinTone    ?? '#D4956A')
  const [outfit, setOutfit] = useState(currentUser?.characterColor ?? '#0055cc')
  const [model, setModel]   = useState(currentUser?.characterModel ?? 'soldier')

  const handleEnter = () => {
    updateCharacter(outfit, skin, model)
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

  const selectedModelData = CHARACTER_MODELS.find(m => m.id === model) ?? CHARACTER_MODELS[0]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #06060f 0%, #0e0e22 50%, #060610 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
      overflowY: 'auto',
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

      <div style={{ position: 'relative', width: '100%', maxWidth: 580, margin: '16px', paddingBottom: 8 }}>
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
          borderRadius: 16, padding: '24px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>

          {/* ── Character model picker ── */}
          <div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>SELECT CHARACTER</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CHARACTER_MODELS.map(ch => {
                const sel = model === ch.id
                return (
                  <button
                    key={ch.id}
                    onClick={() => setModel(ch.id)}
                    style={{
                      flex: '1 1 80px',
                      minWidth: 80,
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: sel ? `2px solid ${ch.accent}` : '2px solid rgba(255,255,255,0.08)',
                      background: sel ? `rgba(${hexToRgb(ch.accent)},0.18)` : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      boxShadow: sel ? `0 0 18px ${ch.accent}55` : 'none',
                      transition: 'all 0.18s',
                      transform: sel ? 'scale(1.06)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{ch.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 'bold', color: sel ? '#fff' : '#aaa', letterSpacing: 1 }}>
                      {ch.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 9, color: sel ? ch.accent : '#555', letterSpacing: 0.5 }}>
                      {ch.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Preview + colour pickers side by side ── */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 2 }}>PREVIEW</div>
              <div style={{
                width: 110, height: 170,
                borderRadius: 10,
                background: `rgba(${hexToRgb(selectedModelData.accent)},0.12)`,
                border: `1px solid ${selectedModelData.accent}44`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: 50 }}>{selectedModelData.emoji}</span>
                <span style={{ fontSize: 9, color: selectedModelData.accent, letterSpacing: 1 }}>
                  {selectedModelData.label.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#ff6600', fontWeight: 'bold', letterSpacing: 1 }}>
                {(currentUser?.username ?? 'PLAYER').toUpperCase()}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                cursor: 'pointer', letterSpacing: 2, marginTop: 4,
                boxShadow: '0 4px 20px rgba(255,80,0,0.35)',
                transition: 'opacity 0.15s',
              }}>
                ENTER CITY
              </button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 20, letterSpacing: 1 }}>
          OPEN WORLD CRIME CITY © 2025
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
