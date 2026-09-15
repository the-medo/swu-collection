import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const chancellorValorumCivilServant = {
  cardId: 'chancellor-valorum--civil-servant',
  name: 'Chancellor Valorum, Civil Servant',
  kind: 'unit',
  aspects: ['Command', 'Command'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command', 'Command', 'Command'],
          effects: [
            {
              kind: 'resource-top',
              optional: false,
            },
          ],
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
