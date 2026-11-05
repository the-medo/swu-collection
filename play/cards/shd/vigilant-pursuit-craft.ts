import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVigilantPursuitCraft = {
  cardId: 'vigilant-pursuit-craft',
  name: 'Vigilant Pursuit Craft',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Vehicle', 'Transport'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'space',
  keywords: ['Sentinel'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 7,
      aspects: ['Vigilance'],
    },
  ],
} as const satisfies UnitDefinition;
