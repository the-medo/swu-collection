import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const hyenaBomber = {
  cardId: 'hyena-bomber',
  name: 'Hyena Bomber',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Aggression'],
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'damage-unit',
              amount: 2,
              arena: 'ground',
              optional: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
