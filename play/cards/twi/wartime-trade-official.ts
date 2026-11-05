import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWartimeTradeOfficial = {
  cardId: 'wartime-trade-official',
  name: 'Wartime Trade Official',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
