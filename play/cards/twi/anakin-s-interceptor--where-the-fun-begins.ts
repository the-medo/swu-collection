import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAnakinSInterceptorWhereTheFunBegins = {
  cardId: 'anakin-s-interceptor--where-the-fun-begins',
  name: "Anakin's Interceptor, Where the Fun Begins",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'base-damage-at-least',
        amount: 15,
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
