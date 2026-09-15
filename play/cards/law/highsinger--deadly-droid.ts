import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const highsingerDeadlyDroid = {
  cardId: 'highsinger--deadly-droid',
  name: 'Highsinger, Deadly Droid',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'command-experience',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            anyAspect: ['Command'],
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
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
    },
    {
      id: 'aggression-experience',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            anyAspect: ['Aggression'],
          },
          bind: 'chosen',
          optional: false,
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
    },
  ],
} as const satisfies UnitDefinition;
