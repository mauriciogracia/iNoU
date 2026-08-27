import fs from "fs";
import path from "path";
import { InuoManifest } from "../interfaces/InuoManifest";
import { Need } from "../interfaces/Need";
import { Offer } from "../interfaces/Offer";
import { Match } from "../interfaces/Match";
import { CLICommandContext } from "../interfaces/CLICommandContext";
import { NeedDoubt } from "../interfaces/NeedDoubt";
import { Skill } from "../interfaces/Skill";
import { Behavior } from "../interfaces/Behavior";
import { Rule } from "../interfaces/Rule";
import { Principle } from "../interfaces/Principle";
import { UserRole } from "../types/UserRole";
import { InouGlobalIdentity } from "../interfaces/InouGlobalIdentity";
import {
  persistStateToSqlite,
  rehydrateStateFromSqlite,
} from "./sqliteStorageEngine";

export function getProjectPaths(rootDir: string = process.cwd()) {
  const techSpec = path.join(rootDir, "tech-specs", "main-specs-goals.md");
  const docsSpec = path.join(rootDir, "docs", "main-specs-goals.md");
  const rootSpec = path.join(rootDir, "main-specs-goals.md");
  const fallbackSpec = path.join(rootDir, "INUO_SPEC.md");
  let specPath = fallbackSpec;
  if (fs.existsSync(techSpec)) specPath = techSpec;
  else if (fs.existsSync(docsSpec)) specPath = docsSpec;
  else if (fs.existsSync(rootSpec)) specPath = rootSpec;

  const customDataDir = process.env.INUO_DATA_DIR || process.env.DATA_DIR;
  let statePath = path.join(rootDir, ".inuo-state.json");
  if (customDataDir) {
    const resolvedDir = path.isAbsolute(customDataDir)
      ? customDataDir
      : path.resolve(rootDir, customDataDir);
    if (!fs.existsSync(resolvedDir)) {
      try {
        fs.mkdirSync(resolvedDir, { recursive: true });
      } catch {}
    }
    statePath = path.join(resolvedDir, ".inuo-state.json");
  }

  return {
    rootDir,
    manifestPath: path.join(rootDir, "inuo-manifest.json"),
    specPath,
    statePath,
  };
}

export function loadManifest(manifestPath: string): InuoManifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(raw) as InuoManifest;
  } catch {
    return null;
  }
}

export interface CustomVerbPairing {
  verb: string;
  complement: string;
}

import { UserIdentity } from "../interfaces/UserIdentity";
import { LearnedCorrection } from "../interfaces/LearnedCorrection";
import { MCPServerConfig } from "../interfaces/MCPServerConfig";
import { ColmenaNode } from "../interfaces/ColmenaNode";
import { TrustRecord } from "../interfaces/TrustRecord";
import { ClientDeviceConfig } from "../interfaces/ClientDeviceConfig";
import { EmergencyContext } from "../interfaces/EmergencyContext";
import { TrustedMemberConfig } from "../interfaces/TrustedMemberConfig";
import { EngineConfig } from "../interfaces/EngineConfig";
import { BiometricVaultEntry } from "../interfaces/BiometricVaultEntry";
import { TrustThresholdGate } from "../interfaces/TrustThresholdGate";
import { InteractiveQuestionSpec } from "../interfaces/InteractiveQuestionSpec";
import { MasterMindSyncProgress } from "../interfaces/MasterMindSyncProgress";
import { UserPreferenceProfile } from "../interfaces/UserPreferenceProfile";
import { LLMConfiguration } from "../interfaces/LLMConfiguration";
import { WorkflowNode } from "../interfaces/WorkflowNode";
import { SocialNetworkConfiguration } from "../interfaces/SocialNetworkConfiguration";
import { CostGovernanceConfig } from "../interfaces/CostGovernanceConfig";
import { CommandAlias } from "../interfaces/CommandAlias";

