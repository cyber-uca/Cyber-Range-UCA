# Risk & Compliance

The Risk Management path on UCA CyRange isn't about memorizing standards. It's about developing the judgment to look at an industrial system, think clearly about what could go wrong, and respond proportionally when something does. The standards and frameworks here are the vocabulary that lets you communicate that judgment to other people — to engineers, to management, to regulators.

---

## The four risk categories

UCA CyRange's Risk Management path is organized around four types of risk. They come from how practitioners in the field actually classify failures:

### Accidental Risk

Things that go wrong because of failures in physical conditions, human error, or process gaps — not because someone intended them to. A pump fails because a gasket wore out. A firmware update aborts because the battery was too low. A configuration gets corrupted because a technician applied a change to the wrong device.

Accidental risk is the most common category in industrial environments. Most of the incidents that bring down OT systems aren't cyberattacks — they're this. The Interrupted OTA Update room is a textbook accidental risk scenario.

### Environmental Risk

Failures caused by the physical environment: temperature extremes that damage hardware, flooding in a control room, a lightning strike that fries an RTU, a power surge that corrupts a PLC's memory. Environmental risks are external to the system but have direct operational impact.

### Regulatory Risk

The gap between what the system does and what applicable regulations or standards require. A facility operating equipment past its certified lifespan, a network architecture that doesn't meet IEC 62443 segmentation requirements, or a security assessment that was never done when one was legally required. These are risks of non-compliance — not immediate operational threats, but significant organizational liabilities.

### Organizational Risk

Failures in how the organization operates: inadequate training, unclear incident response procedures, no change management process, security responsibilities that fall between teams. An engineer who doesn't know the signs of a compromised PLC because nobody trained them. An incident that escalated because nobody knew who to call. These are the hardest risks to quantify but often the ones that determine whether a technical failure becomes a serious incident.

---

## IEC 62443

IEC 62443 is the international standard for industrial cybersecurity. It's organized as a series of documents covering policies, procedures, system design, and component requirements. The parts most relevant to the platform:

**IEC 62443-1-1 (Terminology and Concepts)** — defines the fundamental concepts including the IACS (Industrial Automation and Control System) security model, security levels, and zones and conduits.

**IEC 62443-2-1 (Security Management System)** — what an organization needs to have in place: asset inventory, risk assessment, security policies, incident response, training, and patch management.

**IEC 62443-3-2 (Security Risk Assessment)** — how to assess risk for an IACS. Defines Security Levels (SL-0 to SL-4) based on the capability of the assumed threat actor.

**IEC 62443-3-3 (System Security Requirements)** — the 51 requirements that a control system must meet at each security level. Covers things like authentication, authorization, data confidentiality, and resource availability.

### Security levels explained

The standard defines four security levels that describe what level of adversary a system can withstand:

- **SL-1** — protection against casual or unintentional violations (accidental risk)
- **SL-2** — protection against intentional violation using simple means with low motivation (opportunistic attacker)
- **SL-3** — protection against intentional violation using sophisticated means with moderate resources (skilled attacker)
- **SL-4** — protection against state-level attackers with extended resources (nation-state)

Most industrial facilities target SL-2 as their baseline. Critical infrastructure like power generation or water treatment should target SL-3 for their most sensitive systems.

### Zones and conduits

One of the most practical concepts in IEC 62443: group assets by their security requirements into **zones**, and control all communication between zones through **conduits** (typically firewalls or data diodes). This is the operational implementation of the Purdue Model — instead of just describing layers, zones and conduits define the boundaries you actually enforce.

---

## NIST SP 800-82

NIST Special Publication 800-82 is the U.S. government's guide to ICS security. It's less prescriptive than IEC 62443 and more descriptive — it explains how ICS environments work, what the security challenges are, and what mitigations exist.

The most useful parts:

**Chapter 4 (ICS Security Program Development)** — how to build a security program from scratch. Covers risk assessment methodology, security architecture, and common architectural patterns for network segmentation.

**Chapter 5 (ICS Security Controls)** — maps NIST SP 800-53 security controls to ICS contexts. Explains which controls apply differently in ICS (where rebooting a server for a patch might not be acceptable) and which don't apply at all.

The key difference from IEC 62443: NIST 800-82 is a guide, not a certifiable standard. You use it to understand and structure your approach; IEC 62443 is what auditors and certification bodies use to evaluate the result.

---

## Doing a risk assessment

The rooms on UCA CyRange are built around a simplified version of the risk assessment process. Here's how the formal process maps to what you do in the lab:

**1. Asset identification** — Task 1 of most rooms asks you to scope what's affected. Which subsystem failed? What VMs are involved? This is the ICS equivalent of "know your inventory."

**2. Threat identification** — Task 2 and 3 ask you to collect evidence and figure out what actually happened. In a formal assessment, this is where you enumerate the threat scenarios that could affect your identified assets.

**3. Vulnerability analysis** — The rooms ask you what gap allowed the incident. In a formal assessment, you'd evaluate the technical and procedural weaknesses that make each threat scenario possible.

**4. Risk evaluation** — The Decide task asks you to make a proportional call. Formally, this means combining likelihood and impact to get a risk score, and prioritizing mitigations accordingly.

**5. Mitigation and control selection** — The Mitigate and Apply tasks. Choosing controls that actually address the root cause, not just the symptoms.

The formal IEC 62443 risk assessment adds security levels, zone definitions, and requirement mapping on top of this basic structure — but the thinking process is the same.
