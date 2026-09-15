import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const qiRaMasterOfTerSKSi = {
  cardId: 'qi-ra--master-of-ter-s-k-si',
  name: "Qi'ra, Master of Teräs Käsi",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 7,
  power: 9,
  hp: 7,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'zone-size',
        zone: 'hand',
        player: 'self',
        multiplier: -1,
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card',
              target: 'discarded',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 3,
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
