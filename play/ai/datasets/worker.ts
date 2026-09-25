/** Separate from the game finalizer so storage latency cannot delay results. */
export function startAiExporter() {
  if (!process.env.CROSSFIRE_AI_BUCKET) return async () => {};
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let stopped = false;
  const tick = () => {
    if (stopped || child) return;
    const running = Bun.spawn(
      [process.execPath, new URL('./export-process.ts', import.meta.url).pathname],
      {
        env: { ...process.env, CROSSFIRE_AI_EXPORT_CHILD: '1' },
        stdin: 'ignore',
        stdout: 'ignore',
        stderr: 'inherit',
      },
    );
    child = running;
    const timeout = setTimeout(() => running.kill('SIGKILL'), 120_000);
    timeout.unref();
    void running.exited.finally(() => {
      clearTimeout(timeout);
      if (child === running) child = undefined;
    });
  };
  const timer = setInterval(tick, 30_000);
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
