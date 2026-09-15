import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const secretBattleOfPretend = {
  cardId: 'secret-battle-of-pretend',
  name: 'Secret Battle of Pretend',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
          ifYouDo: [
            {
              kind: 'select-units',
              filter: {
                controller: 'enemy',
                sameArenaAs: 'chosen',
                exhausted: false,
              },
              bind: 'enemies',
              min: {
                kind: 'distinct-aspects',
                target: 'chosen',
              },
              max: {
                kind: 'distinct-aspects',
                target: 'chosen',
              },
              effects: [
                {
                  kind: 'exhaust-group',
                  group: 'enemies',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
