import { hmwUnit } from './define.ts';

export const hmwNuteGunrayPerfectlyLegal = hmwUnit('nute-gunray--perfectly-legal', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [{ kind: 'friendly-units-damage-different-enemies', amount: 1 }],
    },
  ],
});
