import { useRef, useState } from 'react';
import { YoutubeClaimButton, YoutubeClaimConfirmation } from './YoutubeClaim.tsx';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  LayoutDashboard,
  PenLine,
  Plus,
  Settings2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import type {
  CreationDocument,
  CreatorStudioFilters,
} from '../../../../../shared/creators/contracts.ts';
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
import { toast } from '@/hooks/use-toast.ts';
import { studioPaths, type StudioSection } from './studioNavigation.ts';

export type StudioSearch = Omit<CreatorStudioFilters, 'medium'> & {
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
  onDraftCreated,
  section,
  onVideoImported,
}: {
  section: StudioSection;
  search: StudioSearch;
  onChange: (patch: Partial<StudioSearch>) => void;
  onDraftCreated: (id: string) => void;
  onVideoImported: (creatorId: string, creationId: string) => void;
}) {
  const user = useUser();
  const displayName =
    user && 'displayName' in user && typeof user.displayName === 'string' ? user.displayName : '';
  const mine = useHubQuery(creatorKeys.mine, hubApi.mine, true, true);
  const counts = useHubQuery(creatorKeys.personalCounts, hubApi.personalCounts, true, true);
  const [profileMode, setProfileMode] = useState<'new' | 'edit' | null>(null);
  const [newCreation, setNewCreation] = useState<CreationDocument['medium'] | null>(null);
  const [newDraftId, setNewDraftId] = useState<string>();
  const [previousCreationId, setPreviousCreationId] = useState(search.creationId);
  const [settings, setSettings] = useState(!!search.youtube);
  const profile = mine.data?.find(p => p.id === search.creatorId);
  const creatorId = search.creatorId ?? null;
  const filters: CreatorStudioFilters = {
    q: search.q,
    status: search.status,
    medium: section === 'articles' ? 'article' : section === 'videos' ? 'video' : undefined,
  };
  const filtered = !!search.q || !!search.status;
  const publications = useHubQuery(
    creatorKeys.studio(creatorId, search.page ?? 1, filters),
    () => hubApi.studio(creatorId, search.page ?? 1, filters),
    !creatorId || !!profile,
    true,
  );
  const draft = useHubQuery(
    creatorKeys.draft(search.creationId),
    () => hubApi.draft(search.creationId!),
    !!search.creationId,
    true,
  );
  // Keep the new editor mounted when its first save adds the ID to the URL,
  // but clear its local state before rendering a different editor or the library.
  if (previousCreationId !== search.creationId) {
    setPreviousCreationId(search.creationId);
    if (newDraftId && search.creationId !== newDraftId) {
      setNewDraftId(undefined);
      setNewCreation(null);
    }
  }
  const editing = !!newCreation || !!search.creationId;
  const EmptyIcon = section === 'videos' ? Video : PenLine;
  const finish = () => {
    setNewDraftId(undefined);
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
      <Helmet
        title={`${section === 'overview' ? '' : section === 'articles' ? 'Articles · ' : 'Videos · '}Creator studio | SWUBASE`}
      />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--creator-soft)] text-[var(--creator-accent)]"
            aria-hidden="true"
          >
            <LayoutDashboard size={20} />
          </span>
          <div className="grid min-w-0 gap-1">
            <h1 className={workspaceStyles.title}>Creator studio</h1>
            <p className="text-xs text-muted-foreground">
              Write articles, share videos, and manage your creator profile.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/content">
            Explore the hub <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </Button>
      </header>
      <nav
        aria-label="Studio sections"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {(
          [
            ['overview', 'Overview', LayoutDashboard],
            ['articles', 'Articles', PenLine],
            ['videos', 'Videos', Video],
          ] as const
        ).map(([value, label, Icon]) => (
          <Link
            key={value}
            to={studioPaths[value]}
            activeOptions={{ exact: true, includeSearch: false }}
            search={{ creatorId: search.creatorId }}
            aria-current={section === value ? 'page' : undefined}
            className={cn(workspaceStyles.tab, 'min-h-9')}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
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
          onDeleted={alreadyMissing => {
            setProfileMode(null);
            setSettings(false);
            onChange({
              creatorId: undefined,
              creationId: undefined,
              page: 1,
              q: undefined,
              status: undefined,
            });
            toast({
              title: alreadyMissing
                ? 'Creator profile no longer exists'
                : 'Creator profile deleted',
              description: 'Your personal library is ready.',
            });
          }}
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
                <Button asChild size="sm" variant="ghost" className="text-foreground">
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
                    className="text-foreground"
                    disabled={editing}
                    onClick={() => setProfileMode('edit')}
                  >
                    Edit profile
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={settings && !editing}
                    className={cn('text-foreground', settings && creatorSelectedControl)}
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
                  className="text-foreground"
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
            {!editing && section === 'overview' && (
              <div className="grid gap-3 sm:grid-cols-2" aria-label="Choose what to create">
                {(
                  [
                    [
                      'articles',
                      'Articles',
                      'Write, edit, and publish articles. Keep drafts private until they are ready.',
                      PenLine,
                    ],
                    [
                      'videos',
                      'Videos',
                      'Connect YouTube, import videos, and manage the videos on your creator profile.',
                      Video,
                    ],
                  ] as const
                ).map(([value, title, description, Icon]) => (
                  <Link
                    key={value}
                    to={studioPaths[value]}
                    search={{ creatorId: search.creatorId }}
                    aria-label={`Open ${value}`}
                    className={`${workspaceStyles.panel} group grid gap-2 p-4 transition-colors hover:border-[var(--creator-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <Icon size={22} className="text-[var(--creator-accent)]" aria-hidden="true" />
                    <h2 className={creatorSubheading}>{title}</h2>
                    <p className={creatorDescription}>{description}</p>
                    <span className="mt-1 flex items-center gap-2 text-sm font-medium text-[var(--creator-accent)]">
                      Open {value}
                      <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {!editing &&
              section !== 'videos' &&
              profile &&
              profile.ownerId === user?.id &&
              !!counts.data?.total && (
                <TransferArticles
                  key={`transfer:${profile.id}`}
                  creatorId={profile.id}
                  name={profile.name}
                  counts={counts.data}
                />
              )}
            {settings && !editing && profile && profile.ownerId === user?.id && (
              <CreatorConnections
                key={`connections:${profile.id}`}
                id={profile.id}
                connectedChannelId={
                  ['connected', 'claimed'].includes(search.youtube ?? '') &&
                  search.creatorId === profile.id
                    ? search.youtubeChannelId
                    : undefined
                }
                onImported={creationId => onVideoImported(profile.id, creationId)}
              />
            )}
            {section === 'videos' &&
              !settings &&
              !editing &&
              profile?.ownerId === user?.id &&
              profile && (
                <YoutubeConnection
                  key={`video-channel:${profile.id}`}
                  creatorId={profile.id}
                  onImported={creationId => onVideoImported(profile.id, creationId)}
                />
              )}
            {newCreation ? (
              <CreationEditor
                key={`new:${creatorId ?? 'personal'}`}
                creatorId={creatorId}
                medium={newCreation}
                onClose={finish}
                onCreated={id => {
                  setNewDraftId(id);
                  onDraftCreated(id);
                }}
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
                      {section === 'videos'
                        ? 'Videos'
                        : section === 'articles'
                          ? 'Articles'
                          : profile
                            ? 'Your creations'
                            : 'My articles'}
                    </h2>
                    {section === 'videos' ? (
                      profile && (
                        <Button size="sm" onClick={() => setNewCreation('video')}>
                          <Plus size={15} aria-hidden="true" />
                          Share a video
                        </Button>
                      )
                    ) : section === 'overview' && profile ? (
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
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={event => {
                      event.preventDefault();
                      const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
                      onChange({ q: q || undefined, page: 1 });
                    }}
                  >
                    <label className="grid min-w-0 flex-1 basis-56 gap-1 text-xs font-medium">
                      Search your creations
                      <Input
                        key={search.q ?? ''}
                        name="q"
                        type="search"
                        maxLength={120}
                        defaultValue={search.q ?? ''}
                        placeholder="Search by title"
                      />
                    </label>
                    <Button type="submit" variant="outline" aria-label="Search creations">
                      Search
                    </Button>
                    <label className="grid gap-1 text-xs font-medium">
                      Publication status
                      <select
                        className={selectClass}
                        value={search.status ?? ''}
                        onChange={event =>
                          onChange({
                            status: (event.target.value || undefined) as StudioSearch['status'],
                            page: 1,
                          })
                        }
                      >
                        <option value="">All statuses</option>
                        <option value="draft">Drafts</option>
                        <option value="published">Published</option>
                        <option value="changes">Unpublished changes</option>
                      </select>
                    </label>
                    {filtered && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onChange({ q: undefined, status: undefined, page: 1 })}
                      >
                        Clear filters
                      </Button>
                    )}
                  </form>
                  <Status compact loading={publications.isPending} error={publications.error} />
                  {publications.data?.items.length === 0 && (
                    <div
                      className={`${workspaceStyles.panel} grid justify-items-center gap-2 px-4 py-8 text-center`}
                    >
                      <EmptyIcon
                        size={24}
                        className="mb-1 text-[var(--creator-accent)]"
                        aria-hidden="true"
                      />
                      <h3 className={creatorSubheading}>
                        {filtered
                          ? 'No creations match these filters.'
                          : section === 'videos'
                            ? profile
                              ? 'Share your first video'
                              : 'Choose a creator profile for your videos'
                            : 'Bring your first idea to the community'}
                      </h3>
                      <p className={`${creatorDescription} max-w-xl`}>
                        {filtered
                          ? 'Try another title or clear the filters to see all your creations.'
                          : section === 'videos'
                            ? profile
                              ? 'Share a video link or connect YouTube to import videos from your channel.'
                              : 'Choose a creator profile using Publish as, or connect or claim a YouTube channel to get started. Personal publishing is for articles.'
                            : section === 'articles'
                              ? 'Write a new article and save a draft. Publish it when you are ready to share.'
                              : profile
                                ? 'Write an article, share a video or podcast, or connect YouTube.'
                                : 'Start writing with your personal profile. You can move your articles to a creator profile whenever you are ready.'}
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2" data-studio-results>
                    {publications.data?.items.map(item => (
                      <div
                        key={item.id}
                        className={`${workspaceStyles.panel} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}
                      >
                        <div className="min-w-0 flex-1 basis-56">
                          <h3 className={`${workspaceStyles.heading} break-words`}>
                            <Link
                              to={studioPaths[section]}
                              className="text-left hover:underline focus-visible:underline"
                              search={previous => ({
                                ...previous,
                                youtube: undefined,
                                youtubeChannelId: undefined,
                                youtubeClaimId: undefined,
                                youtubeError: undefined,
                                transferredDecks: undefined,
                                creatorId: item.creatorId ?? undefined,
                                creationId: item.id,
                              })}
                              resetScroll={false}
                            >
                              {item.document.title}
                            </Link>
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
                            <time
                              dateTime={item.updatedAt}
                              className="text-xs text-muted-foreground"
                            >
                              Edited{' '}
                              {new Date(item.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </time>
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
