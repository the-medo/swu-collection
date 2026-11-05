import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePirateBattleTank = {
  cardId: 'pirate-battle-tank',
  name: 'Pirate Battle Tank',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Underworld', 'Vehicle', 'Tank'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 7,
      aspects: ['Command', 'Villainy'],
    },
  ],
} as const satisfies UnitDefinition;
