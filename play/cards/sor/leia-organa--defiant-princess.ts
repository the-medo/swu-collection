import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLeiaOrganaDefiantPrincess = {
  cardId: 'leia-organa--defiant-princess',
  name: 'Leia Organa, Defiant Princess',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resource',
              effects: [
                {
                  kind: 'select-resources',
                  player: 'self',
                  exhausted: 'any',
                  min: 1,
                  max: 1,
                  operation: 'ready',
                },
              ],
            },
            {
              id: 'exhaust',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'exhaust',
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
