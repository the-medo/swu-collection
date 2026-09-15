import type { UnitDefinition } from '../definition.ts';

// LOF 046. Printed text is pinned in the meta token fixture.
export const ezraBridgerAttunedWithLife = {
  cardId: 'ezra-bridger--attuned-with-life',
  name: 'Ezra Bridger, Attuned With Life',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel', 'Spectre'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            otherThan: 'source',
            anyTrait: ['Creature', 'Spectre'],
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
