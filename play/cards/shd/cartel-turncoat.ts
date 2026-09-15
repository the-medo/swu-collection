import type { UnitDefinition } from '../definition.ts';

// Official text is pinned in leader-bounties.json.
export const cartelTurncoat = {
  cardId: 'cartel-turncoat',
  name: 'Cartel Turncoat',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 3,
  arena: 'space',
  bounties: [
    {
      id: 'reward',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
