# Open World Crime City

A 3D browser-based open-world crime simulation game (GTA-style) built with React and Three.js. Players navigate a city, drive vehicles, interact with NPCs, and face a wanted system. Includes an admin dashboard for live game configuration and custom 3D model uploads.

---

## Environment & Installation

### Runtime requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 (`nodejs-20`) | Declared in `.replit` `modules`. Actual runtime: v20.20.0. |
| pnpm | 10.26.1 | Locked via corepack / Replit tooling. `npm` and `yarn` are blocked by the root `preinstall` script. |
| NixOS channel | `stable-25_05` | Set in `.replit` `[nix] channel`. Used for system packages (bash, openssl, etc.). |
| TypeScript | ~5.9.3 | Root devDep, shared across all packages. |

> On Replit, the Node and pnpm versions are managed automatically by the platform via the `modules` field in `.replit`. No manual `nvm` or `volta` setup is needed — and virtual environments / Docker are not supported.

### First-time setup (fresh clone)

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. (Optional) Push the database schema if using the API server
#    Requires DATABASE_URL to be set first (see Environment variables below)
pnpm --filter @workspace/db run push

# 3. (Optional) Regenerate API client from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

`pnpm install` resolves every package through the **catalog** in `pnpm-workspace.yaml`, which pins shared versions (React 19.1.0, Vite 7, Tailwind 4, Zod, etc.) across all workspace packages. Never add a catalog-managed package directly to a sub-package's `package.json` — use `catalog:` as the version specifier instead.

### Security policy: minimum package release age

`pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` (1 day). Any `pnpm add` of a package published less than 24 hours ago will fail unless the package is listed under `minimumReleaseAgeExclude`. Do not remove this policy.

---

## Run & Operate

### Start the game (primary workflow)

```bash
PORT=24982 BASE_PATH=/ pnpm --filter @workspace/3d-game run dev
```

- Binds to `0.0.0.0:24982`, accessible via the Replit preview pane.
- **Both `PORT` and `BASE_PATH` are required** — the Vite config validates them on startup and throws if either is missing.
- `BASE_PATH` must begin with `/`.

### Start the API server (optional, separate workflow)

```bash
pnpm --filter @workspace/api-server run dev
```

- Runs on port 5000.
- Requires `DATABASE_URL` (see Environment variables).
- The game frontend works without the API server — it is only needed for persistent leaderboard/DB features.

### Other useful commands

```bash
pnpm run typecheck              # Full typecheck across all workspace packages
pnpm run build                  # typecheck + production build of all packages
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks + Zod schemas from OpenAPI spec
pnpm --filter @workspace/db run push            # Push Drizzle schema to the database (dev only)
```

---

## Environment variables

| Variable | Required by | Purpose |
|---|---|---|
| `PORT` | 3d-game Vite server | Port the dev server listens on. Must be `24982` in the default workflow. |
| `BASE_PATH` | 3d-game Vite server | Vite `base` path. Use `/` for the root. |
| `DATABASE_URL` | api-server only | PostgreSQL connection string (Drizzle ORM). Not needed to run the game. |

On Replit, set secrets via the **Secrets** panel (Environment Variables tab). Never hardcode them in source files. `DATABASE_URL` is automatically injected when a Replit PostgreSQL database is attached to the project.

---

## Replit workflow configuration

Defined in `.replit`:

```toml
modules = ["nodejs-20", "web", "bash"]

[nix]
channel = "stable-25_05"

[deployment]
router = "application"
deploymentTarget = "autoscale"

[deployment.postBuild]
args = ["pnpm", "store", "prune"]
env = { "CI" = "true" }

[postMerge]
path = "scripts/post-merge.sh"
timeoutMs = 20000
```

- **Run button** triggers the `Start application` workflow, which starts only the game frontend.
- The `artifacts/api-server: API Server` workflow is separate and must be started manually if needed.
- `scripts/post-merge.sh` runs automatically after any agent task merges — it handles dependency installs and any post-merge reconciliation.

---

## Stack

- **pnpm workspaces** — monorepo with packages under `artifacts/` and `lib/`
- **Node.js 20**, TypeScript 5.9
- **Game**: React 19.1.0, Three.js ^0.184.0, @react-three/fiber ^9, @react-three/drei ^10, Zustand ^5
- **UI**: Tailwind CSS 4, Radix UI, Framer Motion, Wouter (client routing)
- **API**: Express 5, Pino logging
- **DB**: PostgreSQL + Drizzle ORM ^0.45, drizzle-zod
- **Validation**: Zod ^3.25
- **Build**: Vite 7 (frontend SPA), esbuild 0.27.3 (API server, pinned exact version)

