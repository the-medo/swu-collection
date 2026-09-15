import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const juniorSenator = {
  cardId: 'junior-senator',
  name: 'Junior Senator',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', 'Official'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            maxCost: 3,
          },
          min: 0,
          max: 1,
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
