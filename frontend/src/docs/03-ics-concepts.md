# ICS/OT Concepts

Industrial control systems are different from the IT infrastructure most security people learn on. The differences matter — in how attacks work, in what "protecting a system" even means, and in what you're allowed to do when something goes wrong. This page covers the foundational concepts behind every room on AutoRange.

---

## The Purdue Model

Most ICS environments are organized in layers, and the most common reference model for those layers is the Purdue Model. Originally developed in the 1990s for manufacturing, it's still the dominant mental model for describing where things live in an industrial network.

```
Level 5 — Enterprise Network (business IT, email, ERP)
Level 4 — Site Business Planning (production scheduling, historians)
Level 3 — Site Operations (SCADA servers, engineering workstations)
Level 2 — Area Control (HMI, supervisory control)
Level 1 — Basic Control (PLCs, DCS, RTUs)
Level 0 — Physical Process (sensors, actuators, field devices)
```

The key insight is that **communication should flow between adjacent levels**. A business laptop at Level 5 should never have direct access to a PLC at Level 1. In practice, this separation is frequently violated — either by design shortcuts, or by attackers who find a path through.

Most attacks on ICS environments work by crossing these level boundaries — landing in the IT network first (Level 4/5), then pivoting down toward the operational layers.

---

## What ICS actually controls

It helps to have a mental image of what these systems do in the real world:

**PLC (Programmable Logic Controller)** — a ruggedized computer that reads inputs from sensors and sends outputs to actuators. It runs a control loop continuously. A PLC might manage a pump, a valve, a conveyor belt, or a circuit breaker. They are designed to be reliable, not secure.

**RTU (Remote Terminal Unit)** — similar to a PLC but designed for geographically distributed assets. Used in pipelines, power transmission, and water systems.

**HMI (Human-Machine Interface)** — the screen an operator looks at. Shows process variables in real time and lets the operator intervene manually. A compromised HMI can show false readings while the process goes wrong, or let an attacker issue commands directly.

**SCADA (Supervisory Control and Data Acquisition)** — the software layer that aggregates data from many PLCs/RTUs and provides enterprise-level visibility. A SCADA server in a power utility might be monitoring thousands of field devices across a region.

**DCS (Distributed Control System)** — similar to SCADA but typically used in tightly coupled processes like oil refining or chemical plants, where the control logic is distributed across many controllers that coordinate with each other.

---

## ICS protocols

ICS environments use their own protocols, developed long before cybersecurity was a concern. Most of them have no authentication, no encryption, and no concept of an attacker on the network.

**Modbus** — probably the most widely deployed ICS protocol, developed in 1979. Runs over serial or TCP. No authentication whatsoever. If you can reach a Modbus device on the network, you can read its registers and write to them.

**DNP3 (Distributed Network Protocol)** — used heavily in utilities (power, water). More sophisticated than Modbus, with event reporting and time-stamping, but authentication is optional and rarely configured.

**EtherNet/IP** — Ethernet-based protocol used in manufacturing. Wraps CIP (Common Industrial Protocol) over standard TCP/IP, which makes it easier to route but also easier to attack from an IT network.

**PROFINET** — widely used in German-engineered manufacturing equipment. Real-time protocol over Ethernet.

**OPC-UA** — a more modern protocol with built-in security features. Increasingly adopted as the standard for industrial data exchange, but older installations still use OPC-DA which has no security.

---

## The CAN bus

The Controller Area Network (CAN bus) is the protocol that vehicles use internally for ECUs (Electronic Control Units) to communicate with each other. It was designed in the 1980s for automotive use — the priority was deterministic, real-time communication, not security.

A CAN bus has no source addresses. Any node on the bus can send any message. If you have access to the bus, you can send forged messages that appear to come from the engine ECU, the brakes, the infotainment system, or anything else. There's no way for the receiving node to verify the sender.

In the platform's Vehicle VM, you can observe the CAN bus using **ICSim** (an instrument cluster simulator) and **can-utils** tools like `candump` and `cansend`. The instrument cluster responds to real CAN frames — if you send the right message ID with the right data bytes, the gauges move.

---

## OTA updates and their risks

Over-the-Air (OTA) updates let manufacturers push firmware to vehicles or field devices without physical access. The update process typically looks like this:

1. The OTA client on the device checks for updates
2. It downloads a firmware package from the OTA server
3. It verifies the package (ideally with a cryptographic signature)
4. It writes the new firmware to the device
5. It reboots

The risks come at every step. If the server is compromised, it can push malicious firmware. If the transport isn't encrypted, the package can be tampered with in transit. If the client doesn't verify the signature, it'll install anything it receives. And if the update process doesn't have safeguards (like a minimum battery check), perfectly legitimate updates can fail in ways that brick the device.

The Interrupted OTA Update room explores exactly this last scenario — a legitimate update failing for a mundane, non-malicious reason, and the question of how you distinguish that from an attack.

---

## Why availability matters more than confidentiality

In IT security, the classic concern is data leakage — someone reads something they shouldn't. In ICS security, the primary concern is usually **availability**. A factory floor that stops producing, a pump that stops pumping, a circuit breaker that opens at the wrong moment — these cause physical consequences that data theft doesn't.

This changes how you think about incidents. In IT, a ransomware infection that encrypts files is severe. In ICS, a ransomware infection that freezes a SCADA server might mean a hospital loses power, or a water treatment plant can't dose chlorine, or a pipeline control room goes blind.

It also changes how carefully you act during incident response. In IT, you can pull a server offline to investigate. In ICS, pulling the SCADA server offline might mean the operators lose visibility entirely, which could be more dangerous than the original incident.

Every room on AutoRange asks you to think about which security property is at stake — confidentiality, integrity, or availability — before deciding how to respond.
