import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCoruscantDissident = {
  cardId: 'coruscant-dissident',
  name: 'Coruscant Dissident',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld', "Twi'lek"],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 0,
          max: 1,
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
