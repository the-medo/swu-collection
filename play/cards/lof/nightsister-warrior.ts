import type { UnitDefinition } from '../definition.ts';

// LOF . V8 rules; printed text pinned in meta combat fixture.
export const nightsisterWarrior = {
  cardId: 'nightsister-warrior',
  name: 'Nightsister Warrior',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Night'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
