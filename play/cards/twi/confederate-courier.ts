import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetConfederateCourier = {
  cardId: 'confederate-courier',
  name: 'Confederate Courier',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'space',
  triggers: [
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
