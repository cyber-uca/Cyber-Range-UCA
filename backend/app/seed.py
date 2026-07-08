"""
Run with: python -m app.seed
Populates the database with sample VM templates, an admin + tutor + learner
account, data-driven categories/difficulties, platform settings, and a
handful of demo challenges so you have something to click through immediately.
"""
from .database import SessionLocal, Base, engine
from . import models
from .auth import hash_password
from .gateway.challenge_types.standard_flag import hash_flag

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.User).count() == 0:
    admin = models.User(name="Admin", email="admin@platform.local",
                         hashed_password=hash_password("admin123"), role=models.Role.ADMIN)
    tutor = models.User(name="Prof. Bennani", email="tutor@platform.local", institution="ENSA",
                         hashed_password=hash_password("tutor123"), role=models.Role.TUTOR)
    learner = models.User(name="Imane Ben", email="learner@platform.local", institution="UCA",
                           hashed_password=hash_password("learner123"), role=models.Role.LEARNER)
    db.add_all([admin, tutor, learner])
    db.commit()
    print("Seeded users: admin@platform.local / tutor@platform.local / learner@platform.local (passwords: role+123)")

if db.query(models.Category).count() == 0:
    categories = [
        models.Category(slug="offensive", name="Offensive", color="coral",
                         description="Attack automotive systems and exploit vulnerabilities.", sort_order=1),
        models.Category(slug="defensive", name="Defensive", color="blue",
                         description="Detect threats and protect automotive assets.", sort_order=2),
        models.Category(slug="mitigation", name="Mitigation", color="teal",
                         description="Respond to incidents and recover systems.", sort_order=3),
    ]
    db.add_all(categories)
    db.commit()
    print(f"Seeded {len(categories)} categories.")

if db.query(models.Difficulty).count() == 0:
    difficulties = [
        models.Difficulty(slug="easy", name="Easy", sort_order=1),
        models.Difficulty(slug="medium", name="Medium", sort_order=2),
        models.Difficulty(slug="hard", name="Hard", sort_order=3),
    ]
    db.add_all(difficulties)
    db.commit()
    print(f"Seeded {len(difficulties)} difficulties.")

if db.query(models.PlatformSettings).count() == 0:
    db.add(models.PlatformSettings(id="singleton", platform_name="AutoRange Cyber Range"))
    db.commit()
    print("Seeded platform settings.")

if db.query(models.VMTemplate).count() == 0:
    templates = [
        models.VMTemplate(name="Attacker VM", zone="Attack_Net", proxmox_template_id=9001,
                           description="Kali-based offensive toolkit", default_tools="nmap, metasploit, can-utils"),
        models.VMTemplate(name="Vehicle Simulation VM", zone="CAN_Net", proxmox_template_id=9002,
                           description="Simulated ECU network over virtual CAN bus", default_tools="can-utils, ICSim"),
        models.VMTemplate(name="Infotainment VM", zone="CAN_Net", proxmox_template_id=9003,
                           description="Simulated head unit exposing OTA/OBD-II interfaces", default_tools="adb, obd-diag"),
        models.VMTemplate(name="OEM Backend VM", zone="Backend_Net", proxmox_template_id=9004,
                           description="Mock manufacturer backend for OTA updates", default_tools="nginx, postgres"),
        models.VMTemplate(name="Monitoring VM", zone="SOC_Net", proxmox_template_id=9005,
                           description="IDS + log aggregation", default_tools="Wazuh, Suricata"),
        models.VMTemplate(name="Management VM", zone="Mgmt_Net", proxmox_template_id=9006,
                           description="Session management / jump host", default_tools="ssh, tmux"),
    ]
    db.add_all(templates)
    db.commit()
    print(f"Seeded {len(templates)} VM templates.")

