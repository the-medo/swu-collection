import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const sorcerousBlast = {
  cardId: 'sorcerous-blast',
  name: 'Sorcerous Blast',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'pay',
      costs: [
        {
          kind: 'force',
        },
      ],
      optional: false,
      effects: [
        {
          kind: 'damage-unit',
          amount: 3,
          arena: 'any',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
