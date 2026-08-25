/**
 * Represents a single operational capability or skill within iNoU.
 */
export interface Skill {
  /** Unique skill ID */
  id: string;

  /** Name of the skill (e.g., 'RecursiveDecomposition', 'MatchOffer', 'VerifySpec') */
  name: string;

  /** Detailed description of capability */
  description: string;

  /** Target category or verb mapping */
  verbCategory?: string;

  /** Timestamp created */
  createdAt: string;
}
