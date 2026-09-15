import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const chirrutMweIDonTNeedLuck = {
  cardId: 'chirrut--mwe--i-don-t-need-luck',
  name: "Chirrut Îmwe, I Don't Need Luck",
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression', 'Heroism'],
  traits: ['Force', 'Rebel'],
  unique: true,
  cost: 6,
  power: 8,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 4,
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'combat-base-damage',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
