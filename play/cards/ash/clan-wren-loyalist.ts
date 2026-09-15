import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const clanWrenLoyalist = {
  cardId: 'clan-wren-loyalist',
  name: 'Clan Wren Loyalist',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'any',
          cardFilter: {
            sharesFriendlyUnitTrait: true,
          },
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
