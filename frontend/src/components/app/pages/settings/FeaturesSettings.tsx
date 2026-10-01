import { useFeatureSettings, useSetFeatureSettings } from '@/api/user/useFeatureSettings.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';

export default function FeaturesSettings() {
  const user = useUser();
  const query = useFeatureSettings();
  const mutation = useSetFeatureSettings();
  return (
    <div className="max-w-xl space-y-4">
      <h3>Features</h3>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="use-tournament-attachments">Tournament attachments</Label>
          <p className="text-sm leading-snug! text-muted-foreground">
            Show Your attachments and Add attachment in tournament details. Turning this off keeps
            your existing attachments saved and private.
          </p>
        </div>
        {query.data && (
          <Switch
            id="use-tournament-attachments"
            checked={query.data.use_tournament_attachments}
            disabled={!user || query.isPending || query.isError || mutation.isPending}
            onCheckedChange={enabled => {
              if (user)
                mutation.mutate({
                  userId: user.id,
                  settings: { use_tournament_attachments: enabled },
                });
            }}
          />
        )}
      </div>
      {query.isPending && (
        <p role="status" className="text-sm">
          Loading feature settings…
        </p>
      )}
      {query.error && (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}{' '}
          <Button variant="link" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
