import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJynErsoStardust = {
  cardId: 'jyn-erso--stardust',
  name: 'Jyn Erso, Stardust',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-history-at-least',
        event: 'defeated',
        player: 'enemy',
        amount: 1,
      },
      power: 1,
      abilities: {
        keywords: ['Saboteur'],
      },
    },
  ],
} as const satisfies UnitDefinition;
