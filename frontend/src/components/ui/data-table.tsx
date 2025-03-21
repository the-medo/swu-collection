'use client';

import { ColumnDef, flexRender, getCoreRowModel, Row, useReactTable } from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { RowData } from '@tanstack/table-core/src/types.ts';

export type DataTableViewMode = 'table' | 'box';

export type ExtendedColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  TData,
  TValue
> & {
  displayBoxHeader?: boolean;
  displayInBoxView?: boolean;
};

interface DataTableProps<TData, TValue> {
  columns: ExtendedColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  defaultColumn?: {
    size: number;
    minSize: number;
    maxSize: number;
  };
  onRowClick?: (row: Row<TData>) => void;
  view?: DataTableViewMode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  defaultColumn = {
    size: 0,
    minSize: 0,
    maxSize: Number.MAX_SAFE_INTEGER,
  },
  onRowClick,
  view = 'table',
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    // @ts-ignore
    data: loading ? [{}, {}, {}] : data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn,
  });

  if (view === 'box') {
    return (
      <div className="space-y-4 w-full">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map(row => (
            <Card
              key={row.id}
              className={cn('overflow-hidden transition-colors hover:bg-muted/50 cursor-pointer', {
                'animate-pulse': loading,
              })}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-4 space-y-2">
                {row.getVisibleCells().map(cell => {
                  // Get header content to use as label
                  const columnDef = cell.column.columnDef as ExtendedColumnDef<TData>;
                  const headerContent = columnDef.header;

                  if (columnDef.displayInBoxView === false) return null;

                  return (
                    <div key={cell.id} className="flex justify-between items-center gap-2">
                      {/* Only show header if it's not empty */}
                      {headerContent &&
                        headerContent !== '' &&
                        columnDef.displayBoxHeader !== false && (
                          <div className="font-medium text-sm text-muted-foreground">
                            {typeof headerContent === 'string' ? headerContent : headerContent({})}
                          </div>
                        )}
                      <div className={cn('flex-grow', headerContent ? 'text-right' : '')}>
                        {loading ? (
                          <Skeleton className="h-4 w-full rounded-md" />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="h-24 flex items-center justify-center">No results.</CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border w-full">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn({
                      [`w-${header.getSize()}`]: header.getSize() > 0,
                    })}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row)}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell
                    key={cell.id}
                    className={cn({
                      [`w-${cell.column.getSize()} min-w-${cell.column.getSize()}`]:
                        cell.column.getSize() > 0,
                    })}
                  >
                    {loading ? (
                      <Skeleton
                        className="size-4 w-full rounded-md"
                        data-sidebar="menu-skeleton-icon"
                      />
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
