import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const theyHateThatShip = {
  cardId: 'they-hate-that-ship',
  name: 'They Hate That Ship',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Innate'],
  cost: 1,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'tie-fighter',
      count: 2,
      player: 'enemy',
      group: 'fighters',
      effects: [
        {
          kind: 'ready-units',
          filter: {
            inGroup: 'fighters',
          },
        },
      ],
    },
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
        trait: 'Vehicle',
      },
      discount: 3,
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
