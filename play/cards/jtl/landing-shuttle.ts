import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const landingShuttle = {
  cardId: 'landing-shuttle',
  name: 'Landing Shuttle',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'draw-on-departure',
      timing: 'defeated',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
