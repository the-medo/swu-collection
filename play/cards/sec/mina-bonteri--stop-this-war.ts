import type { UnitDefinition } from '../definition.ts';

// SEC 094. Printed text and rulings are pinned in meta-disclose fixture.
export const minaBonteriStopThisWar = {
  cardId: 'mina-bonteri--stop-this-war',
  name: 'Mina Bonteri, Stop This War',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Separatist', 'Official'],
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  unique: true,
  restore: 1,
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command', 'Command', 'Heroism'],
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
