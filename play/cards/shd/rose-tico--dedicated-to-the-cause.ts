import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRoseTicoDedicatedToTheCause = {
  cardId: 'rose-tico--dedicated-to-the-cause',
  name: 'Rose Tico, Dedicated to the Cause',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Resistance'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 6,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            withUpgrade: 'shield',
          },
          optional: true,
          bind: 'host',
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'host',
                cardId: 'shield',
              },
              min: 1,
              max: 1,
              bind: 'shield',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'shield',
                  to: 'discard',
                  bindHost: 'host',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'host',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 2,
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
