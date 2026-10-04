import { CalendarDays, MapPin, Pencil } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import type { ReactNode } from 'react';
import { userLocale } from '@/lib/locale.ts';
import type { User } from '../../../../../../types/User.ts';

type ProfileSidebarProps = {
  children?: ReactNode;
  user: Pick<User, 'displayName' | 'image' | 'createdAt' | 'state'>;
  country?: { name: string; flag: string };
};

const membershipDate = new Intl.DateTimeFormat(userLocale, { month: 'long', year: 'numeric' });

// Keep half the avatar above the cover's bottom edge at every size.
const avatarClassName =
  'relative z-1 -mt-9.5 size-19 shrink-0 rounded-full shadow-[0_0_0_6px_hsl(var(--background)),0_0_0_7px_hsl(var(--border))] @[401px]/main-body:-mt-12 @[401px]/main-body:size-24 @[761px]/main-body:-mt-16 @[761px]/main-body:size-32 @[1001px]/main-body:-mt-18 @[1001px]/main-body:size-36';

function ProfileAvatarLayout({ children }: { children: ReactNode }) {
  return (
    <div className="col-start-1 row-start-1 flex items-start justify-center @[761px]/main-body:border-r @[761px]/main-body:border-border @[761px]/main-body:bg-card">
      {children}
    </div>
  );
}

export function ProfileAvatar({
  user,
  canEdit = false,
}: Pick<ProfileSidebarProps, 'user'> & { canEdit?: boolean }) {
  const initials = user.displayName.trim().slice(0, 2).toUpperCase() || '?';
  return (
    <ProfileAvatarLayout>
      <Avatar className={avatarClassName}>
        <AvatarImage
          src={user.image ?? undefined}
          alt={user.displayName}
          className="object-cover"
        />
        <AvatarFallback className="bg-primary text-3xl font-semibold text-primary-foreground">
          {initials}
        </AvatarFallback>
        {canEdit && (
          <Link
            to="/settings"
            search={{ page: 'profile' }}
            hash="avatar-heading"
            aria-label="Edit avatar"
            title="Edit avatar"
            className="group absolute inset-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none pointer-coarse:inset-auto pointer-coarse:right-[12%] pointer-coarse:bottom-[12%] pointer-coarse:size-7 pointer-coarse:opacity-100">
              <Pencil className="size-6 pointer-coarse:size-4" aria-hidden="true" />
            </span>
          </Link>
        )}
      </Avatar>
    </ProfileAvatarLayout>
  );
}

function ProfileMetadata({ user, country }: Pick<ProfileSidebarProps, 'user' | 'country'>) {
  const location = [user.state, country?.name].filter(Boolean).join(', ');
  return (
    <dl className="grid w-full min-w-0 grid-cols-2 gap-5 text-sm @[761px]/main-body:grid-cols-1 @[761px]/main-body:gap-6">
      {location && (
        <div className="min-w-0">
          <dt className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" /> Location
          </dt>
          <dd className="m-0 flex min-w-0 items-center gap-2 font-medium">
            {country && <img src={country.flag} alt="" className="w-5 shrink-0 rounded-xs" />}
            <span className="[overflow-wrap:anywhere]">{location}</span>
          </dd>
        </div>
      )}
      {user.createdAt && (
        <div className="min-w-0">
          <dt className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" /> Member since
          </dt>
          <dd className="m-0 font-medium">{membershipDate.format(new Date(user.createdAt))}</dd>
        </div>
      )}
    </dl>
  );
}

function ProfileSidebarLayout({ children }: { children: ReactNode }) {
  return (
    <aside
      className="col-span-2 row-start-3 min-w-0 border-border px-2 py-6 @[761px]/main-body:col-span-1 @[761px]/main-body:col-start-1 @[761px]/main-body:row-span-2 @[761px]/main-body:row-start-2 @[761px]/main-body:border-r @[761px]/main-body:bg-card @[761px]/main-body:px-6 @[761px]/main-body:pb-9 @[1001px]/main-body:px-7"
      aria-label="Player details"
    >
      <div className="flex flex-col gap-6 @[761px]/main-body:gap-8">{children}</div>
    </aside>
  );
}

export function ProfileSidebar({ user, country, children }: ProfileSidebarProps) {
  return (
    <ProfileSidebarLayout>
      <ProfileMetadata user={user} country={country} />
      <div className="flex w-full flex-col gap-2 [&_a]:w-full [&_button]:w-full has-[>div:only-child:empty]:hidden">
        {children}
      </div>
    </ProfileSidebarLayout>
  );
}

export function ProfileSidebarSkeleton() {
  return (
    <ProfileSidebarLayout>
      <div className="grid w-full grid-cols-2 gap-5 @[761px]/main-body:grid-cols-1">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </ProfileSidebarLayout>
  );
}

export function ProfileAvatarSkeleton() {
  return (
    <ProfileAvatarLayout>
      <Skeleton className={avatarClassName} />
    </ProfileAvatarLayout>
  );
}
