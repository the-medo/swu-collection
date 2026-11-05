import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteImperialInterceptor = {
  cardId: 'imperial-interceptor',
  name: 'Imperial Interceptor',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'space',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
