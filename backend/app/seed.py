"""
UCA CyRange — Seed Data (v2)
Hierarchy: Path → Module → Room → Task → Question

Run with:  python -m app.seed
"""
import hashlib
from .database import SessionLocal, Base, engine
from . import models
from .auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def h(v: str) -> str:
    """Store plain value as-is for ANSWER_X style flags (no hash needed).
    For real FLAG{} values, prefix with sha256: and store the hash."""
    if v.startswith("FLAG{"):
        return "sha256:" + hashlib.sha256(v.strip().encode()).hexdigest()
    return v   # ANSWER_X values stored plaintext for direct comparison


# ── Users ──────────────────────────────────────────────────────────────────
if db.query(models.User).count() == 0:
    admin   = models.User(name="Admin",          email="admin@platform.local",
                          hashed_password=hash_password("admin123"),   role=models.Role.ADMIN)
    tutor   = models.User(name="Prof. Bennani",  email="tutor@platform.local", institution="ENSA",
                          hashed_password=hash_password("tutor123"),   role=models.Role.TUTOR)
    learner = models.User(name="Imane Ben",       email="learner@platform.local", institution="UCA",
                          hashed_password=hash_password("learner123"), role=models.Role.LEARNER)
    db.add_all([admin, tutor, learner]); db.commit()
    print("✓ Users seeded.")

# ── Platform settings ──────────────────────────────────────────────────────
if db.query(models.PlatformSettings).count() == 0:
    db.add(models.PlatformSettings(id="singleton", platform_name="UCA CyRange"))
    db.commit()
    print("✓ Platform settings seeded.")

# ── Domains ────────────────────────────────────────────────────────────────
if db.query(models.Domain).count() == 0:
    db.add_all([
        models.Domain(slug="automotive",  title="Automotive",  color="#22D3EE", sort_order=1, is_active=True,
                      description="CAN bus, ECU, OTA updates, V2X — automotive cybersecurity from risk to exploit."),
        models.Domain(slug="smart-grid",  title="Smart Grid",  color="#FBBF24", sort_order=2, is_active=False,
                      description="Power grid SCADA, substation automation, smart meter attacks and grid resilience."),
        models.Domain(slug="aeronautics", title="Aeronautics", color="#60A5FA", sort_order=3, is_active=False,
                      description="Avionics systems, ACARS protocol exploitation, ground control security."),
        models.Domain(slug="banking",     title="Banking",     color="#34D399", sort_order=4, is_active=False,
                      description="Financial infrastructure attacks, fraud detection, SWIFT network security."),
    ])
    db.commit()
    print("✓ Domains seeded.")

# ── Challenge Categories & Difficulties ─────────────────────────────────────
if db.query(models.Category).count() == 0:
    db.add_all([
        models.Category(slug="offensive",  name="Offensive",  color="coral",  sort_order=1,
                        description="Attack ICS/OT systems — PLC, SCADA, CAN bus exploitation."),
        models.Category(slug="defensive",  name="Defensive",  color="blue",   sort_order=2,
                        description="Detect threats and protect industrial assets."),
        models.Category(slug="mitigation", name="Mitigation", color="teal",   sort_order=3,
                        description="Harden systems and respond to incidents."),
        models.Category(slug="risk",       name="Risk",       color="purple", sort_order=4,
                        description="Assess and manage cybersecurity risks."),
    ])
    db.commit()
    print("✓ Categories seeded.")

if db.query(models.Difficulty).count() == 0:
    db.add_all([
        models.Difficulty(slug="easy",   name="Easy",   sort_order=1),
        models.Difficulty(slug="medium", name="Medium", sort_order=2),
        models.Difficulty(slug="hard",   name="Hard",   sort_order=3),
    ])
    db.commit()
    print("✓ Difficulties seeded.")

