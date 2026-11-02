import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';

export interface VirtualTableScroll {
  containerRef: RefObject<HTMLDivElement | null>;
  highlightedRowId?: string;
}

export interface VirtualTableRowProps {
  ref: (element: HTMLTableRowElement | null) => void;
  'data-index': number;
  'aria-rowindex': number;
}

interface VirtualizedTableBodyProps<TData> extends VirtualTableScroll {
  rows: Row<TData>[];
  columnCount: number;
  headerRef: RefObject<HTMLTableSectionElement | null>;
  renderRow: (row: Row<TData>, props?: VirtualTableRowProps) => ReactNode;
}

export function VirtualizedTableBody<TData>({
  rows,
  columnCount,
  containerRef,
  headerRef,
  highlightedRowId,
  renderRow,
}: VirtualizedTableBodyProps<TData>) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [geometry, setGeometry] = useState<{ margin: number; headerHeight: number } | null>(null);
  const lastReveal = useRef<{ rows: Row<TData>[]; highlightedRowId?: string } | null>(null);
  const getItemKey = useCallback((index: number) => rows[index].id, [rows]);
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    getItemKey,
    estimateSize: () => 64,
    // ResizeObserver borderBoxSize can omit collapsed table borders.
    measureElement: element => element.getBoundingClientRect().height,
    overscan: 5,
    scrollMargin: geometry?.margin ?? 0,
    scrollPaddingStart: geometry?.headerHeight ?? 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    const body = bodyRef.current;
    const header = headerRef.current;
    if (!container || !body || !header) return;

    const measure = () => {
      // Include content above the table, while keeping the sticky header clear.
      const margin = Math.round(
        body.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop -
          container.clientTop,
      );
      const headerHeight = Math.ceil(header.getBoundingClientRect().height);
      setGeometry(previous =>
        previous?.margin === margin && previous.headerHeight === headerHeight
          ? previous
          : { margin, headerHeight },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(header);
    observer.observe(body);
    return () => observer.disconnect();
  }, [containerRef, headerRef]);

  useEffect(() => {
    if (!geometry) return;
    const previous = lastReveal.current;
    if (previous?.rows === rows && previous.highlightedRowId === highlightedRowId) return;
    lastReveal.current = { rows, highlightedRowId };

    const index = rows.findIndex(row => row.id === highlightedRowId);
    if (index >= 0) {
      const alreadyRendered = virtualizer.getVirtualItems().some(item => item.index === index);
      virtualizer.scrollToIndex(index, { align: alreadyRendered ? 'auto' : 'center' });
    } else if (previous?.rows !== rows) {
      virtualizer.scrollToOffset(0);
    }
    // Geometry updates and closing details must preserve the user's scroll position.
  }, [rows, highlightedRowId, virtualizer, geometry]);

  const items = virtualizer.getVirtualItems();
  const margin = geometry?.margin ?? 0;
  const paddingTop = items.length ? items[0].start - margin : 0;
  const paddingBottom = items.length
    ? virtualizer.getTotalSize() - (items[items.length - 1].end - margin)
    : 0;

  return (
    <TableBody ref={bodyRef}>
      {paddingTop > 0 && (
        <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-0" style={{ height: paddingTop }} />
        </TableRow>
      )}
      {items.map(item =>
        renderRow(rows[item.index], {
          ref: virtualizer.measureElement,
          'data-index': item.index,
          'aria-rowindex': item.index + 2,
        }),
      )}
      {paddingBottom > 0 && (
        <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-0" style={{ height: paddingBottom }} />
        </TableRow>
      )}
    </TableBody>
  );
}
