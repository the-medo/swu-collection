import { parseArgs } from 'node:util';
import { createVideoWorker } from './worker.ts';
import { budgetMicros, WorkerError, type JobStatus } from './contracts.ts';

export const workerHelp = `Creator video worker (metadata only)
  bun run server/crons/creator-video-worker.ts [tick|maintain|discover|enqueue|run|status|retry]
  tick                         Maintain metadata/access, discover, then process queued videos
  maintain --limit 50           Refresh public metadata and check access; no Gemini requests
  discover --since YYYY-MM-DD  Queue public channel uploads since this date
  enqueue --file FILE.json     Queue a saved inventory; verify metadata during processing
  run --limit 10               Process at most 10 videos (maximum 100)
  run --video VIDEO_ID         Process only this queued video
  status                       Show queue, held/used Gemini allowance and review items
  status --status review --page 2  Filter and paginate jobs (100 per page, newest first)
  retry --video VIDEO_ID       Requeue a failed/pending video, retaining cached analysis
  retry --video ID --reclassify Reclassify a skipped/failed job (another Gemini request)
  --dry-run                    Show the plan and queue without writes or provider requests
  --help                       Show this help

Backend env: DATABASE_URL, YOUTUBE_API_KEY, GEMINI_API_KEY.
CREATOR_GEMINI_BUDGET_USD defaults to $5 total; maximum $40; no automatic reset.
Videos publish automatically, including uncertain SWU classifications; clearly unrelated uploads are skipped.
Text rejected by content moderation remains a draft for review.
`;

export async function workerCommand(args: string[], worker = createVideoWorker()) {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        since: { type: 'string' },
        file: { type: 'string' },
        limit: { type: 'string' },
        page: { type: 'string' },
        status: { type: 'string' },
        video: { type: 'string' },
        'dry-run': { type: 'boolean' },
        reclassify: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch {
    throw new WorkerError('invalid_worker_arguments', false);
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: workerHelp };
  const command = positionals[0] ?? 'tick';
  if (
    positionals.length > 1 ||
    !['tick', 'maintain', 'discover', 'enqueue', 'run', 'status', 'retry'].includes(command)
  )
    throw new WorkerError('invalid_worker_command', false);
  const limit = Number(values.limit ?? (command === 'maintain' ? 50 : 10));
  const page = Number(values.page ?? 1);
  const status = typeof values.status === 'string' ? (values.status as JobStatus) : undefined;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    (status &&
      !['pending', 'processing', 'published', 'review', 'skipped', 'failed'].includes(status))
  )
    throw new WorkerError('invalid_status_filter', false);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new WorkerError('invalid_worker_limit', false);
  const video = typeof values.video === 'string' ? values.video : undefined;
  if (video && !/^[\w-]{11}$/.test(video)) throw new WorkerError('invalid_video_id', false);
  const since = typeof values.since === 'string' ? values.since : undefined;
  if (
    since &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(since) ||
      !Number.isFinite(Date.parse(since)) ||
      new Date(since).toISOString().slice(0, 10) !== since ||
      Date.parse(since) > Date.now())
  )
    throw new WorkerError('invalid_discovery_date', false);
  if (values['dry-run'] && command === 'maintain')
    return { maintenance: await worker.maintain(limit, true) };
  if (values['dry-run'])
    return {
      dryRun: true,
      command,
      since,
      limit,
      video,
      capMicros: budgetMicros(),
      report: await worker.store.report(page, status),
    };
  switch (command) {
    case 'maintain':
      return { maintenance: await worker.maintain(limit) };
    case 'status':
      return { capMicros: budgetMicros(), report: await worker.store.report(page, status) };
    case 'retry':
      if (!video) throw new WorkerError('video_id_required', false);
      return { retried: await worker.store.retry(video, !!values.reclassify) };
    case 'enqueue': {
      if (typeof values.file !== 'string') throw new WorkerError('inventory_file_required', false);
      const file = Bun.file(values.file);
      if (file.size > 10_000_000) throw new WorkerError('inventory_too_large', false);
      return { inventory: await worker.enqueueInventory(await file.json()) };
    }
    case 'discover':
      return { discovery: await worker.discover(since) };
    case 'run':
      return { run: await worker.run(limit, video) };
    default: {
      const maintenance = await worker.maintain(50);
      const discovery = await worker.discover(since);
      return { maintenance, discovery, run: await worker.run(limit, video) };
    }
  }
}

export async function monitoredWorkerCommand(
  work: () => Promise<Awaited<ReturnType<typeof workerCommand>>>,
  monitor: { started(): void; finished(): void; crashed(error: Error): void },
  flush: () => Promise<unknown>,
  log: (value: unknown) => void,
) {
  monitor.started();
  try {
    const result = await work();
    log(result);
    if (result.maintenance && 'failed' in result.maintenance && result.maintenance.failed)
      throw new WorkerError('creator_youtube_maintenance_failed');
    if (result.run?.failed)
      throw new WorkerError(result.run.stoppedBy ?? 'creator_video_batch_failed');
    // Stale or ambiguous directory links are reported in the result, without masking
    // real cron outages with a permanently failing monitor.
    if (result.discovery?.incomplete.length)
      throw new WorkerError('creator_video_discovery_incomplete');
    monitor.finished();
    return 0;
  } catch (error) {
    const safe =
      error instanceof WorkerError
        ? new Error(error.code)
        : new Error('creator_video_worker_failed');
    log({ error: safe.message });
    monitor.crashed(safe);
    return 1;
  } finally {
    await flush();
  }
}
