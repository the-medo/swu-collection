import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const muckrakerCrabDroid = {
  cardId: 'muckraker-crab-droid',
  name: 'Muckraker Crab Droid',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  protectFromAttackUnlessSentinel: [
    {
      sameAs: 'source',
      exhausted: false,
    },
  ],
} as const satisfies UnitDefinition;
