import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCantinaBouncer = {
  cardId: 'cantina-bouncer',
  name: 'Cantina Bouncer',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Fringe'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
