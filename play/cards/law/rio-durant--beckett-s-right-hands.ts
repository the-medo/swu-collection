import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const rioDurantBeckettSRightHands = {
  cardId: 'rio-durant--beckett-s-right-hands',
  name: "Rio Durant, Beckett's Right Hands",
  kind: 'unit',
  aspects: ['Vigilance', 'Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            maxCost: 3,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
              ifYouDo: [
                {
                  kind: 'play-card',
                  player: 'owner',
                  from: 'hand',
                  target: 'chosen',
                  filter: {},
                  optional: true,
                  free: true,
                  phaseAbilities: {
                    keywords: ['Shielded'],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
