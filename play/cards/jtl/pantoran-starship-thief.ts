import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-conversions.json.
export const pantoranStarshipThief = {
  cardId: 'pantoran-starship-thief',
  name: 'Pantoran Starship Thief',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Pilot'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'steal-ship',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 3,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'attach-self',
              filter: {
                anyTrait: ['Fighter', 'Transport'],
                withoutPilot: true,
              },
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'attached-host',
                  operation: {
                    kind: 'take-control',
                    player: 'self',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  upgrade: {
    attachTo: 'unit',
    attachFilter: {
      anyTrait: ['Fighter', 'Transport'],
      withoutPilot: true,
    },
    modifiers: {
      power: 0,
      hp: 0,
    },
    triggers: [
      {
        id: 'return-ship',
        timing: 'detached',
        effects: [
          {
            kind: 'on-unit',
            target: 'subject',
            operation: {
              kind: 'take-control',
              player: 'owner',
            },
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
