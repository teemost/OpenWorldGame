import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../auth/useAuthStore'
import { useModelStore, ModelCategory, AnimClip, DEFAULT_SETTINGS, modelBlobURLs, animBlobURLs, HUMANOID_CATS, ANIM_CLIPS } from '../store/useModelStore'
import { useGameStore } from '../store/useGameStore'

const CATEGORIES: { key: ModelCategory; label: string; icon: string; desc: string }[] = [
  { key: 'player',         label: 'Player Character',    icon: '🎮', desc: 'The main controllable player character model' },
  { key: 'npc',            label: 'Civilian NPCs',       icon: '🚶', desc: 'Generic civilian NPC walking characters' },
  { key: 'police',         label: 'Police Officers',     icon: '👮', desc: 'Standard police officer character model' },
  { key: 'swat',           label: 'SWAT Units',          icon: '🪖', desc: 'High-wanted-level SWAT tactical units' },
  { key: 'ai_character',   label: 'AI Characters',       icon: '🤖', desc: 'General AI-controlled character model' },
  { key: 'vehicle',        label: 'Civilian Vehicle',    icon: '🚗', desc: 'Default driveable civilian car model' },
  { key: 'police_vehicle', label: 'Police Vehicle',      icon: '🚔', desc: 'Police cruiser model' },
  { key: 'weapon',         label: 'Weapon / Gun',        icon: '🔫', desc: 'Handheld weapon model shown in player hands' },
]

const ACCEPTED        = '.glb,.gltf,.fbx,.obj,.ply'
const ACCEPTED_FORMATS = ['glb', 'gltf', 'fbx', 'obj', 'ply']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

type Section = 'overview' | 'models' | 'settings' | 'players'

const NAV: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview',       icon: '📊' },
  { key: 'models',   label: 'Model Manager',  icon: '🗂️' },
  { key: 'settings', label: 'Game Settings',  icon: '⚙️' },
  { key: 'players',  label: 'Player Manager', icon: '👥' },
]

// ─── Model upload card ────────────────────────────────────────────────────────
function ModelUploadCard({ cat }: { cat: typeof CATEGORIES[0] }) {
  const { models, uploadModel, removeModel, modelRevision } = useModelStore()
  const meta    = models[cat.key]
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging,  setDragging ] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError    ] = useState('')
  const [hasURL,    setHasURL   ] = useState(() => modelBlobURLs.has(cat.key))

  useEffect(() => { setHasURL(modelBlobURLs.has(cat.key)) }, [modelRevision, cat.key])

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_FORMATS.includes(ext)) {
      setError(`Unsupported format: .${ext}. Accepted: ${ACCEPTED_FORMATS.join(', ')}.`)
      return
    }
    setError(''); setUploading(true)
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
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{cat.label}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{cat.desc}</div>
        </div>
        {hasURL && (
          <div style={{
            background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.3)',
            color: '#00cc66', padding: '3px 10px', borderRadius: 20, fontSize: 11, flexShrink: 0,
          }}>● ACTIVE IN-GAME</div>
        )}
        {meta && !hasURL && (
          <div style={{
            background: 'rgba(200,150,0,0.15)', border: '1px solid rgba(200,150,0,0.3)',
            color: '#ccaa00', padding: '3px 10px', borderRadius: 20, fontSize: 11, flexShrink: 0,
          }}>⟳ RELOAD TO ACTIVATE</div>
        )}
      </div>

      {meta && (
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
              type="button"
              onClick={(e) => { e.stopPropagation(); removeModel(cat.key) }}
              style={{
                background: 'rgba(200,0,0,0.2)', border: '1px solid rgba(200,0,0,0.35)',
                color: '#ff6666', padding: '4px 12px', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', fontFamily: 'monospace', flexShrink: 0,
              }}
            >Remove</button>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
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
              {meta ? 'Drop a new file to replace' : 'Drop 3D model file here or click to browse'}
            </div>
            <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>
              GLB · GLTF · FBX · OBJ · PLY
            </div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={onInputChange} />
      {error && (
        <div style={{ color: '#ff6666', fontSize: 12, marginTop: 8, padding: '6px 10px',
          background: 'rgba(255,0,0,0.1)', borderRadius: 4 }}>{error}</div>
      )}
      {(HUMANOID_CATS as ModelCategory[]).includes(cat.key) && (
        <AnimUploadSection catKey={cat.key} />
      )}
    </div>
  )
}

