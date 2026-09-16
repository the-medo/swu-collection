import { hmwUpgrade } from './define.ts';

export const hmwAllianceShieldGenerator = hmwUpgrade('alliance-shield-generator', {
  damageReplacements: [
    {
      id: 'shield-generator',
      target: 'friendly',
      targetRole: 'base',
      minimumAmount: 5,
      operation: 'prevent',
      amount: 'all',
      effects: [{ kind: 'defeat-self-upgrade' }, { kind: 'draw-cards', amount: 1 }],
    },
  ],
});
