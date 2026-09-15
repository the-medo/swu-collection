import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const securityComplex = {
  cardId: 'security-complex',
  kind: 'base',
  name: 'Security Complex',
  aspects: ['Vigilance'],
  traits: [],
  hp: 25,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
          },
          bind: 'chosen',
          optional: false,
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
} as const satisfies BaseDefinition;
