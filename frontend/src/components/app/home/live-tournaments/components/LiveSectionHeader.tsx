import type { ReactNode } from 'react';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import { Badge } from '@/components/ui/badge.tsx';

export function LiveSectionHeader({
  title,
  detail,
  count,
  action,
}: {
  title: string;
  detail?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <SectionHeader
      headerAndTooltips={
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold">{title}</h4>
          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        </div>
      }
      dropdownMenu={
        action ?? (count !== undefined ? (
          <Badge variant="outline" className="rounded-md">
            {count}
          </Badge>
        ) : undefined)
      }
    />
  );
}
