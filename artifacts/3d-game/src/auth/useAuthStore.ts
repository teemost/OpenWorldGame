import { create } from 'zustand'

export interface UserAccount {
  id: string
  username: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  level: number
  totalScore: number
  totalMoney: number
  kills: number
  createdAt: string
  characterColor: string
  skinTone: string
}

const ADMIN: UserAccount = {
  id: 'admin-root',
  username: 'admin',
  email: 'agboolasamul09@gmail.com',
  passwordHash: btoa('admin123'),
  role: 'admin',
  level: 99,
  totalScore: 999999,
  totalMoney: 9999999,
  kills: 0,
  createdAt: new Date().toISOString(),
  characterColor: '#FFD700',
  skinTone: '#D4956A',
}

const STORAGE_KEY = 'owcc_users'
const SESSION_KEY = 'owcc_session'

function loadUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveUsers(users: UserAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

function loadSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const saved: UserAccount = JSON.parse(raw)
    if (saved.id === 'admin-root') return ADMIN
    const users = loadUsers()
    return users.find(u => u.id === saved.id) ?? null
  } catch { return null }
}

function saveSession(user: UserAccount | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }))
  else localStorage.removeItem(SESSION_KEY)
}

interface AuthStore {
  currentUser: UserAccount | null
  error: string | null
  login: (username: string, password: string) => boolean
  register: (username: string, email: string, password: string) => boolean
  logout: () => void
  clearError: () => void
  updateStats: (score: number, money: number, kills: number) => void
  updateCharacter: (characterColor: string, skinTone: string) => void
  getAllUsers: () => UserAccount[]
  kickUser: (id: string) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: loadSession(),
  error: null,

  login: (username, password) => {
    const hash = btoa(password)
    if (username === ADMIN.username && hash === ADMIN.passwordHash) {
      saveSession(ADMIN)
      set({ currentUser: ADMIN, error: null })
      return true
    }
    const users = loadUsers()
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash)
    if (!user) {
      set({ error: 'Invalid username or password.' })
      return false
    }
    saveSession(user)
    set({ currentUser: user, error: null })
    return true
  },

  register: (username, email, password) => {
    if (username.toLowerCase() === 'admin') {
      set({ error: 'Username not available.' })
      return false
    }
    if (username.length < 3) {
      set({ error: 'Username must be at least 3 characters.' })
      return false
    }
    if (password.length < 6) {
      set({ error: 'Password must be at least 6 characters.' })
      return false
    }
    const users = loadUsers()
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      set({ error: 'Username already taken.' })
      return false
    }
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      set({ error: 'Email already registered.' })
      return false
    }
    const colors = ['#ff6600','#00aaff','#ff44aa','#44ff88','#ffaa00','#aa44ff','#00ffdd']
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      username,
      email,
      passwordHash: btoa(password),
      role: 'user',
      level: 1,
      totalScore: 0,
      totalMoney: 500,
      kills: 0,
      createdAt: new Date().toISOString(),
      characterColor: colors[Math.floor(Math.random() * colors.length)],
      skinTone: '#D4956A',
    }
    saveUsers([...users, newUser])
    saveSession(newUser)
    set({ currentUser: newUser, error: null })
    return true
  },

  logout: () => {
    saveSession(null)
    set({ currentUser: null, error: null })
  },

  clearError: () => set({ error: null }),

  updateCharacter: (characterColor, skinTone) => {
    const { currentUser } = get()
    if (!currentUser) return
    const updated = { ...currentUser, characterColor, skinTone }
    if (currentUser.role !== 'admin') {
      const users = loadUsers().map(u => u.id === currentUser.id ? updated : u)
      saveUsers(users)
    }
    saveSession(updated)
    set({ currentUser: updated })
  },

  updateStats: (score, money, kills) => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role === 'admin') return
    const users = loadUsers()
    const updated = users.map(u => {
      if (u.id !== currentUser.id) return u
      const newScore = u.totalScore + score
      const level = Math.floor(newScore / 1000) + 1
      return { ...u, totalScore: newScore, totalMoney: u.totalMoney + money, kills: u.kills + kills, level }
    })
    saveUsers(updated)
    const updatedUser = updated.find(u => u.id === currentUser.id) ?? currentUser
    saveSession(updatedUser)
    set({ currentUser: updatedUser })
  },

  getAllUsers: () => loadUsers(),

  kickUser: (id) => {
    const users = loadUsers().filter(u => u.id !== id)
    saveUsers(users)
  },
}))
