"""
Run with: python -m app.seed
Populates the database with:
 - Users (admin, tutor, learner)
 - Categories: offensive, defensive, mitigation, risk
 - Difficulties: easy, medium, hard
 - Lab layers: plc, scada, icsim, wazuh, risk
 - VM templates (Attacker, Vehicle, PLC, SCADA, ICSim, Wazuh, etc.)
 - Rooms grouped by category + lab layer (TryHackMe-style)
 - Demo challenges assigned to rooms
 - Platform settings
"""
from .database import SessionLocal, Base, engine
from . import models
from .auth import hash_password
from .gateway.challenge_types.standard_flag import hash_flag

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Users ──────────────────────────────────────────────────────────────────
if db.query(models.User).count() == 0:
    admin   = models.User(name="Admin", email="admin@platform.local",
                          hashed_password=hash_password("admin123"), role=models.Role.ADMIN)
    tutor   = models.User(name="Prof. Bennani", email="tutor@platform.local", institution="ENSA",
                          hashed_password=hash_password("tutor123"), role=models.Role.TUTOR)
    learner = models.User(name="Imane Ben", email="learner@platform.local", institution="UCA",
                          hashed_password=hash_password("learner123"), role=models.Role.LEARNER)
    db.add_all([admin, tutor, learner])
    db.commit()
    print("Seeded users.")

# ── Categories ─────────────────────────────────────────────────────────────
if db.query(models.Category).count() == 0:
    cats = [
        models.Category(slug="offensive",  name="Offensive",  color="coral",
                        description="Attack ICS/OT systems and exploit vulnerabilities.", sort_order=1),
        models.Category(slug="defensive",  name="Defensive",  color="blue",
                        description="Detect threats and protect industrial assets.", sort_order=2),
        models.Category(slug="mitigation", name="Mitigation", color="teal",
                        description="Respond to incidents and harden systems.", sort_order=3),
        models.Category(slug="risk",       name="Risk",       color="purple",
                        description="Assess, model and manage cybersecurity risks in OT environments.", sort_order=4),
    ]
    db.add_all(cats)
    db.commit()
    print("Seeded categories (offensive, defensive, mitigation, risk).")

# ── Difficulties ───────────────────────────────────────────────────────────
if db.query(models.Difficulty).count() == 0:
    diffs = [
        models.Difficulty(slug="easy",   name="Easy",   sort_order=1),
        models.Difficulty(slug="medium", name="Medium", sort_order=2),
        models.Difficulty(slug="hard",   name="Hard",   sort_order=3),
    ]
    db.add_all(diffs)
    db.commit()
    print("Seeded difficulties.")

# ── Platform settings ──────────────────────────────────────────────────────
if db.query(models.PlatformSettings).count() == 0:
    db.add(models.PlatformSettings(id="singleton", platform_name="AutoRange Cyber Range"))
    db.commit()
    print("Seeded platform settings.")

