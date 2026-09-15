import type { UnitDefinition } from '../definition.ts';

export const snubFighterSquadron = {
  cardId: 'snub-fighter-squadron',
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  name: 'Snub Fighter Squadron',
  kind: 'unit',
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'space',
  aspects: ['Cunning', 'Villainy'],
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'space',
          optional: false,
        },
      ],
    },
  ],
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
