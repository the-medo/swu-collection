import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheGhostSpectreHomeBase = {
  cardId: 'the-ghost--spectre-home-base',
  name: 'The Ghost, Spectre Home Base',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport', 'Spectre'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'space',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Spectre',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Spectre',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
