import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const hunterExtraordinaryTracker = {
  cardId: 'hunter--extraordinary-tracker',
  name: 'Hunter, Extraordinary Tracker',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Clone'],
  unique: true,
  cost: 6,
  power: 7,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'defender',
            filter: {
              exhausted: true,
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'modify',
                power: -4,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
