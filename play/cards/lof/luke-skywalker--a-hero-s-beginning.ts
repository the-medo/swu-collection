import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const lukeSkywalkerAHeroSBeginning = {
  cardId: 'luke-skywalker--a-hero-s-beginning',
  name: "Luke Skywalker, A Hero's Beginning",
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Force', 'Fringe'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'unique-unit-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
      excludeSelf: true,
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          unique: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
