import * as React from 'react';
import {
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore';
import ComparerEntryBadge from '@/components/app/comparer/SidebarComparer/ComparerEntryBadge.tsx';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar.tsx';
import { Scale } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

interface SidebarComparerProps {
  setOpenMobile: (open: boolean) => void;
  buttonClassName?: string;
}

const SidebarComparer: React.FC<SidebarComparerProps> = ({ setOpenMobile, buttonClassName }) => {
  const { entries, mainId } = useComparerStore();
  const { setMainId, removeComparerEntry } = useComparerStoreActions();
  const { open, isMobile } = useSidebar();
  const expanded = open || isMobile;

  return (
    <div>
      <SidebarMenuButton asChild tooltip="Comparer" className={buttonClassName}>
        <Link
          to="/comparer"
          aria-label="Open comparer"
          className="relative"
          onClick={() => setOpenMobile(false)}
        >
          <Scale className="size-4" />
          <span className="flex-1">Comparer</span>
          {entries.length > 0 && (
            <span
              aria-label={`${entries.length} comparison entries`}
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground',
                !expanded && 'absolute top-0 right-0',
              )}
            >
              {entries.length}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
      {expanded && entries.length > 0 && (
        <div
          role="group"
          aria-label="Comparison entries"
          className="mt-1 flex flex-wrap gap-1 rounded-lg border border-border bg-card/60 p-1"
        >
          {entries
            .slice()
            .sort((a, b) => {
              if (a.id === mainId) return -1;
              if (b.id === mainId) return 1;
              return 0;
            })
            .map(entry => (
              <ComparerEntryBadge
                key={entry.id}
                entry={entry}
                isMain={entry.id === mainId}
                onRemove={() => removeComparerEntry(entry.id)}
                onSetMain={() => setMainId(entry.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default SidebarComparer;
