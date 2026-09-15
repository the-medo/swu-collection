import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const tantiveIvCarryingHope = {
  cardId: 'tantive-iv--carrying-hope',
  name: 'Tantive IV, Carrying Hope',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 8,
  arena: 'space',
  restore: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 4,
        },
      ],
      condition: {
        kind: 'friendly-unit-defeated',
      },
    },
  ],
} as const satisfies UnitDefinition;
