import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveModelToDB, loadModelFromDB, deleteModelFromDB } from '../db/modelDB'

export type ModelCategory =
  | 'player'
  | 'npc'
  | 'police'
  | 'swat'
  | 'vehicle'
  | 'police_vehicle'
  | 'weapon'
  | 'ai_character'

export interface ModelMeta {
  key: string
  category: ModelCategory
  name: string
  format: string
  size: number
  uploadedAt: string
}

export interface GameSettings {
  // ── Player ──────────────────────────────────────────────────────────────────
  playerSpeedMult:      number    // 0.3–3.0
  playerHealthMax:      number    // 50–500
  startingMoney:        number
  startingAmmo:         number
  bulletDamage:         number    // 1–100 HP
  playerDamageResist:   number    // 0–0.9 (damage reduction ratio)
  // ── World & Environment ───────────────────────────────────────────────────
  enableDayCycle:       boolean
  dayCycleSpeed:        number    // 0–0.5
  fogDistance:          number    // 30–500 m
  enableWeather:        boolean
  gravityMultiplier:    number    // 0.5–3.0
  // ── NPC Citizens ──────────────────────────────────────────────────────────
  npcCount:             number    // 0–50
  npcSpeed:             number    // 0.2–3.0 ×
  npcPanicRadius:       number    // 3–60 m
  enableAI:             boolean
  aiDifficulty:         number    // 0–3
  aiReactionTime:       number    // 0.1–2.0 s
  // ── Police ────────────────────────────────────────────────────────────────
  enableWantedSystem:   boolean
  policeSpeed:          number    // 0.3–3.0 ×
  policeAggression:     number    // 0–3
  policeSpawnDelay:     number    // 3–120 s
  policeHealthMult:     number    // 0.5–3.0
  // ── Vehicles ──────────────────────────────────────────────────────────────
  vehicleCount:         number    // 0–30
  vehicleMaxSpeed:      number    // 10–60
  vehicleAcceleration:  number    // 5–50
  vehicleFriction:      number    // 0.7–0.99
  vehicleCameraFollow:  boolean   // auto-align camera to vehicle direction
  // ── Weapons & Combat ─────────────────────────────────────────────────────
  weaponFireRate:       number    // 0.05–1.0 s between shots
  weaponRange:          number    // 20–200 m
  bulletSpeed:          number    // 20–120 m/s
  explosionRadius:      number    // 0–20 m
  enableExplosions:     boolean
  maxBullets:           number    // 10–200
  // ── Economy & Progression ─────────────────────────────────────────────────
  moneyMultiplier:      number    // 0.1–5.0 ×
  scoreMultiplier:      number    // 0.1–5.0 ×
  killBounty:           number    // 0–500 $
  // ── Visual & Effects ──────────────────────────────────────────────────────
  enableBloodEffects:   boolean
  showNameTags:         boolean
  minimapZoom:          number    // 0.5–3.0
  fieldOfView:          number    // 50–110 deg
}

export const DEFAULT_SETTINGS: GameSettings = {
  playerSpeedMult:     1.0,
  playerHealthMax:     100,
  startingMoney:       500,
  startingAmmo:        60,
  bulletDamage:        34,
  playerDamageResist:  0,
  enableDayCycle:      true,
  dayCycleSpeed:       0.05,
  fogDistance:         220,
  enableWeather:       false,
  gravityMultiplier:   1.0,
  npcCount:            0,
  npcSpeed:            1.0,
  npcPanicRadius:      12,
  enableAI:            false,
  aiDifficulty:        1,
  aiReactionTime:      0.5,
  enableWantedSystem:  true,
  policeSpeed:         1.0,
  policeAggression:    1,
  policeSpawnDelay:    30,
  policeHealthMult:    1.0,
  vehicleCount:        12,
  vehicleMaxSpeed:     32,
  vehicleAcceleration: 15,
  vehicleFriction:     0.88,
  vehicleCameraFollow: true,
  weaponFireRate:      0.22,
  weaponRange:         125,
  bulletSpeed:         48,
  explosionRadius:     5,
  enableExplosions:    true,
  maxBullets:          60,
  moneyMultiplier:     1.0,
  scoreMultiplier:     1.0,
  killBounty:          50,
  enableBloodEffects:  true,
  showNameTags:        true,
  minimapZoom:         1.0,
  fieldOfView:         68,
}