# ── VM Templates ───────────────────────────────────────────────────────────
if db.query(models.VMTemplate).count() == 0:
    templates = [
        models.VMTemplate(name="Attacker VM",      zone="Attack_Net",   proxmox_template_id=9001,
                          description="Kali-based offensive toolkit",
                          default_tools="nmap, metasploit, can-utils, scapy"),
        models.VMTemplate(name="Vehicle Sim VM",   zone="CAN_Net",      proxmox_template_id=9002,
                          description="Simulated ECU network over virtual CAN bus",
                          default_tools="can-utils, ICSim, candump"),
        models.VMTemplate(name="PLC VM",           zone="OT_Net",       proxmox_template_id=9003,
                          description="Soft PLC running OpenPLC with Modbus/DNP3 exposed",
                          default_tools="OpenPLC, ModRSsim2, pymodbus"),
        models.VMTemplate(name="SCADA VM",         zone="OT_Net",       proxmox_template_id=9004,
                          description="ScadaBR / Inductive Automation Ignition SCADA server",
                          default_tools="ScadaBR, Ignition, IEC 61131"),
        models.VMTemplate(name="ICSim VM",         zone="CAN_Net",      proxmox_template_id=9005,
                          description="Instrument Cluster Simulator for CAN bus training",
                          default_tools="ICSim, can-utils, carloop"),
        models.VMTemplate(name="Wazuh Manager VM", zone="SOC_Net",      proxmox_template_id=9006,
                          description="Wazuh SIEM/XDR manager for log collection and alerting",
                          default_tools="Wazuh, Kibana, Filebeat"),
        models.VMTemplate(name="Monitoring VM",    zone="SOC_Net",      proxmox_template_id=9007,
                          description="IDS + log aggregation node",
                          default_tools="Suricata, Zeek, ELK Stack"),
        models.VMTemplate(name="HMI VM",           zone="OT_Net",       proxmox_template_id=9008,
                          description="Human-Machine Interface connected to PLC/SCADA",
                          default_tools="WinCC, FactoryTalk, VNC"),
        # ── Room 1 Accidental Risk VMs ─────────────────────────────────────
        models.VMTemplate(name="icsimrisk",        zone="CAN_Net",      proxmox_template_id=9010,
                          description="Vehicle VM for Accidental Risk Room 1 — ICSim + infotainment unit (192.168.37.47)",
                          default_tools="ICSim, OTA client, /opt/ota-lab/"),
        models.VMTemplate(name="riskroom1wazuh",   zone="SOC_Net",      proxmox_template_id=9011,
                          description="Wazuh SIEM VM for Accidental Risk Room 1 — dashboard at https://192.168.37.49",
                          default_tools="Wazuh dashboard, alert rules, file integrity monitoring"),
        models.VMTemplate(name="accriskroom1",     zone="OT_Net",       proxmox_template_id=9012,
                          description="OTA Server VM for Accidental Risk Room 1 — journalctl -u ota-server (192.168.37.48)",
                          default_tools="OTA server, systemd journal, firmware packages"),
    ]
    db.add_all(templates)
    db.commit()
    print(f"Seeded {len(templates)} VM templates.")

# ── Helper lookups ─────────────────────────────────────────────────────────
def cat(slug):  return db.query(models.Category).filter_by(slug=slug).first()
def diff(slug): return db.query(models.Difficulty).filter_by(slug=slug).first()
def vm(name):   return db.query(models.VMTemplate).filter_by(name=name).first()
def tutor_user():return db.query(models.User).filter_by(email="tutor@platform.local").first()

