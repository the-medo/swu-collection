import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const swoopBikeMarauder = {
  cardId: 'swoop-bike-marauder',
  name: 'Swoop Bike Marauder',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Underworld'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
