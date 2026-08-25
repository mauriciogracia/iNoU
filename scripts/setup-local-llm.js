#!/usr/bin/env node
/**
 * scripts/setup-local-llm.js
 * Zero-Touch Automated Setup Assistant for Local SLM (Ollama + Qwen 2.5).
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OLLAMA_URL = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.LOCAL_LLM_MODEL || 'qwen2.5:3b';

function isCommandAvailable(cmd) {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function isOllamaReachable(url = OLLAMA_URL, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(`${url.replace(/\/+$/, '')}/api/tags`);
      const req = http.get(parsed, { timeout: timeoutMs }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function installOllama() {
  console.log(`\n📦 Installing Ollama for platform: ${process.platform}...`);
  if (process.platform === 'win32') {
    if (isCommandAvailable('winget')) {
      console.log('Running: winget install Ollama.Ollama...');
      try {
        execSync('winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements --silent', {
          stdio: 'inherit',
        });
        console.log('✔ Ollama installed successfully via winget.');
        return true;
      } catch (e) {
        console.warn('winget installation encountered an issue:', e.message);
      }
    }
    console.log('\n💡 Please download and run the official Windows installer from: https://ollama.com/download/windows');
    return false;
  } else if (process.platform === 'linux') {
    console.log('Running official Linux install script: curl -fsSL https://ollama.com/install.sh | sh');
    try {
      execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'inherit' });
      console.log('✔ Ollama installed successfully.');
      return true;
    } catch (e) {
      console.error('Failed to install Ollama on Linux:', e.message);
      return false;
    }
  } else if (process.platform === 'darwin') {
    if (isCommandAvailable('brew')) {
      console.log('Running: brew install ollama...');
      execSync('brew install ollama', { stdio: 'inherit' });
      return true;
    }
    console.log('Please install Ollama from: https://ollama.com/download');
    return false;
  }
  return false;
}

function getOllamaBin() {
  if (isCommandAvailable('ollama')) return 'ollama';

  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
      path.join(process.env.ProgramFiles || '', 'Ollama', 'ollama.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Ollama', 'ollama.exe'),
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return `"${p}"`;
    }
  } else {
    const candidates = ['/usr/local/bin/ollama', '/usr/bin/ollama', '/opt/homebrew/bin/ollama'];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return 'ollama';
}

function startOllamaDaemon() {
  const ollamaBin = getOllamaBin();
  console.log(`\n🚀 Starting Ollama daemon in background (${ollamaBin})...`);
  try {
    const cleanBin = ollamaBin.replace(/^"|"$/g, '');
    const child = spawn(cleanBin, ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
    child.unref();
  } catch (e) {
    console.warn('Could not spawn ollama serve automatically:', e.message);
  }
}

async function waitForOllama(maxRetries = 15, delayMs = 1500) {
  process.stdout.write('Waiting for Ollama service to become responsive');
  for (let i = 0; i < maxRetries; i++) {
    const ok = await isOllamaReachable();
    if (ok) {
      console.log(' ✔ Connected!');
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.log(' ✖ Timeout.');
  return false;
}

function pullModel(modelName = DEFAULT_MODEL) {
  const ollamaBin = getOllamaBin();
  console.log(`\n📥 Pulling local model "${modelName}"... (This will download once)`);
  try {
    execSync(`${ollamaBin} pull ${modelName}`, { stdio: 'inherit' });
    console.log(`✔ Model "${modelName}" ready!`);
    return true;
  } catch (err) {
    console.error(`Failed to pull model "${modelName}":`, err.message);
    if (modelName !== 'qwen2.5:1.5b') {
      console.log('Attempting lightweight fallback: qwen2.5:1.5b...');
      return pullModel('qwen2.5:1.5b');
    }
    return false;
  }
}

async function testInference(modelName = DEFAULT_MODEL) {
  console.log(`\n🧪 Testing JSON intent inference with "${modelName}"...`);
  return new Promise((resolve) => {
    const parsed = new URL(`${OLLAMA_URL}/api/chat`);
    const payload = JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an intent parser. Return strictly a JSON object with keys: dialogue_act, primary_intent, delta_facts.',
        },
        {
          role: 'user',
          content: 'Por favor asegurate de usar SQLite y el puerto 3000',
        },
      ],
      format: 'json',
      stream: false,
    });

    const req = http.request(
      parsed,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const resp = JSON.parse(data);
            const content = resp.message?.content || resp.response;
            console.log('\x1b[32m✔ Local JSON Response Verified:\x1b[0m');
            console.log(content);
            resolve(true);
          } catch (e) {
            console.warn('Could not parse response JSON:', data);
            resolve(false);
          }
        });
      },
    );
    req.on('error', (err) => {
      console.error('Inference test error:', err.message);
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

function updateEnvFile(url = OLLAMA_URL, model = DEFAULT_MODEL) {
  const envPath = path.join(process.cwd(), '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  if (!content.includes('LOCAL_LLM_URL')) {
    content += `\nLOCAL_LLM_URL=${url}`;
  }
  if (!content.includes('LOCAL_LLM_MODEL')) {
    content += `\nLOCAL_LLM_MODEL=${model}`;
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
  console.log(`\n✔ Configured .env with LOCAL_LLM_URL=${url} and LOCAL_LLM_MODEL=${model}`);
}

async function main() {
  console.log('====================================================');
  console.log('   iNoU Automated Local SLM Setup (Qwen 2.5)       ');
  console.log('====================================================');

  let reachable = await isOllamaReachable();

  if (!reachable) {
    const ollamaBin = getOllamaBin();
    if (ollamaBin === 'ollama' && !isCommandAvailable('ollama')) {
      const installed = installOllama();
      if (!installed && !isCommandAvailable('ollama') && getOllamaBin() === 'ollama') {
        console.log('\n❌ Ollama is not installed yet. Please install it to enable local models.');
        process.exit(1);
      }
    }

    startOllamaDaemon();
    reachable = await waitForOllama();
  }

  if (!reachable) {
    console.error('\n❌ Could not connect to Ollama at', OLLAMA_URL);
    process.exit(1);
  }

  const modelPulled = pullModel(DEFAULT_MODEL);
  if (!modelPulled) {
    console.error('\n❌ Could not pull the model.');
    process.exit(1);
  }

  const tested = await testInference(DEFAULT_MODEL);
  if (tested) {
    updateEnvFile(OLLAMA_URL, DEFAULT_MODEL);
    console.log('\n🎉 Local SLM Setup Complete! iNoU will now interpret prompts locally with 0 cloud tokens.');
  }
}

main().catch((err) => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
