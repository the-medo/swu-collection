import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHeroicResolve = {
  cardId: 'heroic-resolve',
  name: 'Heroic Resolve',
  kind: 'upgrade',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Innate'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    actions: [
      {
        id: 'action',
        costs: [
          {
            kind: 'resources',
            amount: 2,
          },
          {
            kind: 'defeat-upgrade',
            filter: {
              attachedTo: 'source',
              cardId: 'heroic-resolve',
            },
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'attack-bound',
            target: 'source',
            optional: false,
            powerBonus: 4,
            abilities: {
              keywords: ['Overwhelm'],
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
