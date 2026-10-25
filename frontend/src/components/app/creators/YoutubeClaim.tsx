import { useEffect, useState } from 'react';
import { BadgeCheck, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  creatorKeys,
  hubApi,
  useCancelYoutubeClaim,
  useClaimYoutube,
  useConfirmYoutubeClaim,
  useHubQuery,
} from '@/api/creators';
import type {
  YoutubeClaimPreview,
  YoutubeConnectionResult,
} from '../../../../../shared/creators/claims.ts';
import { CreatorAvatar } from './CreatorLayout.tsx';
import { Field, selectClass, Status } from './CreatorControls.tsx';
import { creatorDescription, creatorSubheading } from './creatorStyles.ts';
import { workspaceStyles } from '../global/WorkspacePage/workspaceStyles.ts';

export function ClaimedBadge() {
  return (
    <Badge
      variant="outline"
      className="w-fit gap-1 border-[var(--creator-border)] bg-[var(--creator-soft)] text-[var(--creator-accent)]"
    >
      <BadgeCheck size={13} aria-hidden="true" />
      Claimed
    </Badge>
  );
}

export function YoutubeClaimButton({
  creatorId,
  children = 'Connect YouTube',
}: {
  creatorId?: string;
  children?: React.ReactNode;
}) {
  const claim = useClaimYoutube();
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    const reset = () => setRedirecting(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);
  return (
    <div className="grid min-w-0 justify-items-start gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-auto min-h-9 whitespace-normal text-left"
        disabled={claim.isPending || redirecting}
        onClick={() =>
          claim.mutate(creatorId, {
            onSuccess: ({ url }) => {
              setRedirecting(true);
              window.location.assign(url);
            },
          })
        }
      >
        <Youtube size={16} className="text-[#c62828] dark:text-red-400" aria-hidden="true" />
        {claim.isPending || redirecting ? 'Opening Google…' : children}
      </Button>
      <Status compact error={claim.error} />
    </div>
  );
}

export function YoutubeClaimConfirmation({
  claimId,
  onConnected,
  onCancel,
}: {
  claimId: string;
  onConnected: (result: YoutubeConnectionResult) => void;
  onCancel: () => void;
}) {
  const pending = useHubQuery(
    creatorKeys.youtubeClaim(claimId),
    () => hubApi.youtubeClaim(claimId),
    true,
    true,
  );
  const cancel = useCancelYoutubeClaim();
  if (!pending.data)
    return (
      <section
        className={`${workspaceStyles.panel} grid max-w-2xl gap-3 p-4 [&>button]:justify-self-start`}
      >
        <Status compact loading={pending.isPending} error={pending.error ?? cancel.error} />
        <Button
          size="sm"
          variant="outline"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(claimId, { onSuccess: onCancel })}
        >
          Back to studio
        </Button>
      </section>
    );
  return (
    <ClaimChoice
      key={claimId}
      claimId={claimId}
      preview={pending.data}
      onConnected={onConnected}
      onCancel={onCancel}
    />
  );
}

function ClaimChoice({
  claimId,
  preview,
  onConnected,
  onCancel,
}: {
  claimId: string;
  preview: YoutubeClaimPreview;
  onConnected: (result: YoutubeConnectionResult) => void;
  onCancel: () => void;
}) {
  const confirm = useConfirmYoutubeClaim(),
    cancel = useCancelYoutubeClaim();
  const [name, setName] = useState(preview.channel.title),
    [slug, setSlug] = useState(preview.suggestedSlug),
    [creatorId, setCreatorId] = useState(preview.profiles[0]?.id ?? '');
  const existing = preview.profiles.length > 0,
    busy = confirm.isPending || cancel.isPending;
  return (
    <form
      className={`${workspaceStyles.panel} grid max-w-2xl gap-4 overflow-hidden p-4 sm:p-5`}
      onSubmit={event => {
        event.preventDefault();
        confirm.mutate(
          {
            claimId,
            choice: existing ? { action: 'connect', creatorId } : { action: 'create', name, slug },
          },
          { onSuccess: onConnected },
        );
      }}
    >
      <div className="-mx-4 -mt-4 flex min-w-0 items-center gap-3 border-b border-[var(--creator-border)] bg-[var(--creator-soft)] px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5">
        <CreatorAvatar
          name={preview.channel.title}
          src={preview.channel.avatarUrl}
          className="size-10 rounded-lg border-0 text-sm"
        />
        <div className="grid min-w-0 gap-1">
          <p className="flex items-center gap-1.5 text-xs text-[var(--creator-accent)]">
            <BadgeCheck size={14} className="shrink-0" aria-hidden="true" />
            YouTube channel verified
          </p>
          <h2 className={creatorSubheading}>{preview.channel.title}</h2>
        </div>
      </div>
      <div className="grid gap-1.5">
        <h3 className={creatorSubheading}>
          {existing ? 'Connect to your creator profile' : 'Create your creator profile?'}
        </h3>
        <p className={creatorDescription}>
          {existing
            ? 'This channel is not in the creator directory yet. Choose which of your profiles it belongs to.'
            : 'This channel is not in the creator directory yet. Create a profile with its name and avatar, then customize it in your studio.'}
        </p>
      </div>
      {existing ? (
        <Field label="Creator profile">
          <select
            className={selectClass}
            value={creatorId}
            disabled={busy}
            onChange={event => setCreatorId(event.target.value)}
          >
            {preview.profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Creator name">
            <Input
              required
              maxLength={100}
              disabled={busy}
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </Field>
          <Field label="Profile address" hint={`swubase.com/creators/${slug}`}>
            <Input
              required
              minLength={3}
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              disabled={busy}
              value={slug}
              onChange={event => setSlug(event.target.value.toLowerCase())}
            />
          </Field>
        </>
      )}
      <Status compact error={confirm.error ?? cancel.error} />
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" type="submit" disabled={busy}>
          {confirm.isPending
            ? 'Connecting…'
            : existing
              ? 'Connect channel'
              : 'Create creator profile'}
        </Button>
        <Button
          size="sm"
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => cancel.mutate(claimId, { onSuccess: onCancel })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
