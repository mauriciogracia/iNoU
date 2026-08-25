/**
 * Structured breakdown of iNoU's canonical versioning model (Deployed.SpecRevision.Implementation).
 */
export interface InuoVersionSpec {
  /** Percentage of deployed production functionality (0 to 100) */
  deployedPercentage: number;

  /** Specification revision / spec bumping index (0 to 99) */
  specRevisionIndex: number;

  /** Percentage of implemented and verified codebase features (0 to 100) */
  implementationPercentage: number;

  /** Formatted version string (e.g. '00.02.95') */
  fullVersionString: string;

  /** ISO Timestamp of version computation */
  calculatedAt: string;
}
