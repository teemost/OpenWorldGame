import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../auth/useAuthStore'
import { useModelStore, ModelCategory, DEFAULT_SETTINGS, modelBlobURLs } from '../store/useModelStore'

const CATEGORIES: { key: ModelCategory; label: string; icon: string; desc: string }[] = [
  { key: 'player',  label: 'Player Character',  icon: '🎮', desc: 'The main player character model' },
  { key: 'npc',     label: 'NPC Citizens',       icon: '🚶', desc: 'Generic civilian NPC models' },
  { key: 'police',  label: 'Police Officers',    icon: '👮', desc: 'Standard police officer model' },
  { key: 'swat',    label: 'SWAT Units',         icon: '🪖', desc: 'High-wanted-level SWAT model' },
  { key: 'vehicle', label: 'Vehicles',           icon: '🚗', desc: 'All driveable vehicle models' },
]

const ACCEPTED = '.glb,.gltf,.fbx,.obj,.ply'
const ACCEPTED_FORMATS = ['glb', 'gltf', 'fbx', 'obj', 'ply']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

// ─── Sidebar nav ─────────────────────────────────────────────────────────────
type Section = 'overview' | 'models' | 'settings' | 'players'

const NAV: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview',        icon: '📊' },
  { key: 'models',   label: 'Model Manager',   icon: '🗂️' },
  { key: 'settings', label: 'Game Settings',   icon: '⚙️' },
  { key: 'players',  label: 'Player Manager',  icon: '👥' },
]

