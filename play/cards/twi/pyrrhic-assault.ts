import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePyrrhicAssault = {
  cardId: 'pyrrhic-assault',
  name: 'Pyrrhic Assault',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Disaster'],
  cost: 3,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          triggers: [
            {
              id: 'defeated',
              timing: 'defeated',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  ],
} as const satisfies EventDefinition;
