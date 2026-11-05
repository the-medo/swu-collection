import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePunishingOneDengarSJumpmaster = {
  cardId: 'punishing-one--dengar-s-jumpmaster',
  name: "Punishing One, Dengar's Jumpmaster",
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'enemy-defeated',
      timing: 'enemy-defeated',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
      optional: true,
      limit: 'once-per-round',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          upgraded: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
