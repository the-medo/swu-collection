import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-defeats.json.
export const shadowCasterJustBusiness = {
  cardId: 'shadow-caster--just-business',
  name: 'Shadow Caster, Just Business',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'repeat-defeats',
      timing: 'friendly-defeated',
      optional: true,
      effects: [
        {
          kind: 'repeat-defeated-batch',
          index: 'defeat-batch',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
