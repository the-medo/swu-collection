import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const lukeSkywalkerDoYouReadMe = {
  cardId: 'luke-skywalker--do-you-read-me-',
  name: 'Luke Skywalker, Do You Read Me?',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Rebel'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'ground',
  restore: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          arena: 'ground',
          amount: 3,
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
