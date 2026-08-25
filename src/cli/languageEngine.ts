import { getI18n } from "../i18n";

export function detectLanguage(text: string): string {
  const lower = text.toLowerCase();

  // Spanish detection cues
  if (
    lower.includes("hola") ||
    lower.includes("buenos") ||
    lower.includes("buenas") ||
    lower.includes("necesito") ||
    lower.includes("como") ||
    lower.includes("cómo") ||
    lower.includes("quien") ||
    lower.includes("quién") ||
    lower.includes("gracias") ||
    lower.includes("favor") ||
    lower.includes("que ") ||
    lower.includes("qué ") ||
    lower.includes("cual") ||
    lower.includes("cuál") ||
    lower.includes("cuales") ||
    lower.includes("cuáles") ||
    lower.includes("donde") ||
    lower.includes("dónde") ||
    lower.includes("cuando") ||
    lower.includes("cuándo") ||
    lower.includes("por que") ||
    lower.includes("por qué") ||
    lower.includes("proposito") ||
    lower.includes("propósito") ||
    lower.includes("tiene") ||
    lower.includes("tienen") ||
    lower.includes("sirve") ||
    lower.includes("sirven") ||
    lower.includes("hace") ||
    lower.includes("hacen") ||
    lower.includes("permitas") ||
    lower.includes("permites") ||
    lower.includes("permitir") ||
    lower.includes("hacer") ||
    lower.includes("puedo") ||
    lower.includes("puedes") ||
    lower.includes("mostrar") ||
    lower.includes("listar") ||
    lower.includes("ayuda") ||
    lower.includes("quiero") ||
    lower.includes("tengo") ||
    lower.includes("para") ||
    lower.includes("por") ||
    lower.includes("explicame") ||
    lower.includes("explícame") ||
    lower.includes("dime")
  ) {
    return "es";
  }

  // English detection cues
  if (
    lower.includes("hello") ||
    lower.includes("good morning") ||
    lower.includes("who are you") ||
    lower.includes("what can you do") ||
    lower.includes("what is inuo") ||
    lower.includes("thank you") ||
    lower.includes("please") ||
    lower.includes("how are you")
  ) {
    return "en";
  }

  // French detection cues
  if (
    lower.includes("bonjour") ||
    lower.includes("salut") ||
    lower.includes("merci") ||
    lower.includes("s'il vous plait") ||
    lower.includes("qui es-tu") ||
    lower.includes("qui es tu") ||
    lower.includes("que puis-je") ||
    lower.includes("que peux-tu") ||
    lower.includes("que peux tu") ||
    lower.includes("que fait inuo") ||
    lower.includes("qu'est-ce que inuo")
  ) {
    return "fr";
  }

  // German detection cues
  if (
    lower.includes("hallo") ||
    lower.includes("guten tag") ||
    lower.includes("danke") ||
    lower.includes("wer bist du") ||
    lower.includes("was kannst du") ||
    lower.includes("was macht inuo") ||
    lower.includes("was ist inuo")
  ) {
    return "de";
  }

  // Portuguese detection cues
  if (
    lower.includes("olá") ||
    lower.includes("bom dia") ||
    lower.includes("obrigado") ||
    lower.includes("quem é você") ||
    lower.includes("quem e voce") ||
    lower.includes("o que você") ||
    lower.includes("o que voce") ||
    lower.includes("o que posso") ||
    lower.includes("o que faz o inuo") ||
    lower.includes("o que é o inuo")
  ) {
    return "pt";
  }

  return "es";
}

export function getLocalizedHostGreeting(
  langOrMode: string = "es",
  langOrUserName?: string,
  userName?: string,
): { greetingText: string; promptWhoAreYouText: string } {
  const mode =
    langOrMode && ["letMeServeYou", "promptMe"].includes(langOrMode)
      ? langOrMode
      : null;
  const lang = mode
    ? typeof langOrUserName === "string"
      ? langOrUserName
      : "es"
    : typeof langOrMode === "string"
      ? langOrMode
      : "es";
  const resolvedUserName = mode
    ? typeof userName === "string"
      ? userName
      : langOrUserName
    : typeof langOrUserName === "string"
      ? langOrUserName
      : undefined;

  const dict = getI18n(lang || "es");
  const nameStr =
    resolvedUserName && resolvedUserName !== "Default User"
      ? ` ${resolvedUserName}`
      : "";
  const greetingText = dict.hostGreeting.greeting.replace("{name}", nameStr);

  return {
    greetingText,
    promptWhoAreYouText: dict.shellBanner.greeting,
  };
}
