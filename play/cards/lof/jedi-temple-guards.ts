import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const jediTempleGuards = {
  cardId: 'jedi-temple-guards',
  name: 'Jedi Temple Guards',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Force', 'Jedi'],
  cost: 4,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  restore: 2,
} as const satisfies UnitDefinition;
