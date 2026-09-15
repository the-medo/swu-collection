import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const blackSquadronScoutWing = {
  cardId: 'black-squadron-scout-wing',
  name: 'Black Squadron Scout Wing',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'upgrade-attack',
      timing: 'upgrade-played-on-self',
      effects: [
        {
          kind: 'attack-bound',
          target: 'source',
          optional: true,
          powerBonus: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