// ─── Model upload card ───────────────────────────────────────────────────────
function ModelUploadCard({ cat }: { cat: typeof CATEGORIES[0] }) {
  const { models, uploadModel, removeModel } = useModelStore()
  const meta    = models[cat.key]
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]    = useState('')
  const hasURL = modelBlobURLs.has(cat.key)

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_FORMATS.includes(ext)) {
      setError(`Unsupported format: .${ext}. Use ${ACCEPTED_FORMATS.join(', ')}.`)
      return
    }
    setError('')
    setUploading(true)
    try {
      await uploadModel(cat.key, file)
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '20px 22px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{cat.icon}</span>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{cat.label}</div>
          <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{cat.desc}</div>
        </div>
        {hasURL && (
          <div style={{
            marginLeft: 'auto', background: 'rgba(0,200,100,0.15)',
            border: '1px solid rgba(0,200,100,0.3)', color: '#00cc66',
            padding: '3px 10px', borderRadius: 20, fontSize: 11,
          }}>
            ● ACTIVE IN-GAME
          </div>
        )}
        {meta && !hasURL && (
          <div style={{
            marginLeft: 'auto', background: 'rgba(200,150,0,0.15)',
            border: '1px solid rgba(200,150,0,0.3)', color: '#ccaa00',
            padding: '3px 10px', borderRadius: 20, fontSize: 11,
          }}>
            ⟳ RELOAD TO ACTIVATE
          </div>
        )}
      </div>

      {meta ? (
        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 14px',
          marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#aaa', fontSize: 13, marginBottom: 4 }}>
                📄 <span style={{ color: '#fff' }}>{meta.name}</span>
              </div>
              <div style={{ color: '#555', fontSize: 11 }}>
                Format: <span style={{ color: '#888' }}>.{meta.format.toUpperCase()}</span>
                &ensp;·&ensp;Size: <span style={{ color: '#888' }}>{formatBytes(meta.size)}</span>
                &ensp;·&ensp;Uploaded: <span style={{ color: '#888' }}>{formatDate(meta.uploadedAt)}</span>
              </div>
            </div>
            <button
              onClick={() => removeModel(cat.key)}
              style={{
                background: 'rgba(200,0,0,0.2)', border: '1px solid rgba(200,0,0,0.35)',
                color: '#ff6666', padding: '4px 12px', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        onDragOver={(e)=>{ e.preventDefault(); setDragging(true) }}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        onClick={()=>fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'rgba(255,100,0,0.7)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 8, padding: '18px 12px', textAlign: 'center',
          cursor: 'pointer', background: dragging ? 'rgba(255,100,0,0.06)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <div style={{ color: '#ff6600', fontSize: 13 }}>⟳ Uploading…</div>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⬆️</div>
            <div style={{ color: '#888', fontSize: 13 }}>
              {meta ? 'Drop a new file to replace' : 'Drop model file here or click to browse'}
            </div>
            <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>
              Supported: GLB · GLTF · FBX · OBJ · PLY
            </div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display:'none' }} onChange={onInputChange}/>
      {error && (
        <div style={{ color:'#ff6666', fontSize:12, marginTop:8, padding:'6px 10px',
          background:'rgba(255,0,0,0.1)', borderRadius:4 }}>{error}</div>
      )}
    </div>
  )
}

// ─── Settings section ─────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 0.01, unit = '', onChange }: {
  label: string; value: number; min: number; max: number
  step?: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#bbb', fontSize: 13 }}>{label}</span>
        <span style={{ color: '#ff6600', fontSize: 13, fontFamily: 'monospace' }}>
          {typeof value === 'number' && step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#ff6600', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ color: '#444', fontSize: 10 }}>{min}{unit}</span>
        <span style={{ color: '#444', fontSize: 10 }}>{max}{unit}</span>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange, desc }: {
  label: string; value: boolean; onChange: (v: boolean) => void; desc?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div>
        <div style={{ color: '#bbb', fontSize: 13 }}>{label}</div>
        {desc && <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{desc}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: value ? '#ff6600' : '#333',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}/>
      </div>
    </div>
  )
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '20px 22px', marginBottom: 18,
    }}>
      <div style={{ color: '#ff6600', fontSize: 12, letterSpacing: 2, marginBottom: 18,
        fontFamily: 'monospace', borderBottom: '1px solid rgba(255,100,0,0.2)', paddingBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SettingsSection() {
  const { settings, setSettings, resetSettings } = useModelStore()
  const s = settings

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ color:'#fff', fontSize:18, fontWeight:'bold' }}>Game Settings</div>
        <button onClick={resetSettings} style={{
          background:'rgba(200,0,0,0.15)',border:'1px solid rgba(200,0,0,0.3)',
          color:'#ff6666',padding:'6px 14px',borderRadius:6,cursor:'pointer',
          fontFamily:'monospace',fontSize:12,
        }}>Reset to Defaults</button>
      </div>

      <SettingsCard title="── PLAYER">
        <Slider label="Movement Speed" value={s.playerSpeedMult} min={0.3} max={3} step={0.1} unit="×" onChange={v=>setSettings({playerSpeedMult:v})}/>
        <Slider label="Max Health" value={s.playerHealthMax} min={50} max={500} step={10} unit=" HP" onChange={v=>setSettings({playerHealthMax:v})}/>
        <Slider label="Starting Money" value={s.startingMoney} min={0} max={99999} step={100} unit=" $" onChange={v=>setSettings({startingMoney:v})}/>
        <Slider label="Starting Ammo" value={s.startingAmmo} min={0} max={999} step={10} onChange={v=>setSettings({startingAmmo:v})}/>
        <Slider label="Bullet Damage" value={s.bulletDamage} min={1} max={100} step={1} unit=" HP" onChange={v=>setSettings({bulletDamage:v})}/>
      </SettingsCard>

      <SettingsCard title="── WORLD & ENVIRONMENT">
        <Toggle label="Day/Night Cycle" value={s.enableDayCycle} onChange={v=>setSettings({enableDayCycle:v})} desc="Toggle automatic time progression"/>
        <Slider label="Day Cycle Speed" value={s.dayCycleSpeed} min={0} max={0.5} step={0.01} onChange={v=>setSettings({dayCycleSpeed:v})}/>
        <Slider label="Fog Distance" value={s.fogDistance} min={30} max={500} step={10} unit=" m" onChange={v=>setSettings({fogDistance:v})}/>
      </SettingsCard>

      <SettingsCard title="── NPC CITIZENS">
        <Slider label="NPC Count" value={s.npcCount} min={0} max={50} step={1} unit=" NPCs" onChange={v=>setSettings({npcCount:v})}/>
        <Slider label="NPC Move Speed" value={s.npcSpeed} min={0.2} max={3} step={0.1} unit="×" onChange={v=>setSettings({npcSpeed:v})}/>
        <Slider label="Panic Radius" value={s.npcPanicRadius} min={3} max={60} step={1} unit=" m" onChange={v=>setSettings({npcPanicRadius:v})}/>
      </SettingsCard>

      <SettingsCard title="── POLICE">
        <Toggle label="Wanted System" value={s.enableWantedSystem} onChange={v=>setSettings({enableWantedSystem:v})} desc="Disable to prevent police from spawning"/>
        <Slider label="Police Speed" value={s.policeSpeed} min={0.3} max={3} step={0.1} unit="×" onChange={v=>setSettings({policeSpeed:v})}/>
        <Slider label="Police Aggression" value={s.policeAggression} min={0} max={3} step={1} onChange={v=>setSettings({policeAggression:v})}/>
        <Slider label="Spawn Delay" value={s.policeSpawnDelay} min={3} max={120} step={1} unit=" s" onChange={v=>setSettings({policeSpawnDelay:v})}/>
      </SettingsCard>

      <SettingsCard title="── VEHICLES">
        <Slider label="Vehicle Count" value={s.vehicleCount} min={0} max={30} step={1} onChange={v=>setSettings({vehicleCount:v})}/>
      </SettingsCard>

      <SettingsCard title="── EFFECTS">
        <Toggle label="Blood Effects" value={s.enableBloodEffects} onChange={v=>setSettings({enableBloodEffects:v})}/>
      </SettingsCard>

      <div style={{ background:'rgba(255,150,0,0.08)',border:'1px solid rgba(255,150,0,0.2)',
        borderRadius:8,padding:'12px 16px',fontSize:12,color:'#cc8800',marginTop:4 }}>
        ⚠️ NPC Count, Vehicle Count, and some settings require returning to the game and pressing RESPAWN to take full effect.
      </div>
    </div>
  )
}

