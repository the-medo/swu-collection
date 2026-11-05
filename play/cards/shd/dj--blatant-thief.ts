import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDjBlatantThief = {
  cardId: 'dj--blatant-thief',
  name: 'DJ, Blatant Thief',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 7,
      aspects: ['Cunning', 'Cunning'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'played-using-smuggle',
            amount: 1,
          },
          effects: [
            {
              kind: 'select-resources',
              player: 'enemy',
              chooser: 'self',
              exhausted: 'any',
              min: 1,
              max: 1,
              operation: 'inspect',
              group: 'stolen',
              effects: [
                {
                  kind: 'take-control-resources',
                  group: 'stolen',
                  returnWhen: 'source-leaves',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
