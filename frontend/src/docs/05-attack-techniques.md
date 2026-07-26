# Attack Techniques

This page maps the attack techniques that appear (or will appear) in AutoRange rooms to their real-world counterparts. We use MITRE ATT&CK for ICS as the reference framework because it describes techniques the way practitioners actually encounter them — in terms of what an attacker does, not just what vulnerability they exploit.

Understanding these techniques is part of why the defensive and analysis rooms are designed the way they are. You can't evaluate evidence well if you don't know what an actual attack looks like.

---

## A note on how to read this

Each technique has an ID (like T1499), a name, a plain-English description, and notes on how it appears in the platform. Where a technique is used in a current room, that's noted. Where it's planned for future rooms, that's noted too.

We're not trying to be a MITRE reference. We're trying to give you enough context to recognize a technique when you see evidence of it — or importantly, to recognize when you're *not* seeing evidence of it.

---

## T1499 — Endpoint Denial of Service

**What it is:** The attacker disrupts the availability of a system or process by exhausting its resources or causing it to crash. In ICS, this can mean flooding a SCADA server with requests, sending malformed packets to a PLC until it faults, or triggering a condition that causes the device to reboot.

**What it looks like:** Unexplained resource exhaustion, watchdog resets, service crashes, or communication timeouts between field devices and the control system. Unlike IT denial-of-service, the threshold for harm is much lower — a PLC that misses one control cycle can cause a physical process to go out of bounds.

**In AutoRange:** Referenced in the Interrupted OTA Update room (`mitre_attack: T1499`). The room asks you to determine whether the infotainment failure is a T1499-style availability attack or an accidental failure. The evidence distinguishes the two: an attack would leave traces in auth logs, FIM alerts, or anomalous network traffic. The accidental scenario leaves none of those — just a battery log.

---

## T1195 — Supply Chain Compromise

**What it is:** The attacker compromises software, hardware, or firmware before it reaches the target. In an OTA update context, this means tampering with the update package, the distribution server, or the delivery mechanism itself.

**What it looks like:** Firmware that doesn't match the expected hash, update packages with unexpected file additions, traffic from the OTA server to unexpected destinations, or certificate validation failures the client didn't log.

**In AutoRange:** Also referenced in the OTA room. A supply chain attack on an OTA update would look fundamentally different from a battery failure — the server would need to be compromised, the firmware package would need to be modified, and the client's signature verification would need to either fail or be absent. Checking for these is part of the investigation in Task 3.

---

## CAN Bus Replay and Injection

**What it is:** Not a MITRE technique per se, but one of the most well-documented automotive attack primitives. Because CAN bus frames have no source authentication, an attacker with access to the bus can:

- **Replay** a captured sequence of frames to reproduce a past state (e.g., trigger the door unlock sequence again)
- **Inject** arbitrary frames to spoof sensor readings or issue commands to ECUs
- **Fuzz** the bus by sending random frames to discover undocumented behaviors

**What it looks like on the bus:** Unexpected message IDs that don't correspond to any known ECU, valid IDs arriving at an unusual frequency, or collisions caused by two nodes transmitting simultaneously.

**In AutoRange:** The Vehicle VM with ICSim lets you observe and interact with the CAN bus. The Offensive path (when published) will include rooms where the goal is to understand and exploit bus behavior. The CAN Bus Fundamentals module will start with read-only observation before moving to injection.

---

## Modbus Function Code Abuse

**What it is:** Modbus has no authentication. If you can reach a device's Modbus TCP port (502), you can send any function code you want. The most dangerous ones:

- `FC 03` — Read Holding Registers (reconnaissance, no harm)
- `FC 06` — Write Single Register (change a setpoint)
- `FC 16` — Write Multiple Registers (change many setpoints at once)
- `FC 05` — Write Single Coil (turn a digital output on or off)

An attacker who has pivoted from the IT network to the OT network can manipulate PLCs by simply sending well-formed Modbus packets. No exploit needed.

**What it looks like:** In Zeek or Suricata logs: Modbus write commands from a source that isn't the SCADA server or the engineering workstation. In PLC logs (if they exist): register values changing without operator input.

**In AutoRange:** The PLC Exploitation module in the Offensive path will cover this in detail.

---

## T0855 — Unauthorized Command Message

**What it is:** The attacker sends valid-looking control commands to a field device without authorization. Related to Modbus abuse but covers all ICS protocols. The "unauthorized" part means the command came from somewhere it shouldn't have — not that the command itself was malformed.

**What it looks like:** Operationally, it looks like an operator issued a command — a pump starts, a valve opens, a breaker trips. The only way to distinguish it from a legitimate command is to check whether a human actually issued it.

**In AutoRange:** Will appear in future Offensive and Defensive rooms focused on SCADA protocol attacks.

---

## Recognizing absence of evidence

One pattern that runs through all these techniques: **a real attack leaves traces**. Not always obvious ones, but usually multiple independent indicators — an unusual source IP, an authentication failure, a file modified outside its normal window, a certificate error that got swallowed.

An accidental failure, by contrast, tends to leave a clean single root cause: the battery was low, the disk was full, the network interface glitched. When three independent sources all point to the same mundane explanation and none of them show signs of interference, that's meaningful evidence of its own.

This is the analytical stance the rooms are designed to build. The question isn't just "what happened?" but "what would have to be true for this to be an attack, and is any of that true?"
