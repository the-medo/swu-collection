import { useRef, useState } from 'react';
import { YoutubeClaimButton, YoutubeClaimConfirmation } from './YoutubeClaim.tsx';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { AlertCircle, ArrowUpRight, CheckCircle2, PenLine, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import type { CreationDocument } from '../../../../../shared/creators/contracts.ts';
import { useUser } from '@/hooks/useUser.ts';
import {
  hubApi,
  useSetCreatorMember,
  useTransferArticles,
  creatorKeys,
  useHubQuery,
} from '@/api/creators';
import { UserPicker } from '../rich-text-editor/shared/UserPicker.tsx';
import ProfileEditor from './ProfileEditor.tsx';
import CreationEditor from './CreationEditor.tsx';
import { selectClass, Status } from './CreatorControls.tsx';
import YoutubeConnection from './YoutubeConnection.tsx';
import { CreatorLayout } from './CreatorLayout.tsx';
import { workspaceStyles } from '../global/WorkspacePage/workspaceStyles.ts';
import {
  creatorDescription,
  creatorPagination,
  creatorSelectedControl,
  creatorSubheading,
} from './creatorStyles.ts';
import { cn } from '@/lib/utils.ts';

export type StudioSearch = {
  creatorId?: string;
  creationId?: string;
  page?: number;
  youtube?: 'connected' | 'failed' | 'claimed' | 'confirm';
  youtubeClaimId?: string;
  youtubeError?: 'already_claimed' | 'channel_mismatch';
  transferredDecks?: number;
  youtubeChannelId?: string;
};
export default function CreatorStudio({
  search,
  onChange,
}: {
  search: StudioSearch;
  onChange: (patch: Partial<StudioSearch>) => void;
}) {
  const user = useUser();
  const displayName =
    user && 'displayName' in user && typeof user.displayName === 'string' ? user.displayName : '';
  const mine = useHubQuery(creatorKeys.mine, hubApi.mine, true, true);
  const counts = useHubQuery(creatorKeys.personalCounts, hubApi.personalCounts, true, true);
  const [profileMode, setProfileMode] = useState<'new' | 'edit' | null>(null);
  const [newCreation, setNewCreation] = useState<CreationDocument['medium'] | null>(null);
  const [settings, setSettings] = useState(!!search.youtube);
  const profile = mine.data?.find(p => p.id === search.creatorId);
  const creatorId = search.creatorId ?? null;
  const publications = useHubQuery(
    creatorKeys.studio(creatorId, search.page ?? 1),
    () => hubApi.studio(creatorId, search.page ?? 1),
    !creatorId || !!profile,
    true,
  );
  const draft = useHubQuery(
    creatorKeys.draft(search.creationId),
    () => hubApi.draft(search.creationId!),
    !!search.creationId,
    true,
  );
  const editing = !!newCreation || !!search.creationId;
  const finish = () => {
    setNewCreation(null);
    onChange({
      creationId: undefined,
      creatorId:
        search.creationId && draft.data
          ? (draft.data.creatorId ?? undefined)
          : (creatorId ?? undefined),
    });
  };
  return (
    <CreatorLayout compact>
      <Helmet title="Writing studio | SWUBASE" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--creator-soft)] text-[var(--creator-accent)]"
            aria-hidden="true"
          >
            <PenLine size={20} />
          </span>
          <div className="grid min-w-0 gap-1">
            <h1 className={workspaceStyles.title}>Writing studio</h1>
            <p className="text-xs text-muted-foreground">
              Write as yourself or publish with a creator profile.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/content">
            Explore the hub <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </Button>
      </header>
      <Status compact loading={mine.isPending} error={mine.error} />
      {search.youtube === 'failed' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-card px-3 py-2.5 text-red-700 dark:text-red-300"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[13px]! leading-relaxed!">
            {search.youtubeError === 'already_claimed'
              ? 'This creator profile has already been claimed by another user. Connecting YouTube cannot change its owner.'
              : search.youtubeError === 'channel_mismatch'
                ? 'That YouTube channel does not belong to the profile you selected. Try again and choose the right channel or brand account.'
                : 'YouTube could not be connected. Try again and choose the account that manages your channel. If the problem continues, contact SWUBASE support.'}
          </p>
        </div>
      )}
      {search.youtube === 'claimed' && profile && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-soft)] px-3 py-2.5"
        >
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 text-[var(--creator-accent)]"
            aria-hidden="true"
          />
          <div className="grid min-w-0 gap-1">
            <h2 className={`${workspaceStyles.heading} break-words text-[var(--creator-accent)]`}>
              You now own {profile.name}
            </h2>
            <p className={cn(creatorDescription, 'text-foreground/80')}>
              Your existing videos and profile are ready to manage in this studio.
              {!!search.transferredDecks &&
                ` ${search.transferredDecks} deck${search.transferredDecks === 1 ? '' : 's'} moved to your “Youtube Connection Decklists” folder and are unlisted.`}
            </p>
          </div>
        </div>
      )}
      {search.youtube === 'confirm' && search.youtubeClaimId ? (
        <YoutubeClaimConfirmation
          claimId={search.youtubeClaimId}
          onCancel={() => onChange({ youtube: undefined })}
          onConnected={result => {
            setSettings(true);
            setProfileMode(null);
            onChange({
              creatorId: result.creatorId,
              youtube: result.claimed ? 'claimed' : 'connected',
              youtubeChannelId: result.channelId,
              transferredDecks: result.transferredDecks,
            });
          }}
        />
      ) : profileMode ? (
        <ProfileEditor
          key={profileMode === 'edit' ? profile?.id : 'new'}
          profile={profileMode === 'edit' ? profile : undefined}
          personalCounts={counts.data}
          onSaved={id => {
            setProfileMode(null);
            onChange({ creatorId: id, creationId: undefined, page: 1 });
          }}
          onCancel={() => setProfileMode(null)}
        />
      ) : (
        mine.data && (
          <>
            <div className={`${workspaceStyles.panel} flex flex-wrap items-center gap-2 p-2.5`}>
              <label className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-medium">
                Publish as
                <select
                  aria-label="Publish as"
                  disabled={editing}
                  className={cn(selectClass, 'h-9 sm:w-56')}
                  value={(search.creationId && draft.data ? draft.data.creatorId : creatorId) ?? ''}
                  onChange={event => {
                    setSettings(false);
                    onChange({
                      creatorId: event.target.value || undefined,
                      creationId: undefined,
                      page: 1,
                    });
                  }}
                >
                  <option value="">Personal — {displayName}</option>
                  {mine.data.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {profile && (
                <Button asChild size="sm" variant="ghost">
                  <Link to="/creators/$slug" params={{ slug: profile.slug }}>
                    View profile
                  </Link>
                </Button>
              )}
              {profile && profile.ownerId === user?.id && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={editing}
                    onClick={() => setProfileMode('edit')}
                  >
                    Edit profile
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={settings && !editing}
                    className={settings ? creatorSelectedControl : undefined}
                    disabled={editing}
                    onClick={() => setSettings(value => !value)}
                  >
                    <Settings2 size={14} aria-hidden="true" />
                    Connections & editors
                  </Button>
                </>
              )}
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto">
                {!editing && <YoutubeClaimButton>Connect or claim a channel</YoutubeClaimButton>}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={editing || counts.isFetching}
                  onClick={() => {
                    void counts.refetch().then(result => {
                      if (!result.error) setProfileMode('new');
                    });
                  }}
                >
                  <Plus size={14} aria-hidden="true" />
                  Create creator profile
                </Button>
              </div>
            </div>
            {creatorId && !profile && (
              <p role="alert">
                This creator profile is unavailable. Choose Personal or another profile you manage.
              </p>
            )}
            <Status compact error={counts.error} />
            {!editing && profile && profile.ownerId === user?.id && !!counts.data?.total && (
              <TransferArticles
                key={profile.id}
                creatorId={profile.id}
                name={profile.name}
                counts={counts.data}
              />
            )}
            {settings && !editing && profile && profile.ownerId === user?.id && (
              <CreatorConnections
                key={profile.id}
                id={profile.id}
                connectedChannelId={
                  ['connected', 'claimed'].includes(search.youtube ?? '') &&
                  search.creatorId === profile.id
                    ? search.youtubeChannelId
                    : undefined
                }
                onImported={creationId => onChange({ creatorId: profile.id, creationId })}
              />
            )}
            {newCreation ? (
              <CreationEditor
                key={`new:${creatorId ?? 'personal'}`}
                creatorId={creatorId}
                medium={newCreation}
                onClose={finish}
              />
            ) : search.creationId ? (
              <>
                <Status compact loading={draft.isPending} error={draft.error} />
                {draft.data && (
                  <CreationEditor
                    key={draft.data.id}
                    creatorId={draft.data.creatorId}
                    initial={draft.data}
                    onClose={finish}
                  />
                )}
              </>
            ) : (
              (!creatorId || profile) && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <h2 className={creatorSubheading}>
                      {profile ? 'Your creations' : 'My articles'}
                    </h2>
                    {profile ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm">
                            <Plus size={15} aria-hidden="true" />
                            Create something new
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setNewCreation('article')}>
                            Write an article
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setNewCreation('video')}>
                            Share a video
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setNewCreation('audio')}>
                            Share a podcast
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setNewCreation('external')}>
                            Share an external resource
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button size="sm" onClick={() => setNewCreation('article')}>
                        <PenLine size={15} aria-hidden="true" />
                        Write an article
                      </Button>
                    )}
                  </div>
                  <Status compact loading={publications.isPending} error={publications.error} />
                  {publications.data?.items.length === 0 && (
                    <div
                      className={`${workspaceStyles.panel} grid justify-items-center gap-2 px-4 py-8 text-center`}
                    >
                      <PenLine
                        size={24}
                        className="mb-1 text-[var(--creator-accent)]"
                        aria-hidden="true"
                      />
                      <h3 className={creatorSubheading}>Bring your first idea to the community</h3>
                      <p className={`${creatorDescription} max-w-xl`}>
                        {profile
                          ? 'Write an article, share a video or podcast, or connect YouTube.'
                          : 'Start writing with your personal profile. You can move your articles to a creator profile whenever you are ready.'}
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    {publications.data?.items.map(item => (
                      <div
                        key={item.id}
                        className={`${workspaceStyles.panel} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}
                      >
                        <div className="min-w-0 flex-1 basis-56">
                          <h3 className={`${workspaceStyles.heading} break-words`}>
                            {item.document.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={item.publishedAt ? creatorSelectedControl : undefined}
                            >
                              {item.publishedAt ? 'Published' : 'Draft'}
                            </Badge>
                            {item.publishedAt && item.hasUnpublishedChanges && (
                              <Badge variant="outline">Unpublished changes</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.document.medium}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {item.publishedAt && (
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/content/$creationId" params={{ creationId: item.id }}>
                                View
                              </Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onChange({
                                creatorId: item.creatorId ?? undefined,
                                creationId: item.id,
                              })
                            }
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={creatorPagination}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(search.page ?? 1) <= 1}
                      onClick={() => onChange({ page: (search.page ?? 1) - 1 })}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {search.page ?? 1}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!publications.data?.hasMore}
                      onClick={() => onChange({ page: (search.page ?? 1) + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )
            )}
          </>
        )
      )}
    </CreatorLayout>
  );
}
function TransferArticles({
  creatorId,
  name,
  counts,
}: {
  creatorId: string;
  name: string;
  counts: { total: number; drafts: number };
}) {
  const transfer = useTransferArticles();
  const requestId = useRef(crypto.randomUUID());
  return (
    <section className={`${workspaceStyles.panel} grid gap-3 p-4 [&>button]:justify-self-start`}>
      <h2 className={creatorSubheading}>Bring your personal articles to {name}</h2>
      <p className={creatorDescription}>
        Move all {counts.total} personal articles, including {counts.drafts} drafts. Links and
        publication dates stay the same. Drafts stay private and become available to this creator’s
        editors. Future personal articles stay personal.
      </p>
      <Status compact error={transfer.error} />
      <Button
        size="sm"
        variant="outline"
        disabled={transfer.isPending}
        onClick={() => {
          void transfer
            .mutateAsync({ creatorId, requestId: requestId.current })
            .then(() => {
              // New personal articles may have been saved after the transfer cutoff,
              // keeping this panel mounted. The next explicit move is a new operation.
              requestId.current = crypto.randomUUID();
            })
            .catch((error: Error & { status?: number }) => {
              if (error.status && error.status >= 400 && error.status < 500)
                requestId.current = crypto.randomUUID();
            });
        }}
      >
        {transfer.isPending ? 'Moving articles…' : 'Move all personal articles'}
      </Button>
    </section>
  );
}

function CreatorConnections({
  id,
  connectedChannelId,
  onImported,
}: {
  id: string;
  connectedChannelId?: string;
  onImported: (id: string) => void;
}) {
  const members = useHubQuery(creatorKeys.members(id), () => hubApi.members(id), true, true);
  const member = useSetCreatorMember();
  const [addEditor, setAddEditor] = useState(false);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <YoutubeConnection
        creatorId={id}
        connectedChannelId={connectedChannelId}
        onImported={onImported}
      />
      <section className={`${workspaceStyles.panel} grid gap-3 p-4 [&>button]:justify-self-start`}>
        <h2 className={creatorSubheading}>Editors</h2>
        <p className={creatorDescription}>
          Editors can write and publish creations for this profile. Only the owner manages branding,
          channel connections and editor access.
        </p>
        <Status compact loading={members.isPending} error={members.error ?? member.error} />
        {members.data?.map(person => (
          <div
            key={person.userId}
            className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm"
          >
            <span className="min-w-0 break-words">{person.name}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={member.isPending}
              onClick={() => {
                if (window.confirm('Remove this editor’s access?'))
                  member.mutate({ id, userId: person.userId, remove: true });
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setAddEditor(p => !p)}>
          <Plus size={14} aria-hidden="true" />
          Add an editor
        </Button>
        {addEditor && (
          <UserPicker
            onSelect={person => {
              if (
                window.confirm(`Allow ${person.displayName} to edit and publish for this creator?`)
              )
                void member
                  .mutateAsync({ id, userId: person.id, remove: false })
                  .then(() => setAddEditor(false))
                  .catch(() => {});
            }}
          />
        )}
      </section>
    </div>
  );
}
