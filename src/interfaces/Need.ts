import { ModelType } from '../types/ModelType';
import { NeedStatus } from '../types/NeedStatus';
import { KnownNeedVerb } from '../types/KnownNeedVerb';

/**
 * Formula: NEED = (VERB) + (OBJECT)
 * Fundamental interaction unit in the iNoU platform.
 */
export interface Need {
  /** Unique identifier for the Need */
  id: string;

  /** The action verb representing human intent (e.g., 'Request', 'Consult', 'Borrow') */
  verb: KnownNeedVerb;

  /** The interaction target/object (e.g., 'Food packet', 'Geotechnical survey') */
  object: string;

  /** Expected matching verb on the Offer side (e.g., 'Donate', 'Advise', 'Lend') */
  complementVerb: string;

  /** Architectural boundary: Transactional (Commercial) vs Gift-Based (Altruistic) */
  modelType: ModelType;

  /** Current state in the interaction engine */
  status: NeedStatus;

  /** Indicates if this need is atomic (singular, matchable transaction) or macro */
  isAtomic: boolean;

  /** Parent Macro-Need ID if this need was decomposed from a larger goal */
  parentNeedId?: string;

  /** IDs of prerequisite needs that must be resolved before this need can be unblocked */
  prerequisiteNeedIds: string[];

  /** Timestamp when the need was created */
  createdAt: string;

  /** Timestamp when the need was last updated */
  updatedAt: string;

  /** Hierarchical visual code (e.g. '1', '1.1', '1.1.2') */
  hierarchicalId?: string;

  /** Detailed specification text for this need */
  details?: string;

  /** Pending doubt / question strings posted by iNoU */
  doubts?: string[];

  /** Answered knowledge notes provided by the user as Knowledge Provider */
  knowledgeNotes?: string[];
}

