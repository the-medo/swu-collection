import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMultiTroopTransport = {
  cardId: 'multi-troop-transport',
  name: 'Multi-Troop Transport',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Separatist', 'Vehicle', 'Tank'],
  cost: 7,
  power: 3,
  hp: 6,
  arena: 'ground',
  exploit: 2,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
