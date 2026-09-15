import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const heightenedAwareness = {
  cardId: 'heightened-awareness',
  name: 'Heightened Awareness',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'regroup-advantage',
        timing: 'regroup-start',
        effects: [
          {
            kind: 'on-unit',
            target: 'source',
            operation: {
              kind: 'give-token',
              token: 'advantage',
              count: 1,
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
