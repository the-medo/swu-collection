import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, Youtube } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  creatorKeys,
  hubApi,
  useConnectYoutube,
  useDisconnectYoutube,
  useHubQuery,
  useImportVideo,
} from '@/api/creators';
import { cn } from '@/lib/utils.ts';
import { Field, selectClass, Status } from './CreatorControls.tsx';
import { creatorDescription, creatorLink, creatorSubheading } from './creatorStyles.ts';
import { workspaceStyles } from '../global/WorkspacePage/workspaceStyles.ts';
import YoutubeChannelControls from './YoutubeChannelControls.tsx';

export default function YoutubeConnection({
  creatorId,
  connectedChannelId,
  onImported,
}: {
  creatorId: string;
  connectedChannelId?: string;
  onImported: (id: string) => void;
}) {
  const youtube = useHubQuery(
    creatorKeys.youtube(creatorId),
    () => hubApi.youtube(creatorId),
    true,
    true,
  );
  const connect = useConnectYoutube(),
    disconnect = useDisconnectYoutube(),
    importVideo = useImportVideo();
  const [url, setUrl] = useState(''),
    [channelId, setChannelId] = useState(''),
    [redirecting, setRedirecting] = useState(false);
  const channels = youtube.data?.channels ?? [];
  const activeChannels = channels.filter(channel => channel.connected);
  const connectedChannel = activeChannels.find(channel => channel.channelId === connectedChannelId);
  const selectedChannel = activeChannels.some(channel => channel.channelId === channelId)
    ? channelId
    : (connectedChannel?.channelId ?? activeChannels[0]?.channelId ?? '');
  const connecting = connect.isPending || redirecting;
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  async function startConnection() {
    try {
      const result = await connect.mutateAsync(creatorId);
      setRedirecting(true);
      window.location.assign(result.url);
    } catch {
      // The mutation supplies the recoverable error below.
      setRedirecting(false);
    }
  }

  return (
    <section className={`${workspaceStyles.panel} grid gap-3 p-4`} aria-label="YouTube connection">
      <div className="grid gap-1.5">
        <h2 className={`${creatorSubheading} flex items-center gap-2`}>
          <Youtube
            size={18}
            className="shrink-0 text-[#c62828] dark:text-red-400"
            aria-hidden="true"
          />
          YouTube connection
        </h2>
        <p className={creatorDescription}>
          {channels.length
            ? 'Manage the YouTube channels connected to your creator profile.'
            : 'Connect your channel to help players find your public Star Wars Unlimited videos.'}
        </p>
      </div>
      <Status
        compact
        loading={youtube.isPending}
        error={youtube.error ?? connect.error ?? disconnect.error ?? importVideo.error}
      />
      {youtube.data && !youtube.data.configured && (
        <p className="text-sm text-muted-foreground">
          YouTube authorization is not configured on this server yet. You can still add video links
          manually.
        </p>
      )}
      {connectedChannel && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-[var(--creator-border)] bg-[var(--creator-soft)] p-3"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-[var(--creator-accent)]"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-[13px]! font-semibold text-[var(--creator-accent)]">
              YouTube connected
            </p>
            <p className="break-words text-[13px]!">
              {connectedChannel.title} is ready. Import a public video below, or connect another
              channel.
            </p>
          </div>
        </div>
      )}
      {(connectedChannel
        ? [
            connectedChannel,
            ...channels.filter(channel => channel.channelId !== connectedChannel.channelId),
          ]
        : channels
      ).map(channel => (
        <div
          key={channel.channelId}
          className={cn(
            'flex flex-wrap items-center gap-3 rounded-xl border p-3',
            channel.channelId === connectedChannel?.channelId && 'border-[var(--creator-accent)]',
          )}
        >
          <Avatar className="size-9">
            <AvatarImage
              src={channel.avatarUrl}
              alt={`${channel.title} channel avatar`}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback>
              <Youtube className="size-6 text-muted-foreground" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 basis-32">
            <a
              className="inline-flex max-w-full items-center gap-1 text-sm font-semibold hover:underline"
              href={`https://www.youtube.com/channel/${channel.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="truncate">{channel.title || channel.channelId}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
            <p className="text-xs text-muted-foreground">
              {channel.connected ? 'YouTube connected' : 'Google access disconnected'}
            </p>
            {!channel.connected && (
              <p className="mt-1 text-xs text-muted-foreground">
                Public auto-import is {channel.autoImportEnabled ? 'still enabled' : 'paused'}.
                Reconnect to restore account access.
              </p>
            )}
          </div>
          {channel.connected ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={disconnect.isPending || connecting}
              aria-label={`Disconnect ${channel.title}`}
              onClick={() => {
                if (
                  window.confirm(
                    'Disconnect Google access? Saved credentials and information imported through that permission will be removed. Public imports continue unless you turn off auto-import below.',
                  )
                )
                  disconnect.mutate({ id: creatorId, channelId: channel.channelId });
              }}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!youtube.data?.configured || connecting}
              onClick={() => void startConnection()}
            >
              Reconnect YouTube
            </Button>
          )}
          <YoutubeChannelControls
            creatorId={creatorId}
            channel={channel}
            fetchingConfigured={youtube.data?.fetchingConfigured ?? false}
            disabled={disconnect.isPending || connecting}
          />
        </div>
      ))}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-[var(--creator-accent)]"
          aria-hidden="true"
        />
        <div className="space-y-1 text-[13px]">
          <p className="font-semibold">Read-only YouTube access</p>
          <p className="text-muted-foreground">
            We use your channel name, avatar and public video details. SWUBASE cannot upload, edit
            or delete your YouTube videos.
          </p>
        </div>
      </div>
      <p className="text-[13px]! leading-relaxed text-muted-foreground">
        Public videos can be added automatically even when their SWU relevance is uncertain; clearly
        unrelated uploads are skipped. Public titles and descriptions may be sent to Google Gemini
        to suggest tags, sets and leaders. You can also import a video yourself as a draft.
      </p>
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          By connecting, you agree to our{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className={creatorLink}>
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer" className={creatorLink}>
            Terms of Service
          </Link>
          . Google will ask you to choose your Google account, then your YouTube or Brand Account.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-auto min-h-9 w-full whitespace-normal sm:w-auto"
          disabled={!youtube.data?.configured || connecting || disconnect.isPending}
          onClick={() => void startConnection()}
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Youtube className="size-4 text-[#c62828] dark:text-red-400" aria-hidden="true" />
          )}
          {connecting
            ? 'Opening Google…'
            : channels.length
              ? 'Connect another YouTube channel'
              : 'Connect a YouTube channel'}
        </Button>
      </div>
      {!!activeChannels.length && (
        <form
          className="space-y-3 border-t pt-3"
          onSubmit={event => {
            event.preventDefault();
            void importVideo
              .mutateAsync({ id: creatorId, channelId: selectedChannel, url })
              .then(result => {
                setUrl('');
                onImported(result.id);
              })
              .catch(() => {});
          }}
        >
          <Field label="Import from channel">
            <select
              className={selectClass}
              value={selectedChannel}
              onChange={event => setChannelId(event.target.value)}
            >
              {activeChannels.map(channel => (
                <option key={channel.channelId} value={channel.channelId}>
                  {channel.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Video URL">
            <Input
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              required
            />
          </Field>
          <Button
            size="sm"
            disabled={importVideo.isPending || !url || !selectedChannel || disconnect.isPending}
          >
            {importVideo.isPending ? 'Importing…' : 'Import as draft'}
          </Button>
        </form>
      )}
      <div className="space-y-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          Disconnecting removes saved Google credentials and data obtained through that permission.
          Independently imported public videos remain. Use the auto-import toggle to stop new
          automatic imports; this is separate from Google access. Contact{' '}
          <a href="mailto:info@swubase.com" className={creatorLink}>
            info@swubase.com
          </a>{' '}
          to request removal of stored channel or video data.
        </p>
        <a
          className={`${creatorLink} inline-flex items-center gap-1`}
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage access in your Google account{' '}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
