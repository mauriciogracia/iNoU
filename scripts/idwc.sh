#!/usr/bin/env bash
# ==============================================================================
# idwc.sh / scripts/idwc.sh – iNoU Docker Web Client Launcher
# Starts Docker container stack, waits for health check, and opens the Web Client.
# Supports Windows 11 (Git Bash / MSYS2 / WSL), macOS, and Linux.
# ==============================================================================
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
INUO_PORT="${INUO_PORT:-8765}"
INUO_HOST="${INUO_HOST:-localhost}"
INUO_URL="${INUO_URL:-http://${INUO_HOST}:${INUO_PORT}}"
MODE="${1:-compose}" # compose | standalone | stop | logs

CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${CYAN}========================================${RESET}"
echo -e "${CYAN} 🐳 iNoU Docker Web Client Launcher     ${RESET}"
echo -e "${CYAN} Target URL: ${INUO_URL}                 ${RESET}"
echo -e "${CYAN}========================================${RESET}"

IS_WSL=false
if grep -qi microsoft /proc/version 2>/dev/null || uname -r | grep -qi microsoft 2>/dev/null; then
  IS_WSL=true
fi

OS_NAME="$(uname -s 2>/dev/null || echo 'Unknown')"
echo -e "${YELLOW}[*] Detected Environment: ${OS_NAME} $( [ "$IS_WSL" = true ] && echo '(WSL)' )${RESET}"

cd "$DIR"

# 1. Locate Docker CLI
find_docker() {
  for d in docker docker.exe /c/Program\ Files/Docker/Docker/resources/bin/docker.exe /mnt/c/Program\ Files/Docker/Docker/resources/bin/docker.exe; do
    if command -v "$d" >/dev/null 2>&1; then
      command -v "$d"
      return 0
    fi
  done
  return 1
}

DOCKER_BIN="$(find_docker || true)"

if [ -z "$DOCKER_BIN" ]; then
  echo -e "${RED}[!] Error: 'docker' executable not found in PATH.${RESET}" >&2
  echo -e "Please install Docker Desktop and ensure it is available in your PATH." >&2
  exit 1
fi

# 2. Locate Node CLI
find_node() {
  for n in node node.exe /c/Program\ Files/nodejs/node.exe /mnt/c/Program\ Files/nodejs/node.exe; do
    if command -v "$n" >/dev/null 2>&1; then
      command -v "$n"
      return 0
    fi
  done
  return 1
}

NODE_BIN="$(find_node || true)"

# 3. Ensure Docker daemon is reachable (with Windows 11 context healing)
ensure_docker_daemon() {
  echo -e "${YELLOW}[*] Checking Docker daemon connection...${RESET}"
  if "$DOCKER_BIN" info >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] Docker daemon is ready.${RESET}"
    return 0
  fi

  for ctx in default desktop-linux; do
    if "$DOCKER_BIN" --context "$ctx" info >/dev/null 2>&1; then
      "$DOCKER_BIN" context use "$ctx" >/dev/null 2>&1 || true
      echo -e "${GREEN}[✓] Auto-switched Docker context to '${ctx}'.${RESET}"
      return 0
    fi
  done

  echo -e "${RED}[!] Error: Docker daemon is unreachable.${RESET}" >&2
  echo -e "Please ensure Docker Desktop is running on Windows 11." >&2
  return 1
}

# 4. Check if container server is already answering
is_server_running() {
  if command -v curl >/dev/null 2>&1; then
    curl -s -m 1 "${INUO_URL}/health" >/dev/null 2>&1 && return 0
    curl -s -m 1 "http://localhost:80/health" >/dev/null 2>&1 && return 0
  fi
  if [ -n "$NODE_BIN" ]; then
    "$NODE_BIN" -e "const http=require('http'); http.get(new URL('${INUO_URL}/health'), (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));" >/dev/null 2>&1 && return 0
  fi
  return 1
}

