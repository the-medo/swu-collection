import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import { Badge } from '@/components/ui/badge.tsx';

export function LiveSectionHeader({
  title,
  detail,
  count,
}: {
  title: string;
  detail?: string;
  count?: number;
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
        count !== undefined ? (
          <Badge variant="outline" className="rounded-md">
            {count}
          </Badge>
        ) : undefined
      }
    />
  );
}
