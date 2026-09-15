import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const cassianAndorEverythingForTheRebellion = {
  cardId: 'cassian-andor--everything-for-the-rebellion',
  name: 'Cassian Andor, Everything For the Rebellion',
  kind: 'unit',
  aspects: ['Command', 'Aggression', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-attack-ended',
      timing: 'friendly-attack-ended',
      effects: [
        {
          kind: 'damage-base',
          amount: 2,
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'defender-defeated',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
