import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const emissariesFromRyloth = {
  cardId: 'emissaries-from-ryloth',
  name: 'Emissaries from Ryloth',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', "Twi'lek", 'Official'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -3,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
