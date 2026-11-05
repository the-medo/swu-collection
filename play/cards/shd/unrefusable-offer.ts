import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnrefusableOffer = {
  cardId: 'unrefusable-offer',
  name: 'Unrefusable Offer',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Bounty', 'Condition'],
  cost: 2,
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
    bounties: [
      {
        id: 'bounty',
        effects: [
          {
            kind: 'play-card',
            from: 'captured',
            filter: {
              kind: 'unit',
            },
            optional: false,
            target: 'source',
            free: true,
            takeControl: true,
            ready: true,
            bind: 'played',
            effects: [
              {
                kind: 'schedule-regroup-operation',
                target: 'played',
                operation: 'defeat',
              },
            ],
            otherwise: [
              {
                kind: 'play-card',
                from: 'discard',
                filter: {
                  kind: 'unit',
                },
                optional: false,
                target: 'source',
                free: true,
                takeControl: true,
                ready: true,
                bind: 'played',
                effects: [
                  {
                    kind: 'schedule-regroup-operation',
                    target: 'played',
                    operation: 'defeat',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
