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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  defaultColumn?: {
    size: number;
    minSize: number;
    maxSize: number;
  };
  onRowClick?: (row: Row<TData>) => void;
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
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    // @ts-ignore
    data: loading ? [{}, {}, {}] : data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn,
  });

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