// In-memory blob URLs for current session (keyed by category)
export const modelBlobURLs = new Map<ModelCategory, { url: string; format: string }>()

// Reactive version counter — increment to force game scene to reload models
export const modelVersion = { value: 0 }

interface ModelStore {
  models: Record<ModelCategory, ModelMeta | null>
  settings: GameSettings
  modelRevision: number
  setSettings: (patch: Partial<GameSettings>) => void
  resetSettings: () => void
  uploadModel: (category: ModelCategory, file: File) => Promise<void>
  removeModel: (category: ModelCategory) => Promise<void>
  loadAllModelURLs: () => Promise<void>
  getModelURL: (category: ModelCategory) => { url: string; format: string } | null
}

const ALL_CATEGORIES: ModelCategory[] = [
  'player', 'npc', 'police', 'swat', 'vehicle', 'police_vehicle', 'weapon', 'ai_character',
]

const makeEmptyModels = (): Record<ModelCategory, ModelMeta | null> =>
  Object.fromEntries(ALL_CATEGORIES.map(c => [c, null])) as Record<ModelCategory, ModelMeta | null>

function getMime(format: string): string {
  switch (format) {
    case 'glb':  return 'model/gltf-binary'
    case 'gltf': return 'model/gltf+json'
    case 'obj':  return 'text/plain'
    default:     return 'application/octet-stream'
  }
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      models:       makeEmptyModels(),
      settings:     { ...DEFAULT_SETTINGS },
      modelRevision: 0,

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

      uploadModel: async (category, file) => {
        const format = file.name.split('.').pop()?.toLowerCase() ?? 'glb'
        const key    = `model_${category}`
        const buf    = await file.arrayBuffer()
        await saveModelToDB(key, buf)

        // Revoke old URL
        const old = modelBlobURLs.get(category)
        if (old) URL.revokeObjectURL(old.url)

        // Create new Blob URL
        const url = URL.createObjectURL(new Blob([buf], { type: getMime(format) }))
        modelBlobURLs.set(category, { url, format })
        modelVersion.value++

        const meta: ModelMeta = {
          key, category, name: file.name, format, size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        set((s) => ({
          models: { ...s.models, [category]: meta },
          modelRevision: s.modelRevision + 1,
        }))
      },

      removeModel: async (category) => {
        const key = `model_${category}`
        await deleteModelFromDB(key)
        const old = modelBlobURLs.get(category)
        if (old) URL.revokeObjectURL(old.url)
        modelBlobURLs.delete(category)
        modelVersion.value++
        set((s) => ({
          models: { ...s.models, [category]: null },
          modelRevision: s.modelRevision + 1,
        }))
      },

      loadAllModelURLs: async () => {
        const { models } = get()
        for (const cat of ALL_CATEGORIES) {
          if (!models[cat]) continue
          if (modelBlobURLs.has(cat)) continue
          const key = `model_${cat}`
          const buf = await loadModelFromDB(key)
          if (!buf) continue
          const fmt = models[cat]!.format
          const url = URL.createObjectURL(new Blob([buf], { type: getMime(fmt) }))
          modelBlobURLs.set(cat, { url, format: fmt })
        }
        modelVersion.value++
        set((s) => ({ modelRevision: s.modelRevision + 1 }))
      },

      getModelURL: (category) => modelBlobURLs.get(category) ?? null,
    }),
    {
      name: 'owcc_model_store_v2',
      partialize: (s) => ({ models: s.models, settings: s.settings }),
    }
  )
)
