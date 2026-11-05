import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCloneCohort = {
  cardId: 'clone-cohort',
  name: 'Clone Cohort',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Supply'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    raid: 2,
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'create-unit',
            cardId: 'clone-trooper',
            count: 1,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
