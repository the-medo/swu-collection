import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const admiralMottiChainOfCommand = {
  cardId: 'admiral-motti--chain-of-command',
  name: 'Admiral Motti, Chain of Command',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  auras: [
    {
      id: 'leader-command',
      filter: {
        controller: 'friendly',
        leader: true,
      },
      power: 2,
      hp: 2,
    },
  ],
} as const satisfies UnitDefinition;
