import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { Switch } from '@/components/ui/switch.tsx';
import { useToast } from '@/hooks/use-toast.ts';

export default function DevelopmentSettings() {
  const { toast } = useToast();
  const { data: shareDevelopmentData = false } = useGetUserSetting('share_development_data');
  const { data: shareDevelopmentDataMatches = false } = useGetUserSetting(
    'share_development_data_matches',
  );
  const shareDevelopmentDataMutation = useSetUserSetting('share_development_data');
  const shareDevelopmentDataMatchesMutation = useSetUserSetting('share_development_data_matches');

  const showError = (settingName: string) => {
    toast({
      variant: 'destructive',
      title: 'Unable to update development-data sharing',
      description: `Your ${settingName} setting was not saved. Please try again.`,
    });
  };

  const updateDevelopmentDataSharing = (enabled: boolean) => {
    shareDevelopmentDataMutation.mutate(enabled, {
      onError: () => showError('data-sharing'),
    });

    if (!enabled) {
      shareDevelopmentDataMatchesMutation.mutate(false, {
        onError: () => showError('match-data sharing'),
      });
    }
  };

  const updateMatchDataSharing = (enabled: boolean) => {
    shareDevelopmentDataMatchesMutation.mutate(enabled, {
      onError: () => showError('match-data sharing'),
    });
  };

  const isSaving =
    shareDevelopmentDataMutation.isPending || shareDevelopmentDataMatchesMutation.isPending;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Development data</h2>
        <p className="text-sm text-muted-foreground">
          SWU Base periodically creates a sanitized database for contributors and development
          environments. This lets contributors work with realistic data without receiving the
          complete production database.
        </p>
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <p className="font-medium">Please opt in only if you are comfortable with this.</p>
        <p className="mt-2 text-muted-foreground">
          The sanitized database can be downloaded by project contributors. Enabling sharing keeps
          your account&apos;s email and profile in that database so that signing in with the same
          Google or GitHub account locally can be linked to the retained data.
        </p>
      </div>

      <div className="flex items-start justify-between gap-6 rounded-md border p-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="share-development-data" className="font-medium">
            Share my development data
          </label>
          <p className="text-sm text-muted-foreground">
            Keep your user profile, decks, collections, wantlists, and card pools in the sanitized
            contributor database. Your account&apos;s email is retained solely to support local
            Google/GitHub account linking.
          </p>
          <p className="text-sm text-muted-foreground">
            Local copies make every retained account an administrator for feature testing. OAuth
            account links, access and refresh tokens, sessions, and verification values are always
            removed. The integration row&apos;s provider and scopes, plus your UI settings, are
            retained; provider identifiers and metadata are replaced. Free-text notes and
            descriptions are removed.
          </p>
        </div>
        <Switch
          id="share-development-data"
          checked={shareDevelopmentData}
          disabled={isSaving}
          onCheckedChange={updateDevelopmentDataSharing}
        />
      </div>

      <div className="flex items-start justify-between gap-6 rounded-md border p-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="share-development-data-matches"
            className={shareDevelopmentData ? 'font-medium' : 'font-medium text-muted-foreground'}
          >
            Share my match data
          </label>
          <p className="text-sm text-muted-foreground">
            Include your game results and event groupings for development of match and statistics
            features, including Karabast lobby-match records. Your free-text notes and external
            game and lobby identifiers are replaced, and raw Karabast payloads are never included.
          </p>
          <p className="text-sm text-muted-foreground">
            Contributors&apos; copies place opted-in match-data users in the “Swubase dev team!”;
            all production teams are removed.
          </p>
        </div>
        <Switch
          id="share-development-data-matches"
          checked={shareDevelopmentDataMatches}
          disabled={!shareDevelopmentData || isSaving}
          onCheckedChange={updateMatchDataSharing}
        />
      </div>
    </div>
  );
}
