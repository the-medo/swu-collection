import { hmwUnit } from './define.ts';

export const hmwTyYorrickMonsterHunter = hmwUnit('ty-yorrick--monster-hunter', {
  damageReplacements: [
    {
      id: 'increase-ability-damage',
      target: 'friendly',
      targetRole: 'any',
      operation: 'increase',
      amount: 1,
      dealtByFriendlyAbility: true,
      optional: true,
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: { trait: 'Creature' },
          bind: 'target',
          optional: true,
          effects: [{ kind: 'damage-target', target: 'target', amount: 1 }],
        },
      ],
    },
  ],
});
