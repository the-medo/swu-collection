import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CrossfireWorkerStatus } from './CrossfireWorkerStatus.tsx';

test('unavailable telemetry cannot display a cached online or offline status', () => {
  for (const online of [true, false, undefined]) {
    const markup = renderToStaticMarkup(<CrossfireWorkerStatus online={online} unavailable />);
    expect(markup).toContain('Telemetry unavailable');
    expect(markup).not.toContain('Worker online');
    expect(markup).not.toContain('Worker offline');
  }
});

test('successful telemetry restores the reported worker status', () => {
  expect(renderToStaticMarkup(<CrossfireWorkerStatus online unavailable={false} />)).toContain(
    'Worker online',
  );
  expect(
    renderToStaticMarkup(<CrossfireWorkerStatus online={false} unavailable={false} />),
  ).toContain('Worker offline');
});
