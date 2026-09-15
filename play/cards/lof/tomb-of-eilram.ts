import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-choices.json.
export const tombOfEilram = {
  cardId: 'tomb-of-eilram',
  name: 'Tomb of Eilram',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 25,
  actions: [
    {
      id: 'gain-force',
      costs: [
        {
          kind: 'exhaust-friendly-unit',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
