import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const theBladeWingTheSecretOfShantipole = {
  cardId: 'the-blade-wing--the-secret-of-shantipole',
  name: 'The Blade Wing, The Secret of Shantipole',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 6,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'return-unit',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
