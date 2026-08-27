/**
 * Structured breakdown of iNoU's canonical versioning model (Major.MinorMilestone.BuildIteration).
 */
export interface InuoVersionSpec {
  /** Major platform generation (e.g. 0 for Pre-cloud Alpha/Beta, 1 for Public Cloud Launch) */
  majorVersion: number;

  /** Minor milestone feature tier (e.g. 1=Core CLI, 2=SLM, 3=Multi-Chat, 4=Docker Hub & Multi-Engine) */
  minorMilestone: number;

  /** Continuous build & iteration counter */
  buildIteration: number;

  /** Formatted version string (e.g. '0.4.76') */
  fullVersionString: string;

  /** ISO Timestamp of version computation */
  calculatedAt: string;

  /** Backwards compatibility fields */
  deployedPercentage?: number;
  specRevisionIndex?: number;
  implementationPercentage?: number;
}

