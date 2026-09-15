import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const beilertValanceTargetVader = {
  cardId: 'beilert-valance--target--vader',
  name: 'Beilert Valance, Target: Vader',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'phase-count',
                  event: 'cards-drawn',
                  player: 'self',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
