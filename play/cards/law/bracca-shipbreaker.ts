import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const braccaShipbreaker = {
  cardId: 'bracca-shipbreaker',
  name: 'Bracca Shipbreaker',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Fringe'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 1,
          bind: 'first',
          group: 'milled',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
