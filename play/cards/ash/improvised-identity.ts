import type { UpgradeDefinition } from '../definition.ts';

// ASH 230. The search may fail; the subsequent optional attack still resolves.
export const improvisedIdentity = {
  cardId: 'improvised-identity',
  name: 'Improvised Identity',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 2,
  token: false,
  modifiers: { power: 0, hp: 3 },
  attachTo: 'unit',
  attachFilter: { arena: 'ground' },
  grants: {
    actions: [
      {
        id: 'improvise',
        costs: [],
        limit: 'once-per-round',
        effects: [
          {
            kind: 'search-deck',
            count: 3,
            filter: 'unit',
            arena: 'ground',
            max: 1,
            destination: 'discard',
            bind: 'discarded',
            afterEvenIfEmpty: true,
            after: [
              {
                kind: 'attack-bound',
                target: 'source',
                optional: true,
                gainsAbilitiesOf: 'discarded',
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
