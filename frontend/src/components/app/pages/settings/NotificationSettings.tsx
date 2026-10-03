import {
  useNotificationSettings,
  useSetNotificationSettings,
} from '@/api/notifications/useNotificationSettings.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { notificationDefinitions } from '../../../../../../shared/types/notifications.ts';

export default function NotificationSettings() {
  const user = useUser();
  const query = useNotificationSettings();
  const mutation = useSetNotificationSettings();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose what appears in your SWUBASE inbox.</p>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-medium">{notificationDefinitions['crossfire.invitation'].label}</p>
          <p className="text-sm text-muted-foreground">
            Always enabled when you have access to Crossfire, so you can respond to invitations.
          </p>
        </div>
        <Badge variant="secondary">Required</Badge>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="notify-deck-favorites">
            {notificationDefinitions['deck.favorite'].label}
          </Label>
          <p className="text-sm text-muted-foreground">
            When someone favorites one of your decks. Turning this off stops new notifications;
            existing ones stay in your inbox.
          </p>
        </div>
        {query.data && (
          <Switch
            id="notify-deck-favorites"
            checked={query.data.notifications_deck_favorites}
            disabled={!user || mutation.isPending || query.isError}
            onCheckedChange={enabled => {
              if (user)
                mutation.mutate({
                  userId: user.id,
                  settings: { notifications_deck_favorites: enabled },
                });
            }}
          />
        )}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="notify-team-members">
            {notificationDefinitions['team.member.joined'].label}
          </Label>
          <p className="text-sm text-muted-foreground">
            When a new member joins one of your teams. Turning this off stops new notifications;
            existing ones stay in your inbox.
          </p>
        </div>
        {query.data && (
          <Switch
            id="notify-team-members"
            checked={query.data.notifications_team_members}
            disabled={!user || mutation.isPending || query.isError}
            onCheckedChange={enabled => {
              if (user)
                mutation.mutate({
                  userId: user.id,
                  settings: { notifications_team_members: enabled },
                });
            }}
          />
        )}
      </div>
      {query.isPending && (
        <p role="status" className="text-sm">
          Loading notification settings…
        </p>
      )}
      {query.error && (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}{' '}
          <Button variant="link" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {mutation.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Saving…
        </p>
      )}
    </div>
  );
}
