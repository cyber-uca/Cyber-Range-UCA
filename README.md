# AutoRange Cyber Range — v2

A working scaffold for an automotive cybersecurity training platform:
learner/tutor/admin roles, a data-driven challenge library, flag
submission + scoring, and a drag-and-drop **Challenge Workspace** that
provisions VMs on Proxmox per learner session.

This is v2 of the project: the backend has been rebuilt around two
explicit **gateways** (for infrastructure provisioning and for challenge
grading) instead of one hardcoded implementation, categories/difficulties
are now database rows instead of fixed enums, and the frontend has been
redesigned to match the AutoRange visual design (dark navy, cyan accent,
sidebar navigation).

```
platform/
  backend/    FastAPI + SQLAlchemy API, gateway architecture
  frontend/   React (Vite) app: sidebar layout, dashboard, library, workspace
```

## Run it

**Backend** (see `backend/README.md` for details):
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 — Vite proxies `/api/*` to the backend on :8000.

Log in with `learner@platform.local` / `learner123` (or `tutor@...` /
`admin@...`, seeded by `app.seed`).

## The gateway architecture (what changed in v2)

Two subsystems are now built as a **stable interface + registry**, so
adding a new implementation never touches the router or model code that
depends on them:

### 1. Provisioning gateway — `backend/app/gateway/`
```
gateway/
  provisioning.py            # ProvisioningGateway ABC + get_gateway()
  adapters/
    simulate_adapter.py       # default - fakes VMs in memory
    proxmox_adapter.py        # real Proxmox via proxmoxer
```
Routers call `get_gateway().clone_vm(...)` and never import `proxmoxer`
or know which backend is active. Switch backends with one env var:
```bash
export PROVISIONING_BACKEND=proxmox   # default is "simulate"
export PROXMOX_HOST=... PROXMOX_USER=... PROXMOX_TOKEN_NAME=... PROXMOX_TOKEN_VALUE=...
```
To add a third backend (Docker, a cloud provider): write one class
implementing `ProvisioningGateway` in `gateway/adapters/`, add one line to
`ADAPTER_REGISTRY` in `provisioning.py`. Nothing else changes.

### 2. Challenge-type gateway — `backend/app/gateway/challenge_type_gateway.py`
```
gateway/
  challenge_type_gateway.py   # ChallengeType ABC + get_challenge_type()
  challenge_types/
    standard_flag.py          # the only built-in type: SHA-256 flag match
```
`POST /challenges/{id}/submit` never contains grading logic itself — it
calls `get_challenge_type(challenge.challenge_type).grade(...)`. Adding a
new grading mechanic (multi-stage flags, team scoring, partial credit) is
one new class + one registry entry, mirroring how CTFd's own
`CHALLENGE_CLASSES` registry works.

### 3. Data-driven taxonomy (categories & difficulties)
`Category` and `Difficulty` used to be Python enums — adding "Forensics"
meant editing code and redeploying. They're real tables now
(`/admin/categories`, `/admin/difficulties` for CRUD; `/categories`,
`/difficulties` for any logged-in user to read). Add one through
`/admin/taxonomy` in the UI and it appears in the Challenge Library
filters, the Dashboard, and the Challenge Creator immediately.

### 4. Centralized settings
`PlatformSettings` is a single-row table (platform name, default points,
default time limit, hint-penalty toggle) editable at `/admin/settings`
instead of being constants scattered through the code.

## What's real vs. what's simulated

**Real and functional:** auth (JWT, roles), challenge library with
category/difficulty filtering, Challenge Creator (create/edit/publish/
delete, dynamic category & challenge-type pickers), challenge packs
(export/import as portable JSON — categories/difficulties are matched by
slug and auto-created on import if missing), admin screens (stats, users,
VM templates, categories/difficulties, settings), hints with point costs,
the full drag-and-drop Environment Builder canvas, tutor active-sessions
monitoring.

**Simulated by default, wired for the real thing:**
- **VM provisioning** — `PROVISIONING_BACKEND=simulate` (default) fakes
  everything in memory. `PROVISIONING_BACKEND=proxmox` calls a real
  cluster. See the gateway architecture section above.
- **Embedded terminal** — the workspace shows a log panel, not a live
  shell. Real VM access: embed Proxmox's noVNC console once `proxmox`
  mode gives you real VMIDs, or build a websocket SSH proxy.
- **Per-session network isolation** — `create_network_segment()` is a
  stub; hook it to Proxmox SDN once your VLAN/VXLAN ranges are defined.

## Not built yet (natural next slices)

- Results page with hint-penalty breakdown and "next challenge" suggestion
- Real-time environment status via websockets instead of polling
- Timer / auto-expiry enforcement (`expires_at` is tracked but nothing
  destroys expired sessions yet — needs a background reaper job)
- Async provisioning (task queue) — `start_environment` clones VMs
  synchronously inside the HTTP request; fine for simulation, will time
  out against real Proxmox under load
- Node/load-balancing logic across multiple physical servers — the
  Proxmox adapter always clones to one `default_node`
- Database migrations (Alembic) — schema is created fresh; fine for a
  scaffold, not for iterating on a live database
- Multi-tenancy (Institution/Cohort as first-class entities)
- Tests — none yet; the provisioning gateway is the highest-risk place
  to have coverage before ever pointing `PROVISIONING_BACKEND` at `proxmox`

The main thing worth trusting going forward: keep everything
backend-specific inside one adapter file, keep the pack format
(`pack_version`) as the stable contract for challenge packs, and treat
new categories/difficulties/challenge-types as the pattern for "things an
admin or tutor should be able to add without a code change."
