import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const inDebtToCrimsonDawn = {
  cardId: 'in-debt-to-crimson-dawn',
  name: 'In Debt to Crimson Dawn',
  kind: 'upgrade',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Condition'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'readiness-debt',
      timing: 'host-readied',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              controller: 'friendly',
            },
          },
          effects: [
            {
              kind: 'pay',
              player: 'self',
              optional: true,
              costs: [
                {
                  kind: 'resources',
                  amount: 2,
                },
              ],
              effects: [],
              otherwise: [
                {
                  kind: 'on-unit',
                  target: 'subject',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
          otherwise: [
            {
              kind: 'pay',
              player: 'enemy',
              optional: true,
              costs: [
                {
                  kind: 'resources',
                  amount: 2,
                },
              ],
              effects: [],
              otherwise: [
                {
                  kind: 'on-unit',
                  target: 'subject',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
