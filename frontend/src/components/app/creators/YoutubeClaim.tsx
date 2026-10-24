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
import { creatorDescription, creatorHeading, creatorPanel } from './creatorStyles.ts';

export function ClaimedBadge() {
  return (
    <Badge
      variant="outline"
      className="w-fit gap-1 border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
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
    <div className="grid justify-items-start gap-2">
      <Button
        className="bg-[#c62828] text-white hover:bg-[#a82020]"
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
        <Youtube size={17} aria-hidden="true" />
        {claim.isPending || redirecting ? 'Opening Google…' : children}
      </Button>
      <Status error={claim.error} />
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
      <section className={`${creatorPanel} space-y-4`}>
        <Status loading={pending.isPending} error={pending.error ?? cancel.error} />
        <Button
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
      className={`${creatorPanel} grid max-w-2xl gap-5`}
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
      <div className="flex items-center gap-4">
        <CreatorAvatar
          name={preview.channel.title}
          src={preview.channel.avatarUrl}
          className="size-14"
        />
        <div>
          <p className="text-xs text-muted-foreground">YouTube channel verified</p>
          <h2 className={creatorHeading}>{preview.channel.title}</h2>
        </div>
      </div>
      <h3 className={creatorHeading}>
        {existing ? 'Connect to your creator profile' : 'Create your creator profile?'}
      </h3>
      <p className={creatorDescription}>
        {existing
          ? 'This channel is not in the creator directory yet. Choose which of your profiles it belongs to.'
          : 'This channel is not in the creator directory yet. Create a profile with its name and avatar, then customize it in your studio.'}
      </p>
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
      <Status error={confirm.error ?? cancel.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {confirm.isPending
            ? 'Connecting…'
            : existing
              ? 'Connect channel'
              : 'Create creator profile'}
        </Button>
        <Button
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
