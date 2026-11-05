import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSecondChance = {
  cardId: 'second-chance',
  name: 'Second Chance',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Gambit'],
  cost: 4,
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
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'if',
            condition: {
              kind: 'card-matches',
              target: 'source',
              filter: {
                owner: 'self',
              },
            },
            effects: [
              {
                kind: 'grant-discard-play',
                target: 'source',
                player: 'self',
                free: true,
              },
            ],
            otherwise: [
              {
                kind: 'grant-discard-play',
                target: 'source',
                player: 'enemy',
                free: true,
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
