import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const rhydoniumDetonation = {
  cardId: 'rhydonium-detonation',
  name: 'Rhydonium Detonation',
  kind: 'event',
  aspects: ['Cunning', 'Vigilance'],
  traits: ['Tactic'],
  cost: 7,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      bind: 'chosen',
      optional: true,
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
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      bind: 'chosen',
      optional: true,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
          },
        },
      ],
      chooser: 'enemy',
    },
    {
      kind: 'defeat-units',
      filter: {
        nonLeader: true,
      },
    },
  ],
} as const satisfies EventDefinition;
