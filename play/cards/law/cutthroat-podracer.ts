import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const cutthroatPodracer = {
  cardId: 'cutthroat-podracer',
  name: 'Cutthroat Podracer',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Vehicle', 'Speeder'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
            exhausted: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
