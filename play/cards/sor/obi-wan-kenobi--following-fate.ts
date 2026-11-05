import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteObiWanKenobiFollowingFate = {
  cardId: 'obi-wan-kenobi--following-fate',
  name: 'Obi-Wan Kenobi, Following Fate',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 6,
  unique: true,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 2,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'chosen',
                filter: {
                  trait: 'Force',
                },
              },
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
    },
  ],
} as const satisfies UnitDefinition;
