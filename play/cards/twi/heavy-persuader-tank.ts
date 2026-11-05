import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHeavyPersuaderTank = {
  cardId: 'heavy-persuader-tank',
  name: 'Heavy Persuader Tank',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Tank'],
  cost: 7,
  power: 6,
  hp: 5,
  arena: 'ground',
  exploit: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
