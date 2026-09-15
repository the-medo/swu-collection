import type { UnitDefinition } from '../definition.ts';

// Text is pinned in meta-attack-outcomes; v8 end-of-attack timing applies.
export const rancorKeeper = {
  cardId: 'rancor-keeper',
  name: 'Rancor Keeper',
  aspects: ['Vigilance', 'Aggression'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 4,
  kind: 'unit',
  arena: 'ground',
  triggers: [
    {
      id: 'punish-survival',
      timing: 'friendly-damage-survived',
      limit: 'once-per-round',
      optional: true,
      effects: [
        {
          kind: 'damage-chosen-bases',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
