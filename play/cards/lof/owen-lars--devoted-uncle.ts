import type { UnitDefinition } from '../definition.ts';

// LOF 057. Printed text is pinned in meta-force-indirect fixture.
export const owenLarsDevotedUncle = {
  cardId: 'owen-lars--devoted-uncle',
  name: 'Owen Lars, Devoted Uncle',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  unique: true,
  cost: 1,
  power: 0,
  hp: 3,
  arena: 'ground',
  restore: 2,
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'unit',
          trait: 'Force',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
