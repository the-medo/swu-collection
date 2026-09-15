import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const darthSionLordOfPain = {
  cardId: 'darth-sion--lord-of-pain',
  name: 'Darth Sion, Lord of Pain',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Sith'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: {
              kind: 'unit-history-count',
              player: 'enemy',
              event: 'defeated',
            },
          },
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'move-card',
          target: 'source',
          from: 'discard',
          to: 'hand',
        },
      ],
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'unit-stat',
          target: 'source',
          stat: 'power',
        },
        amount: 7,
      },
    },
  ],
} as const satisfies UnitDefinition;
