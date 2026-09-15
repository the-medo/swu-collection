import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const rodianBondsman = {
  cardId: 'rodian-bondsman',
  name: 'Rodian Bondsman',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Bounty Hunter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
        {
          kind: 'create-credits',
          amount: 1,
          player: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
