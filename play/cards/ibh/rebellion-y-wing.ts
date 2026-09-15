import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const rebellionYWing = {
  cardId: 'rebellion-y-wing',
  name: 'Rebellion Y-Wing',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'base',
          optional: false,
          effects: [
            {
              kind: 'damage-target',
              target: 'base',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
