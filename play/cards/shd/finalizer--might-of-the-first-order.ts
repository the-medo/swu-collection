import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFinalizerMightOfTheFirstOrder = {
  cardId: 'finalizer--might-of-the-first-order',
  name: 'Finalizer, Might of the First Order',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Capital Ship'],
  cost: 11,
  unique: true,
  power: 11,
  hp: 11,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'capture-pairs',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
