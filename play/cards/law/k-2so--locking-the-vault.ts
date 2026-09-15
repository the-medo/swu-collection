import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const k2soLockingTheVault = {
  cardId: 'k-2so--locking-the-vault',
  name: 'K-2SO, Locking the Vault',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Heroism'],
  traits: ['Rebel', 'Droid'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
            damaged: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
