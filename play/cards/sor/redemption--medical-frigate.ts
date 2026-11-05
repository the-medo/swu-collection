import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRedemptionMedicalFrigate = {
  cardId: 'redemption--medical-frigate',
  name: 'Redemption, Medical Frigate',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 8,
  unique: true,
  power: 6,
  hp: 9,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'distribute',
          benefit: 'heal',
          bases: true,
          amount: 8,
          filter: {},
          bind: 'healed',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'value',
                  name: 'healed',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
