import type { UnitDefinition } from '../definition.ts';

// SEC 168. Printed text is pinned in meta-board fixture.
export const zitonMojBlackSunBully = {
  cardId: 'ziton-moj--black-sun-bully',
  name: 'Ziton Moj, Black Sun Bully',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-initiative-taken',
      timing: 'initiative-taken',
      effects: [
        {
          kind: 'damage-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
