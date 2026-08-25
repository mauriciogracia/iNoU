import { getProjectPaths, loadState, saveState, CustomVerbPairing } from './context';

export const BUILTIN_CATALOG: { verb: string; complement: string; example: string }[] = [
  { verb: 'Request', complement: 'Donate', example: 'Need: Food packet | Offer: Packaged meals' },
  { verb: 'Buy', complement: 'Sell', example: 'Need: Bicycle | Offer: Used mountain bike' },
  { verb: 'Seek', complement: 'Offer', example: 'Need: Career mentor | Offer: Industry professional' },
  { verb: 'Need', complement: 'Fulfill', example: 'Need: Emergency shelter | Offer: Temporary housing' },
  { verb: 'Borrow', complement: 'Lend', example: 'Need: Construction tools | Offer: Equipment loan' },
  { verb: 'Consult', complement: 'Advise', example: 'Need: Legal inquiry | Offer: Legal counsel' },
  { verb: 'Search', complement: 'Supply', example: 'Need: Rare blood type | Offer: Blood bank inventory' },
  { verb: 'Call', complement: 'Respond', example: 'Need: Crisis help | Offer: Emergency support' },
  { verb: 'Volunteer', complement: 'Coordinate', example: 'Need: Event staff | Offer: Volunteer coordination' },
  { verb: 'Report', complement: 'Action', example: 'Need: Road hazard | Offer: Maintenance crew' },
  { verb: 'Ride', complement: 'Drive', example: 'Need: Commute to work | Offer: Shared ride' },
  { verb: 'Talk', complement: 'Listen', example: 'Need: Someone to talk to | Offer: Active listener' },
  { verb: 'Transport', complement: 'Carry', example: 'Need: Goods relocation | Offer: Trucking service' },
  { verb: 'Deliver', complement: 'Fetch', example: 'Need: Package delivery | Offer: Courier service' },
  { verb: 'Employ', complement: 'Teach', example: 'Need: School requires staff | Offer: Teacher availability' },
  { verb: 'Contract', complement: 'Nurse', example: 'Need: Patient requires home visit | Offer: Nursing care' },
  { verb: 'Recruit', complement: 'Apply', example: 'Need: Organization needs help | Offer: Employment seeker' },
  { verb: 'Offer', complement: 'Accept', example: 'Need: Employer offers position | Offer: Candidate accepts' },
  { verb: 'Interview', complement: 'Attend', example: 'Need: Company requests interview | Offer: Candidate attends' },
];

export function getComplementForVerb(verb: string, rootDir: string = process.cwd()): string {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  if (state.customVerbs) {
    const custom = state.customVerbs.find((c) => c.verb.toLowerCase() === verb.toLowerCase());
    if (custom) return custom.complement;
  }

  const builtin = BUILTIN_CATALOG.find((b) => b.verb.toLowerCase() === verb.toLowerCase());
  if (builtin) return builtin.complement;

  return 'Respond';
}

export function addCustomVerbPairing(verb: string, complement: string, rootDir: string = process.cwd()): CustomVerbPairing {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  if (!state.customVerbs) state.customVerbs = [];

  const existingIdx = state.customVerbs.findIndex((c) => c.verb.toLowerCase() === verb.toLowerCase());
  const pairing: CustomVerbPairing = { verb, complement };

  if (existingIdx >= 0) {
    state.customVerbs[existingIdx] = pairing;
  } else {
    state.customVerbs.push(pairing);
  }

  saveState(paths.statePath, state);
  return pairing;
}

export function runCatalog(args: string[] = [], rootDir: string = process.cwd()): void {
  const sub = args[0]?.toLowerCase();
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  if (sub === 'add') {
    let verb = '';
    let complement = '';

    for (let i = 1; i < args.length; i++) {
      if ((args[i] === '--verb' || args[i] === '-v') && args[i + 1]) verb = args[i + 1];
      if ((args[i] === '--complement' || args[i] === '-c') && args[i + 1]) complement = args[i + 1];
    }

    if (!verb && args[1] && !args[1].startsWith('-')) verb = args[1];
    if (!complement && args[2] && !args[2].startsWith('-')) complement = args[2];

    if (!verb || !complement) {
      console.log('\x1b[33m%s\x1b[0m', 'Usage: catalog add --verb <Verb> --complement <ComplementVerb>');
      return;
    }

    const added = addCustomVerbPairing(verb, complement, rootDir);
    console.log('\x1b[32m%s\x1b[0m', `✔ Added Dynamic Verb to Catalog: NEED (${added.verb}) <---> OFFER (${added.complement})`);
    return;
  }

  const customList = state.customVerbs || [];
  const isSuccinct = state.operatingMode ? state.operatingMode.isSuccinctMode !== false : true;
  const isEs = state.operatingMode?.detectedLanguage === 'es';

  if (isSuccinct) {
    console.log(isEs ? '\x1b[36m=== Catálogo iNoU de Verbos (Modo Sucinto) ===\x1b[0m\n' : '\x1b[36m=== iNoU Global Catalog (Succinct Mode) ===\x1b[0m\n');
    for (const item of BUILTIN_CATALOG) {
      console.log(`- \x1b[1m${item.verb}\x1b[0m ➔ \x1b[32m${item.complement}\x1b[0m (${item.example})`);
    }
    for (const item of customList) {
      console.log(`- \x1b[33m${item.verb}\x1b[0m ➔ \x1b[32m${item.complement}\x1b[0m (Custom)`);
    }
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '=== iNoU Global Catalog: Canonical & Dynamic Verbs ===\n');
  console.log(`\x1b[1m${'NEED VERB'.padEnd(12)} | ${'COMPLEMENT'.padEnd(14)} | TYPE & EXAMPLE\x1b[0m`);
  console.log(''.padEnd(70, '-'));

  for (const item of BUILTIN_CATALOG) {
    console.log(`${item.verb.padEnd(12)} | ${item.complement.padEnd(14)} | [Built-in] ${item.example}`);
  }

  for (const item of customList) {
    console.log(`\x1b[32m${item.verb.padEnd(12)}\x1b[0m | \x1b[32m${item.complement.padEnd(14)}\x1b[0m | [Dynamic Custom] Added via user/AI specification`);
  }
}
