/**
 * Canonical Job Specification Interface
 */
export interface InouJobSpecInterface {
  /** Unique Job Specification ID */
  id: string;
  /** Position / Role title (e.g. 'Senior TypeScript Engineer') */
  role: string;
  /** Required technology stack tags */
  stack: string[];
  /** Work modality ('100% Remoto' | 'Híbrido' | 'Presencial') */
  modality: string;
  /** Seniority level ('Junior' | 'Mid' | 'Senior' | 'Lead') */
  seniority: string;
  /** Compensation or monthly budget range */
  budget: string;
  /** Decomposed milestone deliverables */
  milestones: string[];
  /** Canonical associated Need ID */
  needId?: string;
  /** Creator's global handle */
  createdByHandle?: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

export type InouJobSpec = InouJobSpecInterface;
