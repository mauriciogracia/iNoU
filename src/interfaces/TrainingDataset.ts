import { Skill } from "./Skill";
import { Behavior } from "./Behavior";
import { Rule } from "./Rule";
import { LearnedCorrection } from "./LearnedCorrection";
import { CustomVerbPairing } from "../cli/context";
import { UserPreferenceProfile } from "./UserPreferenceProfile";

/**
 * Exportable and mergeable training dataset container for iNoU knowledge.
 */
export interface TrainingDataset {
  /** Dataset specification version */
  version: string;

  /** Timestamp when dataset was exported */
  exportedAt: string;

  /** Exported by user ID */
  exportedBy: string;

  /** List of learned corrections */
  learnedCorrections: LearnedCorrection[];

  /** List of custom skills */
  skills: Skill[];

  /** List of behaviors */
  behaviors: Behavior[];

  /** List of custom verb pairings */
  customVerbs: CustomVerbPairing[];

  /** Learned user format preference profiles */
  userPreferences?: UserPreferenceProfile[];
}
