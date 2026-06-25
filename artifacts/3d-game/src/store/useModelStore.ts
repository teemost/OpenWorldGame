import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveModelToDB, loadModelFromDB, deleteModelFromDB } from '../db/modelDB'

export type ModelCategory = 'player' | 'npc' | 'police' | 'swat' | 'vehicle'

export interface ModelMeta {
  key: string
  category: ModelCategory
  name: string
  format: string
  size: number
  uploadedAt: string
}

export interface GameSettings {
  playerSpeedMult: number     // 0.5–2.0
  npcCount: number            // 5–50
  vehicleCount: number        // 3–20
  policeAggression: number    // 0–3 (chill/normal/aggressive/extreme)
  dayCycleSpeed: number       // 0=paused,0.02=slow,0.05=normal,0.15=fast
  startingMoney: number
  startingAmmo: number
  fogDistance: number         // 50–400
  npcPanicRadius: number      // 5–50
  policeSpawnDelay: number    // 5–60s
  enableWantedSystem: boolean
  enableDayCycle: boolean
  enableBloodEffects: boolean
  npcSpeed: number            // 0.5–2.0
  policeSpeed: number         // 0.5–2.0
  bulletDamage: number        // 10–100
  playerHealthMax: number     // 50–500
}

export const DEFAULT_SETTINGS: GameSettings = {
  playerSpeedMult:   1.0,
  npcCount:          25,
  vehicleCount:      12,
  policeAggression:  1,
  dayCycleSpeed:     0.05,
  startingMoney:     500,
  startingAmmo:      60,
  fogDistance:       220,
  npcPanicRadius:    12,
  policeSpawnDelay:  30,
  enableWantedSystem: true,
  enableDayCycle:    true,
  enableBloodEffects: true,
  npcSpeed:          1.0,
  policeSpeed:       1.0,
  bulletDamage:      34,
  playerHealthMax:   100,
}

// In-memory blob URLs for current session (keyed by category)
export const modelBlobURLs = new Map<ModelCategory, { url: string; format: string }>()

interface ModelStore {
  models: Record<ModelCategory, ModelMeta | null>
  settings: GameSettings
  setSettings: (patch: Partial<GameSettings>) => void
  resetSettings: () => void
  uploadModel: (category: ModelCategory, file: File) => Promise<void>
  removeModel: (category: ModelCategory) => Promise<void>
  loadAllModelURLs: () => Promise<void>
  getModelURL: (category: ModelCategory) => string | null
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      models: { player: null, npc: null, police: null, swat: null, vehicle: null },
      settings: { ...DEFAULT_SETTINGS },

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
        const mime = format === 'glb' ? 'model/gltf-binary'
                   : format === 'gltf' ? 'model/gltf+json'
                   : format === 'fbx' ? 'application/octet-stream'
                   : format === 'obj' ? 'text/plain'
                   : format === 'ply' ? 'application/octet-stream'
                   : 'application/octet-stream'
        const url = URL.createObjectURL(new Blob([buf], { type: mime }))
        modelBlobURLs.set(category, { url, format })

        const meta: ModelMeta = {
          key, category, name: file.name, format, size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        set((s) => ({ models: { ...s.models, [category]: meta } }))
      },

      removeModel: async (category) => {
        const key = `model_${category}`
        await deleteModelFromDB(key)
        const old = modelBlobURLs.get(category)
        if (old) URL.revokeObjectURL(old.url)
        modelBlobURLs.delete(category)
        set((s) => ({ models: { ...s.models, [category]: null } }))
      },

      loadAllModelURLs: async () => {
        const { models } = get()
        const cats: ModelCategory[] = ['player', 'npc', 'police', 'swat', 'vehicle']
        for (const cat of cats) {
          if (!models[cat]) continue
          if (modelBlobURLs.has(cat)) continue
          const key = `model_${cat}`
          const buf = await loadModelFromDB(key)
          if (!buf) continue
          const fmt  = models[cat]!.format
          const mime = fmt === 'glb' ? 'model/gltf-binary'
                     : fmt === 'gltf' ? 'model/gltf+json'
                     : 'application/octet-stream'
          const url  = URL.createObjectURL(new Blob([buf], { type: mime }))
          modelBlobURLs.set(cat, { url, format: fmt })
        }
      },

      getModelURL: (category) => modelBlobURLs.get(category)?.url ?? null,
    }),
    {
      name: 'owcc_model_store',
      partialize: (s) => ({ models: s.models, settings: s.settings }),
    }
  )
)
