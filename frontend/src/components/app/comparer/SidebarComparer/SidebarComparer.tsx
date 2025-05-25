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
  const { open } = useSidebar();

  // If sidebar is collapsed, show only a single icon with a badge
  if (!open) {
    return (
      <SidebarMenuButton>
        <Link
          to={'/comparer'}
          className="relative [&.active]:font-bold"
          onClick={() => {
            setOpenMobile(false);
          }}
        >
          <Scale className="w-4 h-4" /> <span className="sr-only">Open comparer</span>
          {entries.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {entries.length}
            </div>
          )}
        </Link>
      </SidebarMenuButton>
    );
  }

  // If sidebar is open, show the full list of entries
  return (
    <div className="p-1">
      <div className="flex flex-col gap-2 p-2 rounded-lg border-foreground dark:border-primary border-dashed border bg-accent/70">
        <div className="w-full flex flex-wrap gap-1">
          {entries.length === 0 && (
            <span className="text-xs italic text-secondary-foreground/70">No entries</span>
          )}
          {entries
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