export interface StateData {
  needs: Need[];
  offers: Offer[];
  matches: Match[];
  customVerbs?: CustomVerbPairing[];
  doubts?: NeedDoubt[];
  currentRole?: UserRole;
  activeUser?: UserIdentity;
  learnedCorrections?: LearnedCorrection[];
  skills?: Skill[];
  behaviors?: Behavior[];
  rules?: Rule[];
  principles?: Principle[];
  mcpServers?: MCPServerConfig[];
  colmenaNodes?: ColmenaNode[];
  trustRecords?: TrustRecord[];
  masterMindId?: string;
  clientDevices?: ClientDeviceConfig[];
  emergencyContext?: EmergencyContext;
  trustedMembers?: TrustedMemberConfig[];
  engines?: EngineConfig[];
  localAuthVault?: BiometricVaultEntry[];
  thresholdGates?: TrustThresholdGate[];
  operatingMode?: any;
  interactiveQuestions?: InteractiveQuestionSpec[];
  progressiveSyncs?: MasterMindSyncProgress[];
  userPreferences?: UserPreferenceProfile[];
  llmConfigurations?: LLMConfiguration[];
  workflowNodes?: WorkflowNode[];
  socialNetworkConfigurations?: SocialNetworkConfiguration[];
  costGovernance?: CostGovernanceConfig;
  aliases?: CommandAlias[];
  projects?: any[];
  workspaces?: any[];
  chats?: any[];
  tasks?: any[];
  activeProject?: string;
  activeWorkspace?: string;
  activeChat?: string;
  preferences?: Record<string, any>;
  globalIdentity?: InouGlobalIdentity | null;
}

export const BASELINE_ENGINES: EngineConfig[] = [
  {
    engineId: "engine_trust",
    engineName: "Dynamic Trust & Anti-Manipulation Engine",
    description:
      "Collection of behaviors governing trust scoring, prompt injection defense, and sub-2ms circuit breaker disconnects.",
    behaviorIds: [
      "behavior_anti_manipulation",
      "behavior_circuit_breaker",
      "behavior_trusted_members",
    ],
    createdBy: "MasterTrainer",
    isImmutable: true,
    updatedAt: "2026-08-14T00:00:00.000Z",
  },
  {
    engineId: "engine_emergency",
    engineName: "Vehicle & Device Emergency Context Engine",
    description:
      "Collection of behaviors handling owner incapacitation, family fallback authorization, and stranger command defense.",
    behaviorIds: [
      "behavior_owner_incapacitation",
      "behavior_family_emergency",
      "behavior_stranger_defense",
    ],
    createdBy: "MasterTrainer",
    isImmutable: true,
    updatedAt: "2026-08-14T00:00:00.000Z",
  },
  {
    engineId: "engine_self_awareness",
    engineName: "Self-Awareness & Trust-Gated Reflection Engine",
    description:
      "Collection of behaviors governing platform self-reflection, versioning, and trust-gated spec disclosures.",
    behaviorIds: [
      "behavior_trust_gated_self_reflection",
      "behavior_spec_disclosure",
    ],
    createdBy: "MasterTrainer",
    isImmutable: true,
    updatedAt: "2026-08-14T00:00:00.000Z",
  },
  {
    engineId: "engine_social_broadcast",
    engineName: "Multi-Platform Social Broadcast Engine",
    description:
      "Collection of API integration behaviors orchestrating simultaneous posts across X/Twitter, LinkedIn, Facebook, and Telegram.",
    behaviorIds: [
      "behavior_post_twitter",
      "behavior_post_linkedin",
      "behavior_post_facebook",
      "behavior_post_telegram",
    ],
    createdBy: "MasterTrainer",
    isImmutable: true,
    updatedAt: "2026-08-14T00:00:00.000Z",
  },
];

export const BASELINE_PRINCIPLES: Principle[] = [
  {
    id: "principle_zero_tolerance",
    name: "Zero Tolerance Safety",
    statement:
      "Strict enforcement of zero-tolerance policies prohibiting illegal exploitation and harmful transactions.",
    createdBy: "MasterTrainer",
    isImmutable: true,
    status: "Locked",
    createdAt: new Date().toISOString(),
  },
  {
    id: "principle_canonical_formulation",
    name: "Canonical Formula Integrity",
    statement:
      "Every interaction unit MUST adhere to NEED = (VERB) + (OBJECT) and OFFER = (COMP_VERB) + (OBJECT).",
    createdBy: "MasterTrainer",
    isImmutable: true,
    status: "Locked",
    createdAt: new Date().toISOString(),
  },
];

export const BASELINE_SKILLS: Skill[] = [
  {
    id: "skill_decompose",
    name: "RecursiveDecomposition",
    description: "Decomposes macro needs into hierarchical atomic needs.",
    verbCategory: "Plan",
    createdAt: new Date().toISOString(),
  },
  {
    id: "skill_match",
    name: "IntentMatching",
    description: "Pairs complementary Needs and Offers based on catalog verbs.",
    verbCategory: "Match",
    createdAt: new Date().toISOString(),
  },
  {
    id: "skill_verify",
    name: "SpecVerification",
    description: "Verifies codebase alignment against INUO_SPEC.md.",
    verbCategory: "Verify",
    createdAt: new Date().toISOString(),
  },
];

