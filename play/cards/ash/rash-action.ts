import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const rashAction = {
  cardId: 'rash-action',
  name: 'Rash Action',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'attack-with-unit',
      powerBonus: 1,
      grantSourceTriggers: true,
    },
  ],
  attackGrants: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'combat-opponent-base-damage',
            amount: 1,
          },
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'owner',
              filter: {},
              min: 1,
              max: 1,
              bind: 'discarded',
              effects: [
                {
                  kind: 'move-card',
                  target: 'discarded',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
