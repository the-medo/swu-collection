import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const nabooSecurityForce = {
  cardId: 'naboo-security-force',
  name: 'Naboo Security Force',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Naboo', 'Trooper'],
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command'],
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      keywords: ['Sentinel'],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command'],
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      keywords: ['Sentinel'],
                    },
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
