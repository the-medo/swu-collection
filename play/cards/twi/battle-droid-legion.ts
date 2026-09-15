import type { UnitDefinition } from '../definition.ts';

// Official text and Dooku's phase-duration erratum are pinned in leader-exploit.json.
export const battleDroidLegion = {
  cardId: 'battle-droid-legion',
  name: 'Battle Droid Legion',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 9,
  power: 6,
  hp: 5,
  arena: 'ground',
  exploit: 2,
  triggers: [
    {
      id: 'droid-reinforcements',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
