import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const bladeThreeBaneOfTheDevastator = {
  cardId: 'blade-three--bane-of-the-devastator',
  name: 'Blade Three, Bane of the Devastator',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'base-advantage',
      timing: 'own-base-damaged',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'advantage',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
