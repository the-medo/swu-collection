import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const furtiveHandmaiden = {
  cardId: 'furtive-handmaiden',
  name: 'Furtive Handmaiden',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'discard-hand',
              count: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
