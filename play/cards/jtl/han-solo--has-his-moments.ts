import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in meta-combat-order.json.
export const hanSoloHasHisMoments = {
  cardId: 'han-solo--has-his-moments',
  kind: 'unit',
  name: 'Han Solo, Has His Moments',
  cost: 5,
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
  power: 4,
  hp: 5,
  unique: true,
  arena: 'ground',
  keywords: ['Ambush'],
  piloting: [{ id: 'piloting', cost: 2, aspects: ['Cunning', 'Heroism'] }],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: { power: 2, hp: 3 },
    triggers: [
      {
        id: 'pilot-attack',
        timing: 'played',
        effects: [
          {
            kind: 'attack-bound',
            target: 'attached',
            optional: true,
            combatFirst: {
              kind: 'unit-matches',
              target: 'attached',
              filter: { name: 'Millennium Falcon' },
            },
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
