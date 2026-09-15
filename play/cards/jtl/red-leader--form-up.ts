import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const redLeaderFormUp = {
  cardId: 'red-leader--form-up',
  name: 'Red Leader, Form Up',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'cards-in-play-count',
        filter: {
          controller: 'friendly',
          trait: 'Pilot',
          roles: ['unit', 'upgrade'],
        },
      },
    },
  ],
  triggers: [
    {
      id: 'pilot-escort',
      timing: 'pilot-attached',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'x-wing',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
