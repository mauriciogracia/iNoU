import { TrustLevel } from '../types/TrustLevel';

/**
 * Report generated when iNoU reflects on its own identity, version, principles, and capabilities.
 */
export interface SelfAwarenessReport {
  /** Caller entity ID */
  callerEntityId: string;

  /** Dynamic trust level of caller governing self-disclosure depth */
  callerTrustLevel: TrustLevel;

  /** Dynamic trust score of caller */
  callerTrustScore: number;

  /** System version specification */
  specVersion: string;

  /** List of disclosed capabilities */
  disclosedCapabilities: string[];

  /** Disclosed principles (full for HighTrust, redacted for lower levels) */
  disclosedPrinciples?: string[];

  /** Disclosed fleet devices */
  disclosedDevices?: string[];

  /** Summary of withheld/redacted information */
  redactedInformation?: string[];

  /** Generated natural language self-description response */
  generatedResponseText: string;

  /** ISO Timestamp of check */
  timestamp: string;
}
