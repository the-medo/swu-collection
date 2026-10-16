import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
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
import { CreatorHeader, CreatorLayout } from './CreatorLayout.tsx';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorPagination,
  creatorPanel,
  creatorSubheading,
} from './creatorStyles.ts';

export type StudioSearch = {
  creatorId?: string;
  creationId?: string;
  page?: number;
  youtube?: 'connected' | 'failed';
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
    <CreatorLayout>
      <Helmet title="Writing studio | SWUBASE" />
      <CreatorHeader
        eyebrow="Your voice. Your community."
        title="Writing studio"
        description="Write as yourself or publish with a creator profile. Your personal articles are always yours to manage."
      >
        <Button
          variant="outline"
          asChild
          className="rounded-lg border-white/25 bg-transparent text-[#fffaf0] hover:bg-white/10 hover:text-[#fffaf0]"
        >
          <Link to="/content">Explore the hub</Link>
        </Button>
      </CreatorHeader>
      <Status loading={mine.isPending} error={mine.error} />
      {search.youtube === 'failed' && (
        <p role="alert" className={`${creatorPanel} text-[13px]!`}>
          YouTube could not be connected. Try again with the account that manages your channel.
        </p>
      )}
      {profileMode ? (
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
            <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card p-3">
              <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
                Publish as
                <select
                  aria-label="Publish as"
                  disabled={editing}
                  className={`${selectClass} sm:w-64`}
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
                <Button asChild variant="outline">
                  <Link to="/creators/$slug" params={{ slug: profile.slug }}>
                    View profile
                  </Link>
                </Button>
              )}
              {profile && profile.ownerId === user?.id && (
                <>
                  <Button variant="ghost" disabled={editing} onClick={() => setProfileMode('edit')}>
                    Edit profile
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={editing}
                    onClick={() => setSettings(value => !value)}
                  >
                    Connections & editors
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                disabled={editing || counts.isFetching}
                onClick={() => {
                  void counts.refetch().then(result => {
                    if (!result.error) setProfileMode('new');
                  });
                }}
              >
                Create creator profile
              </Button>
            </div>
            {creatorId && !profile && (
              <p role="alert">
                This creator profile is unavailable. Choose Personal or another profile you manage.
              </p>
            )}
            <Status error={counts.error} />
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
                  search.youtube === 'connected' && search.creatorId === profile.id
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
                <Status loading={draft.isPending} error={draft.error} />
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
                  <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                    <h2 className={creatorHeading}>{profile ? 'Your creations' : 'My articles'}</h2>
                    {profile ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button>Create something new</Button>
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
                      <Button onClick={() => setNewCreation('article')}>Write an article</Button>
                    )}
                  </div>
                  <Status loading={publications.isPending} error={publications.error} />
                  {publications.data?.items.length === 0 && (
                    <div className={`${creatorEmpty} grid gap-3`}>
                      <h3 className={`${creatorHeading} text-foreground`}>
                        Bring your first idea to the community
                      </h3>
                      <p className={creatorDescription}>
                        {profile
                          ? 'Write an article, share a video or podcast, or connect YouTube.'
                          : 'Start writing with your personal profile. You can move your articles to a creator profile whenever you are ready.'}
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {publications.data?.items.map(item => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-border bg-card p-5"
                      >
                        <div className="min-w-0 flex-1 basis-56">
                          <h3 className={creatorSubheading}>{item.document.title}</h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge variant={item.publishedAt ? 'default' : 'secondary'}>
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
                            <Button asChild variant="outline">
                              <Link to="/content/$creationId" params={{ creationId: item.id }}>
                                View
                              </Link>
                            </Button>
                          )}
                          <Button
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
                      variant="outline"
                      disabled={(search.page ?? 1) <= 1}
                      onClick={() => onChange({ page: (search.page ?? 1) - 1 })}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {search.page ?? 1}</span>
                    <Button
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
    <section className={`${creatorPanel} space-y-3`}>
      <h2 className={creatorHeading}>Bring your personal articles to {name}</h2>
      <p className={creatorDescription}>
        Move all {counts.total} personal articles, including {counts.drafts} drafts. Links and
        publication dates stay the same. Drafts stay private and become available to this creator’s
        editors. Future personal articles stay personal.
      </p>
      <Status error={transfer.error} />
      <Button
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
      <section className={`${creatorPanel} grid gap-4 [&>button]:justify-self-start`}>
        <h2 className={creatorHeading}>Editors</h2>
        <p className={creatorDescription}>
          Editors can write and publish creations for this profile. Only the owner manages branding,
          channel connections and editor access.
        </p>
        <Status loading={members.isPending} error={members.error ?? member.error} />
        {members.data?.map(person => (
          <div key={person.userId} className="flex items-center justify-between text-sm">
            <span>{person.name}</span>
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
        <Button variant="outline" onClick={() => setAddEditor(p => !p)}>
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
