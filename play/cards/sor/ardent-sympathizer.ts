import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetArdentSympathizer = {
  cardId: 'ardent-sympathizer',
  name: 'Ardent Sympathizer',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'initiative',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
