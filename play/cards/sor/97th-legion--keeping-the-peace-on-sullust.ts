import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyComplete97ThLegionKeepingThePeaceOnSullust = {
  cardId: '97th-legion--keeping-the-peace-on-sullust',
  name: '97th Legion, Keeping the Peace on Sullust',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Trooper'],
  cost: 7,
  unique: true,
  power: 0,
  hp: 0,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'zone-size',
        zone: 'resources',
        player: 'self',
      },
      hp: {
        kind: 'zone-size',
        zone: 'resources',
        player: 'self',
      },
    },
  ],
} as const satisfies UnitDefinition;
