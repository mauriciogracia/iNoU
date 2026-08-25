#!/usr/bin/env node
/**
 * scripts/setup-llm.js
 * Interactive Zero-Exposure Setup Assistant for Google Gemini / AI Studio credentials.
 */
const readline = require('readline');
const { runSetupCommand, maskApiKey } = require('../dist/cli/setupCommand');
const { loadEnvironment } = require('../dist/cli/environment');

const keyArg = process.argv[2];

async function main() {
  console.log('====================================================');
  console.log('      iNoU Zero-Exposure AI Setup Assistant        ');
  console.log('====================================================');

  if (keyArg) {
    console.log(`Configuring with provided API key: ${maskApiKey(keyArg)}...\n`);
    await runSetupCommand(['llm', keyArg], process.cwd());
    return;
  }

  const env = loadEnvironment(process.cwd());
  if (env.geminiApiKey) {
    console.log(`Current active key: ${maskApiKey(env.geminiApiKey)}`);
    console.log('Re-verifying and probing live models...\n');
    await runSetupCommand(['llm', env.geminiApiKey], process.cwd());
    return;
  }

  // Interactive prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Please paste your Google AI Studio API Key: ', async (key) => {
    rl.close();
    if (!key || key.trim().length === 0) {
      console.log('\n❌ No key entered. Setup cancelled.');
      process.exit(1);
    }
    console.log(`\nVerifying key: ${maskApiKey(key)}...\n`);
    await runSetupCommand(['llm', key.trim()], process.cwd());
  });
}

main().catch(err => {
  console.error('Fatal error during setup:', err.message);
  process.exit(1);
});
