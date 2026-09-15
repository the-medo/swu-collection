import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const theChancellorSShuttleGrimHarbinger = {
  cardId: 'the-chancellor-s-shuttle--grim-harbinger',
  name: "The Chancellor's Shuttle, Grim Harbinger",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  restore: 1,
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'controls-name',
        name: 'Chancellor Palpatine',
      },
    },
  ],
} as const satisfies UnitDefinition;
