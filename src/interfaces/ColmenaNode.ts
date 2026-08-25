import { TrustLevel } from '../types/TrustLevel';

/**
 * Peer iNoU node registration in the federated "Colmena" Hivemind network.
 */
export interface ColmenaNode {
  /** Unique peer node ID */
  nodeId: string;

  /** Display name of the peer node (e.g., 'CityB_INUO_Node') */
  nodeName: string;

  /** API Endpoint URL of the peer node */
  endpointUrl: string;

  /** Connection status ('Active' | 'Unreachable' | 'Syncing' | 'Blacklisted' | 'Disconnected') */
  status: 'Active' | 'Unreachable' | 'Syncing' | 'Blacklisted' | 'Disconnected';

  /** Dynamic trust score (0 to 100) */
  trustScore?: number;

  /** Dynamic trust level */
  trustLevel?: TrustLevel;

  /** True if disconnected/blacklisted due to security breach */
  isBlacklisted?: boolean;

  /** ISO Timestamp when node was last synchronized */
  lastSyncedAt?: string;

  /** Timestamp connected */
  connectedAt: string;
}

