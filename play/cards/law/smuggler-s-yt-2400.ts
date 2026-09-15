import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const smugglerSYt2400 = {
  cardId: 'smuggler-s-yt-2400',
  name: "Smuggler's YT-2400",
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'paid-boost',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: 1,
                hp: 1,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
