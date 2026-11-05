import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGrandMoffTarkinDeathStarOverseer = {
  cardId: 'grand-moff-tarkin--death-star-overseer',
  name: 'Grand Moff Tarkin, Death Star Overseer',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Official'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          max: 2,
          filter: 'any',
          trait: 'Imperial',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
