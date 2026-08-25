import { getProjectPaths, loadState } from './context';
import { askInteractiveQuestion, answerInteractiveQuestion } from './questionEngine';
import { QuestionOptionType } from '../types/QuestionOptionType';

export function runQuestionCommand(args: string[], rootDir: string = process.cwd()): void {
  const sub = args[0]?.toLowerCase() || 'list';

  if (sub === 'list') {
    console.log('\x1b[36m%s\x1b[0m', '=== iNoU Divide & Conquer Interactive Questions Registry ===\n');
    const paths = getProjectPaths(rootDir);
    const state = loadState(paths.statePath);
    const questions = state.interactiveQuestions || [];

    if (questions.length === 0) {
      console.log('No active interactive questions. Create one using "question ask --type <single|multi> --title <T> --options <O1,O2>"');
      return;
    }

    console.log(`\x1b[1m${'QUESTION ID'.padEnd(20)} | ${'TYPE'.padEnd(15)} | ${'TITLE'.padEnd(30)} | STATUS\x1b[0m`);
    console.log(''.padEnd(90, '-'));

    questions.forEach((q) => {
      const statusStr = q.isAnswered ? `\x1b[32mAnswered (${q.selectedOptions?.join(', ')})\x1b[0m` : '\x1b[33mPending\x1b[0m';
      console.log(`${q.questionId.padEnd(20)} | ${q.questionType.padEnd(15)} | \x1b[1m${q.questionTitle.padEnd(30)}\x1b[0m | ${statusStr}`);
    });
    return;
  }

  if (sub === 'ask' || sub === 'create') {
    let typeInput: QuestionOptionType = 'SingleChoice';
    let title = '';
    let optionsInput = '';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--type' && args[i + 1]) {
        typeInput = args[i + 1].toLowerCase().includes('multi') ? 'MultipleChoice' : 'SingleChoice';
      }
      if (args[i] === '--title' && args[i + 1]) title = args[i + 1];
      if (args[i] === '--options' && args[i + 1]) optionsInput = args[i + 1];
    }

    if (!title && args[1] && !args[1].startsWith('-')) title = args[1];

    if (!title || !optionsInput) {
      console.log('\x1b[33m%s\x1b[0m', 'Usage: question ask --title <Title> --options <Option1,Option2> [--type single|multi]');
      return;
    }

    const options = optionsInput.split(',').map((o) => o.trim());
    const q = askInteractiveQuestion(typeInput, title, options, undefined, rootDir);

    console.log(`\n\x1b[36m[Interactive Question Asked]:\x1b[0m \x1b[1m${q.questionTitle}\x1b[0m (${q.questionType})`);
    q.options.forEach((opt, idx) => {
      console.log(`  [${idx + 1}] ${opt}`);
    });
    return;
  }

  if (sub === 'answer' || sub === 'select') {
    let qId = '';
    let selectStr = '';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--select' && args[i + 1]) selectStr = args[i + 1];
    }

    if (!qId && args[1] && !args[1].startsWith('-')) qId = args[1];
    if (!selectStr && args[2] && !args[2].startsWith('-')) selectStr = args[2];

    if (!qId || !selectStr) {
      console.log('\x1b[33m%s\x1b[0m', 'Usage: question answer <QuestionId> --select <Option1,Option2>');
      return;
    }

    const selectedOptions = selectStr.split(',').map((s) => s.trim());
    const res = answerInteractiveQuestion(qId, selectedOptions, rootDir);

    console.log(res.success ? `\x1b[32m${res.message}\x1b[0m` : `\x1b[31m${res.message}\x1b[0m`);
    return;
  }

  console.log('Unknown subcommand for question. Supported: "question list", "question ask --title <T> --options <O1,O2>", "question answer <Id> --select <S1,S2>"');
}