---

## Workspace layout

```
/
├── artifacts/
│   ├── 3d-game/          # Main game frontend (Vite SPA)
│   │   ├── src/game/     # 3D scene, city, controls, HUD, traffic lights
│   │   ├── src/auth/     # localStorage-based auth (login/register)
│   │   ├── src/admin/    # Admin dashboard (live tuning, GLB model uploads)
│   │   ├── src/store/    # Zustand stores
│   │   └── public/models/# GLB assets: sedan/suv/sports/taxi/police/trees/buildings
│   ├── api-server/       # Express 5 backend
│   └── mockup-sandbox/   # Component preview server (design workflow)
├── lib/
│   ├── db/               # Drizzle schema + migrations
│   ├── api-spec/         # OpenAPI definition (source of truth for API)
│   ├── api-client-react/ # Generated TanStack Query hooks (do not edit by hand)
│   └── api-zod/          # Generated Zod schemas from OpenAPI
├── scripts/
│   └── post-merge.sh     # Runs after agent task merges
├── pnpm-workspace.yaml   # Workspace + catalog version pins + security policy
└── .replit               # Platform config (modules, workflows, deployment, nix)
```

---

## Architecture decisions

- **Auth** is custom localStorage-based (no external provider). Passwords are Base64-encoded client-side. Suitable for a game prototype.
- **3D model assets** are stored in IndexedDB via the admin panel — no backend asset server needed.
- **Vite requires `PORT` and `BASE_PATH`** env vars at startup (validated at boot — will throw on startup if missing).
- **Game frontend** runs on port 24982; **API server** on port 5000 — separate workflows, independent lifecycles.
- **API client** (`lib/api-client-react/`) is fully generated from `lib/api-spec/`. Always run `codegen` after editing the OpenAPI spec.
- **esbuild is pinned at 0.27.3** — the workspace `overrides` in `pnpm-workspace.yaml` enforce this because `drizzle-kit` bundles an older vulnerable version internally.

---

## Build for production

```bash
pnpm run build
```

This runs TypeScript checks across all packages, then builds:
- `artifacts/3d-game/dist/public/` — static SPA served by the deployed host
- `artifacts/api-server/dist/` — compiled Node.js server bundle

Deployment uses Replit Autoscale (`deploymentTarget = "autoscale"`). After build, `pnpm store prune` runs to trim the store.

---

## Product

- Open-world 3D crime city game playable in the browser
- Player movement, vehicle entry/driving, NPC encounters, wanted/combat system
- Traffic lights at intersections cycling NS→amber→EW→amber (4s/1s/4s/1s)
- Admin dashboard for real-time game settings and custom 3D model management
- Mobile touch controls with landscape enforcement

---

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

---

## Gotchas

- Always provide `PORT` and `BASE_PATH` when starting the 3d-game Vite server or it will throw on startup.
- The hardcoded admin account email is `agboolasamul09@gmail.com` with password `admin123`.
- `DATABASE_URL` is only required if running the API server; the game itself runs without it.
- Node.js version is **20** (v20.20.0 at time of writing), not 24 — the `.replit` `modules = ["nodejs-20"]` controls this.
- `pnpm` is the **only** allowed package manager — the root `preinstall` script rejects `npm` and `yarn`.
- Do not edit `lib/api-client-react/` or `lib/api-zod/` by hand — they are generated from `lib/api-spec/`.
- When adding a package that's already in the `pnpm-workspace.yaml` catalog, use `catalog:` as the version in `package.json` rather than a semver range.
- GLB vehicle models must **not** use `computeFit()` — use direct Y-axis bounding-box scaling (`scale = targetHeight / sY`, `yOffset = -minY * scale`) to avoid the lying-flat branch that floats cars ~0.75 units off the ground.
- Skinned mesh clones (characters) need `frustumCulled = false` after `SkeletonUtils.clone` — their bounding sphere collapses to origin before the mesh is attached, making them invisible.

---

## Pointers

- See the `pnpm-workspace` skill for workspace TypeScript project references and package wiring details.
- `pnpm-workspace.yaml` is the single source of truth for shared dependency versions (catalog) and the supply-chain security policy.