export const BASELINE_BEHAVIORS: Behavior[] = [
  {
    id: "behavior_planner",
    name: "PlanningBehavior",
    description: "Autonomous planning and hierarchical detailing workflow.",
    skillIds: ["skill_decompose", "skill_verify"],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "behavior_fulfillment",
    name: "FulfillmentBehavior",
    description: "Intent parsing and matching workflow.",
    skillIds: ["skill_match"],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

function migrateLegacyOperatingMode(
  state: Partial<StateData>,
): Partial<StateData> {
  if (!state.operatingMode && !state.userPreferences) return state;

  const legacy = state.operatingMode as any;
  const activeUserId = state.activeUser?.userId ?? "user_local";
  const userPreferences = Array.isArray(state.userPreferences)
    ? [...state.userPreferences]
    : [];

  const profile = userPreferences.find((p) => p.userId === activeUserId) || {
    userId: activeUserId,
    signalCount: 0,
    updatedAt: new Date().toISOString(),
  };

  if (legacy?.isSuccinctMode === true && !profile.interactionStyle) {
    profile.interactionStyle = "succinct";
  }
  if (legacy?.currentMode === "letMeServeYou" && !profile.interactionStyle) {
    profile.interactionStyle = "conversational";
  }
  if (legacy?.currentMode === "promptMe" && !profile.interactionStyle) {
    profile.interactionStyle = "canonical";
  }

  if (profile.interactionStyle && !profile.styleSignals) {
    profile.styleSignals = [
      {
        detectedStyle: profile.interactionStyle,
        sourceText: "legacy operating mode migration",
        confidence: 1,
        capturedAt: new Date().toISOString(),
      },
    ];
  }

  if (!userPreferences.some((p) => p.userId === activeUserId)) {
    userPreferences.push(profile);
  }

  state.userPreferences = userPreferences;
  state.operatingMode = {
    currentMode: legacy?.currentMode || "promptMe",
    detectedLanguage:
      legacy?.detectedLanguage || state.preferences?.lang || "en",
    autoDetectLanguage: legacy?.autoDetectLanguage ?? true,
    isSuccinctMode:
      legacy?.isSuccinctMode ?? profile.interactionStyle === "succinct",
    debugLevel: legacy?.debugLevel ?? state.preferences?.debugLevel ?? 1,
    authRequiredOnStart: legacy?.authRequiredOnStart ?? false,
    updatedAt: legacy?.updatedAt || new Date().toISOString(),
  };
  return state;
}

export function loadState(statePath: string): StateData {
  const defaultUser: UserIdentity = {
    userId: "user_local",
    userName: "RegularUser",
    role: "RegularUser",
    authenticatedAt: new Date().toISOString(),
  };

  if (!fs.existsSync(statePath)) {
    const sqliteRehydrated = rehydrateStateFromSqlite(path.dirname(statePath));
    const migrated = migrateLegacyOperatingMode({
      ...({
        needs: sqliteRehydrated?.needs || [],
        offers: [],
        matches: [],
        customVerbs: [],
        doubts: [],
        currentRole: "RegularUser",
        activeUser: defaultUser,
        learnedCorrections: [],
        skills: [...BASELINE_SKILLS],
        behaviors: [...BASELINE_BEHAVIORS],
        rules: [],
        principles: [...BASELINE_PRINCIPLES],
        mcpServers: [],
        colmenaNodes: [],
        trustRecords: [],
        masterMindId: "master_mind_primary",
        clientDevices: [],
        emergencyContext: {
          status: "Normal",
          authorizedFamilyUserIds: [],
          activatedAt: new Date().toISOString(),
        },
        trustedMembers: [],
        engines: [...BASELINE_ENGINES],
        localAuthVault: [],
        thresholdGates: [],
        interactiveQuestions: [],
        progressiveSyncs: [],
        userPreferences: [],
        llmConfigurations: [],
        workflowNodes: sqliteRehydrated?.workflowNodes || [],
        socialNetworkConfigurations: [],
        costGovernance: undefined,
        aliases: [],
        projects: sqliteRehydrated?.projects || [],
        workspaces: sqliteRehydrated?.workspaces || [],
        chats: sqliteRehydrated?.chats || [],
        activeProject: undefined,
        activeWorkspace: undefined,
        activeChat: undefined,
        preferences: sqliteRehydrated?.preferences || {},
      } as StateData),
    });
    return migrated as StateData;
  }
  try {
    const raw = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw) as StateData;
    const migrated = migrateLegacyOperatingMode(parsed) as StateData;
    return {
      needs: migrated.needs || [],
      offers: migrated.offers || [],
      matches: migrated.matches || [],
      customVerbs: migrated.customVerbs || [],
      doubts: migrated.doubts || [],
      currentRole: migrated.currentRole || "RegularUser",
      activeUser: migrated.activeUser || defaultUser,
      learnedCorrections: migrated.learnedCorrections || [],
      skills:
        migrated.skills && migrated.skills.length > 0
          ? migrated.skills
          : [...BASELINE_SKILLS],
      behaviors:
        migrated.behaviors && migrated.behaviors.length > 0
          ? migrated.behaviors
          : [...BASELINE_BEHAVIORS],
      rules: migrated.rules || [],
      principles:
        migrated.principles && migrated.principles.length > 0
          ? migrated.principles
          : [...BASELINE_PRINCIPLES],
      mcpServers: migrated.mcpServers || [],
      colmenaNodes: migrated.colmenaNodes || [],
      trustRecords: migrated.trustRecords || [],
      masterMindId: migrated.masterMindId || "master_mind_primary",
      clientDevices: migrated.clientDevices || [],
      emergencyContext: migrated.emergencyContext || {
        status: "Normal",
        authorizedFamilyUserIds: [],
        activatedAt: new Date().toISOString(),
      },
      trustedMembers: migrated.trustedMembers || [],
      engines:
        migrated.engines && migrated.engines.length > 0
          ? migrated.engines
          : [...BASELINE_ENGINES],
      localAuthVault: migrated.localAuthVault || [],
      thresholdGates: migrated.thresholdGates || [],
      operatingMode: migrated.operatingMode,
      interactiveQuestions: migrated.interactiveQuestions || [],
      progressiveSyncs: migrated.progressiveSyncs || [],
      userPreferences: migrated.userPreferences || [],
      llmConfigurations: migrated.llmConfigurations || [],
      workflowNodes: migrated.workflowNodes || [],
      socialNetworkConfigurations: migrated.socialNetworkConfigurations || [],
      costGovernance: migrated.costGovernance,
      aliases: migrated.aliases || [],
      projects: migrated.projects || [],
      workspaces: migrated.workspaces || [],
      chats: migrated.chats || [],
      activeProject: migrated.activeProject,
      activeWorkspace: migrated.activeWorkspace,
      activeChat: migrated.activeChat,
      preferences: migrated.preferences || {},
      globalIdentity: (migrated as any).globalIdentity || null,
    };
  } catch {
    const sqliteRehydrated = rehydrateStateFromSqlite(path.dirname(statePath));
    const migrated = migrateLegacyOperatingMode({
      ...({
        needs: sqliteRehydrated?.needs || [],
        offers: [],
        matches: [],
        customVerbs: [],
        doubts: [],
        currentRole: "RegularUser",
        activeUser: defaultUser,
        learnedCorrections: [],
        skills: [...BASELINE_SKILLS],
        behaviors: [...BASELINE_BEHAVIORS],
        rules: [],
        principles: [...BASELINE_PRINCIPLES],
        mcpServers: [],
        colmenaNodes: [],
        trustRecords: [],
        masterMindId: "master_mind_primary",
        clientDevices: [],
        emergencyContext: {
          status: "Normal",
          authorizedFamilyUserIds: [],
          activatedAt: new Date().toISOString(),
        },
        trustedMembers: [],
        engines: [...BASELINE_ENGINES],
        localAuthVault: [],
        thresholdGates: [],
        interactiveQuestions: [],
        progressiveSyncs: [],
        userPreferences: [],
        llmConfigurations: [],
        workflowNodes: sqliteRehydrated?.workflowNodes || [],
        socialNetworkConfigurations: [],
        costGovernance: undefined,
        aliases: [],
        projects: sqliteRehydrated?.projects || [],
        workspaces: sqliteRehydrated?.workspaces || [],
        chats: sqliteRehydrated?.chats || [],
        activeProject: undefined,
        activeWorkspace: undefined,
        activeChat: undefined,
        preferences: sqliteRehydrated?.preferences || {},
        globalIdentity: undefined,
      } as StateData),
    });
    return migrated as StateData;
  }
}

export function saveState(statePath: string, data: StateData): void {
  // 1. Dual-Write: Export formatted JSON snapshot for Git inspection
  fs.writeFileSync(statePath, JSON.stringify(data, null, 2), "utf8");

  // 2. Write-Through: Persist into L2 SQLite WAL database (.inuo.db)
  persistStateToSqlite(data, path.dirname(statePath));
}

export function createContext(
  rootDir: string = process.cwd(),
): CLICommandContext {
  const paths = getProjectPaths(rootDir);
  const manifest = loadManifest(paths.manifestPath);
  const state = loadState(paths.statePath);

  return {
    manifestPath: paths.manifestPath,
    specPath: paths.specPath,
    manifest,
    needs: state.needs,
    offers: state.offers,
    matches: state.matches,
  };
}
