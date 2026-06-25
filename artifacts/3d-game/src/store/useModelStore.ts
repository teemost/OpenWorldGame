import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveModelToDB, loadModelFromDB, deleteModelFromDB } from '../db/modelDB'

export type ModelCategory =
  | 'player'
  | 'player_hair'
  | 'player_shirt'
  | 'player_pant'
  | 'player_shoe'
  | 'player_eyes'
  | 'npc'
  | 'police'
  | 'swat'
  | 'vehicle'
  | 'police_vehicle'
  | 'weapon'
  | 'ai_character'

export type AnimClip = 'idle' | 'walk' | 'run'

export interface ModelMeta {
  key: string            // unique IndexedDB key, e.g. model_player_1234abcd
  category: ModelCategory
  name: string
  format: string
  size: number
  uploadedAt: string
}

export interface AnimMeta {
  key: string
  category: ModelCategory
  clip: AnimClip
  name: string
  format: string
  size: number
  uploadedAt: string
}

export interface GameSettings {
  playerSpeedMult:      number
  playerHealthMax:      number
  startingMoney:        number
  startingAmmo:         number
  bulletDamage:         number
  playerDamageResist:   number
  enableDayCycle:       boolean
  dayCycleSpeed:        number
  fogDistance:          number
  enableWeather:        boolean
  gravityMultiplier:    number
  npcCount:             number
  npcSpeed:             number
  npcPanicRadius:       number
  enableAI:             boolean
  aiDifficulty:         number
  aiReactionTime:       number
  enableWantedSystem:   boolean
  policeSpeed:          number
  policeAggression:     number
  policeSpawnDelay:     number
  policeHealthMult:     number
  vehicleCount:         number
  vehicleMaxSpeed:      number
  vehicleAcceleration:  number
  vehicleFriction:      number
  vehicleCameraFollow:  boolean
  weaponFireRate:       number
  weaponRange:          number
  bulletSpeed:          number
  explosionRadius:      number
  enableExplosions:     boolean
  maxBullets:           number
  moneyMultiplier:      number
  scoreMultiplier:      number
  killBounty:           number
  enableBloodEffects:   boolean
  showNameTags:         boolean
  minimapZoom:          number
  fieldOfView:          number
  soldierModelScale:    number
  playerModelScale:     number
  npcModelScale:        number
  policeModelScale:     number
  swatModelScale:       number
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
  soldierModelScale:   1.85,
  playerModelScale:    1.85,
  npcModelScale:       1.15,
  policeModelScale:    1.15,
  swatModelScale:      1.15,
}

// ─── In-memory runtime maps ───────────────────────────────────────────────────
// Active model URL per category (consumed by GameScene / CharacterSelect)
export const modelBlobURLs = new Map<ModelCategory, { url: string; format: string }>()
// All loaded blob URLs keyed by ModelMeta.key (for admin UI showing all uploaded models)
export const allModelBlobURLs = new Map<string, { url: string; format: string }>()
// Animation blob URLs — key: `${category}_${clip}`
export const animBlobURLs = new Map<string, string>()
// Reactive version counter
export const modelVersion = { value: 0 }

// Categories that support separate animation file uploads (humanoids only)
export const HUMANOID_CATS: ModelCategory[] = ['player', 'npc', 'police', 'swat']
export const ANIM_CLIPS: AnimClip[] = ['idle', 'walk', 'run']

// All categories in the store
export const ALL_CATEGORIES: ModelCategory[] = [
  'player', 'player_hair', 'player_shirt', 'player_pant', 'player_shoe', 'player_eyes',
  'npc', 'police', 'swat', 'vehicle', 'police_vehicle', 'weapon', 'ai_character',
]

// Categories that represent full character/game models (shown in CharacterSelect)
export const CHARACTER_CATEGORIES: ModelCategory[] = [
  'player', 'npc', 'police', 'swat', 'ai_character', 'vehicle', 'police_vehicle', 'weapon',
]

