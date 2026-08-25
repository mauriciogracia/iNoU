import { getProjectPaths, loadState, saveState } from './context';
import { ColmenaNode } from '../interfaces/ColmenaNode';
import { ColmenaSyncResult } from '../interfaces/ColmenaSyncResult';

import { detectManipulationAttempt } from './manipulationDefenseEngine';

export function runColmenaCommand(args: string[], rootDir: string = process.cwd()): void {

  const sub = args[0]?.toLowerCase() || 'list';
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  if (sub === 'list') {
    console.log('\x1b[36m%s\x1b[0m', '=== Inter-iNoU Federation: "Colmena" Hivemind Network ===\n');
    const nodes = state.colmenaNodes || [];

    if (nodes.length === 0) {
      console.log('No peer iNoU nodes connected. Connect to a peer using "colmena connect --name <NodeName> --url <NodeUrl>"');
      return;
    }

    console.log(`\x1b[1m${'NODE ID'.padEnd(20)} | ${'NODE NAME'.padEnd(22)} | ENDPOINT URL | STATUS\x1b[0m`);
    console.log(''.padEnd(80, '-'));

    nodes.forEach((n) => {
      const statusColor = n.status === 'Active' ? '\x1b[32mActive\x1b[0m' : '\x1b[33m' + n.status + '\x1b[0m';
      console.log(`${n.nodeId.padEnd(20)} | \x1b[1m${n.nodeName.padEnd(22)}\x1b[0m | ${n.endpointUrl.padEnd(25)} | ${statusColor}`);
    });
    return;
  }

  if (sub === 'connect' || sub === 'add') {
    let name = '';
    let url = '';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--name' && args[i + 1]) name = args[i + 1];
      if (args[i] === '--url' && args[i + 1]) url = args[i + 1];
    }

    if (!name && args[1] && !args[1].startsWith('-')) name = args[1];
    if (!url && args[2] && !args[2].startsWith('-')) url = args[2];

    if (!name || !url) {
      console.log('\x1b[33m%s\x1b[0m', 'Usage: colmena connect --name <NodeName> --url <NodeEndpointUrl>');
      return;
    }

    const colmenaNode: ColmenaNode = {
      nodeId: `node_${Date.now()}`,
      nodeName: name,
      endpointUrl: url,
      status: 'Active',
      connectedAt: new Date().toISOString(),
    };

    if (!state.colmenaNodes) state.colmenaNodes = [];
    state.colmenaNodes.push(colmenaNode);
    saveState(paths.statePath, state);

    console.log('\x1b[32m%s\x1b[0m', `✔ Connected Peer iNoU Node: "${colmenaNode.nodeName}" [ID: ${colmenaNode.nodeId}] (${colmenaNode.endpointUrl})`);
    return;
  }

  if (sub === 'sync') {
    const targetNodeId = args[1];
    const nodes = state.colmenaNodes || [];

    if (nodes.length === 0) {
      console.log('\x1b[33m%s\x1b[0m', 'No peer iNoU nodes connected. Connect one first using "colmena connect".');
      return;
    }

    const syncNodes = targetNodeId ? nodes.filter((n) => n.nodeId === targetNodeId || n.nodeName === targetNodeId) : nodes;

    if (syncNodes.length === 0) {
      console.log('\x1b[31m%s\x1b[0m', `Colmena peer node "${targetNodeId}" not found.`);
      return;
    }

    console.log('\x1b[36m%s\x1b[0m', '=== Synchronizing Federated Colmena Hivemind Network ===');

    for (const node of syncNodes) {
      const check = detectManipulationAttempt(node.endpointUrl || node.nodeName, 'PeerNode', rootDir);
      if (check.isManipulative) {
        console.log(`\x1b[31m❌ [Colmena Security Block]\x1b[0m Peer node "${node.nodeName}" rejected: ${check.explanation}`);
        node.status = 'Unreachable';
        continue;
      }

      node.lastSyncedAt = new Date().toISOString();

      const syncResult: ColmenaSyncResult = {
        nodeId: node.nodeId,
        syncedNeedsCount: state.needs.length,
        syncedOffersCount: state.offers.length,
        mergedSkillsCount: state.skills?.length || 0,
        message: `Peer node ${node.nodeName} synchronized successfully`,
        syncedAt: new Date().toISOString(),
      };

      console.log(
        `\x1b[32m✔ Federated Node [${node.nodeName}]:\x1b[0m Synced ${syncResult.syncedNeedsCount} Needs, ${syncResult.syncedOffersCount} Offers, ${syncResult.mergedSkillsCount} Skills/Rules`
      );
    }


    saveState(paths.statePath, state);
    console.log('\x1b[33m%s\x1b[0m', '★ Colmena Hivemind Federated Sync Complete!');
    return;
  }

  console.log('Unknown subcommand for colmena. Supported: "colmena list", "colmena connect --name <N> --url <U>", "colmena sync"');
}
