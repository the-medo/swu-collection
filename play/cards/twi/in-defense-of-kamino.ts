import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteInDefenseOfKamino = {
  cardId: 'in-defense-of-kamino',
  name: 'In Defense of Kamino',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Republic'],
  cost: 4,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
        trait: 'Republic',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          restore: 2,
          triggers: [
            {
              id: 'defeated',
              timing: 'defeated',
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'clone-trooper',
                  count: 1,
                },
              ],
            },
          ],
        },
      },
    },
  ],
} as const satisfies EventDefinition;