interface ModelStore {
  models:        Record<ModelCategory, ModelMeta[]>
  activeModelId: Record<ModelCategory, string | null>
  animations:    Record<string, AnimMeta | null>
  settings:      GameSettings
  modelRevision: number
  setSettings:   (patch: Partial<GameSettings>) => void
  resetSettings: () => void
  uploadModel:   (category: ModelCategory, file: File) => Promise<void>
  removeModel:   (category: ModelCategory, key: string) => Promise<void>
  setActiveModel:(category: ModelCategory, key: string) => void
  uploadAnimation: (category: ModelCategory, clip: AnimClip, file: File) => Promise<void>
  removeAnimation: (category: ModelCategory, clip: AnimClip) => Promise<void>
  loadAllModelURLs: () => Promise<void>
  getModelURL:   (category: ModelCategory) => { url: string; format: string } | null
}

const makeEmptyModels = (): Record<ModelCategory, ModelMeta[]> => {
  const r = {} as Record<ModelCategory, ModelMeta[]>
  for (const c of ALL_CATEGORIES) r[c as ModelCategory] = []
  return r
}

const makeEmptyActiveIds = (): Record<ModelCategory, string | null> => {
  const r = {} as Record<ModelCategory, string | null>
  for (const c of ALL_CATEGORIES) r[c as ModelCategory] = null
  return r
}

const makeEmptyAnimations = (): Record<string, AnimMeta | null> =>
  Object.fromEntries(
    HUMANOID_CATS.flatMap(cat => ANIM_CLIPS.map(clip => [`${cat}_${clip}`, null]))
  )

function getMime(format: string): string {
  switch (format) {
    case 'glb':  return 'model/gltf-binary'
    case 'gltf': return 'model/gltf+json'
    case 'obj':  return 'text/plain'
    default:     return 'application/octet-stream'
  }
}

