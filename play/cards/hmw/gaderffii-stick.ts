import { hmwUpgrade } from './define.ts';

export const hmwGaderffiiStick = hmwUpgrade('gaderffii-stick', {
  attachTo: 'non-vehicle',
  attachFilter: {
    powerAtMost: 3,
  },
});
