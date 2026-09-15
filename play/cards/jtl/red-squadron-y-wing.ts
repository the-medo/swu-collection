import type { UnitDefinition } from '../definition.ts';

// JTL 149. Printed text is pinned in meta-force-indirect fixture.
export const redSquadronYWing = {
  cardId: 'red-squadron-y-wing',
  name: 'Red Squadron Y-Wing',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 3,
          recipient: 'defender',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