# ── Challenges ─────────────────────────────────────────────────────────────
if db.query(models.Challenge).count() == 0:
    CHALLENGES = [
        # ── ICSim layer ────────────────────────────────────────────────────
        dict(title="CAN Bus Traffic Analysis",
             cat="offensive", diff="easy", lab_layer="icsim", points=150, time=60,
             tags="CAN,ICSim,Traffic Analysis",
             desc="Use candump and cansniffer to capture and decode CAN frames from the ICSim dashboard. Identify normal vs. anomalous traffic patterns.",
             obj="CAN frame structure; arbitration IDs; candump/cansniffer usage; baseline traffic analysis.",
             flag="FLAG{can_traffic_baseline_2026}",
             vms=["Attacker VM", "ICSim VM"],
             hints=[("Run `candump vcan0` to start capturing frames.", 10),
                    ("Filter by arbitration ID with `-f` option.", 15)]),

        dict(title="CAN Bus Message Injection",
             cat="offensive", diff="medium", lab_layer="icsim", points=300, time=90,
             tags="CAN,Injection,ICSim",
             desc="Exploit weaknesses in the ICSim to inject malicious CAN frames and manipulate the instrument cluster — change the speedometer, unlock doors, and trigger warning lights.",
             obj="CAN message injection; cansend usage; replay attacks; unauthorized frame injection.",
             flag="FLAG{icsim_door_unlock_2026}",
             vms=["Attacker VM", "ICSim VM"],
             hints=[("The door-unlock frame uses arbitration ID 0x19B.", 25),
                    ("Use `cansend vcan0 19B#0000000000000001` to send a frame.", 15)]),

        dict(title="ICSim Fuzzing",
             cat="offensive", diff="hard", lab_layer="icsim", points=400, time=120,
             tags="CAN,Fuzzing,ICSim",
             desc="Write a CAN bus fuzzer targeting the ICSim. Discover undocumented frames that trigger unexpected behavior in the instrument cluster.",
             obj="Fuzzing methodology; CAN frame structure; automated test generation; crash analysis.",
             flag="FLAG{icsim_fuzz_crash_2026}",
             vms=["Attacker VM", "ICSim VM"],
             hints=[("Use canfuzzer or write a Python script with python-can.", 20)]),

        # ── PLC layer ──────────────────────────────────────────────────────
        dict(title="Modbus Protocol Enumeration",
             cat="offensive", diff="easy", lab_layer="plc", points=150, time=60,
             tags="Modbus,PLC,Enumeration",
             desc="Enumerate a soft PLC running OpenPLC via Modbus TCP. Discover coils, registers and device information without authentication.",
             obj="Modbus function codes; register mapping; pymodbus enumeration; unauthenticated read access.",
             flag="FLAG{modbus_enum_coil_2026}",
             vms=["Attacker VM", "PLC VM"],
             hints=[("Modbus default port is 502.", 10),
                    ("Use `pymodbus.client.ModbusTcpClient` to read coils.", 15)]),

        dict(title="PLC Ladder Logic Manipulation",
             cat="offensive", diff="hard", lab_layer="plc", points=450, time=120,
             tags="PLC,Ladder Logic,ICS Attack",
             desc="Gain write access to an OpenPLC instance and modify ladder logic to force an emergency stop condition — a classic Stuxnet-style attack primitive.",
             obj="PLC write operations; Modbus write coil; industrial sabotage techniques; Stuxnet attack pattern.",
             flag="FLAG{plc_logic_modified_2026}",
             vms=["Attacker VM", "PLC VM", "HMI VM"],
             hints=[("Modbus function code 0x05 writes a single coil.", 20),
                    ("The emergency stop coil is at address 0x0001.", 30)]),

        dict(title="PLC Anomaly Detection",
             cat="defensive", diff="medium", lab_layer="plc", points=250, time=90,
             tags="PLC,IDS,Anomaly Detection",
             desc="Configure Suricata rules to detect Modbus write operations targeting critical coils. Generate an attack and confirm the alert fires.",
             obj="Suricata ICS rules; Modbus protocol analysis; alert tuning; baseline vs. attack traffic.",
             flag="FLAG{plc_ids_alert_2026}",
             vms=["Attacker VM", "PLC VM", "Monitoring VM"],
             hints=[("Suricata supports Modbus detection via the `modbus` keyword.", 15)]),

        # ── SCADA layer ────────────────────────────────────────────────────
        dict(title="SCADA HMI Reconnaissance",
             cat="offensive", diff="easy", lab_layer="scada", points=150, time=60,
             tags="SCADA,HMI,Reconnaissance",
             desc="Perform passive and active reconnaissance against a ScadaBR SCADA server. Discover exposed services, default credentials, and process tags.",
             obj="SCADA service enumeration; default credential exploitation; process tag discovery; OT network mapping.",
             flag="FLAG{scada_hmi_recon_2026}",
             vms=["Attacker VM", "SCADA VM"],
             hints=[("ScadaBR default admin credentials are admin/admin.", 10)]),

        dict(title="DNP3 Spoofing Attack",
             cat="offensive", diff="hard", lab_layer="scada", points=500, time=150,
             tags="DNP3,Spoofing,SCADA",
             desc="Craft and inject spoofed DNP3 packets to send false data to the SCADA master, causing the operator to make incorrect control decisions.",
             obj="DNP3 protocol structure; packet crafting with Scapy; man-in-the-middle positioning; SCADA operator deception.",
             flag="FLAG{dnp3_spoof_master_2026}",
             vms=["Attacker VM", "SCADA VM", "HMI VM"],
             hints=[("DNP3 runs on TCP port 20000.", 15),
                    ("Use Scapy's DNP3 layers to craft packets.", 25)]),

        dict(title="SCADA Network Hardening",
             cat="mitigation", diff="medium", lab_layer="scada", points=250, time=90,
             tags="SCADA,Hardening,Firewall",
             desc="Implement network segmentation and firewall rules to isolate the SCADA system from the corporate network. Verify isolation with penetration tests.",
             obj="OT/IT network segmentation; firewall rule design; DMZ architecture; IEC 62443 zoning.",
             flag="FLAG{scada_network_hardened_2026}",
             vms=["Attacker VM", "SCADA VM", "Monitoring VM"],
             hints=[("Apply allowlist-only rules on the OT-facing interface.", 15)]),

        # ── Wazuh layer ────────────────────────────────────────────────────
        dict(title="Wazuh Agent Deployment",
             cat="defensive", diff="easy", lab_layer="wazuh", points=100, time=45,
             tags="Wazuh,SIEM,Agent",
             desc="Deploy a Wazuh agent on the PLC VM and configure it to forward system and Modbus-related logs to the Wazuh manager. Verify log ingestion.",
             obj="Wazuh agent installation; log forwarding configuration; ossec.conf tuning; dashboard verification.",
             flag="FLAG{wazuh_agent_online_2026}",
             vms=["PLC VM", "Wazuh Manager VM"],
             hints=[("Use the Wazuh manager's IP in agent.conf.", 10)]),

        dict(title="OT Threat Hunting with Wazuh",
             cat="defensive", diff="medium", lab_layer="wazuh", points=300, time=90,
             tags="Wazuh,Threat Hunting,OT",
             desc="Use Wazuh's threat hunting capabilities to detect a simulated Modbus coil-write attack. Build custom rules and investigate the alert timeline.",
             obj="Custom Wazuh rules; log correlation; threat hunting workflow; OT attack indicators.",
             flag="FLAG{wazuh_threat_hunt_2026}",
             vms=["Attacker VM", "PLC VM", "Wazuh Manager VM"],
             hints=[("Wazuh rule IDs 30100+ cover custom OT detections.", 20),
                    ("Correlate Modbus write events with the attacker's IP.", 15)]),

        dict(title="ICS Incident Response",
             cat="mitigation", diff="hard", lab_layer="wazuh", points=400, time=120,
             tags="Incident Response,Wazuh,Forensics",
             desc="Respond to a live attack on the PLC. Use Wazuh alerts to contain the threat, collect forensic artefacts and write an incident report.",
             obj="Incident response workflow; Wazuh active response; forensic artefact collection; reporting.",
             flag="FLAG{ics_ir_complete_2026}",
             vms=["Attacker VM", "PLC VM", "Wazuh Manager VM", "Monitoring VM"],
             hints=[("Enable Wazuh active-response to block the attacker's IP.", 20)]),

        # ── Risk layer ─────────────────────────────────────────────────────
        dict(title="ICS Risk Assessment Fundamentals",
             cat="risk", diff="easy", lab_layer="risk", points=100, time=60,
             tags="Risk,IEC 62443,Assessment",
             desc="Apply the IEC 62443 risk assessment methodology to a sample OT environment. Identify assets, threats, vulnerabilities and calculate risk scores.",
             obj="IEC 62443-3-2; asset inventory; threat modelling; risk matrix; consequence vs. likelihood.",
             flag="FLAG{risk_assessment_done_2026}",
             vms=["Monitoring VM"],
             hints=[("Use the CVSS base score as a starting point for likelihood.", 10)]),

        dict(title="STRIDE Threat Modelling for OT",
             cat="risk", diff="medium", lab_layer="risk", points=250, time=90,
             tags="STRIDE,Threat Modelling,OT",
             desc="Apply STRIDE threat modelling to an ICS architecture diagram. Identify spoofing, tampering, repudiation, information disclosure, DoS and elevation threats specific to OT protocols.",
             obj="STRIDE methodology; OT protocol threat mapping; data flow diagrams; mitigating controls.",
             flag="FLAG{stride_ot_model_2026}",
             vms=["Monitoring VM"],
             hints=[("Map each STRIDE category to a specific OT protocol (Modbus, DNP3, CAN).", 15)]),

        # ── Accidental Risk — Room 1: Interrupted OTA Update ───────────────
        dict(title="Task 1 — Discover",
             cat="risk", diff="easy", lab_layer="risk", points=15, time=10,
             tags="Accidental Risk,OTA,Investigation",
             desc="""You are on the Automotive Cybersecurity Incident Response Team. Open the Vehicle VM and observe both running windows: the ICSim CAN-bus dashboard and the infotainment unit. Spend time with both before forming an opinion.

Machine access:
  Vehicle VM   — 192.168.37.47  (user: ubuntudesktop / ubuntudesktop)
  OTA Server   — 192.168.37.48  (user: otaserver / otaserver)
  Wazuh        — 192.168.37.49  (user: wazuh / wazuh)  →  https://192.168.37.49

Q1. Which subsystem is affected?
  A) Engine management
  B) Infotainment system
  C) Steering system
  D) Lighting system

Q2. Based only on what you observe, what is the most accurate statement?
  A) The entire vehicle has failed
  B) Only one subsystem appears affected
  C) This is clearly a cyberattack
  D) Nothing can be concluded yet

Submit ANSWER_B_B when you have answered both questions correctly.""",
             obj="Distinguish affected vs. functional subsystems; apply initial scope assessment before touching logs.",
             flag="ANSWER_B_B",
             vms=["icsimrisk", "accriskroom1", "riskroom1wazuh"],
             hints=[("Focus on what still works, not just what is broken. The boundary between the two tells you more than either alone.", 0)]),

        dict(title="Task 2 — Collect Evidence",
             cat="risk", diff="easy", lab_layer="risk", points=25, time=10,
             tags="Accidental Risk,OTA,Log Analysis",
             desc="""Read the OTA client logs on the Vehicle VM at /opt/ota-lab/logs/ — four files, each written by a different part of the update process.

  update.log   — the client's own account of the update attempt
  battery.log  — a measurement taken repeatedly during install
  install.log  — lower-level detail from the actual firmware write
  auth.log     — what the client found checking for suspicious logins

Also check: OTA Server journal with `journalctl -u ota-server`, and the Wazuh dashboard at https://192.168.37.49.

Q3. Which two files, together, best explain why the update actually stopped?
  A) auth.log and the package directory
  B) update.log and battery.log
  C) install.log and the OTA Server access log only
  D) The Wazuh dashboard alone

Q4. What sequence best matches the evidence?
  A) Malware corrupted the firmware
  B) The OTA server crashed
  C) Battery dropped too low during installation, so it aborted
  D) A remote attacker interrupted the update

Submit ANSWER_B_C when you have answered both questions correctly.""",
             obj="Read and correlate multiple log sources; distinguish causal evidence from noise.",
             flag="ANSWER_B_C",
             vms=["icsimrisk", "accriskroom1", "riskroom1wazuh"],
             hints=[("One file usually says what happened. A different one tends to say why.", 0)]),

        dict(title="Task 3 — Analyze",
             cat="risk", diff="medium", lab_layer="risk", points=30, time=10,
             tags="Accidental Risk,OTA,Cross-Correlation",
             desc="""A single log is a claim. Several independent sources that agree without having coordinated are close to a fact. Cross-check the Vehicle VM logs against the OTA Server journal and the Wazuh dashboard. Ask what an attacker's fingerprints would look like across all three — and whether you are seeing any of them.

Q5. Which of these, if found, would support the "not an attack" conclusion?
  A) High CPU usage on the OTA Server
  B) No malware, no unauthorized logins, no file integrity alerts, plus a real battery drop during install
  C) A firewall rule change
  D) An unusually large firmware file

Q6. Which security property was primarily affected?
  A) Confidentiality
  B) Availability
  C) Authenticity
  D) Non-repudiation

Q7. How would you classify this incident?
  A) Deliberate attack
  B) Environmental risk
  C) Accidental risk
  D) Regulatory issue

Submit ANSWER_B_B_C when you have answered all three questions correctly.""",
             obj="Cross-correlate evidence across independent sources; classify incidents using standard risk taxonomy.",
             flag="ANSWER_B_B_C",
             vms=["icsimrisk", "accriskroom1", "riskroom1wazuh"],
             hints=[("Look for what is absent as much as what is present. No attack fingerprints across three independent sources is itself strong evidence.", 0)]),

        dict(title="Task 4 — Decide",
             cat="risk", diff="medium", lab_layer="risk", points=20, time=5,
             tags="Accidental Risk,OTA,Decision Making",
             desc="""Your team lead needs a decision that matches the evidence, not the loudest reaction. Overreacting wastes engineering time and can damage customer trust. Underreacting to a real attack is worse. Weigh the real options against what you have actually established.

Q8. What should the engineering team do first?
  A) Launch a full cyber incident response
  B) Replace the infotainment ECU
  C) Roll back or safely reinstall the firmware once the battery issue is resolved
  D) Disconnect the vehicle from the network

Submit ANSWER_C when you have answered correctly.""",
             obj="Proportional incident response; match remediation to confirmed root cause.",
             flag="ANSWER_C",
             vms=["icsimrisk", "accriskroom1", "riskroom1wazuh"],
             hints=[("Match the response to what you have actually confirmed, not to worst-case assumptions.", 0)]),

        dict(title="Task 5 — Mitigate",
             cat="risk", diff="medium", lab_layer="risk", points=20, time=5,
             tags="Accidental Risk,OTA,Mitigation",
             desc="""An incident is a free lesson about a gap in the system. This fleet had more than one — or a failed update could not have left a vehicle with no way back to a working state.

Q9. Which single change would have prevented this specific incident from happening at all?
  A) A more detailed log format
  B) Enforcing a minimum battery level before allowing installation to start
  C) A faster download connection
  D) A bigger firmware file size limit

Q10. Which additional measures reduce the risk of a similar incident going forward?
  A) Automatic rollback + firmware integrity verification before reboot
  B) A louder error beep
  C) Disabling OTA updates permanently
  D) Increasing the firmware file size

Submit ANSWER_B_A when you have answered both questions correctly.""",
             obj="Distinguish preventive from detective controls; identify systemic gaps from a single failure.",
             flag="ANSWER_B_A",
             vms=["icsimrisk", "accriskroom1", "riskroom1wazuh"],
             hints=[("Think about which changes would have genuinely prevented this, versus which would only have made it easier to diagnose afterward.", 0)]),

        dict(title="Task 6 — Apply",
             cat="risk", diff="hard", lab_layer="risk", points=40, time=10,
             tags="Accidental Risk,OTA,Hands-On Fix",
             desc="""This is where it stops being theoretical. You have real terminal access to the Vehicle VM. Its OTA client reads its configuration from a real file — whatever you set here genuinely changes how it behaves on the next attempt.

On the Vehicle VM, edit the live config:
  sudo nano /opt/ota-lab/config/ota.conf

Set a minimum_battery threshold with real margin, and turn rollback_enabled and verify_before_reboot to true. Then trigger a genuine retry:
  python3 /opt/ota-lab/ota_client.py --retry

Check /opt/ota-lab/logs/ again to see what actually happened.

Q11. Which mitigation would have prevented this incident before it even started?
  A) User notification before installation
  B) Enforcing a minimum battery level before allowing the OTA installation
  C) A larger battery icon on the dashboard
  D) Restarting the OTA server daily

When the retry succeeds and the infotainment recovers, the OTA client prints a confirmation token. Submit it as your flag.""",
             obj="Apply configuration-level mitigations in a live environment; validate that a fix actually changes system behavior.",
             flag="FLAG{ota_retry_success_battery_enforced}",
             vms=["icsimrisk", "accriskroom1", "riskroom1wazuh"],
             hints=[("Set minimum_battery to at least 50 in ota.conf before retrying.", 10),
                    ("Both rollback_enabled and verify_before_reboot must be true for the client to accept the config.", 15)]),
    ]

    challenge_objs = {}
    for c in CHALLENGES:
        category  = cat(c["cat"])
        difficulty = diff(c["diff"])
        ch = models.Challenge(
            title=c["title"], description=c["desc"], objectives=c["obj"],
            category_id=category.id, difficulty_id=difficulty.id,
            challenge_type="standard_flag",
            points=c["points"], time_limit_minutes=c["time"],
            tags=c["tags"], lab_layer=c["lab_layer"],
            flag_hash=hash_flag(c["flag"]),
            created_by=tutor_user().id, is_published=True,
        )
        db.add(ch)
        db.flush()
        for i, vm_name in enumerate(c["vms"]):
            v = vm(vm_name)
            if v:
                db.add(models.ChallengeVM(challenge_id=ch.id, vm_template_id=v.id,
                                           canvas_x=120 + i * 230, canvas_y=160))
        for order, (hint_text, cost) in enumerate(c.get("hints", [])):
            db.add(models.Hint(challenge_id=ch.id, content=hint_text, cost=cost, order=order))
        challenge_objs[c["title"]] = ch

    db.commit()
    print(f"Seeded {len(CHALLENGES)} challenges.")

