import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeneralTaggeConcernedCommander = {
  cardId: 'general-tagge--concerned-commander',
  name: 'General Tagge, Concerned Commander',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            trait: 'Trooper',
          },
          bind: 'chosen',
          min: 0,
          max: 3,
          effects: [
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'chosen',
              },
              bind: 'recipient',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'recipient',
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
    },
  ],
} as const satisfies UnitDefinition;