// ─── Players section ──────────────────────────────────────────────────────────
function PlayersSection() {
  const { getAllUsers, kickUser } = useAuthStore()
  const [users, setUsers] = useState(() => getAllUsers())
  const refresh = () => setUsers(getAllUsers())

  return (
    <div>
      <div style={{ color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:20 }}>
        Player Manager
        <span style={{ color:'#555',fontSize:13,fontWeight:'normal',marginLeft:10 }}>
          {users.length} registered player{users.length!==1?'s':''}
        </span>
      </div>
      {users.length === 0 ? (
        <div style={{ color:'#555',fontSize:14,textAlign:'center',padding:'40px 0' }}>
          No players have registered yet.
        </div>
      ) : (
        users.map(u => (
          <div key={u.id} style={{
            background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:10,padding:'14px 18px',marginBottom:10,
            display:'flex',alignItems:'center',gap:14,
          }}>
            <div style={{
              width:40,height:40,borderRadius:'50%',background:u.characterColor,
              border:'2px solid rgba(255,255,255,0.2)',flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:18,fontWeight:'bold',color:'rgba(0,0,0,0.6)',
            }}>
              {u.username[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#fff',fontSize:14,fontWeight:'bold' }}>{u.username}</div>
              <div style={{ color:'#666',fontSize:11,marginTop:2 }}>{u.email}</div>
              <div style={{ color:'#888',fontSize:11,marginTop:4,display:'flex',gap:16 }}>
                <span>Lv.{u.level}</span>
                <span>Score: {u.totalScore.toLocaleString()}</span>
                <span>${u.totalMoney.toLocaleString()}</span>
                <span>Kills: {u.kills}</span>
                <span style={{ color:'#555' }}>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={()=>{ kickUser(u.id); refresh() }}
              style={{
                background:'rgba(200,0,0,0.15)',border:'1px solid rgba(200,0,0,0.3)',
                color:'#ff6666',padding:'5px 14px',borderRadius:6,
                fontSize:12,cursor:'pointer',fontFamily:'monospace',
              }}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Overview section ─────────────────────────────────────────────────────────
function OverviewSection() {
  const { models, settings } = useModelStore()
  const { getAllUsers, currentUser } = useAuthStore()
  const users = getAllUsers()
  const uploadedCount = Object.values(models).filter(Boolean).length

  const StatCard = ({ label, value, color = '#ff6600', icon }: {
    label: string; value: string | number; color?: string; icon: string
  }) => (
    <div style={{
      background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:10,padding:'16px 18px',flex:1,minWidth:140,
    }}>
      <div style={{ fontSize:24,marginBottom:8 }}>{icon}</div>
      <div style={{ color,fontSize:22,fontWeight:'bold',fontFamily:'monospace' }}>{value}</div>
      <div style={{ color:'#555',fontSize:12,marginTop:4 }}>{label}</div>
    </div>
  )

  return (
    <div>
      <div style={{ color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:20 }}>Dashboard Overview</div>

      <div style={{ display:'flex',gap:12,marginBottom:24,flexWrap:'wrap' }}>
        <StatCard icon="👥" label="Registered Players" value={users.length} color="#44ff88"/>
        <StatCard icon="🗂️" label="Custom Models" value={`${uploadedCount}/5`} color="#ff6600"/>
        <StatCard icon="🏃" label="NPC Count" value={settings.npcCount}/>
        <StatCard icon="🚗" label="Vehicle Count" value={settings.vehicleCount}/>
      </div>

      <div style={{
        background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:12,padding:'18px 20px',marginBottom:18,
      }}>
        <div style={{ color:'#ff6600',fontSize:12,letterSpacing:2,marginBottom:14,fontFamily:'monospace' }}>
          ── ADMIN ACCOUNT
        </div>
        <div style={{ color:'#fff',fontSize:14 }}>👑 {currentUser?.username}</div>
        <div style={{ color:'#555',fontSize:12,marginTop:4 }}>{currentUser?.email}</div>
      </div>

      <div style={{
        background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:12,padding:'18px 20px',
      }}>
        <div style={{ color:'#ff6600',fontSize:12,letterSpacing:2,marginBottom:14,fontFamily:'monospace' }}>
          ── ACTIVE MODELS
        </div>
        {CATEGORIES.map(c => (
          <div key={c.key} style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ color:'#888',fontSize:13 }}>{c.icon} {c.label}</span>
            <span style={{
              fontSize:11,padding:'2px 10px',borderRadius:20,
              background: models[c.key] ? 'rgba(0,200,100,0.15)' : 'rgba(255,255,255,0.05)',
              color: models[c.key] ? '#00cc66' : '#444',
              border: `1px solid ${models[c.key] ? 'rgba(0,200,100,0.3)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {models[c.key] ? `${models[c.key]!.name}` : 'Default 3D'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { currentUser } = useAuthStore()
  const { loadAllModelURLs } = useModelStore()
  const [section, setSection] = useState<Section>('overview')

  useEffect(() => { loadAllModelURLs() }, [])

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ width:'100vw',height:'100vh',background:'#060610',display:'flex',
        alignItems:'center',justifyContent:'center',color:'#ff4444',fontFamily:'monospace',fontSize:18 }}>
        ⛔ Admin access required.{' '}
        <a href="#" onClick={()=>{ window.location.hash='' }} style={{ color:'#ff6600',marginLeft:8 }}>
          Back to game
        </a>
      </div>
    )
  }

  return (
    <div style={{
      display:'flex',height:'100vh',width:'100vw',overflow:'hidden',
      background:'#07070f',fontFamily:'monospace',
    }}>
      {/* Sidebar */}
      <div style={{
        width:220,background:'rgba(255,255,255,0.03)',borderRight:'1px solid rgba(255,255,255,0.07)',
        display:'flex',flexDirection:'column',flexShrink:0,
      }}>
        {/* Logo */}
        <div style={{ padding:'24px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color:'#ff6600',fontSize:10,letterSpacing:3,marginBottom:4 }}>OPEN WORLD</div>
          <div style={{ color:'#fff',fontSize:15,fontWeight:'bold',letterSpacing:2 }}>CRIME CITY</div>
          <div style={{ color:'#444',fontSize:10,marginTop:4,letterSpacing:1 }}>ADMIN DASHBOARD</div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:'12px 8px' }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)}
              style={{
                width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,
                background:section===n.key ? 'rgba(255,100,0,0.15)' : 'transparent',
                border:`1px solid ${section===n.key ? 'rgba(255,100,0,0.3)' : 'transparent'}`,
                color:section===n.key ? '#ff6600' : '#666',
                cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:10,
                marginBottom:2,transition:'all 0.15s',
              }}
            >
              <span style={{ fontSize:16 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Back to game */}
        <div style={{ padding:'12px 8px',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.location.hash = '' }}
            style={{
              display:'block',textAlign:'center',padding:'9px',borderRadius:8,
              background:'rgba(255,100,0,0.1)',border:'1px solid rgba(255,100,0,0.2)',
              color:'#ff6600',fontSize:12,textDecoration:'none',letterSpacing:1,
            }}
          >
            ◀ BACK TO GAME
          </a>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex:1,overflow:'auto',padding:'28px 32px' }}>
        {section === 'overview' && <OverviewSection />}

        {section === 'models' && (
          <div>
            <div style={{ color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:6 }}>
              3D Model Manager
            </div>
            <div style={{ color:'#555',fontSize:13,marginBottom:22 }}>
              Upload custom 3D models (.GLB, .GLTF, .FBX, .OBJ, .PLY). 
              Uploaded models replace the in-game primitives automatically — no restart needed for GLB/GLTF.
            </div>
            {CATEGORIES.map(c => <ModelUploadCard key={c.key} cat={c}/>)}
          </div>
        )}

        {section === 'settings' && <SettingsSection />}
        {section === 'players' && <PlayersSection />}
      </div>
    </div>
  )
}
