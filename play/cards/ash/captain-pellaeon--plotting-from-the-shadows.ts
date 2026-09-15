import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const captainPellaeonPlottingFromTheShadows = {
  cardId: 'captain-pellaeon--plotting-from-the-shadows',
  name: 'Captain Pellaeon, Plotting from the Shadows',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-history-at-least',
        event: 'defeated',
        player: 'any',
        leader: true,
        amount: 1,
      },
      abilities: {
        raid: 3,
      },
    },
  ],
} as const satisfies UnitDefinition;
