import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const grimValor = {
  cardId: 'grim-valor',
  name: 'Grim Valor',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'parting-exhaust',
        timing: 'defeated',
        effects: [
          {
            kind: 'select-unit',
            filter: {},
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
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
} as const satisfies UpgradeDefinition;
