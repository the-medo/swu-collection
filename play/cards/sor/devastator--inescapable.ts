import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDevastatorInescapable = {
  cardId: 'devastator--inescapable',
  name: 'Devastator, Inescapable',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 10,
  unique: true,
  power: 10,
  hp: 10,
  arena: 'space',
  keywords: ['Sentinel', 'Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'zone-size',
                zone: 'resources',
                player: 'self',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
