import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const lieutenantGornIDeserveWorse = {
  cardId: 'lieutenant-gorn--i-deserve-worse',
  name: 'Lieutenant Gorn, I Deserve Worse',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Imperial', 'Rebel'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'steal-credit',
      timing: 'attack',
      effects: [
        {
          kind: 'take-enemy-credit',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
