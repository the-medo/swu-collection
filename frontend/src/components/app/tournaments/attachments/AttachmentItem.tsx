import { useState } from 'react';
import { Download, FileText, ImageOff, Link, Pencil, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import type { TournamentAttachment } from '../../../../../../types/TournamentAttachment.ts';

export function AttachmentItem({
  item,
  pending,
  onView,
  onEdit,
  onRemove,
}: {
  item: TournamentAttachment;
  pending: boolean;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = item.kind === 'file' && item.mimeType?.startsWith('image/');
  const Icon = image ? ImageOff : item.kind === 'link' ? Link : FileText;
  const kind =
    item.kind === 'file' ? (image ? 'Image' : 'PDF') : item.kind === 'link' ? 'Link' : 'Text';
  const open = () => {
    if (item.kind === 'text') onView();
    // Avoid automatic link tracking of private URLs.
    else
      window.open(
        item.kind === 'link' ? item.content! : item.downloadUrl!,
        '_blank',
        'noopener,noreferrer',
      );
  };
  return (
    <li className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 py-1.5">
      <Button
        variant="ghost"
        className="row-span-2 size-10 p-0"
        aria-label={`Preview ${item.title}`}
        onClick={open}
      >
        {image && !imageFailed ? (
          <img
            src={`${item.downloadUrl!}?thumbnail=true`}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            data-amp-mask
            data-amp-mask-attributes="src,alt"
            className="size-10 rounded border bg-muted object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded border bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </Button>
      <Button
        variant="link"
        className="h-auto min-w-0 justify-start self-center whitespace-normal break-words p-0 text-left text-sm leading-tight"
        aria-label={`Open ${item.title}`}
        onClick={open}
      >
        {item.title}
      </Button>
      <div className="flex shrink-0 items-start justify-end gap-0.5">
        {imageFailed && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setImageFailed(false)}
            aria-label={`Retry preview of ${item.title}`}
            title="Retry preview"
          >
            <RotateCw className="size-4" />
          </Button>
        )}
        {item.kind === 'file' && (
          <Button asChild size="icon" variant="ghost" className="size-7">
            <a
              href={`${item.downloadUrl!}?download=true`}
              download={item.fileName ?? true}
              rel="noopener noreferrer"
              aria-label={`Download ${item.title}`}
              title="Download"
            >
              <Download className="size-4" />
            </a>
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Edit ${item.title}`}
          title="Edit"
          disabled={pending}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Delete ${item.title}`}
          title="Delete"
          disabled={pending}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <span className="col-span-2 col-start-2 min-w-0 break-words text-xs leading-tight text-muted-foreground">
        {item.kind === 'file'
          ? `${kind} · ${item.fileName} · ${Math.ceil((item.byteSize ?? 0) / 1024)} KB`
          : kind}
      </span>
    </li>
  );
}
