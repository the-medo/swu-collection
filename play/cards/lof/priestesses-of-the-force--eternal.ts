import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const priestessesOfTheForceEternal = {
  cardId: 'priestesses-of-the-force--eternal',
  name: 'Priestesses of the Force, Eternal',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 8,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-units',
              filter: {},
              min: 0,
              max: 5,
              bind: 'group',
              effects: [
                {
                  kind: 'each-unit',
                  filter: {
                    inGroup: 'group',
                  },
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'shield',
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
    },
  ],
} as const satisfies UnitDefinition;
