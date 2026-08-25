const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runMCPCommand } = require('../dist/cli/mcpCommand');
const { runColmenaCommand } = require('../dist/cli/colmenaCommand');
const { executeEcosystemAPIBridge } = require('../dist/cli/apiBridge');
const { loadState } = require('../dist/cli/context');

test('MCP Integration, REST/SOAP API Bridge & Colmena Federation Unit Tests', async (t) => {
  const scratchDir = path.join(__dirname, 'scratch_colmena_test');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const statePath = path.join(scratchDir, '.inuo-state.json');
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);

  await t.test('registers and lists an MCP server connection', () => {
    runMCPCommand(['add', '--name', 'FilesystemMCP', '--command', 'npx', '--args', '-y,@modelcontextprotocol/server-filesystem'], scratchDir);

    const state = loadState(statePath);
    assert.ok(state.mcpServers);
    const mcp = state.mcpServers.find((s) => s.name === 'FilesystemMCP');
    assert.ok(mcp);
    assert.strictEqual(mcp.status, 'Connected');
    assert.strictEqual(mcp.command, 'npx');
  });

  await t.test('connects and synchronizes peer iNoU nodes in Colmena hivemind network', () => {
    runColmenaCommand(['connect', '--name', 'CityB_Node', '--url', 'https://city-b.inuo.net/api'], scratchDir);

    let state = loadState(statePath);
    assert.ok(state.colmenaNodes);
    const node = state.colmenaNodes.find((n) => n.nodeName === 'CityB_Node');
    assert.ok(node);
    assert.strictEqual(node.status, 'Active');

    runColmenaCommand(['sync', 'CityB_Node'], scratchDir);

    state = loadState(statePath);
    const updatedNode = state.colmenaNodes.find((n) => n.nodeName === 'CityB_Node');
    assert.ok(updatedNode.lastSyncedAt);
  });

  await t.test('formats REST and SOAP API payloads via Ecosystem API Bridge', () => {
    const soapRes = executeEcosystemAPIBridge('SOAP', 'https://legacy-soap-service.com/ws', { verb: 'Consult', object: 'Geotechnical Survey' });
    assert.strictEqual(soapRes.success, true);
    assert.strictEqual(soapRes.protocol, 'SOAP');
    assert.ok(soapRes.payload.includes('<soap:Envelope'));

    const restRes = executeEcosystemAPIBridge('REST', 'https://api.external.org/v1/fulfill', { verb: 'Deliver', object: 'Medical Package' });
    assert.strictEqual(restRes.success, true);
    assert.strictEqual(restRes.protocol, 'REST');
    assert.strictEqual(restRes.payload.action, 'Deliver');
  });

  // Cleanup
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
});
