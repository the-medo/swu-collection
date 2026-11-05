import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteStrategicAcumen = {
  cardId: 'strategic-acumen',
  name: 'Strategic Acumen',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
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
            },
            discount: 1,
            optional: false,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
