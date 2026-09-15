/** One bounded child per worker. No raw state enters this supervisor. A restart
 * rediscovers pending jobs in PostgreSQL; termination cannot publish half an archive. */
export function startFinalizer(options: { intervalMs?: number; timeoutMs?: number } = {}) {
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let stopped = false;
  const tick = () => {
    if (stopped || child) return;
    const running = Bun.spawn(
      [process.execPath, new URL('./finalizer-process.ts', import.meta.url).pathname],
      {
        env: { ...process.env, CROSSFIRE_FINALIZER_CHILD: '1' },
        stdin: 'ignore',
        stdout: 'ignore',
        stderr: 'inherit',
      },
    );
    child = running;
    const timeout = setTimeout(() => running.kill('SIGKILL'), options.timeoutMs ?? 60_000);
    timeout.unref();
    void running.exited.finally(() => {
      clearTimeout(timeout);
      if (child === running) child = undefined;
    });
  };
  const timer = setInterval(tick, options.intervalMs ?? 30_000);
  timer.unref();
  tick();
  return async () => {
    stopped = true;
    clearInterval(timer);
    if (child) {
      child.kill('SIGTERM');
      await child.exited;
    }
  };
}
