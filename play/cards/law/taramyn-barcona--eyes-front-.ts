import type { UnitDefinition } from '../definition.ts';

// Printed text is pinned in the meta-credits fixture.
export const taramynBarconaEyesFront = {
  cardId: 'taramyn-barcona--eyes-front-',
  name: 'Taramyn Barcona, Eyes Front!',
  aspects: ['Vigilance', 'Command'],
  traits: ['Rebel', 'Trooper'],
  kind: 'unit',
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'credit-played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-credit',
          controller: 'any',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                otherThan: 'source',
              },
              bind: 'ally',
              optional: false,
              allowMissing: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'ally',
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
    },
  ],
} as const satisfies UnitDefinition;
