import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const c3PoOhDearOhDear = {
  cardId: 'c-3po--oh-dear--oh-dear',
  name: 'C-3PO, Oh Dear, Oh Dear',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Droid'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Cunning'],
            },
            amount: 1,
          },
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
