import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-allocations.json.
export const executionerSArena = {
  cardId: 'executioner-s-arena',
  name: "Executioner's Arena",
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 27,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'with-value',
          name: 'leaders',
          value: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              leader: true,
            },
          },
          effects: [
            {
              kind: 'distribute',
              benefit: 'damage',
              quantum: 2,
              amount: {
                kind: 'value',
                name: 'leaders',
                multiplier: 2,
              },
              filter: {},
              bind: 'dealt',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
