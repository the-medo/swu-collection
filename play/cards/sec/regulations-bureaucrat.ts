import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const regulationsBureaucrat = {
  cardId: 'regulations-bureaucrat',
  name: 'Regulations Bureaucrat',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  power: 0,
  hp: 5,
  arena: 'ground',
  actions: [
    {
      id: 'exhaust-resource',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self',
              effects: [
                {
                  kind: 'select-resources',
                  chooser: 'self',
                  player: 'self',
                  exhausted: 'any',
                  min: 1,
                  max: 1,
                  operation: 'exhaust',
                },
              ],
            },
            {
              id: 'enemy',
              effects: [
                {
                  kind: 'select-resources',
                  chooser: 'self',
                  player: 'enemy',
                  exhausted: 'any',
                  min: 1,
                  max: 1,
                  operation: 'exhaust',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
