import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSmokeAndCinders = {
  cardId: 'smoke-and-cinders',
  name: 'Smoke and Cinders',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Disaster'],
  cost: 5,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: {
        kind: 'difference',
        left: {
          kind: 'zone-size',
          zone: 'hand',
          player: 'self',
        },
        right: 2,
      },
      max: {
        kind: 'difference',
        left: {
          kind: 'zone-size',
          zone: 'hand',
          player: 'self',
        },
        right: 2,
      },
      bind: 'card',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: {
            kind: 'difference',
            left: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'enemy',
            },
            right: 2,
          },
          max: {
            kind: 'difference',
            left: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'enemy',
            },
            right: 2,
          },
          bind: 'card',
          effects: [
            {
              kind: 'discard-groups',
              groups: ['first-discard', 'second-discard'],
            },
          ],
          group: 'second-discard',
          otherwise: [
            {
              kind: 'discard-groups',
              groups: ['first-discard', 'second-discard'],
            },
          ],
        },
      ],
      group: 'first-discard',
      otherwise: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: {
            kind: 'difference',
            left: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'enemy',
            },
            right: 2,
          },
          max: {
            kind: 'difference',
            left: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'enemy',
            },
            right: 2,
          },
          bind: 'card',
          effects: [
            {
              kind: 'discard-groups',
              groups: ['first-discard', 'second-discard'],
            },
          ],
          group: 'second-discard',
          otherwise: [
            {
              kind: 'discard-groups',
              groups: ['first-discard', 'second-discard'],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
