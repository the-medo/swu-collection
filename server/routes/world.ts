import { Hono } from 'hono';
import { countryList, currencyList } from '../db/lists.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const worldRoute = new Hono<AuthExtension>()
  .get('/countries', c => {
    return c.json({ countries: countryList });
  })
  .get('/currencies', c => {
    return c.json({ currencies: currencyList });
  });
