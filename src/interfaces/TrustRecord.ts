import { TrustLevel } from '../types/TrustLevel';

/**
 * Dynamic trust state tracking for any entity interacting with iNoU.
 */
export interface TrustRecord {
  /** Unique entity ID */
  entityId: string;

  /** Type of entity */
  entityType: 'User' | 'PeerNode' | 'MCPServer' | 'ExternalAI';

  /** Dynamic trust score (0 to 100) */
  trustScore: number;

  /** Dynamic trust classification level */
  trustLevel: TrustLevel;

  /** Number of recorded security / principle violations */
  violationsCount: number;

  /** True if entity has been blacklisted and disconnected */
  isBlacklisted: boolean;

  /** Explanation of last trust penalty */
  lastPenaltyReason?: string;

  /** ISO Timestamp of last evaluation */
  lastEvaluatedAt: string;
}
