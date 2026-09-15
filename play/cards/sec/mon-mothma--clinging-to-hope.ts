import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-sequences.json.
export const monMothmaClingingToHope = {
  cardId: 'mon-mothma--clinging-to-hope',
  name: 'Mon Mothma, Clinging to Hope',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 8,
  arena: 'ground',
  restore: 3,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'attack-series',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          unitsOnly: true,
          evenIfExhausted: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
