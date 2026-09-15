import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const heavyBlasterCannon = {
  cardId: 'heavy-blaster-cannon',
  name: 'Heavy Blaster Cannon',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Weapon'],
  cost: 4,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
