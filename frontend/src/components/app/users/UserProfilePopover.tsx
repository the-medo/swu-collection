import { lazy, Suspense, useState, type ReactNode, type MouseEventHandler } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
export type PublicProfileSummary = { id: string; displayName: string; image?: string | null };
const ProfilePreview = lazy(() => import('./UserProfilePreview.tsx'));
export function UserProfilePopover({
  user,
  children,
  onLinkClick,
}: {
  user: PublicProfileSummary;
  children: ReactNode;
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-1rem)] overflow-hidden p-0"
        aria-label={`${user.displayName}'s profile`}
        onClick={event => event.stopPropagation()}
      >
        {open && (
          <Suspense
            fallback={
              <p role="status" className="p-4">
                Loading profile…
              </p>
            }
          >
            <ProfilePreview
              user={user}
              onLinkClick={event => {
                if (
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                )
                  setOpen(false);
                onLinkClick?.(event);
              }}
            />
          </Suspense>
        )}
      </PopoverContent>
    </Popover>
  );
}
