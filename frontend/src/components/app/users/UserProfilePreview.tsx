import { Link } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ProfileHeader } from './UserDetail/ProfileHeader.tsx';
import { useUserAchievements } from '@/api/user-profile/useUserAchievements.ts';
import type { PublicProfileSummary } from './UserProfilePopover.tsx';
export default function UserProfilePreview({ user }: { user: PublicProfileSummary }) {
  const achievements = useUserAchievements(user.id);
  return (
    <div>
      <div className="h-24 overflow-hidden [&>div]:h-full">
        <ProfileHeader userId={user.id} />
      </div>
      <div className="relative space-y-3 px-4 pb-4">
        <Avatar className="-mt-8 size-16 border-4 border-popover">
          <AvatarImage src={user.image ?? undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="break-words font-semibold">{user.displayName}</p>
        {!!achievements.data?.achievements.length && (
          <ul aria-label="Player achievements" className="space-y-2">
            {achievements.data.achievements.slice(0, 3).map(result => (
              <li key={result.slot} className="flex items-start gap-2 text-xs">
                <Trophy className="size-4 shrink-0 text-primary" />
                <Link
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: result.tournamentId }}
                  className="hover:underline"
                >
                  <span className="font-semibold">#{result.placement}</span> · {result.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/users/$userId" params={{ userId: user.id }}>
            Open profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
