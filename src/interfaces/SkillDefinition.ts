/**
 * Definition of a learned skill or integration in iNoU.
 */
export interface SkillDefinition {
  id: string;
  name: string;
  category: 'api_integration' | 'workflow' | 'tool' | 'preference';
  description: string;
  atomicFormula: string; // e.g. "NEED = (Post) + (LinkedInStatus)"
  requiredEnvVars?: string[];
  samplePayload?: Record<string, any>;
  learnedAt: string;
  version: string;
}
