import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEnfysNestChampionOfJustice = {
  cardId: 'enfys-nest--champion-of-justice',
  name: 'Enfys Nest, Champion of Justice',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            powerLessThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            powerLessThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
