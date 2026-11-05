import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBrightHopeTheLastTransport = {
  cardId: 'bright-hope--the-last-transport',
  name: 'Bright Hope, The Last Transport',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            nonLeader: true,
            arena: 'ground',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
              ifYouDo: [
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
