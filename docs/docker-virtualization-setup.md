# Docker & Virtualization Setup Guide

## 1. Current Diagnostic Status

Diagnostic run on: **2026-08-26**

| Component | Status | Details |
| :--- | :--- | :--- |
| **CPU Model** | Intel Core i5-11400H @ 2.70GHz | Hardware supports Intel VT-x |
| **Firmware Virtualization (VT-x)** | ❌ **Disabled (`False`)** | `Win32_Processor.VirtualizationFirmwareEnabled` is `False` |
| **Docker Engine / Daemon** | ⚠️ **Not running** | Docker Desktop client v29.7.2 installed, daemon socket unreachable |
| **WSL Subsystem** | ⚠️ **No Distros Installed** | WSL default version is 2, but no Linux distributions installed |

---

## 2. Prerequisites & Fix Steps

### Step 1: Enable Intel Virtualization (VT-x) in BIOS/UEFI
1. Restart the machine.
2. Press <kbd>F2</kbd>, <kbd>Del</kbd>, or <kbd>F12</kbd> (depending on motherboard/laptop manufacturer) during the initial splash screen to enter BIOS/UEFI.
3. Navigate to **Advanced**, **CPU Configuration**, or **Security**.
4. Look for **Intel Virtualization Technology (Intel VT-x / VMX / VMD)**.
5. Set it to **Enabled**.
6. Save settings and restart into Windows.

### Step 2: Set Up WSL 2 & Linux Subsystem
Open **PowerShell as Administrator** and run:
```powershell
# Install WSL and default Ubuntu distro
wsl --install

# Verify WSL status
wsl --status
```
*(Reboot if Windows prompts for a restart).*

### Step 3: Start Docker Desktop
1. Launch **Docker Desktop** from the Windows Start Menu.
2. In Docker Desktop Settings (`⚙️` icon):
   - Navigate to **General** -> Verify **"Use the WSL 2 based engine"** is checked.
   - Navigate to **Resources** -> **WSL integration** -> Ensure integration is enabled.
3. Verify Docker is running from PowerShell/Bash:
```powershell
docker info
docker compose version
```

---

## 3. Running iNoU with Docker

Once Docker Desktop is running, you can build and run the project containers:

### Build and Start Containers
```bash
# Build and start services in the background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Key Project Docker Files
- [Dockerfile](file:///c:/repos/iNoU/Dockerfile) - Multi-stage Node/TypeScript production build
- [docker-compose.yml](file:///c:/repos/iNoU/docker-compose.yml) - Service definition (iNoU app + Caddy reverse proxy)
- [Caddyfile](file:///c:/repos/iNoU/Caddyfile) - Caddy reverse proxy configuration
- [.dockerignore](file:///c:/repos/iNoU/.dockerignore) - Build context ignore list
