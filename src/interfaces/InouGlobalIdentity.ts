/**
 * Canonical Global Unique Identity Contract for iNoU Users
 */
export interface InouGlobalIdentityInterface {
  /** Unique internal user identifier */
  userId: string;
  /** Globally unique public handle (e.g. 'HalconVeloz4821', 'SwiftFalcon4821') */
  globalHandle: string;
  /** Native language detected/used during generation ('es', 'en', 'pt', 'fr') */
  language: string;
  /** True if the user manually typed a custom handle */
  isCustom: boolean;
  /** ISO timestamp when the identity was created */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

export type InouGlobalIdentity = InouGlobalIdentityInterface;

