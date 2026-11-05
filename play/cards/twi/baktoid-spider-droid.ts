import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBaktoidSpiderDroid = {
  cardId: 'baktoid-spider-droid',
  name: 'Baktoid Spider Droid',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Droid', 'Walker'],
  cost: 8,
  power: 5,
  hp: 6,
  arena: 'ground',
  exploit: 2,
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