# ── Rooms ──────────────────────────────────────────────────────────────────
if db.query(models.Room).count() == 0:
    def ch(title): return db.query(models.Challenge).filter_by(title=title).first()

    ROOMS = [
        # ── ICSim rooms (Offensive path) ───────────────────────────────────
        dict(slug="icsim-basics", title="ICSim Basics",
             cat="offensive", layer="icsim", module="CAN Bus Fundamentals",
             diff="easy", order=1,
             desc="Get started with the Instrument Cluster Simulator. Learn CAN bus fundamentals through hands-on traffic capture and analysis.",
             challenges=["CAN Bus Traffic Analysis"]),
        dict(slug="icsim-attack", title="CAN Bus Attack Lab",
             cat="offensive", layer="icsim", module="CAN Bus Fundamentals",
             diff="medium", order=2,
             desc="Escalate from passive sniffing to active message injection. Unlock doors, spoof the speedometer, trigger alerts.",
             challenges=["CAN Bus Message Injection", "ICSim Fuzzing"]),

        # ── PLC rooms (Offensive path) ─────────────────────────────────────
        dict(slug="plc-recon", title="PLC Reconnaissance",
             cat="offensive", layer="plc", module="PLC Exploitation",
             diff="easy", order=3,
             desc="Map and enumerate a soft PLC running OpenPLC via Modbus TCP. Discover registers, coils and device metadata without authentication.",
             challenges=["Modbus Protocol Enumeration"]),
        dict(slug="plc-attack", title="PLC Attack & Defense",
             cat="offensive", layer="plc", module="PLC Exploitation",
             diff="hard", order=4,
             desc="Exploit a soft PLC to force an emergency stop, then harden it against future attacks using Suricata ICS rules.",
             challenges=["PLC Ladder Logic Manipulation", "PLC Anomaly Detection"]),

        # ── SCADA rooms (Offensive path) ───────────────────────────────────
        dict(slug="scada-recon", title="SCADA Reconnaissance",
             cat="offensive", layer="scada", module="SCADA Protocol Attacks",
             diff="easy", order=5,
             desc="Enumerate a ScadaBR SCADA server: exposed services, default credentials and process tags.",
             challenges=["SCADA HMI Reconnaissance"]),
        dict(slug="scada-attack", title="SCADA Protocol Attacks",
             cat="offensive", layer="scada", module="SCADA Protocol Attacks",
             diff="hard", order=6,
             desc="Craft and inject spoofed DNP3 packets to mislead the SCADA master.",
             challenges=["DNP3 Spoofing Attack", "SCADA Network Hardening"]),

        # ── Wazuh rooms (Defensive path) ───────────────────────────────────
        dict(slug="wazuh-setup", title="Wazuh for OT Security",
             cat="defensive", layer="wazuh", module="OT Security Monitoring",
             diff="easy", order=7,
             desc="Deploy and configure Wazuh agents on OT assets. Learn how SIEM/XDR integrates with industrial environments.",
             challenges=["Wazuh Agent Deployment"]),
        dict(slug="wazuh-hunting", title="OT Threat Hunting",
             cat="defensive", layer="wazuh", module="OT Security Monitoring",
             diff="medium", order=8,
             desc="Build custom Wazuh rules to detect OT-specific attacks. Hunt for Modbus write anomalies and respond to live incidents.",
             challenges=["OT Threat Hunting with Wazuh", "ICS Incident Response"]),

        # ── Risk path — 4 modules ──────────────────────────────────────────
        # Module 1: Accidental Risk — Room 1 (live)
        dict(slug="accidental-risk-ota", title="Interrupted OTA Update",
             cat="risk", layer="risk", module="Accidental Risk",
             diff="medium", order=9,
             desc="A vehicle's infotainment failed after an OTA update. Was it an accident or an attack? Investigate three real machines, cross-correlate logs and Wazuh alerts, then apply a live fix.",
             challenges=[
                 "Task 1 — Discover",
                 "Task 2 — Collect Evidence",
                 "Task 3 — Analyze",
                 "Task 4 — Decide",
                 "Task 5 — Mitigate",
                 "Task 6 — Apply",
             ]),

        # Module 2: Environmental Risk (placeholder — rooms to be added)
        dict(slug="environmental-risk-intro", title="Environmental Threat Modelling",
             cat="risk", layer="risk", module="Environmental Risk",
             diff="medium", order=10,
             desc="Model environmental threats to ICS infrastructure — power outages, physical access failures, natural disasters — and map them to IEC 62443 security levels.",
             challenges=[]),

        # Module 3: Regulatory Risk (placeholder)
        dict(slug="regulatory-risk-intro", title="OT Regulatory Compliance",
             cat="risk", layer="risk", module="Regulatory Risk",
             diff="medium", order=11,
             desc="Navigate ICS regulatory frameworks (IEC 62443, NERC CIP, NIS2) and assess compliance gaps. Understand what non-compliance means in operational terms.",
             challenges=[]),

        # Module 4: Organizational Risk (placeholder)
        dict(slug="organizational-risk-intro", title="STRIDE for OT Systems",
             cat="risk", layer="risk", module="Organizational Risk",
             diff="medium", order=12,
             desc="Apply STRIDE threat modelling to an ICS architecture. Identify organizational risk factors — insider threats, supply chain, governance gaps.",
             challenges=["STRIDE Threat Modelling for OT"]),
    ]

    for r in ROOMS:
        category = cat(r["cat"])
        room = models.Room(
            slug=r["slug"], title=r["title"], description=r["desc"],
            category_id=category.id, lab_layer=r["layer"],
            module=r.get("module"), difficulty=r["diff"],
            sort_order=r["order"], is_published=True,
        )
        db.add(room)
        db.flush()
        for i, challenge_title in enumerate(r["challenges"]):
            c_obj = ch(challenge_title)
            if c_obj:
                db.add(models.RoomChallenge(room_id=room.id, challenge_id=c_obj.id, order=i))

    db.commit()
    print(f"Seeded {len(ROOMS)} rooms.")

db.close()
print("Seed complete.")
