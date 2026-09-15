import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const tauntaunMount = {
  cardId: 'tauntaun-mount',
  name: 'Tauntaun Mount',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
