import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const grapplingGuardian = {
  cardId: 'grappling-guardian',
  name: 'Grappling Guardian',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 7,
  power: 3,
  hp: 9,
  arena: 'space',
  triggers: [
    {
      id: 'defeat-space',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            arena: 'space',
            remainingHpAtMost: 6,
          },
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
