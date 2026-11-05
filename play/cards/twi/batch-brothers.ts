import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetBatchBrothers = {
  cardId: 'batch-brothers',
  name: 'Batch Brothers',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
