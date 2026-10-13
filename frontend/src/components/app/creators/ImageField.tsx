import { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Input } from '@/components/ui/input.tsx';
import { Field, Status } from './CreatorControls.tsx';
import { creatorLink } from './creatorStyles.ts';
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const user = useUser(),
    upload = useUploadUserFile();
  return (
    <div className="space-y-2">
      <Field label={label}>
        <Input
          type="url"
          placeholder="https://…"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </Field>
      <label
        className={`${creatorLink} inline-flex cursor-pointer focus-within:ring-2 focus-within:ring-ring`}
      >
        {upload.isPending ? 'Uploading…' : 'Upload an image'}
        <input
          aria-label={`Upload ${label.toLowerCase()}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={upload.isPending || !user}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file && user)
              void upload
                .mutateAsync({ userId: user.id, file })
                .then(result => onChange(result.url))
                .catch(() => {});
            e.target.value = '';
          }}
        />
      </label>
      <Status error={upload.error} />
      {value && (
        <img
          referrerPolicy="no-referrer"
          loading="lazy"
          src={value}
          alt={`${label} preview`}
          className="max-h-32 rounded-lg object-contain"
        />
      )}
    </div>
  );
}
