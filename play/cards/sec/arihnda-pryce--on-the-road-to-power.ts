import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const arihndaPryceOnTheRoadToPower = {
  cardId: 'arihnda-pryce--on-the-road-to-power',
  name: 'Arihnda Pryce, On the Road to Power',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
              ifYouDo: [
                {
                  kind: 'damage-bases',
                  amount: 4,
                  targets: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
