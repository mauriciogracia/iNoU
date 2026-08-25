/**
 * A Behavior is a grouped collection of Skills defining an operational workflow persona in iNoU.
 */
export interface Behavior {
  /** Unique behavior ID */
  id: string;

  /** Behavior name (e.g., 'PlanningBehavior', 'FulfillmentBehavior') */
  name: string;

  /** Description of operational behavior */
  description: string;

  /** Array of skill IDs forming this behavior */
  skillIds: string[];

  /** Indicates if behavior is currently active in the engine */
  isActive: boolean;

  /** Timestamp created */
  createdAt: string;
}
