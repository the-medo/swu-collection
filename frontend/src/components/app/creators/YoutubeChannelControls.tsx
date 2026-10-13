import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { useFetchYoutubeVideos, useYoutubeAutoImport } from '@/api/creators';
import {
  CHANNEL_FETCH_COOLDOWN_MS,
  type CreatorYoutubeStatus,
} from '../../../../../shared/creators/contracts.ts';
import { Status } from './CreatorControls.tsx';

export default function YoutubeChannelControls({
  creatorId,
  channel,
  fetchingConfigured,
  disabled,
}: {
  creatorId: string;
  channel: CreatorYoutubeStatus['channels'][number];
  fetchingConfigured: boolean;
  disabled: boolean;
}) {
  const settings = useYoutubeAutoImport();
  const fetchVideos = useFetchYoutubeVideos();
  const [clock, setClock] = useState(Date.now);
  const nextFetchAt = channel.lastManualFetchAt
    ? Date.parse(channel.lastManualFetchAt) + CHANNEL_FETCH_COOLDOWN_MS
    : 0;
  const coolingDown = nextFetchAt > clock;
  useEffect(() => {
    if (!nextFetchAt) return;
    const timer = window.setTimeout(
      () => setClock(Date.now()),
      Math.max(0, nextFetchAt - Date.now()) + 50,
    );
    return () => window.clearTimeout(timer);
  }, [nextFetchAt]);
  const switchId = `auto-import-${channel.channelId}`;
  return (
    <div className="w-full space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label
          htmlFor={switchId}
          className="flex cursor-pointer items-center gap-3 text-sm font-medium"
        >
          <Switch
            id={switchId}
            checked={channel.autoImportEnabled}
            aria-label={`Auto-import from ${channel.title}`}
            disabled={disabled || settings.isPending}
            onCheckedChange={autoImportEnabled =>
              settings.mutate({ id: creatorId, channelId: channel.channelId, autoImportEnabled })
            }
          />
          Auto-import {channel.autoImportEnabled ? 'on' : 'off'}
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || fetchVideos.isPending || coolingDown || !fetchingConfigured}
          aria-label={`Fetch new videos from ${channel.title}`}
          onClick={() => fetchVideos.mutate({ id: creatorId, channelId: channel.channelId })}
        >
          {fetchVideos.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          {fetchVideos.isPending ? 'Checking YouTube…' : 'Fetch new videos'}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {channel.autoImportEnabled
          ? 'New uploads are checked automatically.'
          : 'Automatic imports are paused. Existing videos stay visible.'}{' '}
        Fetch checks the last seven days for this channel, even while paused. New videos are queued
        for background processing.
      </p>
      {!fetchingConfigured && (
        <p className="text-xs text-muted-foreground">
          Video fetching is not configured on this server yet.
        </p>
      )}
      {coolingDown && (
        <p className="text-xs text-muted-foreground">
          You can fetch again at{' '}
          {new Date(nextFetchAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}
      <Status error={settings.error ?? fetchVideos.error} />
      {fetchVideos.data && (
        <p role="status" className="text-sm">
          {fetchVideos.data.enqueued
            ? `${fetchVideos.data.enqueued} video${fetchVideos.data.enqueued === 1 ? '' : 's'} queued. They will appear after background processing.`
            : 'No new videos to queue.'}
          {fetchVideos.data.incomplete &&
            ' Checked the latest 150 uploads; older uploads may still be missing. You can import a specific video below.'}
        </p>
      )}
    </div>
  );
}
