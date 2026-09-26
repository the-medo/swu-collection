import { randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import type { Plugin } from 'vite';
import { TrainingReader } from './crossfire-training-reader.ts';
import {
  trainingRuns,
  trainingRunDirectory,
  completedTrainingRequest,
} from './crossfire-training-runs.ts';
import { trainingCommand } from './crossfire-training-commands.ts';
import {
  addTrainingDeckSchema,
  inspectTrainingDeckSchema,
} from '../../shared/types/crossfire-training-roster.ts';

const cursor = z.coerce.number().int().nonnegative().safe();

/** Only the private/local Vite development server exposes these aggregate reports. */
export function crossfireTrainingPlugin(repositoryRoot: string, command = trainingCommand): Plugin {
  const readers = new Map<string, TrainingReader>();
  const mutationToken = randomBytes(32).toString('hex');
  let busy = false;
  async function body(req: IncomingMessage) {
    let data = '';
    for await (const chunk of req) {
      data += chunk;
      if (Buffer.byteLength(data) > 8192) throw new Error('Request too large');
    }
    return JSON.parse(data);
  }
  return {
    name: 'crossfire-training-dashboard',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/__crossfire-training/')) return next();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const send = (code: number, data: unknown) => {
          res.statusCode = code;
          res.end(JSON.stringify(data));
        };
        const write = [
          '/__crossfire-training/decks/inspect',
          '/__crossfire-training/decks/add',
        ].includes(url.pathname);
        if (req.method !== (write ? 'POST' : 'GET')) {
          res.setHeader('Allow', write ? 'POST' : 'GET');
          return send(405, { message: 'Unsupported method' });
        }
        // Match Vite's private serving boundary. No cross-site browser reads or CORS opt-in.
        const origin = req.headers.origin;
        try {
          if (
            req.headers['sec-fetch-site'] === 'cross-site' ||
            (origin && new URL(origin).host !== req.headers.host)
          )
            return send(403, { message: 'Same-origin requests only' });
        } catch {
          return send(403, { message: 'Invalid request origin' });
        }
        try {
          if (url.pathname === '/__crossfire-training/runs') {
            if (url.search) return send(400, { message: 'Invalid run query' });
            return send(200, { ...(await trainingRuns(repositoryRoot)), mutationToken });
          }
          if (write) {
            if (!origin || req.headers['x-crossfire-training-token'] !== mutationToken)
              return send(403, { message: 'Refresh this dashboard before preparing a deck.' });
            if (url.search || !req.headers['content-type']?.startsWith('application/json'))
              return send(400, { message: 'Expected a JSON deck request' });
            let raw: unknown;
            try {
              raw = await body(req);
            } catch {
              return send(400, { message: 'Invalid deck request' });
            }
            const adding = url.pathname.endsWith('/add');
            const parsed = (adding ? addTrainingDeckSchema : inspectTrainingDeckSchema).safeParse(
              raw,
            );
            if (!parsed.success)
              return send(400, { message: 'Choose a valid deck and at least one archetype.' });
            if (busy)
              return send(409, {
                message: 'Another deck is being checked or prepared. Try again shortly.',
              });
            busy = true;
            try {
              if (adding) {
                const completed = await completedTrainingRequest(
                  repositoryRoot,
                  addTrainingDeckSchema.parse(raw),
                );
                if (completed)
                  return 'conflict' in completed
                    ? send(409, {
                        message:
                          'This request ID was already used for different input. Check the deck again.',
                      })
                    : send(200, completed);
              }
              const inspected = await command(repositoryRoot, 'inspect', {
                deckId: parsed.data.deckId,
                cookie: req.headers.cookie ?? '',
              });
              if (!inspected.ok) return send(400, { message: inspected.message });
              if (!adding) return send(200, inspected.inspection);
              const input = addTrainingDeckSchema.parse(raw);
              const inspection = inspected.inspection as {
                ready: boolean;
                contentHash?: string;
                name: string;
                leaderName: string;
              };
              if (!inspection.ready)
                return send(400, {
                  message: 'This deck has unsupported cards. Check the deck again.',
                });
              if (inspection.contentHash !== input.contentHash)
                return send(409, { message: 'The deck changed. Check it again before adding it.' });
              const result = await command(repositoryRoot, 'add', {
                ...input,
                snapshot: inspected.snapshot,
                name: inspection.name,
                leaderName: inspection.leaderName,
              });
              if (!result.ok) return send(409, { message: result.message });
              return send(201, { run: result.run, revision: result.revision });
            } finally {
              busy = false;
            }
          }
          const selectedRun = url.searchParams.get('run') ?? 'legacy';
          if (url.searchParams.getAll('run').length > 1)
            return send(400, { message: 'Invalid training run' });
          const directory = await trainingRunDirectory(repositoryRoot, selectedRun);
          if (!directory) return send(400, { message: 'Invalid training run' });
          let reader = readers.get(selectedRun);
          if (!reader) {
            reader = new TrainingReader(directory);
            readers.set(selectedRun, reader);
          }
          if (url.pathname === '/__crossfire-training/status') {
            if ([...url.searchParams.keys()].some(k => k !== 'run'))
              return send(400, { message: 'Invalid status query' });
            return send(200, await reader.status());
          }
          if (url.pathname === '/__crossfire-training/history') {
            if (
              [...url.searchParams.keys()].some(k => k !== 'before' && k !== 'run') ||
              url.searchParams.getAll('before').length > 1
            )
              return send(400, { message: 'Invalid history cursor' });
            const parsed = url.searchParams.has('before')
              ? cursor.safeParse(url.searchParams.get('before'))
              : null;
            if (parsed && !parsed.success) return send(400, { message: 'Invalid history cursor' });
            return send(200, await reader.history(parsed?.data));
          }
          return send(404, { message: 'Unknown dashboard endpoint' });
        } catch {
          return send(503, {
            message: 'Training reports are temporarily unavailable. Retrying shortly.',
          });
        }
      });
    },
  };
}
