# Tools Reference

Every tool you encounter in the platform's virtual machines is here. This isn't an exhaustive manual — it's a quick reference so you know what something is, what VM it lives on, and what you'd use it for in context.

---

## Vehicle VM (192.168.37.47)

### ICSim — Instrument Cluster Simulator

ICSim creates a simulated vehicle dashboard that responds to real CAN bus messages. When you open the Vehicle VM, you'll see two windows: the dashboard (gauges, turn signals, door locks) and a controls window. The controls window lets you send preset CAN messages. The dashboard reacts.

The interesting part is that anything on the CAN bus can send messages to the dashboard. So if you have a CAN interface open, you can use `cansend` to trigger the same effects — or different ones.

```bash
# See what's on the bus
candump vcan0

# Send a specific frame
cansend vcan0 19B#000000000000
```

ICSim is at `/opt/ICSim/` on the Vehicle VM.

### can-utils

A collection of command-line tools for working with CAN interfaces. The two you'll use most:

**candump** — listens on a CAN interface and prints every frame as it arrives. Each line shows the interface name, the message ID (hex), and the data bytes. Useful for understanding what traffic is normal before you start looking for anomalies.

**cansend** — sends a single CAN frame. Takes the interface and the frame in the format `ID#DATA`.

**canplayer** — replays a captured CAN log. Useful for reproducing a specific state.

```bash
candump vcan0              # watch live traffic
candump -l vcan0           # log to file
cansend vcan0 244#0000000000000000    # send a frame
```

### OTA client — `/opt/ota-lab/`

The OTA update client installed on the Vehicle VM. It reads its configuration from `/opt/ota-lab/config/ota.conf` and writes logs to `/opt/ota-lab/logs/`. The logs are the primary evidence source in the Interrupted OTA Update room.

Key files:
- `ota.conf` — controls minimum battery threshold, rollback behaviour, signature verification
- `logs/update.log` — the client's record of the update attempt
- `logs/battery.log` — battery readings taken during installation
- `logs/install.log` — low-level firmware write progress
- `logs/auth.log` — login activity checked by the client

To trigger a retry:
```bash
python3 /opt/ota-lab/ota_client.py --retry
```

---

## OTA Server VM (192.168.37.48)

### systemd journal

The OTA server runs its service under systemd. The most useful command for reading its logs:

```bash
journalctl -u ota-server -n 100       # last 100 lines
journalctl -u ota-server --since "1 hour ago"
journalctl -u ota-server -f           # follow in real time
```

The server logs every client connection, what firmware version was requested, and whether the transfer completed. Cross-checking the server log against the client's `update.log` tells you whether the two sides agree on what happened.

---

## Wazuh VM (192.168.37.49)

### Wazuh

Wazuh is an open-source security platform that combines a SIEM (Security Information and Event Management) with XDR (Extended Detection and Response) capabilities. On the platform it runs as the central monitoring point for the lab environment.

Access the dashboard at `https://192.168.37.49` (credentials: wazuh / wazuh).

What Wazuh monitors in the lab:
- **File Integrity Monitoring (FIM)** — alerts when files are created, modified, or deleted on watched paths
- **Log analysis** — ingests syslog, auth.log, and application logs and runs rules against them
- **Vulnerability detection** — scans installed packages against CVE databases
- **Active response** — can automatically block IPs or run scripts when rules fire

In the Interrupted OTA Update room, the Wazuh dashboard is your third independent evidence source. After checking the Vehicle VM logs and the OTA Server journal, checking Wazuh tells you whether any security rules fired during the window in question.

Key things to look for in the Wazuh dashboard:
- Alerts timeline — did anything trigger around the time of the update?
- FIM events — were any critical files modified unexpectedly?
- Authentication events — any failed logins or privilege escalation?

---

## Attacker VM (Kali-based)

> Used in Offensive path rooms — not present in the current Risk Management room.

### Nmap

Network scanner. Used to discover hosts, open ports, and service versions. The most common scans you'll use:

```bash
nmap -sV 192.168.37.0/24          # discover hosts and services
nmap -p 502 192.168.37.0/24       # scan for Modbus
nmap -sU -p 47808 192.168.37.0/24 # scan for BACnet (UDP)
```

### Metasploit

Exploitation framework. In ICS contexts, used for Modbus/DNP3 scanning modules and known CVE exploits on SCADA software. Launched with `msfconsole`.

### Scapy

Python library for crafting arbitrary network packets. More flexible than Nmap for unusual protocols.

```python
from scapy.all import *
# Build and send a custom Modbus read request
```

---

## PLC VM

> Used in Offensive and Defensive path rooms — not yet published.

### OpenPLC

Open-source PLC runtime that supports IEC 61131-3 ladder logic. Runs a Modbus TCP server on port 502 by default. The web interface is on port 8080.

You can use pymodbus to read and write registers:

```python
from pymodbus.client import ModbusTcpClient
c = ModbusTcpClient('192.168.x.x')
c.connect()
result = c.read_holding_registers(0, 10)
print(result.registers)
```

---

## SCADA VM

> Used in Offensive and Defensive path rooms — not yet published.

### ScadaBR

Open-source SCADA server based on Mango Automation. Provides a web-based HMI and data historian. Communicates with PLCs via Modbus, DNP3, and other protocols configured through the web interface.

Default credentials are in the room's task description. The admin interface allows you to create data points, view trends, and configure alarms.

---

## Monitoring VM

> Used in Defensive path rooms — not yet published.

### Suricata

Network IDS/IPS. Reads PCAP files or monitors a live interface and runs signatures against traffic. Has built-in rules for common ICS protocols and many CVEs.

```bash
suricata -r capture.pcap -l /var/log/suricata/
cat /var/log/suricata/fast.log
```

### Zeek

Network analysis framework. Rather than signature matching, Zeek generates structured logs from network traffic — connection logs, DNS logs, HTTP logs, and protocol-specific logs. Good for understanding what happened on the network at a timeline level.

```bash
zeek -r capture.pcap
ls -la *.log      # conn.log, dns.log, etc.
```
