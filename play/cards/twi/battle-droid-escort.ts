import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetBattleDroidEscort = {
  cardId: 'battle-droid-escort',
  name: 'Battle Droid Escort',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 3,
  power: 1,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 1,
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
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
