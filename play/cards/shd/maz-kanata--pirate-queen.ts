import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMazKanataPirateQueen = {
  cardId: 'maz-kanata--pirate-queen',
  name: 'Maz Kanata, Pirate Queen',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Underworld'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
      ],
      excludeSelf: true,
    },
  ],
} as const satisfies UnitDefinition;
