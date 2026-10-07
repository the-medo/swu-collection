import { useState } from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useTeamHeaderSettings, useSetTeamHeader } from '@/api/teams';
import { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { UploadedImagePicker } from '@/components/app/global/UploadedImagePicker.tsx';
import { GalleryImagePicker } from '@/components/app/global/GalleryImagePicker.tsx';
import { HeaderCropEditor } from '@/components/app/global/HeaderCropEditor.tsx';
import { ProfileHeaderPreview } from '@/components/app/users/UserDetail/ProfileHeader.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import type { HeaderCrop, HeaderImageOption } from '../../../../../../types/UserHeader.ts';
import type { TeamHeaderSettings as Settings } from '../../../../../../types/TeamHeader.ts';

export function TeamHeaderSettings({ teamId }: { teamId: string }) {
  const user = useUser();
  const query = useTeamHeaderSettings(teamId, user?.id);
  return (
    <section className="@container space-y-4 border-y py-5" aria-labelledby="team-header-heading">
      <div className="space-y-2">
        <h3 id="team-header-heading" className="text-xl! font-medium">
          Team header
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose one of your images or artwork from our gallery. Without an image, your team uses
          the default planet header.
        </p>
      </div>
      {query.isPending && (
        <p role="status" className="text-sm">
          Loading header settings…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {user && query.data && (
        <TeamHeaderEditor
          key={`${teamId}:${user.id}`}
          teamId={teamId}
          userId={user.id}
          settings={query.data}
        />
      )}
    </section>
  );
}

function TeamHeaderEditor({
  teamId,
  userId,
  settings,
}: {
  teamId: string;
  userId: string;
  settings: Settings;
}) {
  const [source, setSource] = useState<'upload' | 'gallery'>(settings.header.source ?? 'upload');
  const [selection, setSelection] = useState<HeaderImageOption | null>(settings.selection);
  const [initialCrop, setInitialCrop] = useState<HeaderCrop | null>(settings.crop);
  const mutation = useSetTeamHeader(teamId);
  const upload = useUploadUserFile();
  const { toast } = useToast();
  const busy = mutation.isPending || upload.isPending;
  const choose = (image: HeaderImageOption) => {
    setSelection(image);
    setInitialCrop(null);
    mutation.reset();
  };
  const save = async (crop: HeaderCrop) => {
    if (!selection) return;
    try {
      await mutation.mutateAsync({ ...selection.source, crop });
      toast({ title: 'Team header updated' });
    } catch {
      /* The mutation error is displayed below. */
    }
  };
  const remove = async () => {
    try {
      await mutation.mutateAsync({ source: 'none' });
      setSelection(null);
      setInitialCrop(null);
      toast({ title: 'Team header image removed' });
    } catch {
      /* The mutation error is displayed below. */
    }
  };
  const selectedId =
    selection?.source.source === 'upload'
      ? selection.source.fileId
      : selection?.source.source === 'gallery'
        ? selection.source.galleryImageId
        : undefined;
  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Current header</p>
          {settings.header.image && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void remove()}>
              {mutation.isPending ? 'Saving header…' : 'Remove header image'}
            </Button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border">
          <ProfileHeaderPreview header={settings.header} />
        </div>
      </div>
      {settings.header.image && !settings.selection && (
        <p className="text-sm text-muted-foreground">
          The original image is unavailable or belongs to another owner. Your saved header is still
          displayed; choose one of your own images or gallery artwork to change it.
        </p>
      )}
      <Tabs
        value={source}
        onValueChange={value => {
          if (!busy && (value === 'upload' || value === 'gallery')) {
            setSource(value);
            mutation.reset();
          }
        }}
      >
        <TabsList aria-label="Team header source">
          <TabsTrigger value="upload" disabled={busy}>
            My images
          </TabsTrigger>
          <TabsTrigger value="gallery" disabled={busy}>
            Gallery
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <UploadedImagePicker
            userId={userId}
            purpose="header"
            upload={upload}
            selectedId={selection?.source.source === 'upload' ? selectedId : undefined}
            disabled={mutation.isPending}
            onSelect={file =>
              choose({
                source: { source: 'upload', fileId: file.id },
                name: file.fileName,
                url: file.url,
                width: file.width,
                height: file.height,
              })
            }
          />
        </TabsContent>
        <TabsContent value="gallery">
          <GalleryImagePicker
            selectedId={selection?.source.source === 'gallery' ? selectedId : undefined}
            disabled={busy}
            onSelect={choose}
          />
        </TabsContent>
      </Tabs>
      {selection && selection.source.source === source && (
        <HeaderCropEditor
          key={selectedId}
          src={selection.url}
          name={selection.name}
          initialCrop={initialCrop}
          busy={busy}
          onSave={crop => void save(crop)}
          onCancel={() => {
            setSelection(null);
            mutation.reset();
          }}
        />
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </>
  );
}
