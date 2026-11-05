import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteNiteOwlSkirmisher = {
  cardId: 'nite-owl-skirmisher',
  name: 'Nite Owl Skirmisher',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 5,
      aspects: ['Aggression', 'Heroism'],
    },
  ],
} as const satisfies UnitDefinition;