function genKey(category: ModelCategory): string {
  return `model_${category}_${Date.now()}${Math.random().toString(36).slice(2, 6)}`
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      models:        makeEmptyModels(),
      activeModelId: makeEmptyActiveIds(),
      animations:    makeEmptyAnimations(),
      settings:      { ...DEFAULT_SETTINGS },
      modelRevision: 0,

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

      uploadModel: async (category, file) => {
        const format = file.name.split('.').pop()?.toLowerCase() ?? 'glb'
        const key    = genKey(category)
        const buf    = await file.arrayBuffer()
        await saveModelToDB(key, buf)

        const url = URL.createObjectURL(new Blob([buf], { type: getMime(format) }))
        allModelBlobURLs.set(key, { url, format })
        // New upload always becomes active
        modelBlobURLs.set(category, { url, format })
        modelVersion.value++

        const meta: ModelMeta = {
          key, category, name: file.name, format, size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        set((s) => ({
          models:        { ...s.models, [category]: [...(s.models[category] ?? []), meta] },
          activeModelId: { ...s.activeModelId, [category]: key },
          modelRevision: s.modelRevision + 1,
        }))
      },

      removeModel: async (category, key) => {
        await deleteModelFromDB(key)
        const entry = allModelBlobURLs.get(key)
        if (entry) URL.revokeObjectURL(entry.url)
        allModelBlobURLs.delete(key)

        const { activeModelId, models } = get()
        const remaining = (models[category] ?? []).filter(m => m.key !== key)

        let newActiveKey = activeModelId[category]
        if (newActiveKey === key) {
          newActiveKey = remaining.length > 0 ? remaining[remaining.length - 1].key : null
        }
        if (newActiveKey) {
          const newEntry = allModelBlobURLs.get(newActiveKey)
          if (newEntry) modelBlobURLs.set(category, newEntry)
          else modelBlobURLs.delete(category)
        } else {
          modelBlobURLs.delete(category)
        }

        modelVersion.value++
        set((s) => ({
          models:        { ...s.models, [category]: remaining },
          activeModelId: { ...s.activeModelId, [category]: newActiveKey },
          modelRevision: s.modelRevision + 1,
        }))
      },

      setActiveModel: (category, key) => {
        const entry = allModelBlobURLs.get(key)
        if (entry) modelBlobURLs.set(category, entry)
        modelVersion.value++
        set((s) => ({
          activeModelId: { ...s.activeModelId, [category]: key },
          modelRevision: s.modelRevision + 1,
        }))
      },

      uploadAnimation: async (category, clip, file) => {
        const format   = file.name.split('.').pop()?.toLowerCase() ?? 'fbx'
        const dbKey    = `anim_${category}_${clip}`
        const storeKey = `${category}_${clip}`
        const buf      = await file.arrayBuffer()
        await saveModelToDB(dbKey, buf)

        const oldUrl = animBlobURLs.get(storeKey)
        if (oldUrl) URL.revokeObjectURL(oldUrl)

        const url = URL.createObjectURL(new Blob([buf], { type: getMime(format) }))
        animBlobURLs.set(storeKey, url)
        modelVersion.value++

        const meta: AnimMeta = {
          key: dbKey, category, clip, name: file.name, format, size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        set((s) => ({
          animations: { ...s.animations, [storeKey]: meta },
          modelRevision: s.modelRevision + 1,
        }))
      },

      removeAnimation: async (category, clip) => {
        const dbKey    = `anim_${category}_${clip}`
        const storeKey = `${category}_${clip}`
        await deleteModelFromDB(dbKey)
        const oldUrl = animBlobURLs.get(storeKey)
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        animBlobURLs.delete(storeKey)
        modelVersion.value++
        set((s) => ({
          animations: { ...s.animations, [storeKey]: null },
          modelRevision: s.modelRevision + 1,
        }))
      },

      loadAllModelURLs: async () => {
        const { models, animations, activeModelId } = get()

        for (const cat of ALL_CATEGORIES) {
          const catModels = models[cat as ModelCategory] ?? []
          for (const meta of catModels) {
            if (allModelBlobURLs.has(meta.key)) continue
            const buf = await loadModelFromDB(meta.key)
            if (!buf) continue
            const url = URL.createObjectURL(new Blob([buf], { type: getMime(meta.format) }))
            allModelBlobURLs.set(meta.key, { url, format: meta.format })
          }
          // Sync the active URL into modelBlobURLs
          const activeKey = activeModelId[cat as ModelCategory]
          if (activeKey && allModelBlobURLs.has(activeKey)) {
            modelBlobURLs.set(cat as ModelCategory, allModelBlobURLs.get(activeKey)!)
          }
        }

        for (const cat of HUMANOID_CATS) {
          for (const clip of ANIM_CLIPS) {
            const storeKey = `${cat}_${clip}`
            if (!animations[storeKey]) continue
            if (animBlobURLs.has(storeKey)) continue
            const dbKey = `anim_${cat}_${clip}`
            const buf   = await loadModelFromDB(dbKey)
            if (!buf) continue
            const fmt = animations[storeKey]!.format
            const url = URL.createObjectURL(new Blob([buf], { type: getMime(fmt) }))
            animBlobURLs.set(storeKey, url)
          }
        }

        modelVersion.value++
        set((s) => ({ modelRevision: s.modelRevision + 1 }))
      },

      getModelURL: (category) => modelBlobURLs.get(category) ?? null,
    }),
    {
      name: 'owcc_model_store_v3',
      partialize: (s) => ({ models: s.models, activeModelId: s.activeModelId, settings: s.settings, animations: s.animations }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<typeof current>
        // Migrate old single-model format to arrays
        const migratedModels = makeEmptyModels()
        if (p.models) {
          for (const cat of ALL_CATEGORIES) {
            const val = (p.models as Record<string, unknown>)[cat]
            if (!val) migratedModels[cat as ModelCategory] = []
            else if (Array.isArray(val)) migratedModels[cat as ModelCategory] = val as ModelMeta[]
            else migratedModels[cat as ModelCategory] = [val as ModelMeta]
          }
        }
        // Migrate activeModelId: infer from first model if not stored
        const migratedActive = makeEmptyActiveIds()
        if (p.activeModelId) {
          Object.assign(migratedActive, p.activeModelId)
        } else {
          for (const cat of ALL_CATEGORIES) {
            const arr = migratedModels[cat as ModelCategory]
            migratedActive[cat as ModelCategory] = arr.length > 0 ? arr[0].key : null
          }
        }
        return {
          ...current,
          settings:      { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          animations:    { ...makeEmptyAnimations(), ...(p.animations ?? {}) },
          models:        migratedModels,
          activeModelId: migratedActive,
        }
      },
    }
  )
)