# ── VM Templates ───────────────────────────────────────────────────────────
if db.query(models.VMTemplate).count() == 0:
    vms = [
        models.VMTemplate(name="Attacker VM",       zone="Attack_Net", proxmox_template_id=9001,
                          description="Kali-based offensive toolkit",
                          default_tools="nmap, metasploit, can-utils, scapy"),
        models.VMTemplate(name="Vehicle Sim VM",    zone="CAN_Net",    proxmox_template_id=9002,
                          description="Simulated ECU network over virtual CAN bus",
                          default_tools="can-utils, ICSim, candump"),
        models.VMTemplate(name="PLC VM",            zone="OT_Net",     proxmox_template_id=9003,
                          description="OpenPLC with Modbus/DNP3",
                          default_tools="OpenPLC, ModRSsim2, pymodbus"),
        models.VMTemplate(name="SCADA VM",          zone="OT_Net",     proxmox_template_id=9004,
                          description="ScadaBR SCADA server",
                          default_tools="ScadaBR, Ignition"),
        models.VMTemplate(name="ICSim VM",          zone="CAN_Net",    proxmox_template_id=9005,
                          description="Instrument Cluster Simulator",
                          default_tools="ICSim, can-utils"),
        models.VMTemplate(name="Wazuh Manager VM",  zone="SOC_Net",    proxmox_template_id=9006,
                          description="Wazuh SIEM/XDR manager",
                          default_tools="Wazuh, Kibana, Filebeat"),
        models.VMTemplate(name="Monitoring VM",     zone="SOC_Net",    proxmox_template_id=9007,
                          description="IDS + log aggregation",
                          default_tools="Suricata, Zeek, ELK"),
        models.VMTemplate(name="HMI VM",            zone="OT_Net",     proxmox_template_id=9008,
                          description="Human-Machine Interface",
                          default_tools="WinCC, VNC"),
        # ── Accidental Risk Room 1 VMs ─────────────────────────────────────
        models.VMTemplate(name="icsimrisk",         zone="CAN_Net",    proxmox_template_id=120,
                          description="Vehicle VM — ICSim + infotainment (192.168.37.47)",
                          default_tools="ICSim, OTA client, /opt/ota-lab/"),
        models.VMTemplate(name="accriskroom1",      zone="OT_Net",     proxmox_template_id=121,
                          description="OTA Server VM (192.168.37.48)",
                          default_tools="OTA server, systemd journal"),
        models.VMTemplate(name="riskroom1wazuh",    zone="SOC_Net",    proxmox_template_id=122,
                          description="Wazuh VM — dashboard at https://192.168.37.49",
                          default_tools="Wazuh dashboard, alert rules"),
    ]
    db.add_all(vms); db.commit()
    print(f"✓ {len(vms)} VM templates seeded.")


def vm(name): return db.query(models.VMTemplate).filter_by(name=name).first()
def tutor_user(): return db.query(models.User).filter_by(email="tutor@platform.local").first()


# ── Learning Hierarchy ─────────────────────────────────────────────────────
if db.query(models.Path).count() == 0:

    # ── PATH: Risk Management ──────────────────────────────────────────────────────────
    risk_path = models.Path(
        slug="risk", title="Risk Management",
        description="Assess, model and manage cybersecurity risks in OT/ICS environments.",
        icon="⚠️", color="#A78BFA",
        status=models.PublicationStatus.PUBLISHED, sort_order=1,
    )
    db.add(risk_path); db.flush()

    # ── MODULE: Accidental Risk ─────────────────────────────────────────────
    acc_module = models.Module(
        path_id=risk_path.id, slug="accidental-risk",
        title="Accidental Risk",
        description="Failures, misconfigurations and unintended events in ICS environments.",
        sort_order=1, status=models.PublicationStatus.PUBLISHED,
    )
    db.add(acc_module); db.flush()

    # ── MODULE: Environmental Risk (placeholder) ────────────────────────────
    for slug, title, order in [
        ("environmental-risk", "Environmental Risk", 2),
        ("regulatory-risk",    "Regulatory Risk",    3),
        ("organizational-risk","Organizational Risk",4),
    ]:
        db.add(models.Module(
            path_id=risk_path.id, slug=slug, title=title,
            description="Coming soon.", sort_order=order,
            status=models.PublicationStatus.DRAFT,
        ))

    # ── PATH: Offensive ─────────────────────────────────────────────────────
    off_path = models.Path(
        slug="offensive", title="Offensive",
        description="Attack ICS/OT systems — PLC, SCADA, CAN bus exploitation.",
        icon="⚔️", color="#F87171",
        status=models.PublicationStatus.PUBLISHED, sort_order=2,
    )
    db.add(off_path); db.flush()

    for slug, title, order in [
        ("can-bus-fundamentals",   "CAN Bus Fundamentals",   1),
        ("plc-exploitation",       "PLC Exploitation",       2),
        ("scada-protocol-attacks", "SCADA Protocol Attacks",  3),
    ]:
        db.add(models.Module(
            path_id=off_path.id, slug=slug, title=title,
            description="Coming soon.", sort_order=order,
            status=models.PublicationStatus.DRAFT,
        ))

    # ── PATH: Defensive ─────────────────────────────────────────────────────
    def_path = models.Path(
        slug="defensive", title="Defensive",
        description="Detect threats and protect industrial assets using Wazuh and Suricata.",
        icon="🛡️", color="#60A5FA",
        status=models.PublicationStatus.PUBLISHED, sort_order=3,
    )
    db.add(def_path); db.flush()

    db.add(models.Module(
        path_id=def_path.id, slug="ot-monitoring", title="OT Security Monitoring",
        description="Coming soon.", sort_order=1, status=models.PublicationStatus.DRAFT,
    ))

    # ── PATH: Mitigation ────────────────────────────────────────────────────
    mit_path = models.Path(
        slug="mitigation", title="Mitigation",
        description="Harden systems, respond to incidents and recover from ICS attacks.",
        icon="🔧", color="#2DD4BF",
        status=models.PublicationStatus.PUBLISHED, sort_order=4,
    )
    db.add(mit_path); db.flush()

    db.add(models.Module(
        path_id=mit_path.id, slug="incident-response", title="Incident Response",
        description="Coming soon.", sort_order=1, status=models.PublicationStatus.DRAFT,
    ))

    db.commit()
    print("✓ Paths and modules seeded.")


