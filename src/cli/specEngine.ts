import fs from "fs";
import path from "path";
import { InouJobSpecInterface } from "../interfaces/InouJobSpecInterface";
import { getProjectPaths, loadState, saveState } from "./context";
import { Need } from "../interfaces/Need";

export interface SpecIntakeSession {
  type: "JOB_CREATE";
  currentStep: number;
  data: {
    role?: string;
    stack?: string[];
    modality?: string;
    budget?: string;
    milestones?: string[];
  };
  startedAt: string;
}

const INTAKE_STEPS = [
  {
    step: 1,
    question: "Paso 1/5: ¿Qué perfil o rol técnico necesitas contratar?",
    isMultiSelect: false,
    options: [
      { index: 1, id: "role_ts", label: "Senior TypeScript / Node.js Engineer", recommended: true },
      { index: 2, id: "role_react", label: "Fullstack React Developer" },
      { index: 3, id: "role_ai", label: "AI / LLM Systems Engineer" },
      { index: 4, id: "role_backend", label: "Backend Go / Python Engineer" }
    ],
    allowOther: true,
    otherPlaceholder: "Escribir otro rol..."
  },
  {
    step: 2,
    question: "Paso 2/5: ¿Qué tecnologías componen el stack obligatorio?",
    isMultiSelect: true,
    options: [
      { index: 1, id: "stack_ts", label: "TypeScript" },
      { index: 2, id: "stack_react", label: "React" },
      { index: 3, id: "stack_node", label: "Node.js" },
      { index: 4, id: "stack_pg", label: "PostgreSQL" },
      { index: 5, id: "stack_docker", label: "Docker" },
      { index: 6, id: "stack_python", label: "Python" }
    ],
    allowOther: true,
    otherPlaceholder: "Agregar otra tecnología..."
  },
  {
    step: 3,
    question: "Paso 3/5: ¿Cuál es la modalidad de trabajo requerida?",
    isMultiSelect: false,
    options: [
      { index: 1, id: "mod_remote", label: "100% Remoto", recommended: true },
      { index: 2, id: "mod_hybrid", label: "Híbrido" },
      { index: 3, id: "mod_onsite", label: "Presencial" }
    ],
    allowOther: true,
    otherPlaceholder: "Especificar otra modalidad..."
  },
  {
    step: 4,
    question: "Paso 4/5: ¿Cuál es la escala de compensación / presupuesto mensual?",
    isMultiSelect: false,
    options: [
      { index: 1, id: "bud_sr", label: "Senior ($4,000 - $6,000 USD/mes)", recommended: true },
      { index: 2, id: "bud_mid", label: "Mid-Level ($2,500 - $4,000 USD/mes)" },
      { index: 3, id: "bud_lead", label: "Lead / Architect ($6,000 - $8,500 USD/mes)" },
      { index: 4, id: "bud_jr", label: "Junior ($1,500 - $2,500 USD/mes)" }
    ],
    allowOther: true,
    otherPlaceholder: "Ingresar otro rango..."
  },
  {
    step: 5,
    question: "Paso 5/5: Selecciona los hitos y entregables clave del rol:",
    isMultiSelect: true,
    options: [
      { index: 1, id: "ms_arch", label: "Arquitectura & Modelo de Datos" },
      { index: 2, id: "ms_api", label: "API Core & Lógica de Negocio" },
      { index: 3, id: "ms_ui", label: "Frontend & Integración" },
      { index: 4, id: "ms_deploy", label: "Despliegue & Monitoreo CI/CD" }
    ],
    allowOther: true,
    otherPlaceholder: "Agregar otro hito..."
  }
];

/**
 * Executes a turn in the Spec-Engineering Finite State Machine.
 */
