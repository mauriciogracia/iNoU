/**
 * Represents a clarification doubt or question asked by iNoU during detailing.
 */
export interface NeedDoubt {
  /** Unique identifier for the doubt */
  id: string;

  /** Target Need ID this doubt belongs to */
  needId: string;

  /** The question asked by iNoU to the user */
  question: string;

  /** The detailed answer provided by the user as Knowledge Provider */
  answer?: string;

  /** ISO Timestamp when the question was answered */
  answeredAt?: string;
}
