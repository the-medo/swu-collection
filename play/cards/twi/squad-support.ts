import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSquadSupport = {
  cardId: 'squad-support',
  name: 'Squad Support',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    nonLeader: true,
  },
  grants: {
    constant: [
      {
        condition: {
          kind: 'always',
        },
        power: {
          kind: 'unit-count',
          filter: {
            controller: 'friendly',
            trait: 'Trooper',
          },
        },
        hp: {
          kind: 'unit-count',
          filter: {
            controller: 'friendly',
            trait: 'Trooper',
          },
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
