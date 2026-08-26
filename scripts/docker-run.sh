#!/usr/bin/env bash
# ==============================================================================
# iNoU Local Docker Runner (`scripts/docker-run.sh`)
# Robust, cross-platform container orchestration for Windows 11, WSL, macOS, and Linux.
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION="${1:-up}"

# ANSI color codes
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${CYAN}=================================================${RESET}"
echo -e "${CYAN}   🐳 iNoU Local Docker Container Manager        ${RESET}"
echo -e "${CYAN}=================================================${RESET}"

cd "$DIR"

# 1. Locate Docker executable across Windows, WSL, and POSIX
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
  echo -e "${RED}Error: 'docker' CLI not found in PATH or standard installation directories.${RESET}"
  echo -e "Please install Docker Desktop (https://www.docker.com/products/docker-desktop) and ensure it is in your PATH."
  exit 1
fi

# 2. Locate Node executable
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

# 3. Verify and Self-Heal Docker Daemon / Windows Contexts
ensure_docker_daemon() {
  echo -e "${YELLOW}• Checking Docker daemon connection...${RESET}"
  
  if "$DOCKER_BIN" info >/dev/null 2>&1; then
    echo -e "${GREEN}✔ Docker daemon is active and responsive.${RESET}"
    return 0
  fi

  # Attempt auto-switch between Windows named pipes / contexts (default vs desktop-linux)
  echo -e "${YELLOW}• Active context unreachable. Testing available Docker contexts...${RESET}"
  for ctx in default desktop-linux; do
    if "$DOCKER_BIN" --context "$ctx" info >/dev/null 2>&1; then
      "$DOCKER_BIN" context use "$ctx" >/dev/null 2>&1 || true
      echo -e "${GREEN}✔ Successfully switched Docker context to '${ctx}'.${RESET}"
      return 0
    fi
  done

  echo -e "${RED}❌ Docker daemon is unreachable.${RESET}"
  echo -e "${YELLOW}Troubleshooting for Windows 11:${RESET}"
  echo -e " 1. Ensure Docker Desktop is open and the bottom-left icon is green ('Engine running')."
  echo -e " 2. In Docker Desktop Settings -> Advanced, verify 'User default Docker daemon' or WSL integration."
  echo -e " 3. In PowerShell/Terminal, try running: ${CYAN}docker context use default${RESET}"
  return 1
}

# 4. Action Dispatcher
case "$ACTION" in
  up|start|compose)
    ensure_docker_daemon || exit 1
    echo -e "\n${CYAN}🚀 Launching full container stack (iNoU Hub + Ollama + Caddy Ingress)...${RESET}"
    
    if [ -n "$NODE_BIN" ] && [ -f "scripts/deploy.js" ]; then
      "$NODE_BIN" scripts/deploy.js compose
    else
      "$DOCKER_BIN" compose up -d --build
    fi

    echo -e "\n${GREEN}✔ Real Docker environment is running!${RESET}"
    echo -e "  • Web UI / Ingress: ${CYAN}http://localhost:80${RESET} (or ${CYAN}http://localhost:8765${RESET})"
    echo -e "  • Ollama LLM Hub:   ${CYAN}http://localhost:11434${RESET}"
    echo -e "  • View logs:        ${YELLOW}./docker-run.sh logs${RESET}"
    echo -e "  • Stop stack:       ${YELLOW}./docker-run.sh down${RESET}\n"
    ;;

  standalone|single)
    ensure_docker_daemon || exit 1
    echo -e "\n${CYAN}🚀 Launching standalone iNoU Hub container...${RESET}"
    
    if [ -n "$NODE_BIN" ] && [ -f "scripts/deploy.js" ]; then
      "$NODE_BIN" scripts/deploy.js docker
    else
      "$DOCKER_BIN" build -t inuo-cloud-hub .
      "$DOCKER_BIN" stop inuo_hub >/dev/null 2>&1 || true
      "$DOCKER_BIN" rm inuo_hub >/dev/null 2>&1 || true
      "$DOCKER_BIN" run -d --name inuo_hub -p 8765:8765 -e INUO_DATA_DIR=/app/data -v inuo_hub_data:/app/data inuo-cloud-hub
    fi

    echo -e "\n${GREEN}✔ Standalone container is running!${RESET}"
    echo -e "  • Endpoint: ${CYAN}http://localhost:8765${RESET}\n"
    ;;

  down|stop)
    echo -e "${YELLOW}🛑 Stopping Docker containers...${RESET}"
    "$DOCKER_BIN" compose down 2>/dev/null || true
    "$DOCKER_BIN" stop inuo_hub 2>/dev/null || true
    "$DOCKER_BIN" rm inuo_hub 2>/dev/null || true
    echo -e "${GREEN}✔ Containers stopped successfully.${RESET}"
    ;;

  restart)
    ensure_docker_daemon || exit 1
    echo -e "${YELLOW}🔄 Restarting Docker stack...${RESET}"
    "$DOCKER_BIN" compose down 2>/dev/null || true
    if [ -n "$NODE_BIN" ] && [ -f "scripts/deploy.js" ]; then
      "$NODE_BIN" scripts/deploy.js compose
    else
      "$DOCKER_BIN" compose up -d --build
    fi
    ;;

  logs)
    "$DOCKER_BIN" compose logs -f
    ;;

  status|ps)
    "$DOCKER_BIN" compose ps
    ;;

  *)
    echo -e "${RED}Unknown action: \"$ACTION\"${RESET}"
    echo -e "Usage: $0 [up|standalone|down|restart|logs|status]"
    exit 1
    ;;
esac
