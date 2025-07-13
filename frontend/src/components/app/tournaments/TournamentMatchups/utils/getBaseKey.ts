import { getSpecialBaseName } from '../../../../../../../shared/lib/basicBases.ts';

// Helper function to get base key
export const getBaseKey = (baseCardId: string | undefined | null): string => {
  return getSpecialBaseName(baseCardId ?? undefined) ?? baseCardId ?? '';
};
