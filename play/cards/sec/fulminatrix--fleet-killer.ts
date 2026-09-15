import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const fulminatrixFleetKiller = {
  cardId: 'fulminatrix--fleet-killer',
  name: 'Fulminatrix, Fleet Killer',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 9,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'bombard-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 4,
          arena: 'ground',
          optional: true,
        },
      ],
    },
    {
      id: 'bombard-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-unit',
          amount: 4,
          arena: 'ground',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
