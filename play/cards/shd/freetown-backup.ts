import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFreetownBackup = {
  cardId: 'freetown-backup',
  name: 'Freetown Backup',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Fringe'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Command', 'Heroism'],
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
