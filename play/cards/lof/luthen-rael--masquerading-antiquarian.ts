import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const luthenRaelMasqueradingAntiquarian = {
  cardId: 'luthen-rael--masquerading-antiquarian',
  name: 'Luthen Rael, Masquerading Antiquarian',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Rebel'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'upgrade',
          max: 1,
          trait: 'Item',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
