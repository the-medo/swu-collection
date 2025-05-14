export const setShortcutConversions: Record<string, Record<string, string>> = {
  sor: {
    Hyperspace: 'sorop',
    'OP Promo': 'sorop',
    'Prerelease Promo': 'sorpr',
    'OP Judge': 'sorsh',
    // Standard: 'Shield', --token
    'OP Top 8': 'sorsh',
    'OP Top 4': 'sorsh',
    'OP Finalist': 'sorsh',
    'OP Champion': 'sorsh',
  },
  twi: {
    'OP Judge': 'twipq',
    'OP Promo': 'twiop',
    // Standard: 'Clone Trooper', -- token
    Hyperspace: 'twiop',
    // 'Standard Foil': 'Clone Trooper', -- token??
    'OP Top 8': 'twish',
    'OP Top 16': 'twipq',
  },
  jtlw: {
    'OP Promo': 'jtlp',
    'OP Promo Foil': 'jtlp',
  },
  c24: {
    'Convention Exclusive': 'ce24',
  },
  shd: {
    Hyperspace: 'shdop',
    'OP Promo': 'shdop',
    'OP Finalist': 'shdsh',
    'OP Champion': 'shdsh',
    'OP Top 16': 'shdpq',
    'OP Top 8': 'shdsh',
    'OP Top 4': 'shdsh',
    'Event Exclusive': 'ee24',
    'OP Promo Foil': 'shdop',
    'OP Judge': 'shdpr',
  },
};
