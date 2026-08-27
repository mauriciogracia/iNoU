import fs from "fs";
import path from "path";
import { InouGlobalIdentity } from "../interfaces/InouGlobalIdentity";
import { getProjectPaths, loadState, saveState } from "./context";

interface WordDictionary {
  adjectives: string[];
  nouns: string[];
  questionPrompt: string;
  otherPlaceholder: string;
}

const LOCALIZED_DICTIONARIES: Record<string, WordDictionary> = {
  es: {
    adjectives: ["Veloz", "Cosmico", "Dorado", "Valiente", "Fugaz", "Sabio", "Astuto", "Feroz", "Estelar", "Invencible"],
    nouns: ["Halcon", "Lobo", "Jaguar", "Condor", "Aguila", "Puma", "Dragon", "Tigre", "Fenix", "Centella"],
    questionPrompt: "Elige tu identidad única en iNoU para participar en la red:",
    otherPlaceholder: "Escribe tu alias personalizado..."
  },
  en: {
    adjectives: ["Swift", "Cosmic", "Golden", "Brave", "Shadow", "Wise", "Clever", "Fierce", "Stellar", "Invincible"],
    nouns: ["Falcon", "Wolf", "Jaguar", "Eagle", "Hawk", "Panther", "Dragon", "Tiger", "Phoenix", "Spark"],
    questionPrompt: "Choose your unique iNoU identity to interact across the network:",
    otherPlaceholder: "Type your custom handle..."
  },
  pt: {
    adjectives: ["Rapido", "Cosmico", "Dourado", "Corajoso", "Sabio", "Astuto", "Feroz", "Estelar", "Luminoso"],
    nouns: ["Aguia", "Lobo", "Jaguar", "Gaviao", "Tigre", "Dragao", "Fenix", "Puma", "Trovao"],
    questionPrompt: "Escolha sua identidade única no iNoU para interagir na rede:",
    otherPlaceholder: "Digite seu alias personalizado..."
  },
  fr: {
    adjectives: ["Rapide", "Cosmique", "Dore", "Brave", "Sage", "Feroce", "Stellaire", "Audacieux"],
    nouns: ["Faucon", "Loup", "Jaguar", "Aigle", "Tigre", "Dragon", "Phenix", "Panthere"],
    questionPrompt: "Choisissez votre identité unique sur iNoU pour interagir sur le réseau :",
    otherPlaceholder: "Entrez votre pseudonyme personnalisé..."
  }
};

/**
 * Generates N unique localized gamer-tag candidates in the given language.
 */
export function generateLocalizedCandidates(lang: string = "es", count: number = 4): string[] {
  const dict = LOCALIZED_DICTIONARIES[lang.toLowerCase()] || LOCALIZED_DICTIONARIES.es;
  const results = new Set<string>();

  while (results.size < count) {
    const adj = dict.adjectives[Math.floor(Math.random() * dict.adjectives.length)];
    const noun = dict.nouns[Math.floor(Math.random() * dict.nouns.length)];
    const num = Math.floor(100 + Math.random() * 8900); // 3-4 digit number
    
    // In Spanish/Portuguese/French, noun comes first: e.g. HalconVeloz4821
    // In English, adjective comes first: e.g. SwiftFalcon4821
    const tag = lang === "en" ? `${adj}${noun}${num}` : `${noun}${adj}${num}`;
    results.add(tag);
  }

  return Array.from(results);
}

/**
 * Builds the standard Interactive Choice marker payload with 4 options + other write-in.
 */
export function buildIdentityChoicePayload(lang: string = "es"): {
  type: string;
  question: string;
  isMultiSelect: boolean;
  options: Array<{ index: number; id: string; label: string; recommended?: boolean }>;
  allowOther: boolean;
  otherIndex: number;
  otherPlaceholder: string;
} {
  const dict = LOCALIZED_DICTIONARIES[lang.toLowerCase()] || LOCALIZED_DICTIONARIES.es;
  const candidates = generateLocalizedCandidates(lang, 4);

  const options = candidates.map((tag, idx) => ({
    index: idx + 1,
    id: `id_opt_${idx + 1}`,
    label: tag,
    recommended: idx === 0
  }));

  return {
    type: "INTERACTIVE_CHOICE",
    question: dict.questionPrompt,
    isMultiSelect: false,
    options,
    allowOther: true,
    otherIndex: 5,
    otherPlaceholder: dict.otherPlaceholder
  };
}

/**
 * Emits the demarcated marker string for streaming / CLI execution.
 */
export function formatIdentityChoiceMarker(lang: string = "es"): string {
  const payload = buildIdentityChoicePayload(lang);
  return `<<<INOU_CHOICE:${JSON.stringify(payload)}>>>`;
}

/**
 * Persists chosen identity for active user.
 */
export function saveGlobalIdentity(
  rootDir: string,
  userId: string,
  handle: string,
  lang: string = "es",
  isCustom: boolean = false
): InouGlobalIdentity {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  const identity: InouGlobalIdentity = {
    userId,
    globalHandle: handle.trim(),
    language: lang,
    isCustom,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Update active user in state
  if (state.activeUser) {
    (state.activeUser as any).globalHandle = identity.globalHandle;
  }
  (state as any).globalIdentity = identity;

  saveState(paths.statePath, state);
  return identity;
}
