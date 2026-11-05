import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAdmiralPiettCaptainOfTheExecutor = {
  cardId: 'admiral-piett--captain-of-the-executor',
  name: 'Admiral Piett, Captain of the Executor',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 4,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        nonLeader: true,
        minCost: 6,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
