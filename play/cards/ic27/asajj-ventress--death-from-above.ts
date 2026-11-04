import { ic27Unit } from './define.ts';

export const ic27AsajjVentressDeathFromAbove = ic27Unit('asajj-ventress--death-from-above', {
  handCombatReplacement: {
    cost: 5,
    aspects: ['Cunning', 'Villainy'],
    attacker: {
      controller: 'friendly',
      nonLeader: true,
      arena: 'ground',
    },
  },
});
