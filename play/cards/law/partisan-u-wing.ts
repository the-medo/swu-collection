import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const partisanUWing = {
  cardId: 'partisan-u-wing',
  name: 'Partisan U-Wing',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
      condition: {
        kind: 'friendly-unit-defeated',
      },
    },
  ],
} as const satisfies UnitDefinition;
