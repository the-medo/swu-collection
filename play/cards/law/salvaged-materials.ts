import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const salvagedMaterials = {
  cardId: 'salvaged-materials',
  name: 'Salvaged Materials',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Supply'],
  cost: 1,
  effects: [
    {
      kind: 'play-card',
      from: 'discard',
      filter: {
        kind: 'upgrade',
        trait: 'Item',
      },
      discount: 3,
      optional: false,
      bind: 'played',
      effects: [
        {
          kind: 'schedule-regroup-operation',
          target: 'played',
          operation: 'defeat',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
