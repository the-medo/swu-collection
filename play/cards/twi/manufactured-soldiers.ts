import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteManufacturedSoldiers = {
  cardId: 'manufactured-soldiers',
  name: 'Manufactured Soldiers',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Supply'],
  cost: 3,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'clones',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'clone-trooper',
              count: 2,
            },
          ],
        },
        {
          id: 'droids',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
