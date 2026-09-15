import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const bankJobFugitives = {
  cardId: 'bank-job-fugitives',
  name: 'Bank Job Fugitives',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
