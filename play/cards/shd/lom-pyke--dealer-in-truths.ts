import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLomPykeDealerInTruths = {
  cardId: 'lom-pyke--dealer-in-truths',
  name: 'Lom Pyke, Dealer in Truths',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Underworld'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 6,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 5,
      aspects: ['Vigilance', 'Villainy'],
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
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
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
              ifYouDo: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'shield',
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
    },
  ],
} as const satisfies UnitDefinition;
