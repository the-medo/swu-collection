import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEnterprisingLackeys = {
  cardId: 'enterprising-lackeys',
  name: 'Enterprising Lackeys',
  kind: 'unit',
  aspects: ['Command', 'Command'],
  traits: ['Underworld'],
  cost: 4,
  power: 5,
  hp: 5,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 6,
      aspects: ['Command', 'Command'],
    },
  ],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 0,
          max: 1,
          operation: 'defeat',
          countAs: 'defeated',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'defeated',
                amount: 1,
              },
              effects: [
                {
                  kind: 'self-resource',
                  optional: false,
                  ready: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
