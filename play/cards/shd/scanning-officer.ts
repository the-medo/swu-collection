import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteScanningOfficer = {
  cardId: 'scanning-officer',
  name: 'Scanning Officer',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-resources',
          player: 'enemy',
          chooser: 'self',
          exhausted: 'any',
          min: 3,
          max: 3,
          operation: 'inspect',
          group: 'revealed',
          effects: [
            {
              kind: 'each-bound-card',
              group: 'revealed',
              bind: 'resource',
              effects: [
                {
                  kind: 'reveal-card',
                  target: 'resource',
                },
              ],
            },
            {
              kind: 'select-resources',
              player: 'enemy',
              chooser: 'self',
              exhausted: 'any',
              min: 3,
              max: 3,
              operation: 'defeat',
              onlyFromGroup: 'revealed',
              filter: {
                hasKeyword: 'Smuggle',
              },
              countAs: 'defeated',
              effects: [
                {
                  kind: 'repeat-effects',
                  count: {
                    kind: 'value',
                    name: 'defeated',
                  },
                  effects: [
                    {
                      kind: 'resource-top',
                      player: 'enemy',
                      optional: false,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
