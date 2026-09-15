import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const caretakerMatron = {
  cardId: 'caretaker-matron',
  name: 'Caretaker Matron',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Fringe'],
  cost: 2,
  power: 0,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'draw-if-force-played',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'played-card-this-phase',
            filter: {
              trait: 'Force',
            },
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
