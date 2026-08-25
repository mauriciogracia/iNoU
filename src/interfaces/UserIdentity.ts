import { UserRole } from '../types/UserRole';
import { TrustLevel } from '../types/TrustLevel';
import { AuthMethod } from '../types/AuthMethod';

/**
 * Represents an active user session/identity interacting with iNoU.
 */
export interface UserIdentity {
  /** Unique user identifier */
  userId: string;

  /** Display name of the user */
  userName: string;

  /** Role governing authority ('MasterTrainer' | 'RegularUser') */
  role: UserRole;

  /** Dynamic trust score (0 to 100) */
  trustScore?: number;

  /** Dynamic trust level */
  trustLevel?: TrustLevel;

  /** True if user is a pre-registered family member authorized during emergency incapacitation */
  isFamilyMember?: boolean;

  /** Authentication method used to sign in */
  lastAuthMethod?: AuthMethod;

  /** ISO Timestamp of last login/identity update */
  authenticatedAt: string;
}



