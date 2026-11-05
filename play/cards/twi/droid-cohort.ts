import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDroidCohort = {
  cardId: 'droid-cohort',
  name: 'Droid Cohort',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Supply'],
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
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'create-unit',
            cardId: 'battle-droid',
            count: 1,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
