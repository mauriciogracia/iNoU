#!/usr/bin/env bash
# iwc.sh – Web Client Launcher with Live Watch Mode

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
INUO_PORT="${INUO_PORT:-3000}"
INUO_URL="${INUO_URL:-http://localhost:${INUO_PORT}}"

echo "========================================"
echo " iNoU Web Client Launcher"
echo " Target URL: $INUO_URL"
echo "========================================"

IS_WSL=false
if grep -qi microsoft /proc/version 2>/dev/null || uname -r | grep -qi microsoft 2>/dev/null; then
  IS_WSL=true
fi

OS_NAME="$(uname -s 2>/dev/null || echo 'Unknown')"
echo "[*] Detected Environment: $OS_NAME $( [ "$IS_WSL" = true ] && echo '(WSL)' )"

# Helper to find npm / npm.cmd across Windows, Git Bash, WSL, and Linux
find_npm() {
  for n in npm npm.cmd /c/Program\ Files/nodejs/npm.cmd /mnt/c/Program\ Files/nodejs/npm.cmd; do
    if command -v "$n" >/dev/null 2>&1; then
      command -v "$n"
      return 0
    fi
  done
  return 1
}

NPM_BIN="$(find_npm)"

if [ -z "$NPM_BIN" ]; then
  echo "[!] Error: npm executable not found in PATH." >&2
  exit 1
fi

is_server_running() {
  if command -v curl >/dev/null 2>&1; then
    curl -s -m 1 "$INUO_URL" >/dev/null 2>&1 && return 0
  fi
  if command -v node >/dev/null 2>&1; then
    node -e "const http=require('http'); http.get(new URL('$INUO_URL'), (res) => process.exit(res.statusCode ? 0 : 1)).on('error', () => process.exit(1));" >/dev/null 2>&1 && return 0
  fi
  return 1
}

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
    echo "[+] Launching $target_url in Google Chrome ($chrome_bin)..."
    "$chrome_bin" "$target_url" >/dev/null 2>&1 &
    return 0
  fi

  echo "[-] Chrome binary not found. Falling back to system default browser..."

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

cleanup() {
  echo ""
  echo "[*] Stopping dev server..."
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Check if already active
if is_server_running; then
  echo "[✓] Connected to existing server on port ${INUO_PORT}"
  launch_url "$INUO_URL"
  exit 0
fi

# Run npm script directly via background subshell
echo "[*] Starting watch server ($NPM_BIN run dev:web)..."
(cd "$DIR" && "$NPM_BIN" run dev:web) &
SERVER_PID=$!

echo "[*] Waiting for server to become responsive at $INUO_URL..."
MAX_RETRIES=30
RETRY_COUNT=0

until is_server_running || [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
  sleep 1
  ((RETRY_COUNT++))
done

if is_server_running; then
  echo "[✓] Server ready."
  launch_url "$INUO_URL"
else
  echo "[!] Timed out waiting for server port. Attempting browser launch..."
  launch_url "$INUO_URL"
fi

echo ""
echo " 💡 Press Ctrl+C to stop the file watcher and server."
echo ""

wait "$SERVER_PID"