# ── Room 1: Interrupted OTA Update ────────────────────────────────────────
if db.query(models.Room).count() == 0:
    acc_module = db.query(models.Module).filter_by(slug="accidental-risk").first()
    t = tutor_user()

    room = models.Room(
        module_id=acc_module.id,
        slug="interrupted-ota-update",
        title="Interrupted OTA Update",
        description="A vehicle's infotainment failed after an OTA update. Was it an accident or an attack?",
        story=(
            "You are three weeks into the Automotive Cybersecurity Incident Response Team. "
            "A ticket just landed on your desk — several owners reported their infotainment "
            "screen going black right after an OTA update. Someone upstream already wrote "
            "'possible cyberattack'. Your rule: nobody declares a security incident before "
            "someone actually looks at the evidence. That's you, this morning."
        ),
        objectives=(
            "Scope the affected subsystem from live observation;"
            "Collect and correlate evidence from three independent sources;"
            "Classify the incident using standard risk taxonomy;"
            "Apply proportional remediation;"
            "Implement preventive controls in a live configuration file"
        ),
        difficulty=models.DifficultyLevel.MEDIUM,
        estimated_minutes=120,
        tags="Accidental Risk,OTA,Automotive,ICS,Wazuh",
        mitre_attack="T1499,T1195",
        xp_reward=150,
        sort_order=1,
        status=models.PublicationStatus.PUBLISHED,
        created_by=t.id if t else None,
    )
    db.add(room); db.flush()

    # ── Assign VMs to room ─────────────────────────────────────────────────
    for i, vm_name in enumerate(["icsimrisk", "accriskroom1", "riskroom1wazuh"]):
        v = vm(vm_name)
        if v:
            db.add(models.RoomVMTemplate(room_id=room.id, vm_template_id=v.id, sort_order=i))

    # ── Task helper ────────────────────────────────────────────────────────
    def add_task(title, description, objectives, sort_order, points, estimated_minutes=20):
        task = models.Task(
            room_id=room.id, title=title, description=description,
            objectives=objectives, sort_order=sort_order,
            points=points, estimated_minutes=estimated_minutes,
            completion_rule=models.TaskCompletionRule.ALL_QUESTIONS,
        )
        db.add(task); db.flush()
        return task

    def add_mcq(task, text, options, correct_letter, points=10, sort_order=0, explanation=None):
        """Add an MCQ question. options = list of (letter, text) tuples."""
        q = models.Question(
            task_id=task.id, question_type=models.QuestionType.MCQ_SINGLE,
            text=text, points=points, is_mandatory=True, sort_order=sort_order,
            explanation=explanation,
        )
        db.add(q); db.flush()
        correct_opt_id = None
        for i, (letter, opt_text) in enumerate(options):
            opt = models.QuestionOption(question_id=q.id, text=f"{letter}) {opt_text}", sort_order=i)
            db.add(opt); db.flush()
            if letter == correct_letter:
                correct_opt_id = opt.id
        q.validation_data = {"correct_option_id": correct_opt_id}
        return q

    # ══════════════════════════════════════════════════════════════════════
    #  TASK 1 — Discover  (+15 XP)
    # ══════════════════════════════════════════════════════════════════════
    t1 = add_task(
        title="Task 1 — Discover",
        description=(
            "Open the Vehicle VM and observe both running windows: the ICSim CAN-bus dashboard "
            "and the infotainment unit. Spend a minute with both before forming an opinion. "
            "What still works is often as informative as what's broken.\n\n"
            "Machine access:\n"
            "  Vehicle VM   — 192.168.37.47  (ubuntudesktop / ubuntudesktop)\n"
            "  OTA Server   — 192.168.37.48  (otaserver / otaserver)\n"
            "  Wazuh        — 192.168.37.49  (wazuh / wazuh)  →  https://192.168.37.49"
        ),
        objectives="Scope affected subsystem from live observation; apply initial assessment before touching logs.",
        sort_order=1, points=15, estimated_minutes=10,
    )

    q1 = add_mcq(t1, "Which subsystem is affected?",
        [("A","Engine management"),("B","Infotainment system"),("C","Steering system"),("D","Lighting system")],
        correct_letter="B", points=8, sort_order=1,
        explanation="The ICSim dashboard (CAN bus / vehicle controls) is still functional. Only the infotainment unit shows the failure.")

    q2 = add_mcq(t1, "Based only on what you observe, what is the most accurate statement?",
        [("A","The entire vehicle has failed"),("B","Only one subsystem appears affected"),
         ("C","This is clearly a cyberattack"),("D","Nothing can be concluded yet")],
        correct_letter="B", points=7, sort_order=2,
        explanation="The boundary between working and broken systems tells you more than either alone.")

    # ══════════════════════════════════════════════════════════════════════
    #  TASK 2 — Collect Evidence  (+25 XP)
    # ══════════════════════════════════════════════════════════════════════
    t2 = add_task(
        title="Task 2 — Collect Evidence",
        description=(
            "Read the OTA client logs on the Vehicle VM at /opt/ota-lab/logs/\n\n"
            "  update.log   — the client's own account of the update attempt\n"
            "  battery.log  — a measurement taken repeatedly during install\n"
            "  install.log  — lower-level detail from the actual firmware write\n"
            "  auth.log     — what the client found checking for suspicious logins\n\n"
            "Also check: `journalctl -u ota-server` on the OTA Server, and the Wazuh dashboard."
        ),
        objectives="Read and correlate multiple log sources; distinguish causal evidence from noise.",
        sort_order=2, points=25, estimated_minutes=10,
    )

    q3 = add_mcq(t2, "Which two files, together, best explain why the update actually stopped?",
        [("A","auth.log and the package directory"),("B","update.log and battery.log"),
         ("C","install.log and the OTA Server access log only"),("D","The Wazuh dashboard alone")],
        correct_letter="B", points=13, sort_order=1,
        explanation="update.log shows the abort event; battery.log shows the voltage drop that triggered it.")

    q4 = add_mcq(t2, "What sequence best matches the evidence?",
        [("A","Malware corrupted the firmware"),("B","The OTA server crashed"),
         ("C","Battery dropped too low during installation, so it aborted"),
         ("D","A remote attacker interrupted the update")],
        correct_letter="C", points=12, sort_order=2,
        explanation="Battery voltage fell below the install threshold — a purely accidental failure.")

    # ══════════════════════════════════════════════════════════════════════
    #  TASK 3 — Analyze  (+30 XP)
    # ══════════════════════════════════════════════════════════════════════
    t3 = add_task(
        title="Task 3 — Analyze",
        description=(
            "A single log is a claim. Several independent sources that agree without having "
            "coordinated are close to a fact. Cross-check the Vehicle VM logs against the "
            "OTA Server journal and the Wazuh dashboard — ask what an attacker's fingerprints "
            "would actually look like across all three, and whether you're seeing any of them."
        ),
        objectives="Cross-correlate evidence across independent sources; classify incidents using standard risk taxonomy.",
        sort_order=3, points=30, estimated_minutes=10,
    )

    q5 = add_mcq(t3, "Which of these, if found, would support the 'not an attack' conclusion?",
        [("A","High CPU usage on the OTA Server"),
         ("B","No malware, no unauthorized logins, no file integrity alerts, plus a real battery drop during install"),
         ("C","A firewall rule change"),("D","An unusually large firmware file")],
        correct_letter="B", points=10, sort_order=1,
        explanation="Look for what is absent as much as what is present.")

    q6 = add_mcq(t3, "Which security property was primarily affected?",
        [("A","Confidentiality"),("B","Availability"),("C","Authenticity"),("D","Non-repudiation")],
        correct_letter="B", points=10, sort_order=2,
        explanation="The infotainment became unavailable — an availability impact, not a confidentiality or integrity breach.")

    q7 = add_mcq(t3, "How would you classify this incident?",
        [("A","Deliberate attack"),("B","Environmental risk"),("C","Accidental risk"),("D","Regulatory issue")],
        correct_letter="C", points=10, sort_order=3,
        explanation="A process failure caused by an unintended condition (low battery) — a textbook accidental risk.")

    # ══════════════════════════════════════════════════════════════════════
    #  TASK 4 — Decide  (+20 XP)
    # ══════════════════════════════════════════════════════════════════════
    t4 = add_task(
        title="Task 4 — Decide",
        description=(
            "Your team lead needs a decision that matches the evidence, not the loudest reaction. "
            "Overreacting wastes engineering time and can damage customer trust; "
            "underreacting to a real attack is worse. Weigh the options against what you've established."
        ),
        objectives="Proportional incident response; match remediation to confirmed root cause.",
        sort_order=4, points=20, estimated_minutes=5,
    )

    q8 = add_mcq(t4, "What should the engineering team do first?",
        [("A","Launch a full cyber incident response"),
         ("B","Replace the infotainment ECU"),
         ("C","Roll back or safely reinstall the firmware once the battery issue is resolved"),
         ("D","Disconnect the vehicle from the network")],
        correct_letter="C", points=20, sort_order=1,
        explanation="Match the response to what you've confirmed. The root cause is a battery failure, not a security breach.")

    # ══════════════════════════════════════════════════════════════════════
    #  TASK 5 — Mitigate  (+20 XP)
    # ══════════════════════════════════════════════════════════════════════
    t5 = add_task(
        title="Task 5 — Mitigate",
        description=(
            "An incident is a free lesson about a gap in the system. "
            "Think about which changes would have genuinely prevented this, "
            "versus which would only have made it easier to diagnose afterward."
        ),
        objectives="Distinguish preventive from detective controls; identify systemic gaps from a single failure.",
        sort_order=5, points=20, estimated_minutes=5,
    )

    q9 = add_mcq(t5, "Which single change would have prevented this specific incident from happening at all?",
        [("A","A more detailed log format"),
         ("B","Enforcing a minimum battery level before allowing installation to start"),
         ("C","A faster download connection"),("D","A bigger firmware file size limit")],
        correct_letter="B", points=10, sort_order=1,
        explanation="A pre-flight battery check stops the install before it can fail midway.")

    q10 = add_mcq(t5, "Which additional measures reduce the risk of a similar incident going forward?",
        [("A","Automatic rollback + firmware integrity verification before reboot"),
         ("B","A louder error beep"),
         ("C","Disabling OTA updates permanently"),
         ("D","Increasing the firmware file size")],
        correct_letter="A", points=10, sort_order=2,
        explanation="Automatic rollback ensures a failed install never leaves the vehicle in a broken state.")

    # ══════════════════════════════════════════════════════════════════════
    #  TASK 6 — Apply  (+40 XP)
    # ══════════════════════════════════════════════════════════════════════
    t6 = add_task(
        title="Task 6 — Apply",
        description=(
            "This is where it stops being theoretical. You have real terminal access to the Vehicle VM. "
            "Its OTA client reads its configuration from a real file — whatever you set here "
            "genuinely changes how it behaves on the next attempt.\n\n"
            "On the Vehicle VM, edit the live config:\n"
            "  sudo nano /opt/ota-lab/config/ota.conf\n\n"
            "Set a minimum_battery threshold with real margin, and turn rollback_enabled "
            "and verify_before_reboot to true. Then trigger a genuine retry:\n"
            "  python3 /opt/ota-lab/ota_client.py --retry\n\n"
            "Check /opt/ota-lab/logs/ again to see what actually happened. "
            "If the infotainment doesn't recover, one of your chosen values didn't close the gap."
        ),
        objectives="Apply configuration-level mitigations in a live environment; validate that a fix changes system behaviour.",
        sort_order=6, points=40, estimated_minutes=15,
    )

    q11 = add_mcq(t6, "Which mitigation would have prevented this incident before it even started?",
        [("A","User notification before installation"),
         ("B","Enforcing a minimum battery level before allowing the OTA installation"),
         ("C","A larger battery icon on the dashboard"),
         ("D","Restarting the OTA server daily")],
        correct_letter="B", points=10, sort_order=1,
        explanation="A pre-install battery check is the single control that prevents mid-install failure.")

    db.commit()
    print("✓ Room 1 'Interrupted OTA Update' seeded with 6 tasks and 11 questions.")

db.close()
print("\n✓ Seed complete.")
