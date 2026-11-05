import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteClone = {
  cardId: 'clone',
  name: 'Clone',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Clone'],
  cost: 7,
  power: 0,
  hp: 0,
  arena: 'ground',
  copyOnEntry: {
    filter: {
      nonLeader: true,
      withoutTrait: 'Vehicle',
    },
    traits: ['Clone'],
    unique: false,
  },
} as const satisfies UnitDefinition;
