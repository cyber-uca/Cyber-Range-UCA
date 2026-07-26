# Admin Guide

> This section is only visible to admins and tutors.

This guide covers everything you need to run the platform day-to-day without touching the source code. Creating content, managing users, configuring VMs, and troubleshooting the common things that break.

---

## Content management

All content lives at `/admin/content`. The interface shows four columns: Paths → Modules → Rooms → Tasks. Click an item to drill down. On tablets and phones it switches to a tab-based view.

### Creating a path

Click "New Path" in the Paths column. You need:
- **Slug** — used in the URL, lowercase, hyphens only (e.g. `risk`, `offensive`)
- **Title** — displayed to learners
- **Sort order** — determines position on the Roadmap (1 = first)
- **Status** — keep it Draft until you have at least one published room in it

### Creating a module

Select a path first, then click "New Module". Same fields as a path. The slug must be unique within the path.

### Creating a room

Select a module, then click "New Room". Key fields:

**Story** — the mission briefing. Write this in second person, present tense. The learner is the analyst. Make it specific enough to be immersive but not so specific that it constrains what they can discover.

**Objectives** — semicolon-separated list of skills the room tests. These appear on the room detail page.

**Tags** — comma-separated. Used for filtering in the challenge library.

**MITRE ATT&CK** — comma-separated technique IDs (e.g. `T1499,T1195`). Shown on the room detail page.

**VM Templates** — select which VM templates this room uses. These must already exist in the VM Templates admin (`/admin/vm-templates`). The templates define which Proxmox templates get cloned when a learner starts the lab.

**Estimated minutes** — this sets the lab timer. Be realistic — rushed learners skip evidence.

### Creating tasks

Select a room, then click "New Task" in the Tasks column. Tasks have a description (the briefing text) and objectives. Sort order determines the sequence.

### Creating questions

Select a task, then click "Add Question". Choose the question type carefully before saving — changing it later requires deleting and recreating the question.

**MCQ (Single / Multi)** — add options one by one. For single-choice, select the correct option. For multi-choice, check all correct options.

**Flag** — enter the expected value. If it starts with `FLAG{`, it's stored as a SHA-256 hash. Other values (like `ANSWER_1`) are stored as plaintext for direct comparison.

**Matching** — add pairs using the left/right text fields. The left items are the prompts, the right items are the answers learners connect them to. The display shuffles the right column, so order doesn't matter.

**True/False** — select the correct answer from the dropdown.

**Short text** — enter the accepted values. Multiple accepted values can be added (case-insensitive by default).

---

## Managing VM templates

Go to `/admin/vm-templates`. Each template has:

- **Name** — internal identifier, used when linking rooms to VMs
- **Proxmox Template ID** — the VMID of the template on Proxmox. This is the VM that gets cloned when a learner starts a lab. The template must exist on Proxmox before you add it here.
- **Zone** — network zone label (CAN_Net, OT_Net, SOC_Net, Attack_Net). Informational only — the actual network config is in the Proxmox template.
- **Default tools** — description of what's installed. Shown in the room detail.

### Template VMID reference (current lab)

| Template name | Proxmox VMID | VM role |
|---|---|---|
| icsimrisk | 120 | Vehicle VM (ICSim + OTA client, 192.168.37.47) |
| accriskroom1 | 121 | OTA Server VM (192.168.37.48) |
| riskroom1wazuh | 122 | Wazuh VM (192.168.37.49) |

---

## User management

Go to `/admin/users`. You can:

- View all registered users with their role, institution, and XP
- Change a user's role (learner → tutor → admin)
- Deactivate accounts without deleting them

There are three roles:

**Learner** — can access all published rooms and their own progress. Cannot create content.

**Tutor** — can access the Creator Studio for challenges. Can view analytics. Cannot manage users or VM templates.

**Admin** — full access to everything, including this admin panel.

### Default seeded accounts

| Email | Password | Role |
|---|---|---|
| admin@platform.local | admin123 | Admin |
| tutor@platform.local | tutor123 | Tutor |
| learner@platform.local | learner123 | Learner |

Change these passwords immediately in a production environment.

---

## Deploying updates

The standard update process from the VM:

```bash
# Pull latest code
cd /opt/cyberrange
sudo git pull origin main

# Restart backend
sudo systemctl restart cyberrange-backend

# Rebuild and reload frontend
cd /opt/cyberrange/frontend
npm run build
sudo systemctl reload nginx
```

If you only changed backend code (Python), you only need the `systemctl restart`. If you only changed frontend code, you only need the `npm run build` and `nginx reload`.

---

## Troubleshooting

### Backend won't start

Check the service status and logs:

```bash
sudo systemctl status cyberrange-backend
sudo journalctl -u cyberrange-backend -n 50
```

Common causes:
- **Database connection error** — the MySQL server at 192.168.37.70 is unreachable. Check network connectivity and that the MySQL service is running.
- **Import error** — a Python syntax error in the code. The log will point to the file and line.
- **Missing .env variable** — the `.env` file is missing a required key. Compare against `.env.example`.

### Frontend shows a blank page

Open the browser developer console (F12). If you see a JavaScript error:

```bash
# Rebuild the frontend
cd /opt/cyberrange/frontend
npm run build
sudo systemctl reload nginx
```

If the build fails, read the error output — it usually points to a specific file and line.

### Lab won't provision (VM stays "Provisioning")

Check the backend logs for Proxmox errors:

```bash
sudo journalctl -u cyberrange-backend -f
```

Common causes:
- **Proxmox token expired or invalid** — check `PROXMOX_TOKEN_VALUE` in `.env`. Test it with: `curl -k -H "Authorization: PVEAPIToken=root@pam\!cyberrange=YOUR_TOKEN" https://192.168.37.20:8006/api2/json/version`
- **Template VMID doesn't exist** — the Proxmox template ID in the database doesn't match an actual template on Proxmox. Check `/admin/vm-templates` and compare against the Proxmox UI.
- **Node out of resources** — the Proxmox node doesn't have enough RAM or storage. Check Proxmox node summary.

### noVNC console is black

The VM is running but the display isn't rendering. Try:
1. Click inside the noVNC window and press Enter
2. If the VM just booted, wait 30 seconds and refresh
3. Check if the VM actually started: in Proxmox, find the cloned VM and check its console directly

### Nginx returns 502 Bad Gateway

The backend service isn't running. Check:

```bash
sudo systemctl status cyberrange-backend
curl http://localhost:8000/health
```

If the backend is down, restart it. If it won't stay up, check the logs for the crash reason.
