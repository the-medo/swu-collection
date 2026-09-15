import type { LeaderDefinition } from '../definition.ts';

// Printed faces and official clarifications are pinned in leader-costs-damage.json.
export const vaneQuarrelsomePirate = {
  cardId: 'vane--quarrelsome-pirate',
  name: 'Vane, Quarrelsome Pirate',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'defeat-friendly-upgrade',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-target',
              bind: 'target',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'target',
                  amount: 2,
                },
              ],
              bases: 'any',
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack',
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                controller: 'friendly',
              },
              min: 0,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrade',
                  to: 'discard',
                  effects: [
                    {
                      kind: 'select-target',
                      bind: 'target',
                      optional: false,
                      effects: [
                        {
                          kind: 'damage-target',
                          target: 'target',
                          amount: 2,
                        },
                      ],
                      units: {
                        defending: true,
                      },
                      bases: 'any',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
