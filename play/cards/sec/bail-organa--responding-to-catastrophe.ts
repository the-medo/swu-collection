import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const bailOrganaRespondingToCatastrophe = {
  cardId: 'bail-organa--responding-to-catastrophe',
  name: 'Bail Organa, Responding to Catastrophe',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'create-spy',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'discard',
          effects: [
            {
              kind: 'move-card',
              target: 'discard',
              from: 'hand',
              to: 'discard',
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'spy',
                  count: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
