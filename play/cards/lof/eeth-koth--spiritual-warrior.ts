import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const eethKothSpiritualWarrior = {
  cardId: 'eeth-koth--spiritual-warrior',
  name: 'Eeth Koth, Spiritual Warrior',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'resource-after-defeat',
      timing: 'defeated',
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
              kind: 'self-resource',
              ready: false,
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
