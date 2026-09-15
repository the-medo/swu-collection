import type { UnitDefinition } from '../definition.ts';

// LAW 97. Printed text is pinned in the meta foundation fixture.
export const imperialDoorTechnician = {
  cardId: 'imperial-door-technician',
  name: 'Imperial Door Technician',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
