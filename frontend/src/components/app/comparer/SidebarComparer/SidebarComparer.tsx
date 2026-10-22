import * as React from 'react';
import {
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore';
import ComparerEntryBadge from '@/components/app/comparer/SidebarComparer/ComparerEntryBadge.tsx';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar.tsx';
import { Scale } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface SidebarComparerProps {
  setOpenMobile: (open: boolean) => void;
}

const SidebarComparer: React.FC<SidebarComparerProps> = ({ setOpenMobile }) => {
  const { entries, mainId } = useComparerStore();
  const { setMainId, removeComparerEntry } = useComparerStoreActions();
  const { open, isMobile } = useSidebar();

  // If sidebar is collapsed, show only a single icon with a badge
  if (!open && !isMobile) {
    return (
      <SidebarMenuButton asChild tooltip="Comparer">
        <Link
          to={'/comparer'}
          className="relative [&.active]:font-bold"
          onClick={() => {
            setOpenMobile(false);
          }}
        >
          <Scale className="w-4 h-4" /> <span className="sr-only">Open comparer</span>
          {entries.length > 0 && (
            <span
              aria-label={`${entries.length} comparison entries`}
              className="absolute top-0 right-0 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
            >
              {entries.length}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    );
  }

  // If sidebar is open, show the full list of entries
  return (
    <div>
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card/60">
        <div className="w-full flex flex-wrap gap-1">
          {entries.length === 0 && (
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              Add decks or lists to compare.
            </span>
          )}
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
      </div>
    </div>
  );
};

export default SidebarComparer;
