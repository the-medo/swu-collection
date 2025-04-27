const baseSpecialShortcuts: Record<string, string | undefined> = {
  Tarkintown: 'TT',
};

export const getBaseShortcut = (baseName: string | undefined) => {
  if (!baseName) return '';
  return (
    baseSpecialShortcuts[baseName] ??
    baseName
      .split(' ')
      .map(p => p[0] ?? '')
      .join('')
      .toUpperCase()
  );
};
