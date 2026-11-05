import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAdmiralOzzelOverconfident = {
  cardId: 'admiral-ozzel--overconfident',
  name: 'Admiral Ozzel, Overconfident',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
            trait: 'Imperial',
          },
          optional: false,
          ready: true,
          beforePlayed: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
              chooser: 'enemy',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
