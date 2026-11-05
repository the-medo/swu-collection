import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTradeFederationShuttle = {
  cardId: 'trade-federation-shuttle',
  name: 'Trade Federation Shuttle',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Separatist', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 3,
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
              damaged: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
