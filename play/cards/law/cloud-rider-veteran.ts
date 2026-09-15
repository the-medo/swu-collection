import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const cloudRiderVeteran = {
  cardId: 'cloud-rider-veteran',
  name: 'Cloud-Rider Veteran',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Underworld'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'base-damage',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
