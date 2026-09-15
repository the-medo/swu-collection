import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const avengerHuntingTheRebels = {
  cardId: 'avenger--hunting-the-rebels',
  name: 'Avenger, Hunting the Rebels',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 8,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          filter: {
            otherThan: 'source',
          },
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