# 5. Browser discovery matching iwc.sh
find_chrome() {
  for cmd in google-chrome google-chrome-stable chromium chromium-browser chrome; do
    if command -v "$cmd" >/dev/null 2>&1; then
      command -v "$cmd"
      return 0
    fi
  done

  for path in \
    "/usr/bin/google-chrome" \
    "/usr/bin/google-chrome-stable" \
    "/opt/google/chrome/google-chrome" \
    "/snap/bin/chromium" \
    "/usr/bin/chromium-browser"; do
    if [ -x "$path" ]; then
      echo "$path"
      return 0
    fi
  done

  if [ -d "/Applications/Google Chrome.app" ]; then
    echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    return 0
  fi

  for win_path in \
    "/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
    "/c/Users/${USER:-${USERNAME}}/AppData/Local/Google/Chrome/Application/chrome.exe"; do
    if [ -x "$win_path" ]; then
      echo "$win_path"
      return 0
    fi
  done

  if [ "$IS_WSL" = true ]; then
    for wsl_path in \
      "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
      "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
      "/mnt/c/Users/${USER:-${USERNAME}}/AppData/Local/Google/Chrome/Application/chrome.exe"; do
      if [ -f "$wsl_path" ]; then
        echo "$wsl_path"
        return 0
      fi
    done
  fi

  if command -v where.exe >/dev/null 2>&1; then
    local found_win
    found_win=$(where.exe chrome.exe 2>/dev/null | head -n1 | tr -d '\r')
    if [ -n "$found_win" ]; then
      if command -v cygpath >/dev/null 2>&1; then
        cygpath -u "$found_win"
      elif command -v wslpath >/dev/null 2>&1; then
        wslpath -u "$found_win"
      else
        echo "$found_win"
      fi
      return 0
    fi
  fi

  return 1
}

launch_url() {
  local target_url="$1"
  local chrome_bin
  chrome_bin="$(find_chrome)"

  if [ -n "$chrome_bin" ]; then
    echo -e "${GREEN}[+] Launching $target_url in Google Chrome ($chrome_bin)...${RESET}"
    "$chrome_bin" "$target_url" >/dev/null 2>&1 &
    return 0
  fi

  echo -e "${YELLOW}[-] Chrome binary not found. Falling back to default browser...${RESET}"

  if [ "$IS_WSL" = true ]; then
    command -v wslview >/dev/null 2>&1 && { wslview "$target_url" & return 0; }
    command -v powershell.exe >/dev/null 2>&1 && { powershell.exe -NoProfile -Command "Start-Process '$target_url'" >/dev/null 2>&1 & return 0; }
    command -v cmd.exe >/dev/null 2>&1 && { cmd.exe /c start "" "$target_url" >/dev/null 2>&1 & return 0; }
  fi

  if command -v open >/dev/null 2>&1; then
    open "$target_url" & return 0
  fi

  for opener in xdg-open sensible-browser x-www-browser gio; do
    if command -v "$opener" >/dev/null 2>&1; then
      "$opener" "$target_url" >/dev/null 2>&1 &
      return 0
    fi
  done

  return 1
}

# Handle stop action
if [ "$MODE" = "stop" ] || [ "$MODE" = "down" ]; then
  echo -e "${YELLOW}[*] Stopping Docker containers...${RESET}"
  "$DOCKER_BIN" compose down 2>/dev/null || true
  "$DOCKER_BIN" stop inuo_hub 2>/dev/null || true
  "$DOCKER_BIN" rm inuo_hub 2>/dev/null || true
  echo -e "${GREEN}[✓] Containers stopped.${RESET}"
  exit 0
fi

# Handle logs action
if [ "$MODE" = "logs" ]; then
  "$DOCKER_BIN" compose logs -f
  exit 0
fi

# Ensure Docker is ready
ensure_docker_daemon || exit 1

# Check if already active
if is_server_running; then
  echo -e "${GREEN}[✓] Connected to existing running container at ${INUO_URL}${RESET}"
  launch_url "$INUO_URL"
  echo -e "\n${CYAN}💡 Containers are active. Run './idwc.sh logs' to view logs or './idwc.sh stop' to stop.${RESET}"
  exit 0
fi

# Start Docker containers
echo -e "${CYAN}[*] Building and starting Docker containers...${RESET}"
if [ -n "$NODE_BIN" ] && [ -f "scripts/deploy.js" ]; then
  "$NODE_BIN" scripts/deploy.js "$MODE"
else
  "$DOCKER_BIN" compose up -d --build
fi

echo -e "${YELLOW}[*] Waiting for container health check at ${INUO_URL}...${RESET}"
MAX_RETRIES=30
RETRY_COUNT=0

until is_server_running || [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
  sleep 1
  ((RETRY_COUNT++))
  printf "."
done
echo ""

if is_server_running; then
  echo -e "${GREEN}[✓] iNoU Docker container is live and healthy!${RESET}"
else
  echo -e "${YELLOW}[!] Health check timed out. Attempting browser launch anyway...${RESET}"
fi

launch_url "$INUO_URL"

echo ""
echo -e "${GREEN}★ iNoU Docker Web Client launched successfully!${RESET}"
echo -e "  • Web UI:        ${CYAN}${INUO_URL}${RESET}"
echo -e "  • Ollama LLM:    ${CYAN}http://localhost:11434${RESET}"
echo -e "  • Ingress HTTP:  ${CYAN}http://localhost:80${RESET}"
echo -e "  • Stop command:  ${YELLOW}./idwc.sh stop${RESET}"
echo -e "  • Stream logs:   ${YELLOW}./idwc.sh logs${RESET}"
echo ""
