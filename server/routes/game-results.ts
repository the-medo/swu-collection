import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { gameResultGetRoute } from './game-results/get.ts';

export const gameResultRoute = new Hono<AuthExtension>().route('/', gameResultGetRoute);
