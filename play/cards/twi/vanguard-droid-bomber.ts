import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVanguardDroidBomber = {
  cardId: 'vanguard-droid-bomber',
  name: 'Vanguard Droid Bomber',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Separatist',
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'damage-bases',
              targets: 'enemy',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
