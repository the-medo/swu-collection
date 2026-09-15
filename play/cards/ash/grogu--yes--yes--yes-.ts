import type { UnitDefinition } from '../definition.ts';

// ASH 155. Printed text is pinned in meta-board fixture.
export const groguYesYesYes = {
  cardId: 'grogu--yes--yes--yes-',
  name: 'Grogu, Yes. Yes. Yes.',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Droid'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'on-initiative-taken',
      timing: 'initiative-taken',
      effects: [
        {
          kind: 'select-unit',
          forAttack: {},
          bind: 'chosen',
          filter: {
            controller: 'friendly',
            exhausted: false,
          },
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
