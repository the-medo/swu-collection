import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
export type PublicProfileSummary = { id: string; displayName: string; image: string | null };
const ProfilePreview = lazy(() => import('./UserProfilePreview.tsx'));
export function UserProfilePopover({
  user,
  children,
}: {
  user: PublicProfileSummary;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-1rem)] overflow-hidden p-0"
        aria-label={`${user.displayName}'s profile`}
      >
        {open && (
          <Suspense
            fallback={
              <p role="status" className="p-4">
                Loading profile…
              </p>
            }
          >
            <ProfilePreview user={user} />
          </Suspense>
        )}
      </PopoverContent>
    </Popover>
  );
}
