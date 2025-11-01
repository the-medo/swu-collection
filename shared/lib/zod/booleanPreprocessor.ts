import { z } from 'zod';

export const booleanPreprocessor = z.preprocess(val => {
  if (val === 'false') return false;
  if (val === 'true') return true;
  return val;
}, z.boolean());
