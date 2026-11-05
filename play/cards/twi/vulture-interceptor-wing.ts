import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVultureInterceptorWing = {
  cardId: 'vulture-interceptor-wing',
  name: 'Vulture Interceptor Wing',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -1,
                hp: -1,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
