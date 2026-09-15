import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const bixCaleenSellingScrap = {
  cardId: 'bix-caleen--selling-scrap',
  name: 'Bix Caleen, Selling Scrap',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
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
              kind: 'create-credits',
              amount: 1,
            },
          ],
        },
      ],
    },
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
              kind: 'create-credits',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
