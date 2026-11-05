import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSanHillChairmanOfTheBankingClan = {
  cardId: 'san-hill--chairman-of-the-banking-clan',
  name: 'San Hill, Chairman of the Banking Clan',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 6,
  unique: true,
  power: 3,
  hp: 7,
  arena: 'ground',
  exploit: 3,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: {
            kind: 'unit-history-count',
            event: 'defeated',
            player: 'self',
          },
          max: {
            kind: 'unit-history-count',
            event: 'defeated',
            player: 'self',
          },
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
