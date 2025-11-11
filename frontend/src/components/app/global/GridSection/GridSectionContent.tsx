import React from 'react';
import { cn } from '@/lib/utils.ts';

export type GridSectionContentProps = {
  children?: React.ReactNode;
};

export const GridSectionContent: React.FC<GridSectionContentProps> = ({ children }) => {
  return (
    <div
      className={cn('border rounded-lg bg-card p-4 shadow-xs h-full min-w-0 flex flex-col min-h-0')}
    >
      {children}
    </div>
  );
};

export default GridSectionContent;
