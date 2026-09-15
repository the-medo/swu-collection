import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const stolenEtaShuttle = {
  cardId: 'stolen-eta-shuttle',
  name: 'Stolen Eta Shuttle',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Transport'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'space',
  keywords: ['Hidden'],
  constant: [
    {
      condition: {
        kind: 'initiative',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
