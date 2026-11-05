import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteClanSaxonGauntlet = {
  cardId: 'clan-saxon-gauntlet',
  name: 'Clan Saxon Gauntlet',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  cost: 6,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
