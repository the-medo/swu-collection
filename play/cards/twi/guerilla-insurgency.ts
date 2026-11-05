import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGuerillaInsurgency = {
  cardId: 'guerilla-insurgency',
  name: 'Guerilla Insurgency',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 8,
  effects: [
    {
      kind: 'select-resources',
      player: 'self',
      exhausted: 'any',
      min: 1,
      max: 1,
      operation: 'defeat',
      chooser: 'owner',
    },
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: 2,
      max: 2,
      bind: 'card',
      effects: [
        {
          kind: 'move-cards',
          group: 'discarded-cards',
          from: 'hand',
          to: 'discard',
          discardBy: 'owner',
        },
      ],
      group: 'discarded-cards',
    },
    {
      kind: 'select-resources',
      player: 'enemy',
      exhausted: 'any',
      min: 1,
      max: 1,
      operation: 'defeat',
      chooser: 'owner',
    },
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'enemy',
      chooser: 'owner',
      filter: {},
      min: 2,
      max: 2,
      bind: 'card',
      effects: [
        {
          kind: 'move-cards',
          group: 'discarded-cards',
          from: 'hand',
          to: 'discard',
          discardBy: 'owner',
        },
      ],
      group: 'discarded-cards',
    },
    {
      kind: 'damage-units',
      filter: {
        arena: 'ground',
      },
      amount: 4,
    },
  ],
} as const satisfies EventDefinition;
