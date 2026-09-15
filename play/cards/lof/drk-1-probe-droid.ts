import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const drk1ProbeDroid = {
  cardId: 'drk-1-probe-droid',
  name: 'DRK-1 Probe Droid',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Droid'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'remove-upgrade',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-upgrade',
          optional: true,
          nonUnique: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
