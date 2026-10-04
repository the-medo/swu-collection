import { useState } from 'react';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { useDeleteUserFile } from '@/api/user-files/useDeleteUserFile.ts';
import type { UserFile } from '../../../../../../../types/UserFile.ts';
import { formatBytes } from './formatBytes.ts';

export function UserFileDetail({
  file,
  uploading,
  userId,
  onClose,
  onDeleted,
  returnFocus,
}: {
  file: UserFile;
  uploading: boolean;
  userId: string;
  onClose: () => void;
  onDeleted: () => void;
  returnFocus: () => void;
}) {
  const remove = useDeleteUserFile();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const url = new URL(file.url, window.location.origin).href;
  const saved = Math.max(0, file.originalByteSize - file.byteSize);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Image link copied' });
    } catch {
      toast({
        title: 'Could not copy the link',
        description: 'Select and copy the link below.',
        variant: 'destructive',
      });
    }
  };
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !remove.isPending) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90dvh] overflow-y-auto"
        onCloseAutoFocus={event => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="break-all pr-6">{file.fileName}</DialogTitle>
          <DialogDescription>
            Optimized image · uploaded {new Date(file.createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <img
          src={file.url}
          alt={file.fileName}
          className="max-h-[40dvh] w-full rounded-md bg-muted object-contain"
        />
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[
            ['Dimensions', `${file.width} × ${file.height}`],
            ['Format', 'WebP'],
            ['Original size', formatBytes(file.originalByteSize)],
            ['Optimized size', formatBytes(file.byteSize)],
            ['Preview size', formatBytes(file.thumbnailByteSize)],
            ['Space used', formatBytes(file.byteSize + file.thumbnailByteSize)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {saved > 0 && (
          <p className="text-sm text-muted-foreground">
            Optimization saved {formatBytes(saved)} on the full image. Only the optimized image and
            its preview count toward your storage.
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="user-image-link" className="text-sm font-medium">
            Image link
          </label>
          <Input
            id="user-image-link"
            readOnly
            value={url}
            onFocus={event => event.currentTarget.select()}
          />
          <p className="text-xs text-muted-foreground">Anyone with this link can view the image.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void copy()}>
            <Copy className="size-4" />
            Copy link
          </Button>
          <Button variant="outline" asChild>
            <a href={file.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open image
            </a>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={remove.isPending || uploading}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
        {uploading && (
          <p className="text-sm text-muted-foreground">
            Wait for your uploads to finish before deleting an image.
          </p>
        )}
        <AlertDialog
          open={confirmDelete}
          onOpenChange={open => {
            if (!remove.isPending) setConfirmDelete(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this image?</AlertDialogTitle>
              <AlertDialogDescription>
                This frees {formatBytes(file.byteSize + file.thumbnailByteSize)} of storage. Links
                to this image will stop working wherever you have used them. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {remove.isError && (
              <p role="alert" className="text-sm text-destructive">
                {remove.error.message}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending || uploading}>
                Keep image
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.isPending || uploading}
                onClick={event => {
                  event.preventDefault();
                  remove.mutate({ userId, id: file.id }, { onSuccess: onDeleted });
                }}
              >
                {remove.isPending ? 'Deleting…' : 'Delete image'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
