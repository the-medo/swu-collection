import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const moffGideonIKnowEverything = {
  cardId: 'moff-gideon--i-know-everything',
  name: 'Moff Gideon, I Know Everything',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'phase-unit-tax',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'phase-play-cost',
          player: 'enemy',
          filter: { kind: 'unit' },
          increase: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
