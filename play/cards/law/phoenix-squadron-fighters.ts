import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const phoenixSquadronFighters = {
  cardId: 'phoenix-squadron-fighters',
  name: 'Phoenix Squadron Fighters',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 8,
  power: 6,
  hp: 6,
  arena: 'space',
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          damaged: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
