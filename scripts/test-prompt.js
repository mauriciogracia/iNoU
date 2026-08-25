#!/usr/bin/env node
/**
 * scripts/test-prompt.js
 * Tests the configured Gemini API key and model against the live Google GenAI API.
 */
const { GoogleGenAI } = require('@google/genai');
const { loadEnvironment } = require('../dist/cli/environment');

const env = loadEnvironment(process.cwd());

console.log('=== Gemini API Prompt Diagnostics ===');
console.log('API Key configured:', env.geminiApiKey ? `Yes (Prefix: ${env.geminiApiKey.slice(0, 8)}..., Length: ${env.geminiApiKey.length})` : 'NO (Missing)');
console.log('Default Model:', env.defaultModel);

if (!env.geminiApiKey) {
  console.error('\n❌ No GEMINI_API_KEY found in .env or .inuo-key.json');
  process.exit(1);
}

async function runDiagnostics() {
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const candidates = [
    env.defaultModel,
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
  ].filter(Boolean);

  for (const model of candidates) {
    console.log(`\nTesting model "${model}"...`);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: 'Reply with "iNoU AI Connection Verified!" in one line.',
      });
      console.log(`\x1b[32m✔ SUCCESS with model "${model}"!\x1b[0m AI Response:`);
      console.log(response.text?.trim());
      console.log(`\n💡 Recommended GEMINI_MODEL setting in .env: GEMINI_MODEL=${model}`);
      return;
    } catch (err) {
      console.log(`  ✖ Failed (${err.status || err.statusCode}): ${err.message?.split('\n')[0]}`);
    }
  }
}

runDiagnostics();
