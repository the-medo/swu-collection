import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFivesInSearchOfTruth = {
  cardId: 'fives--in-search-of-truth',
  name: 'Fives, In Search of Truth',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'friendly-card-played',
      timing: 'friendly-card-played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {
            kind: 'unit',
            trait: 'Clone',
          },
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'discard',
              to: 'deck-bottom',
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
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          kind: 'event',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
