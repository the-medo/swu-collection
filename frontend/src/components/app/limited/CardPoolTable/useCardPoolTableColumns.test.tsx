import { expect, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTable, flexRender, getCoreRowModel } from '@tanstack/react-table';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { formatDate } from '@/lib/locale.ts';
import { useCardPoolTableColumns } from './useCardPoolTableColumns.tsx';

const pool: CardPool = {
  id: 'pool-id',
  set: 'hmw',
  userId: null,
  type: 'sealed',
  name: 'Older pool',
  description: null,
  leaders: null,
  edited: false,
  custom: false,
  status: 'ready',
  visibility: 'public',
  archivedAt: null,
  createdAt: '2024-01-02T12:00:00Z',
  updatedAt: '2024-03-04T12:00:00Z',
};

function UpdatedCell({ view }: { view: 'table' | 'box' }) {
  const columns = useCardPoolTableColumns({ view });
  const table = createTable({
    data: [pool],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
  });
  const cell = table
    .getRowModel()
    .rows[0].getAllCells()
    .find(c => c.column.id === 'updatedAt')!;
  return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
}

test.each(['table', 'box'] as const)('%s uses the saved update date from the API row', view => {
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <UpdatedCell view={view} />
    </QueryClientProvider>,
  );
  expect(markup).toContain(formatDate(pool.updatedAt));
  expect(markup).not.toContain(formatDate(pool.createdAt));
  client.clear();
});
