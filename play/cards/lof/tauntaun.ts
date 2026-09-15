import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const tauntaun = {
  cardId: 'tauntaun',
  name: 'Tauntaun',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            withoutTrait: 'Vehicle',
            damaged: true,
          },
          bind: 'chosen',
          optional: true,
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
} as const satisfies UnitDefinition;