export function processSpecIntakeTurn(
  rootDir: string,
  session: SpecIntakeSession | null,
  userInput?: string
): {
  session: SpecIntakeSession | null;
  output: string;
  isComplete: boolean;
  jobSpec?: InouJobSpecInterface;
} {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  // Initialize new session if none active
  if (!session) {
    const newSession: SpecIntakeSession = {
      type: "JOB_CREATE",
      currentStep: 1,
      data: {},
      startedAt: new Date().toISOString()
    };
    const stepConfig = INTAKE_STEPS[0];
    const marker = `<<<INOU_CHOICE:${JSON.stringify({ ...stepConfig, otherIndex: stepConfig.options.length + 1 })}>>>`;
    return {
      session: newSession,
      output: `🚀 Iniciando Entrevista de Especificación Técnica (1 a 1)\n\n${stepConfig.question}\n${marker}`,
      isComplete: false
    };
  }

  // Process current step answer
  const answer = (userInput || "").trim();
  if (session.currentStep === 1) {
    session.data.role = answer || "Software Engineer";
  } else if (session.currentStep === 2) {
    session.data.stack = answer.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (session.currentStep === 3) {
    session.data.modality = answer || "100% Remoto";
  } else if (session.currentStep === 4) {
    session.data.budget = answer || "A convenir";
  } else if (session.currentStep === 5) {
    session.data.milestones = answer.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Advance step
  session.currentStep++;

  if (session.currentStep <= INTAKE_STEPS.length) {
    const stepConfig = INTAKE_STEPS[session.currentStep - 1];
    const marker = `<<<INOU_CHOICE:${JSON.stringify({ ...stepConfig, otherIndex: stepConfig.options.length + 1 })}>>>`;
    return {
      session,
      output: `${stepConfig.question}\n${marker}`,
      isComplete: false
    };
  }

  // All 5 steps complete -> Compile Specification & Register Canonical Need
  const specId = `job_spec_${Date.now()}`;
  const jobRole = session.data.role || "Software Engineer";
  const needId = `need_recruit_${Date.now()}`;

  const jobSpec: InouJobSpecInterface = {
    id: specId,
    role: jobRole,
    stack: session.data.stack || ["TypeScript"],
    modality: session.data.modality || "100% Remoto",
    seniority: session.data.budget?.includes("Senior") ? "Senior" : "Mid",
    budget: session.data.budget || "A convenir",
    milestones: session.data.milestones || ["Core Milestone 1"],
    needId,
    createdByHandle: (state as any).globalIdentity?.globalHandle || "local_user",
    createdAt: new Date().toISOString()
  };

  // Register Canonical Need in state: NEED = (Recruit) + (Role)
  const needEntity: Need = {
    id: needId,
    verb: "Recruit" as any,
    object: jobRole,
    complementVerb: "Apply",
    modelType: "Transactional",
    status: "Open",
    isAtomic: true,
    prerequisiteNeedIds: [],
    details: `Búsqueda activa de ${jobRole} (${jobSpec.modality}, ${jobSpec.budget}). Stack: ${jobSpec.stack.join(", ")}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.needs = state.needs || [];
  state.needs.push(needEntity);
  saveState(paths.statePath, state);

  // Formatted Markdown Spec Output
  const markdownReport = [
    `✨ **Especificación Técnica de Empleo Compilada** ✨`,
    `─────────────────────────────────────────────────────────────`,
    `📋 **Rol Requerido**: ${jobSpec.role}`,
    `🛠 **Stack Tecnológico**: ${jobSpec.stack.join(", ")}`,
    `📍 **Modalidad**: ${jobSpec.modality}`,
    `💰 **Compensación**: ${jobSpec.budget}`,
    `🎯 **Hitos Clave (AST Milestones)**:`,
    ...jobSpec.milestones.map((m, i) => `   ${i + 1}. ${m}`),
    `─────────────────────────────────────────────────────────────`,
    `✔ **Necesidad Canónica Registrada**: [${needId}] \`Recruit + ${jobRole}\``,
    `📡 **Radar Activado**: Transmitiendo al registro global de ConnectingNeeds.`
  ].join("\n");

  return {
    session: null,
    output: markdownReport,
    isComplete: true,
    jobSpec
  };
}
