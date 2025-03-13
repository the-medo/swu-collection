import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';

export const deckIdCardDeleteRoute = new Hono<AuthExtension>();
