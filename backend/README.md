# UCA CyRange — Backend

FastAPI + SQLAlchemy backend. Auth, challenges, flag submission, tutor
monitoring, and two explicit **gateways** — one for VM provisioning, one
for challenge grading — so new backends/mechanics never touch existing
routers. See the top-level README for the architecture write-up.

## Quick start (simulation mode — no Proxmox needed)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python -m app.seed          # users, categories, difficulties, VM templates, demo challenges
uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

Demo accounts (seeded):
| Role    | Email                    | Password   |
|---------|--------------------------|------------|
| Admin   | admin@platform.local     | admin123   |
| Tutor   | tutor@platform.local     | tutor123   |
| Learner | learner@platform.local   | learner123 |

## Switching to a real Proxmox cluster

```bash
export PROVISIONING_BACKEND=proxmox   # default is "simulate"
export PROXMOX_HOST=your-proxmox-host.example.com
export PROXMOX_USER=api-user@pve
export PROXMOX_TOKEN_NAME=platform
export PROXMOX_TOKEN_VALUE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export PROXMOX_NODE=pve1
```

Then in `app/models.py`, `VMTemplate.proxmox_template_id` needs to point
at real template VMIDs on your cluster. All Proxmox-specific code lives
in `app/gateway/adapters/proxmox_adapter.py` — nothing else in the
codebase imports `proxmoxer` or knows which backend is active (see
`app/gateway/provisioning.py` for the registry that makes this swap a
one-line env var change).

Two things intentionally left as extension points, since they depend on
your cluster's specific setup:
- **SDN / per-session networking** (`create_network_segment`) in the
  Proxmox adapter.
- **Live clone task polling** — production code should poll the task ID
  `clone.post()` returns before starting the VM, rather than assuming
  it's instant.

## Project layout

```
app/
  gateway/
    provisioning.py              ProvisioningGateway ABC + get_gateway()
    adapters/
      simulate_adapter.py         default backend, fakes VMs in memory
      proxmox_adapter.py           real Proxmox via proxmoxer
    challenge_type_gateway.py     ChallengeType ABC + get_challenge_type()
    challenge_types/
      standard_flag.py             SHA-256 flag match (the only built-in type)
  routers/
    auth.py, challenges.py, environments.py, admin.py, tutor.py,
    vm_templates.py, taxonomy.py  (public categories/difficulties reads)
  models.py       Category & Difficulty are tables, not enums
  schemas.py
  seed.py
```

## Environment variables

| Variable              | Default                  | Purpose                          |
|------------------------|---------------------------|-----------------------------------|
| DATABASE_URL           | sqlite:///./platform.db  | Swap for Postgres in production   |
| JWT_SECRET              | dev-secret-change-me...  | Set a real secret in production   |
| PROVISIONING_BACKEND    | simulate                 | `simulate` or `proxmox`           |
| PROXMOX_HOST/USER/TOKEN_NAME/TOKEN_VALUE/NODE | — | Required when `PROVISIONING_BACKEND=proxmox` |
