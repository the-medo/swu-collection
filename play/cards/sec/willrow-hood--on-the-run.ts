import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const willrowHoodOnTheRun = {
  cardId: 'willrow-hood--on-the-run',
  name: 'Willrow Hood, On the Run',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  protectSingleFriendlyUpgrade: true,
} as const satisfies UnitDefinition;