if db.query(models.Challenge).count() == 0:
    tutor = db.query(models.User).filter(models.User.email == "tutor@platform.local").first()
    attacker = db.query(models.VMTemplate).filter(models.VMTemplate.name == "Attacker VM").first()
    vehicle = db.query(models.VMTemplate).filter(models.VMTemplate.name == "Vehicle Simulation VM").first()
    monitoring = db.query(models.VMTemplate).filter(models.VMTemplate.name == "Monitoring VM").first()

    offensive = db.query(models.Category).filter(models.Category.slug == "offensive").first()
    defensive = db.query(models.Category).filter(models.Category.slug == "defensive").first()
    mitigation = db.query(models.Category).filter(models.Category.slug == "mitigation").first()
    easy = db.query(models.Difficulty).filter(models.Difficulty.slug == "easy").first()
    medium = db.query(models.Difficulty).filter(models.Difficulty.slug == "medium").first()
    hard = db.query(models.Difficulty).filter(models.Difficulty.slug == "hard").first()

    demo_challenges = [
        dict(title="CAN Bus Attacker", category=offensive, difficulty=medium, points=300, time=90,
             tags="CAN Bus,ECU,OBD-II",
             description="Exploit weaknesses in the vehicle's CAN bus to manipulate messages, gain "
                          "unauthorized access and override critical functions.",
             objectives="CAN bus fundamentals; traffic sniffing and analysis; message injection; "
                        "ID spoofing and replay attacks.",
             flag="FLAG{unauth_can_injection_2026}", vms=[attacker, vehicle]),
        dict(title="ECU Firmware Analysis", category=defensive, difficulty=hard, points=350, time=120,
             tags="ECU,Firmware,Reverse Engineering",
             description="Reverse engineer ECU firmware to identify hardcoded credentials and "
                          "insecure update mechanisms.",
             objectives="Firmware extraction; binary analysis; identifying hardcoded secrets.",
             flag="FLAG{ecu_firmware_secret_2026}", vms=[vehicle, monitoring]),
        dict(title="Gateway Fuzzing", category=mitigation, difficulty=medium, points=250, time=90,
             tags="Gateway,Fuzzing",
             description="Fuzz the central gateway ECU and discover issues that could crash or "
                          "desynchronize the vehicle's internal networks, then propose a mitigation.",
             objectives="Fuzzing techniques; gateway ECU behavior; writing a mitigation report.",
             flag="FLAG{gateway_fuzz_crash_2026}", vms=[attacker, vehicle]),
        dict(title="IDS Log Investigation", category=defensive, difficulty=easy, points=200, time=60,
             tags="IDS,Logs,Detection",
             description="Analyze IDS logs and detect attacks against the vehicle's onboard network.",
             objectives="Reading IDS alerts; correlating logs; identifying attack patterns.",
             flag="FLAG{ids_log_detected_2026}", vms=[monitoring]),
    ]

    for c in demo_challenges:
        challenge = models.Challenge(
            title=c["title"], description=c["description"], objectives=c["objectives"],
            category_id=c["category"].id, difficulty_id=c["difficulty"].id,
            challenge_type="standard_flag", points=c["points"], time_limit_minutes=c["time"],
            tags=c["tags"], flag_hash=hash_flag(c["flag"]),
            created_by=tutor.id if tutor else None, is_published=True,
        )
        db.add(challenge)
        db.flush()
        for i, vm in enumerate(c["vms"]):
            if vm:
                db.add(models.ChallengeVM(challenge_id=challenge.id, vm_template_id=vm.id,
                                           canvas_x=100 + i * 220, canvas_y=150))

    db.add_all([
        models.Hint(challenge_id=db.query(models.Challenge).filter_by(title="CAN Bus Attacker").first().id,
                    content="Start with `candump can0` to observe live traffic.", cost=10, order=0),
        models.Hint(challenge_id=db.query(models.Challenge).filter_by(title="CAN Bus Attacker").first().id,
                    content="The door-unlock frame uses arbitration ID 0x19B.", cost=25, order=1),
    ])
    db.commit()
    print(f"Seeded {len(demo_challenges)} demo challenges.")

db.close()
print("Seed complete.")
