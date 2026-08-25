import { UserRole } from '../types/UserRole';

/**
 * Definition of an Engine in iNoU as a cohesive collection of Behaviors.
 */
export interface EngineConfig {
  /** Unique engine ID (e.g. 'engine_trust', 'engine_emergency') */
  engineId: string;

  /** Human-readable engine name */
  engineName: string;

  /** Detailed description of domain responsibility */
  description: string;

  /** Array of constituent Behavior IDs comprising this Engine */
  behaviorIds: string[];

  /** Role governing authorization ('MasterTrainer' | 'RegularUser') */
  createdBy: UserRole;

  /** True if engine is protected by Master Trainer governance */
  isImmutable?: boolean;

  /** ISO Timestamp of last update */
  updatedAt: string;
}
