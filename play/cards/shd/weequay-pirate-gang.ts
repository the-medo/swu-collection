import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWeequayPirateGang = {
  cardId: 'weequay-pirate-gang',
  name: 'Weequay Pirate Gang',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Ambush'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 5,
      aspects: ['Command'],
    },
  ],
} as const satisfies UnitDefinition;