// ─── Per-clip animation upload slot ──────────────────────────────────────────
const CLIP_LABELS: Record<AnimClip, { icon: string; label: string }> = {
  idle: { icon: '🧍', label: 'Idle' },
  walk: { icon: '🚶', label: 'Walk' },
  run:  { icon: '🏃', label: 'Run'  },
}

function AnimClipSlot({ catKey, clip }: { catKey: ModelCategory; clip: AnimClip }) {
  const { animations, uploadAnimation, removeAnimation, modelRevision } = useModelStore()
  const storeKey = `${catKey}_${clip}`
  const meta     = animations[storeKey]
  const fileRef  = useRef<HTMLInputElement>(null)
  const [dragging,  setDragging ] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [hasURL,    setHasURL   ] = useState(() => animBlobURLs.has(storeKey))

  useEffect(() => { setHasURL(animBlobURLs.has(storeKey)) }, [modelRevision, storeKey])

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_FORMATS.includes(ext)) return
    setUploading(true)
    try { await uploadAnimation(catKey, clip, file) }
    finally { setUploading(false) }
  }

  const { icon, label } = CLIP_LABELS[clip]

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#777', fontSize: 11, marginBottom: 6, textAlign: 'center' }}>
        {icon} {label}
      </div>
      {meta ? (
        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 10px',
          border: `1px solid ${hasURL ? 'rgba(0,200,100,0.25)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          <div style={{
            color: hasURL ? '#00cc66' : '#888', fontSize: 11,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 6, fontFamily: 'monospace',
          }} title={meta.name}>{meta.name}</div>
          <div style={{ color: '#555', fontSize: 10, marginBottom: 8 }}>{formatBytes(meta.size)}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => fileRef.current?.click()} style={{
              flex: 1, background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.2)',
              color: '#ff6600', borderRadius: 4, padding: '3px 0', fontSize: 10, cursor: 'pointer',
            }}>Replace</button>
            <button type="button" onClick={() => removeAnimation(catKey, clip)} style={{
              flex: 1, background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.2)',
              color: '#ff6666', borderRadius: 4, padding: '3px 0', fontSize: 10, cursor: 'pointer',
            }}>Remove</button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'rgba(255,100,0,0.6)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 6, padding: '14px 8px', textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'rgba(255,100,0,0.05)' : 'transparent', transition: 'all 0.15s',
          }}
        >
          {uploading
            ? <div style={{ color: '#ff6600', fontSize: 11 }}>⟳</div>
            : <>
                <div style={{ fontSize: 18, marginBottom: 4 }}>⬆️</div>
                <div style={{ color: '#555', fontSize: 10 }}>FBX / GLB</div>
              </>
          }
        </div>
      )}
      <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

function AnimUploadSection({ catKey }: { catKey: ModelCategory }) {
  const [open, setOpen] = useState(false)
  void ANIM_CLIPS

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ color: '#555', fontSize: 11 }}>🎞️ Separate Animation Files</span>
        <span style={{ color: '#555', fontSize: 11, marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#444', fontSize: 10, marginBottom: 10 }}>
            Upload separate FBX files for each pose. Each file's first animation clip is used.
            Works best with Mixamo exports (one clip per file).
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ANIM_CLIPS.map(clip => (
              <AnimClipSlot key={clip} catKey={catKey} clip={clip} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Settings components ──────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 0.01, unit = '', onChange }: {
  label: string; value: number; min: number; max: number
  step?: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#bbb', fontSize: 13 }}>{label}</span>
        <span style={{ color: '#ff6600', fontSize: 13, fontFamily: 'monospace' }}>
          {step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        onClick={e => e.stopPropagation()}
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
        onClick={(e) => { e.stopPropagation(); onChange(!value) }}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: value ? '#ff6600' : '#333',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 16,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }} />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Game Settings</div>
        <button type="button" onClick={resetSettings} style={{
          background: 'rgba(200,0,0,0.15)', border: '1px solid rgba(200,0,0,0.3)',
          color: '#ff6666', padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
          fontFamily: 'monospace', fontSize: 12,
        }}>Reset to Defaults</button>
      </div>

      <SettingsCard title="── PLAYER">
        <Slider label="Movement Speed"      value={s.playerSpeedMult}    min={0.3}  max={3}    step={0.1}  unit="×"   onChange={v => setSettings({ playerSpeedMult: v })} />
        <Slider label="Max Health"          value={s.playerHealthMax}    min={50}   max={500}  step={10}   unit=" HP" onChange={v => setSettings({ playerHealthMax: v })} />
        <Slider label="Starting Money"      value={s.startingMoney}      min={0}    max={99999} step={100} unit=" $"  onChange={v => setSettings({ startingMoney: v })} />
        <Slider label="Starting Ammo"       value={s.startingAmmo}       min={0}    max={999}  step={10}              onChange={v => setSettings({ startingAmmo: v })} />
        <Slider label="Damage Resistance"   value={s.playerDamageResist} min={0}    max={0.9}  step={0.05} unit="×"  onChange={v => setSettings({ playerDamageResist: v })} />
      </SettingsCard>

      <SettingsCard title="── WORLD & ENVIRONMENT">
        <Toggle label="Day/Night Cycle"  value={s.enableDayCycle} onChange={v => setSettings({ enableDayCycle: v })} desc="Toggle automatic time progression" />
        <Slider label="Day Cycle Speed"  value={s.dayCycleSpeed}  min={0}   max={0.5} step={0.01}             onChange={v => setSettings({ dayCycleSpeed: v })} />
        <Slider label="Fog Distance"     value={s.fogDistance}    min={30}  max={500} step={10}   unit=" m"   onChange={v => setSettings({ fogDistance: v })} />
        <Toggle label="Weather Effects"  value={s.enableWeather}  onChange={v => setSettings({ enableWeather: v })} desc="Rain and atmospheric effects" />
        <Slider label="Gravity Multiplier" value={s.gravityMultiplier} min={0.5} max={3} step={0.1} unit="×" onChange={v => setSettings({ gravityMultiplier: v })} />
      </SettingsCard>

      <SettingsCard title="── NPC CITIZENS & AI">
        <Slider label="NPC Count"        value={s.npcCount}       min={0}   max={50} step={1}  unit=" NPCs" onChange={v => setSettings({ npcCount: v })} />
        <Slider label="NPC Move Speed"   value={s.npcSpeed}       min={0.2} max={3}  step={0.1} unit="×"   onChange={v => setSettings({ npcSpeed: v })} />
        <Slider label="Panic Radius"     value={s.npcPanicRadius} min={3}   max={60} step={1}  unit=" m"   onChange={v => setSettings({ npcPanicRadius: v })} />
        <Toggle label="Enable AI"        value={s.enableAI}       onChange={v => setSettings({ enableAI: v })} desc="Toggle all NPC AI behaviour" />
        <Slider label="AI Difficulty"    value={s.aiDifficulty}   min={0}   max={3}  step={1}              onChange={v => setSettings({ aiDifficulty: v })} />
        <Slider label="AI Reaction Time" value={s.aiReactionTime} min={0.1} max={2}  step={0.1} unit=" s"  onChange={v => setSettings({ aiReactionTime: v })} />
      </SettingsCard>

      <SettingsCard title="── POLICE">
        <Toggle label="Wanted System"    value={s.enableWantedSystem} onChange={v => setSettings({ enableWantedSystem: v })} desc="Disable to prevent police spawning" />
        <Slider label="Police Speed"     value={s.policeSpeed}        min={0.3} max={3}   step={0.1} unit="×"  onChange={v => setSettings({ policeSpeed: v })} />
        <Slider label="Police Aggression" value={s.policeAggression}  min={0}   max={3}   step={1}             onChange={v => setSettings({ policeAggression: v })} />
        <Slider label="Spawn Delay"      value={s.policeSpawnDelay}   min={3}   max={120} step={1}   unit=" s" onChange={v => setSettings({ policeSpawnDelay: v })} />
        <Slider label="Police Health Multiplier" value={s.policeHealthMult} min={0.5} max={3} step={0.1} unit="×" onChange={v => setSettings({ policeHealthMult: v })} />
      </SettingsCard>

      <SettingsCard title="── VEHICLES">
        <Slider label="Vehicle Count"       value={s.vehicleCount}        min={0}  max={30} step={1}             onChange={v => setSettings({ vehicleCount: v })} />
        <Slider label="Max Speed"           value={s.vehicleMaxSpeed}     min={10} max={60} step={1}  unit=" m/s" onChange={v => setSettings({ vehicleMaxSpeed: v })} />
        <Slider label="Acceleration"        value={s.vehicleAcceleration} min={5}  max={50} step={1}             onChange={v => setSettings({ vehicleAcceleration: v })} />
        <Slider label="Friction / Drag"     value={s.vehicleFriction}     min={0.7} max={0.99} step={0.01}       onChange={v => setSettings({ vehicleFriction: v })} />
        <Toggle label="Camera Follow Vehicle" value={s.vehicleCameraFollow} onChange={v => setSettings({ vehicleCameraFollow: v })} desc="Auto-align camera behind vehicle when driving" />
      </SettingsCard>

      <SettingsCard title="── WEAPONS & COMBAT">
        <Slider label="Bullet Damage"   value={s.bulletDamage}  min={1}    max={100} step={1}  unit=" HP" onChange={v => setSettings({ bulletDamage: v })} />
        <Slider label="Fire Rate"       value={s.weaponFireRate} min={0.05} max={1}   step={0.01} unit=" s" onChange={v => setSettings({ weaponFireRate: v })} />
        <Slider label="Weapon Range"    value={s.weaponRange}   min={20}   max={200} step={5}  unit=" m"  onChange={v => setSettings({ weaponRange: v })} />
        <Slider label="Bullet Speed"    value={s.bulletSpeed}   min={20}   max={120} step={5}  unit=" m/s" onChange={v => setSettings({ bulletSpeed: v })} />
        <Slider label="Max Bullets"     value={s.maxBullets}    min={10}   max={200} step={5}             onChange={v => setSettings({ maxBullets: v })} />
        <Toggle label="Explosions"      value={s.enableExplosions} onChange={v => setSettings({ enableExplosions: v })} desc="Enable explosive effects on impact" />
        <Slider label="Explosion Radius" value={s.explosionRadius} min={0} max={20} step={0.5} unit=" m" onChange={v => setSettings({ explosionRadius: v })} />
      </SettingsCard>

      <SettingsCard title="── ECONOMY & PROGRESSION">
        <Slider label="Money Multiplier"  value={s.moneyMultiplier}  min={0.1} max={5} step={0.1} unit="×"  onChange={v => setSettings({ moneyMultiplier: v })} />
        <Slider label="Score Multiplier"  value={s.scoreMultiplier}  min={0.1} max={5} step={0.1} unit="×"  onChange={v => setSettings({ scoreMultiplier: v })} />
        <Slider label="Kill Bounty"       value={s.killBounty}       min={0}   max={500} step={10} unit=" $" onChange={v => setSettings({ killBounty: v })} />
      </SettingsCard>

      <SettingsCard title="── VISUAL & EFFECTS">
        <Toggle label="Blood Effects"   value={s.enableBloodEffects} onChange={v => setSettings({ enableBloodEffects: v })} />
        <Toggle label="Show Name Tags"  value={s.showNameTags}       onChange={v => setSettings({ showNameTags: v })} />
        <Slider label="Minimap Zoom"    value={s.minimapZoom}        min={0.5} max={3} step={0.1} unit="×" onChange={v => setSettings({ minimapZoom: v })} />
        <Slider label="Field of View"   value={s.fieldOfView}        min={50}  max={110} step={1} unit="°" onChange={v => setSettings({ fieldOfView: v })} />
      </SettingsCard>

      <SettingsCard title="── CHARACTER MODEL SCALE">
        <div style={{ color: '#666', fontSize: 11, marginBottom: 12, letterSpacing: 0.3 }}>
          Sets the rendered height (metres) for each downloaded humanoid model. Changes apply instantly in-game.
        </div>
        {([
          { emoji: '🪖', label: 'Soldier',   key: 'soldierModelScale',  desc: 'player default · police · SWAT · male NPCs' },
          { emoji: '🤖', label: 'Fembot',    key: 'fembotModelScale',   desc: 'female NPC default'                          },
          { emoji: '💃', label: 'Michelle',  key: 'michelleModelScale', desc: 'animated street character'                   },
          { emoji: '🦾', label: 'X-Bot',     key: 'xbotModelScale',     desc: 'mechanised humanoid'                         },
          { emoji: '🤖', label: 'Robot',     key: 'robotModelScale',    desc: 'expressive AI unit'                          },
        ] as { emoji: string; label: string; key: keyof typeof s; desc: string }[]).map(({ emoji, label, key, desc }) => (
          <div key={key as string}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ color: '#ddd', fontSize: 12 }}>{emoji} <strong>{label}</strong></span>
              <span style={{ color: '#555', fontSize: 10 }}>{desc}</span>
            </div>
            <Slider
              label=""
              value={s[key] as number}
              min={0.5} max={4} step={0.05} unit=" m"
              onChange={v => setSettings({ [key]: v })}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setSettings({
            soldierModelScale: 1.85, fembotModelScale: 1.85, michelleModelScale: 1.85,
            xbotModelScale: 1.85, robotModelScale: 1.85,
          })} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#aaa', padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 11,
          }}>Reset All</button>
          {([
            ['Reset Soldier',  { soldierModelScale:  1.85 }],
            ['Reset Fembot',   { fembotModelScale:   1.85 }],
            ['Reset Michelle', { michelleModelScale: 1.85 }],
            ['Reset X-Bot',    { xbotModelScale:     1.85 }],
            ['Reset Robot',    { robotModelScale:    1.85 }],
          ] as [string, Partial<typeof s>][]).map(([lbl, patch]) => (
            <button key={lbl} type="button" onClick={() => setSettings(patch)} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#aaa', padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>{lbl}</button>
          ))}
        </div>
      </SettingsCard>

      <div style={{ background: 'rgba(255,150,0,0.08)', border: '1px solid rgba(255,150,0,0.2)',
        borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#cc8800', marginTop: 4 }}>
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
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Player Manager
        <span style={{ color: '#555', fontSize: 13, fontWeight: 'normal', marginLeft: 10 }}>
          {users.length} registered player{users.length !== 1 ? 's' : ''}
        </span>
      </div>
      {users.length === 0 ? (
        <div style={{ color: '#555', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          No players have registered yet.
        </div>
      ) : (
        users.map(u => (
          <div key={u.id} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: u.characterColor,
              border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 'bold', color: 'rgba(0,0,0,0.6)',
            }}>
              {u.username[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{u.username}</div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{u.email}</div>
              <div style={{ color: '#888', fontSize: 11, marginTop: 4, display: 'flex', gap: 16 }}>
                <span>Lv.{u.level}</span>
                <span>Score: {u.totalScore.toLocaleString()}</span>
                <span>${u.totalMoney.toLocaleString()}</span>
                <span>Kills: {u.kills}</span>
                <span style={{ color: '#555' }}>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { kickUser(u.id); refresh() }}
              style={{
                background: 'rgba(200,0,0,0.15)', border: '1px solid rgba(200,0,0,0.3)',
                color: '#ff6666', padding: '5px 14px', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >Delete</button>
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
  const triggerRestart = useGameStore(s => s.triggerRestart)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [confirmClear,   setConfirmClear  ] = useState(false)

  const handleClearCache = () => {
    localStorage.clear()
    window.location.reload()
  }
  const users         = getAllUsers()
  const uploadedCount = Object.values(models).filter(Boolean).length
  const totalCats     = CATEGORIES.length

  const handleRestart = () => {
    triggerRestart()
    setConfirmRestart(false)
    window.location.hash = ''
  }

  const StatCard = ({ label, value, color = '#ff6600', icon }: {
    label: string; value: string | number; color?: string; icon: string
  }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, padding: '16px 18px', flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ color, fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' }}>{value}</div>
      <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Dashboard Overview</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon="👥" label="Registered Players" value={users.length} color="#44ff88" />
        <StatCard icon="🗂️" label="Custom Models" value={`${uploadedCount}/${totalCats}`} color="#ff6600" />
        <StatCard icon="🏃" label="NPC Count" value={settings.npcCount} />
        <StatCard icon="🚗" label="Vehicle Count" value={settings.vehicleCount} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '18px 20px', marginBottom: 18,
      }}>
        <div style={{ color: '#ff6600', fontSize: 12, letterSpacing: 2, marginBottom: 14, fontFamily: 'monospace' }}>
          ── ADMIN ACCOUNT
        </div>
        <div style={{ color: '#fff', fontSize: 14 }}>👑 {currentUser?.username}</div>
        <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{currentUser?.email}</div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '18px 20px', marginBottom: 18,
      }}>
        <div style={{ color: '#ff6600', fontSize: 12, letterSpacing: 2, marginBottom: 14, fontFamily: 'monospace' }}>
          ── ACTIVE 3D MODELS
        </div>
        {CATEGORIES.map(c => (
          <div key={c.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ color: '#888', fontSize: 13 }}>{c.icon} {c.label}</span>
            <span style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 20,
              background: models[c.key] ? 'rgba(0,200,100,0.15)' : 'rgba(255,255,255,0.05)',
              color: models[c.key] ? '#00cc66' : '#444',
              border: `1px solid ${models[c.key] ? 'rgba(0,200,100,0.3)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {models[c.key] ? models[c.key]!.name : 'Default 3D'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Restart Server ─────────────────────────────────────────────── */}
      <div style={{
        background: confirmRestart ? 'rgba(200,0,0,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${confirmRestart ? 'rgba(200,0,0,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, padding: '18px 20px', marginBottom: 18,
        transition: 'all 0.2s',
      }}>
        <div style={{ color: '#ff6600', fontSize: 12, letterSpacing: 2, marginBottom: 14, fontFamily: 'monospace' }}>
          ── SERVER CONTROL
        </div>
        {!confirmRestart ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ color: '#ccc', fontSize: 13 }}>Restart Server</div>
              <div style={{ color: '#555', fontSize: 11, marginTop: 3 }}>
                Resets the entire game world — NPCs, vehicles, player stats, wanted level
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmRestart(true) }}
              style={{
                background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.4)',
                color: '#ff4444', padding: '8px 20px', borderRadius: 7,
                fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
                fontWeight: 'bold', letterSpacing: 1, flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >⟳ RESTART</button>
          </div>
        ) : (
          <div>
            <div style={{ color: '#ff6666', fontSize: 13, marginBottom: 14, fontWeight: 'bold' }}>
              ⚠️ Confirm server restart?
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
              This will immediately reset all NPCs, vehicles, player health, money, ammo and wanted level. You will be taken back to the game.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRestart() }}
                style={{
                  background: 'rgba(200,0,0,0.3)', border: '1px solid rgba(255,60,60,0.5)',
                  color: '#ff4444', padding: '8px 22px', borderRadius: 7,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
                  fontWeight: 'bold', letterSpacing: 1,
                }}
              >YES, RESTART</button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmRestart(false) }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#888', padding: '8px 22px', borderRadius: 7,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Clear Cache ────────────────────────────────────────────────── */}
      <div style={{
        background: confirmClear ? 'rgba(180,100,0,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${confirmClear ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, padding: '18px 20px', marginBottom: 18,
        transition: 'all 0.2s',
      }}>
        <div style={{ color: '#ff6600', fontSize: 12, letterSpacing: 2, marginBottom: 14, fontFamily: 'monospace' }}>
          ── CACHE CONTROL
        </div>
        {!confirmClear ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ color: '#ccc', fontSize: 13 }}>Clear All LocalStorage Cache</div>
              <div style={{ color: '#555', fontSize: 11, marginTop: 3 }}>
                Resets all stored settings, accounts, uploaded models and preferences — page reloads automatically
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmClear(true) }}
              style={{
                background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.4)',
                color: '#ffaa00', padding: '8px 20px', borderRadius: 7,
                fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
                fontWeight: 'bold', letterSpacing: 1, flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >🗑️ CLEAR CACHE</button>
          </div>
        ) : (
          <div>
            <div style={{ color: '#ffaa00', fontSize: 13, marginBottom: 10, fontWeight: 'bold' }}>
              ⚠️ This will erase all data — accounts, models, settings. Continue?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClearCache() }}
                style={{
                  background: 'rgba(200,100,0,0.3)', border: '1px solid rgba(255,140,0,0.5)',
                  color: '#ffaa00', padding: '8px 22px', borderRadius: 7,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1,
                }}
              >YES, CLEAR & RELOAD</button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmClear(false) }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#888', padding: '8px 22px', borderRadius: 7,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '18px 20px',
      }}>
        <div style={{ color: '#ff6600', fontSize: 12, letterSpacing: 2, marginBottom: 14, fontFamily: 'monospace' }}>
          ── QUICK SETTINGS SNAPSHOT
        </div>
        {[
          ['NPC Count', settings.npcCount],
          ['Vehicle Count', settings.vehicleCount],
          ['Police Aggression', ['Chill', 'Normal', 'Aggressive', 'Extreme'][settings.policeAggression]],
          ['Wanted System', settings.enableWantedSystem ? 'ON' : 'OFF'],
          ['Day/Night Cycle', settings.enableDayCycle ? 'ON' : 'OFF'],
          ['Field of View', `${settings.fieldOfView}°`],
        ].map(([label, val]) => (
          <div key={String(label)} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ color: '#666', fontSize: 12 }}>{label}</span>
            <span style={{ color: '#aaa', fontSize: 12, fontFamily: 'monospace' }}>{String(val)}</span>
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
      <div style={{ width: '100vw', height: '100vh', background: '#060610', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#ff4444', fontFamily: 'monospace', fontSize: 18 }}>
        ⛔ Admin access required.{' '}
        <a href="#" onClick={() => { window.location.hash = '' }} style={{ color: '#ff6600', marginLeft: 8 }}>
          Back to game
        </a>
      </div>
    )
  }

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
        background: '#07070f', fontFamily: 'monospace' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Sidebar */}
      <div style={{
        width: 230, background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '24px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#ff6600', fontSize: 10, letterSpacing: 3, marginBottom: 4 }}>OPEN WORLD</div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 2 }}>CRIME CITY</div>
          <div style={{ color: '#444', fontSize: 10, marginTop: 4, letterSpacing: 1 }}>ADMIN DASHBOARD</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(n => (
            <button
              key={n.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); setSection(n.key) }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                background: section === n.key ? 'rgba(255,100,0,0.15)' : 'transparent',
                border: `1px solid ${section === n.key ? 'rgba(255,100,0,0.3)' : 'transparent'}`,
                color: section === n.key ? '#ff6600' : '#666',
                cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 2, transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.hash = '' }}
            style={{
              display: 'block', textAlign: 'center', padding: '9px', borderRadius: 8,
              background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.2)',
              color: '#ff6600', fontSize: 12, textDecoration: 'none', letterSpacing: 1,
            }}
          >
            ◀ BACK TO GAME
          </a>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}
        onClick={e => e.stopPropagation()}>
        {section === 'overview' && <OverviewSection />}
        {section === 'models' && (
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 }}>
              3D Model Manager
            </div>
            <div style={{ color: '#555', fontSize: 13, marginBottom: 22 }}>
              Upload custom 3D models (.GLB .GLTF .FBX .OBJ .PLY). Models activate in-game immediately — 
              GLB/GLTF recommended for best compatibility. No restart required for GLB/GLTF.
            </div>
            {CATEGORIES.map(c => <ModelUploadCard key={c.key} cat={c} />)}
          </div>
        )}
        {section === 'settings' && <SettingsSection />}
        {section === 'players' && <PlayersSection />}
      </div>
    </div>
  )
}
