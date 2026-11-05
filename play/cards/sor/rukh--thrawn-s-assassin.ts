import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRukhThrawnSAssassin = {
  cardId: 'rukh--thrawn-s-assassin',
  name: "Rukh, Thrawn's Assassin",
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'attacking-unit-damage-dealt',
      timing: 'attacking-unit-damage-dealt',
      effects: [
        {
          kind: 'on-unit',
          target: 'damaged-unit',
          operation: {
            kind: 'defeat',
          },
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'damaged-unit',
        filter: {
          nonLeader: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
