import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const garSaxonCovetingPower = {
  cardId: 'gar-saxon--coveting-power',
  name: 'Gar Saxon, Coveting Power',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Mandalorian', 'Trooper'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'upgrade-played-on-self',
      timing: 'upgrade-played-on-self',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'mandalorian',
          count: 1,
        },
      ],
      optional: true,
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
