import { useState } from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useUserHeaderSettings } from '@/api/user-header/useUserHeaderSettings.ts';
import { useSetUserHeader } from '@/api/user-header/useSetUserHeader.ts';
import { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { UploadedImagePicker } from '@/components/app/global/UploadedImagePicker.tsx';
import { ProfileHeaderPreview } from '@/components/app/users/UserDetail/ProfileHeader.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { HeaderCropEditor } from '@/components/app/global/HeaderCropEditor.tsx';
import { GalleryImagePicker } from '@/components/app/global/GalleryImagePicker.tsx';
import type {
  HeaderCrop,
  HeaderImageOption,
  HeaderSourceKind,
  UserHeaderSettings,
} from '../../../../../../types/UserHeader.ts';

export default function HeaderSettings() {
  const user = useUser();
  const query = useUserHeaderSettings(user?.id);
  return (
    <section className="@container space-y-4 border-t pt-5" aria-labelledby="header-heading">
      <div className="space-y-2">
        <h3 id="header-heading" className="text-xl! font-medium">
          Profile header
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a battlefield, one of your images, or artwork from our gallery.
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
        <HeaderSettingsEditor key={user.id} userId={user.id} settings={query.data} />
      )}
    </section>
  );
}

function HeaderSettingsEditor({
  userId,
  settings,
}: {
  userId: string;
  settings: UserHeaderSettings;
}) {
  const [source, setSource] = useState<HeaderSourceKind>(settings.header.source);
  const [selection, setSelection] = useState<HeaderImageOption | null>(settings.selection);
  const [initialCrop, setInitialCrop] = useState<HeaderCrop | null>(settings.crop);
  const mutation = useSetUserHeader(userId);
  const upload = useUploadUserFile();
  const { toast } = useToast();
  const busy = mutation.isPending || upload.isPending;
  const choose = (image: HeaderImageOption) => {
    setSelection(image);
    setInitialCrop(null);
    mutation.reset();
  };
  const save = async (crop?: HeaderCrop) => {
    try {
      if (source === 'battlefield') await mutation.mutateAsync({ source: 'battlefield' });
      else if (selection && crop) await mutation.mutateAsync({ ...selection.source, crop });
      else return;
      toast({ title: 'Profile header updated' });
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
        <p className="text-sm font-medium">Current header</p>
        <div className="overflow-hidden rounded-lg border">
          <ProfileHeaderPreview header={settings.header} />
        </div>
      </div>
      {settings.header.image && !settings.selection && (
        <p className="text-sm text-muted-foreground">
          The original image is no longer available. Your saved header is still displayed; choose
          another image to change it.
        </p>
      )}
      <Tabs
        value={source}
        onValueChange={value => {
          if (!busy && (value === 'battlefield' || value === 'upload' || value === 'gallery')) {
            setSource(value);
            mutation.reset();
          }
        }}
      >
        <TabsList aria-label="Profile header source" className="h-auto flex-wrap">
          <TabsTrigger value="battlefield" disabled={busy}>
            Battlefield
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={busy}>
            My images
          </TabsTrigger>
          <TabsTrigger value="gallery" disabled={busy}>
            Gallery
          </TabsTrigger>
        </TabsList>
        <TabsContent value="battlefield" className="space-y-3">
          <div className="overflow-hidden rounded-lg border">
            <ProfileHeaderPreview />
          </div>
          <p className="text-sm text-muted-foreground">
            Use the planet battlefield as your profile header. More battlefield customization is
            coming.
          </p>
          <Button
            disabled={busy || settings.header.source === 'battlefield'}
            onClick={() => void save()}
          >
            {mutation.isPending ? 'Saving header…' : 'Use battlefield'}
          </Button>
        </TabsContent>
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
