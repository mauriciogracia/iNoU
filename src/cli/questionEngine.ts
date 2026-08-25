import { getProjectPaths, loadState, saveState } from './context';
import { QuestionOptionType } from '../types/QuestionOptionType';
import { InteractiveQuestionSpec } from '../interfaces/InteractiveQuestionSpec';

export function askInteractiveQuestion(
  questionType: QuestionOptionType = 'SingleChoice',
  questionTitle: string,
  options: string[],
  targetNeedId?: string,
  rootDir: string = process.cwd()
): InteractiveQuestionSpec {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  if (!state.interactiveQuestions) state.interactiveQuestions = [];

  const questionId = `q_${Date.now()}`;
  const spec: InteractiveQuestionSpec = {
    questionId,
    targetNeedId,
    questionType,
    questionTitle,
    options,
    isAnswered: false,
    askedAt: new Date().toISOString(),
  };

  state.interactiveQuestions.push(spec);
  saveState(paths.statePath, state);

  console.log(
    `\x1b[36m✔ [iNoU Divide & Conquer Question Engine]\x1b[0m Refusing to guess vague prompt! Created ${questionType} question [${questionId}].`
  );
  return spec;
}

export function answerInteractiveQuestion(
  questionIdOrTitle: string,
  selectedOptions: string[],
  rootDir: string = process.cwd()
): { success: boolean; message: string; question?: InteractiveQuestionSpec } {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const questions = state.interactiveQuestions || [];

  const q = questions.find(
    (item) => item.questionId.toLowerCase() === questionIdOrTitle.toLowerCase() || item.questionTitle.toLowerCase().includes(questionIdOrTitle.toLowerCase())
  );

  if (!q) {
    return {
      success: false,
      message: `❌ Interactive question "${questionIdOrTitle}" not found.`,
    };
  }

  // Validate choice constraints
  if (q.questionType === 'SingleChoice' && selectedOptions.length > 1) {
    return {
      success: false,
      message: `❌ SingleChoice question allows selecting only 1 option. You provided ${selectedOptions.length}.`,
    };
  }

  // Validate option membership
  for (const sel of selectedOptions) {
    if (!q.options.some((opt) => opt.toLowerCase().includes(sel.toLowerCase()))) {
      return {
        success: false,
        message: `❌ Selected option "${sel}" is not a valid choice in question options [${q.options.join(', ')}].`,
      };
    }
  }

  q.selectedOptions = selectedOptions;
  q.isAnswered = true;
  q.answeredAt = new Date().toISOString();

  saveState(paths.statePath, state);

  return {
    success: true,
    message: `✔ Recorded selection [${selectedOptions.join(', ')}] for question "${q.questionTitle}". Intent ambiguity resolved!`,
    question: q,
  };
}
