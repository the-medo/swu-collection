import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const sawGerreraSUWingBreakingTheRules = {
  cardId: 'saw-gerrera-s-u-wing--breaking-the-rules',
  name: "Saw Gerrera's U-Wing, Breaking the Rules",
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 8,
  arena: 'space',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            anyAspect: ['Aggression'],
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
            },
          ],
          forAttack: {},
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
