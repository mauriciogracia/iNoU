#!/usr/bin/env node
/**
 * scripts/test-google-models.js
 * Comprehensive and reusable test utility for Google AI / Gemini models.
 * 
 * Usage:
 *   node scripts/test-google-models.js [modelName]
 *   node scripts/test-google-models.js --all
 *   node scripts/test-google-models.js --list
 */

const { GoogleGenAI } = require('@google/genai');
const { loadEnvironment } = require('../dist/cli/environment');

const env = loadEnvironment(process.cwd());

if (!env.geminiApiKey) {
  console.error('\x1b[31m❌ Error: GEMINI_API_KEY is not configured in .env or .inuo-key.json\x1b[0m');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
const targetArg = process.argv[2];

const POPULAR_MODELS = [
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

async function testSingleModel(modelName) {
  process.stdout.write(`Testing model \x1b[36m${modelName}\x1b[0m ... `);
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Reply with "OK" in 1 word.',
    });
    const latency = Date.now() - start;
    const text = response.text ? response.text.trim().replace(/\n/g, ' ') : '(empty)';
    console.log(`\x1b[32m✔ ONLINE\x1b[0m (${latency}ms) -> "${text}"`);
    return { model: modelName, status: 'ONLINE', latency, text };
  } catch (err) {
    const latency = Date.now() - start;
    const code = err.status || err.statusCode || 'ERR';
    const firstLine = (err.message || String(err)).split('\n')[0];
    console.log(`\x1b[31m✖ FAILED [${code}]\x1b[0m -> ${firstLine.slice(0, 80)}`);
    return { model: modelName, status: 'FAILED', code, error: firstLine };
  }
}

async function listRemoteModels() {
  console.log('\nFetching all model endpoints from Google AI API for your API key...\n');
  try {
    const pager = await ai.models.list();
    const models = [];
    for await (const m of pager) {
      const name = m.name ? m.name.replace(/^models\//, '') : m.name;
      models.push(name);
    }
    return models;
  } catch (err) {
    console.error('Failed to list remote models:', err.message);
    return POPULAR_MODELS;
  }
}

async function main() {
  console.log('====================================================');
  console.log('         iNoU Google AI Model Test Suite            ');
  console.log('====================================================');
  console.log(`API Key Prefix: ${env.geminiApiKey.slice(0, 10)}... (Length: ${env.geminiApiKey.length})`);
  console.log(`Default in .env: ${env.defaultModel}\n`);

  if (targetArg && targetArg !== '--all' && targetArg !== '--list') {
    // Test specific model
    await testSingleModel(targetArg);
    return;
  }

  if (targetArg === '--list') {
    const remoteModels = await listRemoteModels();
    console.log(`Available models on your account (${remoteModels.length}):`);
    remoteModels.forEach(m => console.log(` - ${m}`));
    return;
  }

  // Multi-model test
  console.log('Testing primary model candidates:\n');
  const results = [];
  for (const m of POPULAR_MODELS) {
    const res = await testSingleModel(m);
    results.push(res);
  }

  const working = results.filter(r => r.status === 'ONLINE');
  console.log('\n----------------------------------------------------');
  console.log(`Summary: \x1b[32m${working.length} working models\x1b[0m / ${results.length} tested.`);

  if (working.length > 0) {
    console.log('\n\x1b[32m✔ Recommended models for your .env:\x1b[0m');
    working.forEach(w => {
      console.log(`  • GEMINI_MODEL=${w.model} (${w.latency}ms)`);
    });
  }
  console.log('====================================================\n');
}

main().catch(err => console.error('Fatal error:', err));
