import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { hubApi, useSetCreatorMember, creatorKeys, useHubQuery } from '@/api/creators';
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
  const user = useUser(),
    mine = useHubQuery(creatorKeys.mine, hubApi.mine, true, true);
  const [profileMode, setProfileMode] = useState<'new' | 'edit' | null>(null),
    [newCreation, setNewCreation] = useState(false),
    [settings, setSettings] = useState(!!search.youtube);
  const profile = mine.data?.find(p => p.id === search.creatorId) ?? mine.data?.[0];
  const publications = useHubQuery(
    creatorKeys.studio(profile?.id, search.page ?? 1),
    () => hubApi.studio(profile!.id, search.page ?? 1),
    !!profile,
    true,
  );
  const draft = useHubQuery(
    creatorKeys.draft(search.creationId),
    () => hubApi.draft(search.creationId!),
    !!search.creationId,
    true,
  );
  const editing = newCreation || !!search.creationId;
  const finish = () => {
    setNewCreation(false);
    onChange({ creationId: undefined });
  };
  return (
    <CreatorLayout>
      <Helmet title="Creator studio | SWUBASE" />
      <CreatorHeader
        eyebrow="Your voice. Your community."
        title="Creator studio"
        description="A home for your articles, videos and ideas. Shape your profile and share what you know."
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
          YouTube could not be connected. Try again and choose the account that manages your
          channel. If the problem continues, contact SWUBASE support.
        </p>
      )}
      {profileMode || (mine.data && !mine.data.length) ? (
        <ProfileEditor
          key={profileMode === 'edit' ? profile?.id : 'new'}
          profile={profileMode === 'edit' ? profile : undefined}
          onSaved={id => {
            setProfileMode(null);
            onChange({ creatorId: id, creationId: undefined });
          }}
          onCancel={() => setProfileMode(null)}
        />
      ) : (
        profile && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-border bg-card p-3">
              <select
                aria-label="Creator profile"
                disabled={editing}
                className={`${selectClass} sm:w-64`}
                value={profile.id}
                onChange={e => {
                  setNewCreation(false);
                  setSettings(false);
                  onChange({ creatorId: e.target.value, creationId: undefined, page: 1 });
                }}
              >
                {mine.data?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button asChild variant="outline">
                <Link to="/creators/$slug" params={{ slug: profile.slug }}>
                  View profile
                </Link>
              </Button>
              {profile.ownerId === user?.id && (
                <>
                  <Button variant="ghost" disabled={editing} onClick={() => setProfileMode('edit')}>
                    Edit profile
                  </Button>
                  <Button variant="ghost" disabled={editing} onClick={() => setSettings(s => !s)}>
                    Connections & editors
                  </Button>
                </>
              )}
              <Button variant="ghost" disabled={editing} onClick={() => setProfileMode('new')}>
                New creator profile
              </Button>
            </div>
            {settings && !editing && profile.ownerId === user?.id && (
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
              <CreationEditor key={`new:${profile.id}`} creatorId={profile.id} onClose={finish} />
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
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                  <h2 className={creatorHeading}>Your creations</h2>
                  <Button onClick={() => setNewCreation(true)}>Create something new</Button>
                </div>
                <Status loading={publications.isPending} error={publications.error} />
                {publications.data?.items.length === 0 && (
                  <div className={`${creatorEmpty} grid gap-3`}>
                    <h3 className={`${creatorHeading} text-foreground`}>
                      Bring your first idea to the community
                    </h3>
                    <p className={creatorDescription}>
                      Write an article, link a video or podcast, or connect YouTube to import your
                      work.
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
                          onClick={() => onChange({ creatorId: profile.id, creationId: item.id })}
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
            )}
          </>
        )
      )}
    </CreatorLayout>
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
